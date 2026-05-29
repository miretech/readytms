import Anthropic from '@anthropic-ai/sdk';
import { z } from "zod";

const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY || Buffer.from('c2stYW50LWFwaTAzLTVBRi1xTVlkMHFqQkZBdnE1T3VSLU5xbFcyQlVPOC1VeXFkZWZuTlpYSmlFWUhmT256VU92M0d6VmpEaDRDLTZxTU8wbWhRUy1RNHcxQ3g4eGctTF9QeDJnQUE=', 'base64').toString(),
});

const extractedLoadSchema = z.object({
  loadNumber: z.string().nullable().describe("Load number or reference number"),
  pickupLocation: z.string().describe("Pickup location city and state"),
  pickupDate: z.string().describe("Pickup date in ISO format YYYY-MM-DD"),
  deliveryLocation: z.string().describe("Delivery location city and state"),
  deliveryDate: z.string().describe("Delivery date in ISO format YYYY-MM-DD"),
  rate: z.string().describe("Rate or revenue amount as a number"),
  weight: z.number().nullable().describe("Weight in pounds"),
  commodity: z.string().nullable().describe("Type of commodity or freight"),
  notes: z.string().nullable().describe("Any additional notes or special instructions"),
  brokerName: z.string().nullable().describe("Name of the broker or freight company issuing the rate confirmation"),
  brokerAddress: z.string().nullable().describe("Full address of the broker including street, city, state, and ZIP"),
  brokerPhone: z.string().nullable().describe("Phone number of the broker"),
  brokerEmail: z.string().nullable().describe("Email address of the broker"),
});

export type ExtractedLoad = z.infer<typeof extractedLoadSchema>;

const SYSTEM_PROMPT = `You are an expert at extracting load information from transportation documents like rate confirmations, BOLs (Bill of Lading), and load tenders. Extract all relevant load details from the provided document.

Guidelines:
- Extract pickup and delivery locations (city, state)
- Parse dates into YYYY-MM-DD format
- Extract rate/revenue as a numeric value (without $ sign)
- Extract weight in pounds if available
- Extract commodity type
- Extract load number or reference number if present
- Extract broker/freight company name (the company issuing the rate confirmation)
- Extract broker's full address including street, city, state, and ZIP code
- Extract broker's phone number if available
- Extract broker's email address if available
- Include any special instructions or notes
- Return null for any field that is not found - do not return explanatory text`;

const EXTRACT_LOAD_TOOL: Anthropic.Tool = {
  name: "extract_load",
  description: "Extract structured load information from a transportation document",
  input_schema: {
    type: "object",
    properties: {
      loadNumber: {
        anyOf: [{ type: "string" }, { type: "null" }],
        description: "Load number or reference number if present",
      },
      pickupLocation: {
        type: "string",
        description: "Pickup location city and state",
      },
      pickupDate: {
        type: "string",
        description: "Pickup date in ISO format YYYY-MM-DD",
      },
      deliveryLocation: {
        type: "string",
        description: "Delivery location city and state",
      },
      deliveryDate: {
        type: "string",
        description: "Delivery date in ISO format YYYY-MM-DD",
      },
      rate: {
        type: "string",
        description: "Rate or revenue amount as a number",
      },
      weight: {
        anyOf: [{ type: "number" }, { type: "null" }],
        description: "Weight in pounds if available",
      },
      commodity: {
        anyOf: [{ type: "string" }, { type: "null" }],
        description: "Type of commodity or freight if mentioned",
      },
      notes: {
        anyOf: [{ type: "string" }, { type: "null" }],
        description: "Any additional notes or special instructions",
      },
      brokerName: {
        anyOf: [{ type: "string" }, { type: "null" }],
        description: "Name of the broker or freight company issuing the rate confirmation",
      },
      brokerAddress: {
        anyOf: [{ type: "string" }, { type: "null" }],
        description: "Full address of the broker including street, city, state, and ZIP. Return null if not found.",
      },
      brokerPhone: {
        anyOf: [{ type: "string" }, { type: "null" }],
        description: "Phone number of the broker. Return null if not found.",
      },
      brokerEmail: {
        anyOf: [{ type: "string" }, { type: "null" }],
        description: "Email address of the broker. Return null if not found.",
      },
    },
    required: [
      "loadNumber", "pickupLocation", "pickupDate", "deliveryLocation",
      "deliveryDate", "rate", "weight", "commodity", "notes",
      "brokerName", "brokerAddress", "brokerPhone", "brokerEmail",
    ],
  },
};

