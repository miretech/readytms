import Anthropic from "@anthropic-ai/sdk";
import { z } from "zod";

const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
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
- Return null for any field that is not found - do not return explanatory text

Respond ONLY with a valid JSON object matching this schema (no markdown, no code block, raw JSON):
{
  "loadNumber": string | null,
  "pickupLocation": string,
  "pickupDate": string,
  "deliveryLocation": string,
  "deliveryDate": string,
  "rate": string,
  "weight": number | null,
  "commodity": string | null,
  "notes": string | null,
  "brokerName": string | null,
  "brokerAddress": string | null,
  "brokerPhone": string | null,
  "brokerEmail": string | null
}`;

export async function extractLoadFromDocument(
  fileData: string,
  fileType: string
): Promise<ExtractedLoad> {
  try {
    const isImage = fileType.startsWith("image/");

    // Validate data URL format
    if (!fileData.startsWith("data:")) {
      throw new Error("Invalid file format. Please ensure the file is properly encoded.");
    }

    const base64Content = fileData.split(",")[1] || fileData;
    let userContent: string;

    if (fileType === "application/pdf") {
      // Extract text from PDF using pdf-parse
      console.log("[AI Extract] Processing PDF file with Claude");
      const pdfBuffer = Buffer.from(base64Content, "base64");

      try {
        const { PDFParse } = await import("pdf-parse");
        const parser = new PDFParse({ data: pdfBuffer });
        const result = await parser.getText();
        const textContent = result.text;
        await parser.destroy();

        if (!textContent || textContent.trim().length < 10) {
          throw new Error(
            "PDF appears to be empty or contains only images. Please convert the PDF to PNG/JPG for better results."
          );
        }

        console.log(
          `[AI Extract] Successfully extracted ${textContent.length} characters from PDF`
        );
        userContent = `Extract load information from this rate confirmation document:\n\n${textContent}`;
      } catch (pdfError: any) {
        console.error("[AI Extract] PDF parsing error:", pdfError);
        throw new Error(
          `Failed to extract text from PDF: ${pdfError.message}. The PDF may be image-based or corrupted. Try converting it to PNG/JPG instead.`
        );
      }
    } else if (isImage) {
      const textContent = `[Image file: ${fileType}. Please provide text content if available.]`;
      userContent = `Extract load information from this document:\n\n${textContent}`;
    } else {
      const textContent = Buffer.from(base64Content, "base64").toString("utf-8");
      userContent = `Extract load information from this document:\n\n${textContent}`;
    }

    const message = await anthropic.messages.create({
      model: "claude-haiku-4-5-20251001",
      max_tokens: 1024,
      system: SYSTEM_PROMPT,
      messages: [{ role: "user", content: userContent }],
    });

    const responseContent = message.content[0];
    if (!responseContent || responseContent.type !== "text") {
      throw new Error("No text response from AI");
    }

    const rawText = responseContent.text.trim();
    const jsonText = rawText
      .replace(/^```(?:json)?\s*/i, "")
      .replace(/\s*```$/, "")
      .trim();

    const parsed = JSON.parse(jsonText);
    return extractedLoadSchema.parse(parsed);
  } catch (error: any) {
    console.error("Error extracting load data:", error);
    if (error?.status === 413 || error?.message?.includes("too large")) {
      throw new Error("Document is too large. Please use a smaller file (under 5MB).");
    }
    if (error?.message?.includes("invalid") || error?.message?.includes("format")) {
      throw new Error("Unable to process this document. Please ensure it's a valid PDF or image file.");
    }
    throw new Error(error?.message || "Failed to extract load information from document");
  }
}
