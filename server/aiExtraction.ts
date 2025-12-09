import OpenAI from "openai";
import { z } from "zod";

const openai = new OpenAI({
  apiKey: process.env.AI_INTEGRATIONS_OPENAI_API_KEY,
  baseURL: process.env.AI_INTEGRATIONS_OPENAI_BASE_URL,
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
});

export type ExtractedLoad = z.infer<typeof extractedLoadSchema>;

export async function extractLoadFromDocument(
  fileData: string,
  fileType: string
): Promise<ExtractedLoad> {
  try {
    const isImage = fileType.startsWith("image/");
    
    const messages: Array<any> = [
      {
        role: "system",
        content: `You are an expert at extracting load information from transportation documents like rate confirmations, BOLs (Bill of Lading), and load tenders. Extract all relevant load details from the provided document.

Guidelines:
- Extract pickup and delivery locations (city, state)
- Parse dates into YYYY-MM-DD format
- Extract rate/revenue as a numeric value (without $ sign)
- Extract weight in pounds if available
- Extract commodity type
- Extract load number or reference number if present
- Extract broker/freight company name (the company issuing the rate confirmation)
- Extract broker's full address including street, city, state, and ZIP code
- Include any special instructions or notes`,
      },
    ];

    // Validate data URL format
    if (!fileData.startsWith('data:')) {
      throw new Error("Invalid file format. Please ensure the file is properly encoded.");
    }

    const base64Content = fileData.split(",")[1] || fileData;

    if (fileType === 'application/pdf') {
      // Extract text from PDF using pdf-parse (dynamic import for CommonJS compatibility)
      console.log("[AI Extract] Processing PDF file");
      const pdfBuffer = Buffer.from(base64Content, "base64");
      
      try {
        // Dynamic import for pdf-parse to handle ESM module
        const { PDFParse } = await import("pdf-parse");
        const parser = new PDFParse({ data: pdfBuffer });
        const result = await parser.getText();
        const textContent = result.text;
        
        // Clean up resources
        await parser.destroy();
        
        if (!textContent || textContent.trim().length < 10) {
          throw new Error("PDF appears to be empty or contains only images. Please convert the PDF to PNG/JPG for better results.");
        }
        
        console.log(`[AI Extract] Successfully extracted ${textContent.length} characters from PDF`);
        
        messages.push({
          role: "user",
          content: `Extract load information from this PDF document:\n\n${textContent}`,
        });
      } catch (pdfError: any) {
        console.error("[AI Extract] PDF parsing error:", pdfError);
        throw new Error(`Failed to extract text from PDF: ${pdfError.message}. The PDF may be image-based or corrupted. Try converting it to PNG/JPG instead.`);
      }
    } else if (isImage) {
      // For images, use OpenAI's Vision API
      messages.push({
        role: "user",
        content: [
          {
            type: "text",
            text: "Extract load information from this document:",
          },
          {
            type: "image_url",
            image_url: {
              url: fileData,
              detail: "high", // Use high detail for better OCR accuracy
            },
          },
        ],
      });
    } else {
      // Text files only
      const textContent = Buffer.from(base64Content, "base64").toString("utf-8");
      
      messages.push({
        role: "user",
        content: `Extract load information from this document:\n\n${textContent}`,
      });
    }

    const completion = await openai.chat.completions.create({
      model: "gpt-4o",
      messages,
      response_format: {
        type: "json_schema",
        json_schema: {
          name: "load_extraction",
          strict: true,
          schema: {
            type: "object",
            properties: {
              loadNumber: {
                type: ["string", "null"],
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
                type: ["number", "null"],
                description: "Weight in pounds if available",
              },
              commodity: {
                type: ["string", "null"],
                description: "Type of commodity or freight if mentioned",
              },
              notes: {
                type: ["string", "null"],
                description: "Any additional notes or special instructions",
              },
              brokerName: {
                type: ["string", "null"],
                description: "Name of the broker or freight company issuing the rate confirmation",
              },
              brokerAddress: {
                type: ["string", "null"],
                description: "Full address of the broker including street, city, state, and ZIP. Return null if not found - do not return explanatory text.",
              },
            },
            required: ["loadNumber", "pickupLocation", "pickupDate", "deliveryLocation", "deliveryDate", "rate", "weight", "commodity", "notes", "brokerName", "brokerAddress"],
            additionalProperties: false,
          },
        },
      },
    });

    const responseContent = completion.choices[0]?.message?.content;
    if (!responseContent) {
      throw new Error("No response from AI");
    }

    const parsed = JSON.parse(responseContent);
    return extractedLoadSchema.parse(parsed);
  } catch (error: any) {
    console.error("Error extracting load data:", error);
    console.error("Error details:", {
      message: error?.message,
      status: error?.status,
      code: error?.error?.code,
      type: error?.error?.type,
      response: error?.response?.data,
    });
    
    // Handle OpenAI-specific errors
    if (error?.error?.code === 'context_length_exceeded') {
      throw new Error("Document is too large for AI processing. Please use a smaller file (under 5MB).");
    }
    
    if (error?.status === 413 || error?.message?.includes('too large')) {
      throw new Error("Document is too large. Please use a smaller file (under 5MB).");
    }
    
    // Handle invalid image URL errors (common with PDFs)
    if (error?.error?.code === 'invalid_image_url' || error?.message?.includes('invalid_image_url')) {
      throw new Error("Unable to process this PDF with Vision API. The PDF may be corrupted or in an unsupported format. Please try converting it to an image (PNG/JPG) first.");
    }
    
    // Handle invalid PDF format errors
    if (error?.message?.includes('invalid') || error?.message?.includes('format')) {
      throw new Error("Unable to process this document. Please ensure it's a valid PDF or image file. For PDFs, try converting to PNG/JPG first.");
    }
    
    // Provide more specific error messages
    const message = error?.message || error?.error?.message || "Failed to extract load information from document";
    throw new Error(message);
  }
}