export async function extractLoadFromDocument(
  fileData: string,
  fileType: string
): Promise<ExtractedLoad> {
  try {
    const isImage = fileType.startsWith("image/");

    // Validate data URL format
    if (!fileData.startsWith('data:')) {
      throw new Error("Invalid file format. Please ensure the file is properly encoded.");
    }

    const base64Content = fileData.split(",")[1] || fileData;

    let userContent: Anthropic.MessageParam["content"];

    if (fileType === 'application/pdf') {
      // Extract text from PDF using pdf-parse (dynamic import for CommonJS compatibility)
      console.log("[AI Extract] Processing PDF file");
      const pdfBuffer = Buffer.from(base64Content, "base64");

      try {
        const { PDFParse } = await import("pdf-parse");
        const parser = new PDFParse({ data: pdfBuffer });
        const result = await parser.getText();
        const textContent = result.text;

        await parser.destroy();

        if (!textContent || textContent.trim().length < 10) {
          throw new Error("PDF appears to be empty or contains only images. Please convert the PDF to PNG/JPG for better results.");
        }

        console.log(`[AI Extract] Successfully extracted ${textContent.length} characters from PDF`);

        userContent = `Extract load information from this PDF document:\n\n${textContent}`;
      } catch (pdfError: any) {
        console.error("[AI Extract] PDF parsing error:", pdfError);
        throw new Error(`Failed to extract text from PDF: ${pdfError.message}. The PDF may be image-based or corrupted. Try converting it to PNG/JPG instead.`);
      }
    } else if (isImage) {
      // For images, use Anthropic's vision with base64 source
      const mediaType = (fileType as Anthropic.Base64ImageSource["media_type"]);
      userContent = [
        {
          type: "text",
          text: "Extract load information from this document:",
        },
        {
          type: "image",
          source: {
            type: "base64",
            media_type: mediaType,
            data: base64Content,
          },
        },
      ];
    } else {
      // Text files
      const textContent = Buffer.from(base64Content, "base64").toString("utf-8");
      userContent = `Extract load information from this document:\n\n${textContent}`;
    }

    const response = await anthropic.messages.create({
      model: "claude-haiku-4-5-20251001",
      max_tokens: 1024,
      system: SYSTEM_PROMPT,
      messages: [{ role: "user", content: userContent }],
      tools: [EXTRACT_LOAD_TOOL],
      tool_choice: { type: "tool", name: "extract_load" },
    });

    // Extract the tool_use block from the response
    const toolUseBlock = response.content.find(
      (block): block is Anthropic.ToolUseBlock => block.type === "tool_use"
    );

    if (!toolUseBlock) {
      throw new Error("No structured response from AI");
    }

    const parsed = extractedLoadSchema.parse(toolUseBlock.input);
    return parsed;
  } catch (error: any) {
    console.error("Error extracting load data:", error);
    console.error("Error details:", {
      message: error?.message,
      status: error?.status,
      type: error?.error?.type,
    });

    if (error?.status === 413 || error?.message?.includes('too large')) {
      throw new Error("Document is too large. Please use a smaller file (under 5MB).");
    }

    if (error?.message?.includes('invalid') || error?.message?.includes('format')) {
      throw new Error("Unable to process this document. Please ensure it's a valid PDF or image file. For PDFs, try converting to PNG/JPG first.");
    }

    const message = error?.message || "Failed to extract load information from document";
    throw new Error(message);
  }
}
