import Anthropic from '@anthropic-ai/sdk';
import { z } from "zod";

const ANTHROPIC_KEY = process.env.ANTHROPIC_API_KEY ?? "";
if (!ANTHROPIC_KEY || !/^sk-ant-[A-Za-z0-9_-]+$/.test(ANTHROPIC_KEY)) {
  console.warn(
    "[AI Extract] WARNING: ANTHROPIC_API_KEY is missing or invalid. " +
    `Value starts with: "${ANTHROPIC_KEY.substring(0, 12)}..." — check for spaces, ellipsis (…), or truncation.`
  );
}

const anthropic = new Anthropic({
  apiKey: ANTHROPIC_KEY,
});

const extractedLoadSchema = z.object({
  loadNumber: z.string().nullable(),
  pickupLocation: z.string(),
  pickupDate: z.string(),
  deliveryLocation: z.string(),
  deliveryDate: z.string(),
  rate: z.string(),
  weight: z.number().nullable(),
  commodity: z.string().nullable(),
  notes: z.string().nullable(),
  brokerName: z.string().nullable(),
  brokerAddress: z.string().nullable(),
  brokerPhone: z.string().nullable(),
  brokerEmail: z.string().nullable(),
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

// ── Paperwork Extraction ─────────────────────────────────────────────────────

const extractedPaperworkSchema = z.object({
  documentType: z.enum(["pod", "bol", "rate_confirmation", "lumper", "other"]),
  extractedLoadNumber: z.string().nullable(),
  extractedDriverName: z.string().nullable(),
  extractedTruckNumber: z.string().nullable(),
  extractedPickupDate: z.string().nullable(),
  extractedDeliveryDate: z.string().nullable(),
  extractedPickupLocation: z.string().nullable(),
  extractedDeliveryLocation: z.string().nullable(),
  extractedShipper: z.string().nullable(),
  extractedReceiver: z.string().nullable(),
  isSigned: z.boolean().nullable(),
  pageCount: z.number().nullable(),
  confidenceScore: z.number(),
});

export type ExtractedPaperwork = z.infer<typeof extractedPaperworkSchema>;

const EXTRACT_PAPERWORK_TOOL: Anthropic.Tool = {
  name: "extract_paperwork",
  description: "Extract structured information from driver paperwork documents like POD, BOL, delivery receipts",
  input_schema: {
    type: "object",
    properties: {
      documentType: {
        type: "string",
        enum: ["pod", "bol", "rate_confirmation", "lumper", "other"],
        description: "Type of document: pod=Proof of Delivery, bol=Bill of Lading, rate_confirmation, lumper receipt, or other",
      },
      extractedLoadNumber: {
        anyOf: [{ type: "string" }, { type: "null" }],
        description: "Load number, reference number, or shipment ID visible on the document",
      },
      extractedDriverName: {
        anyOf: [{ type: "string" }, { type: "null" }],
        description: "Driver name if visible",
      },
      extractedTruckNumber: {
        anyOf: [{ type: "string" }, { type: "null" }],
        description: "Truck number or unit number if visible",
      },
      extractedPickupDate: {
        anyOf: [{ type: "string" }, { type: "null" }],
        description: "Pickup date in YYYY-MM-DD format",
      },
      extractedDeliveryDate: {
        anyOf: [{ type: "string" }, { type: "null" }],
        description: "Delivery date in YYYY-MM-DD format",
      },
      extractedPickupLocation: {
        anyOf: [{ type: "string" }, { type: "null" }],
        description: "Pickup city and state",
      },
      extractedDeliveryLocation: {
        anyOf: [{ type: "string" }, { type: "null" }],
        description: "Delivery city and state",
      },
      extractedShipper: {
        anyOf: [{ type: "string" }, { type: "null" }],
        description: "Shipper company name",
      },
      extractedReceiver: {
        anyOf: [{ type: "string" }, { type: "null" }],
        description: "Receiver/consignee company name",
      },
      isSigned: {
        anyOf: [{ type: "boolean" }, { type: "null" }],
        description: "Whether the document appears to have a signature",
      },
      pageCount: {
        anyOf: [{ type: "number" }, { type: "null" }],
        description: "Number of pages in the document if determinable",
      },
      confidenceScore: {
        type: "number",
        description: "Confidence score 0.0 to 1.0 that this is a valid transportation paperwork document",
      },
    },
    required: [
      "documentType", "extractedLoadNumber", "extractedDriverName", "extractedTruckNumber",
      "extractedPickupDate", "extractedDeliveryDate", "extractedPickupLocation",
      "extractedDeliveryLocation", "extractedShipper", "extractedReceiver",
      "isSigned", "pageCount", "confidenceScore",
    ],
  },
};

export async function extractPaperworkDocument(
  fileData: string,
  fileType: string
): Promise<ExtractedPaperwork> {
  const base64Content = fileData.split(",")[1] || fileData;

  let userContent: Anthropic.MessageParam["content"];
  if (fileType === "application/pdf") {
    userContent = [
      { type: "text", text: "Extract driver paperwork details from this transportation document:" },
      { type: "document", source: { type: "base64", media_type: "application/pdf", data: base64Content } } as any,
    ];
  } else {
    const mediaType = fileType as Anthropic.Base64ImageSource["media_type"];
    userContent = [
      { type: "text", text: "Extract driver paperwork details from this transportation document:" },
      { type: "image", source: { type: "base64", media_type: mediaType, data: base64Content } },
    ];
  }

  const response = await anthropic.messages.create({
    model: "claude-haiku-4-5-20251001",
    max_tokens: 1024,
    system: "You are an expert at reading transportation paperwork including PODs (Proof of Delivery), BOLs (Bill of Lading), and delivery receipts. Extract all relevant fields accurately. Return null for missing fields.",
    messages: [{ role: "user", content: userContent }],
    tools: [EXTRACT_PAPERWORK_TOOL],
    tool_choice: { type: "tool", name: "extract_paperwork" },
  });

  const toolUseBlock = response.content.find(
    (block): block is Anthropic.ToolUseBlock => block.type === "tool_use"
  );
  if (!toolUseBlock) throw new Error("No structured response from AI");
  return extractedPaperworkSchema.parse(toolUseBlock.input);
}

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
    let message: Anthropic.Message;

    let userContent: Anthropic.MessageParam["content"];

    if (fileType === 'application/pdf') {
      // Use Anthropic's native PDF document support
      console.log("[AI Extract] Processing PDF using Anthropic native PDF support");
      userContent = [
        {
          type: "text",
          text: "Extract load information from this PDF document:",
        },
        {
          type: "document",
          source: {
            type: "base64",
            media_type: "application/pdf",
            data: base64Content,
          },
        } as any,
      ];
    } else if (isImage) {
      // Use Anthropic's vision with base64 image source
      const mediaType = fileType as Anthropic.Base64ImageSource["media_type"];
      console.log(`[AI Extract] Processing image (${fileType})`);
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
      // Plain text files
      const textContent = Buffer.from(base64Content, "base64").toString("utf-8");
      console.log("[AI Extract] Processing text file");
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

    return extractedLoadSchema.parse(toolUseBlock.input);
  } catch (error: any) {
    console.error("[AI Extract] Error:", error?.message);

    if (error?.status === 413 || error?.message?.includes('too large')) {
      throw new Error("Document is too large. Please use a smaller file (under 5MB).");
    }

    if (error?.status === 400 && error?.message?.includes('pdf')) {
      throw new Error("Unable to process this PDF. Please try converting it to PNG/JPG first.");
    }

    const message = error?.message || "Failed to extract load information from document";
    throw new Error(message);
  }
}
