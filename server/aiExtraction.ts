import Anthropic from "@anthropic-ai/sdk";
import { z } from "zod";

const client = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY || "sk-ant-api03-5AF-qMYd0qjBFAvq5OuR-NqlW2BUO8-UyqdefnNZXJiEYHfOnzUOv3GzVjDh4C-6qMO0mhQS-Q4w1Cx8xg-L_Px2gAA",
});

export const extractedLoadSchema = z.object({
  loadNumber: z.string().nullable().describe("Load number or reference number"),
  pickupLocation: z.string().describe("Pickup location city and state"),
  pickupDate: z.string().describe("Pickup date in ISO format YYYY-MM-DD"),
  deliveryLocation: z.string().describe("Delivery location city and state"),
  deliveryDate: z.string().describe("Delivery date in ISO format YYYY-MM-DD"),
  rate: z.string().describe("Rate or revenue amount as a number"),
  weight: z.number().nullable().describe("Weight in pounds"),
  commodity: z.string().nullable().describe("Type of commodity or freight"),
  notes: z.string().nullable().describe("Any additional notes or special instructions"),
  brokerName: z.string().nullable().describe("Name of the broker or freight company"),
  brokerAddress: z.string().nullable().describe("Full address of the broker"),
  brokerPhone: z.string().nullable().describe("Phone number of the broker"),
  brokerEmail: z.string().nullable().describe("Email address of the broker"),
});

export type ExtractedLoad = z.infer<typeof extractedLoadSchema>;

const SYSTEM_PROMPT = `You are an expert at extracting load information from transportation documents like rate confirmations, BOLs (Bill of Lading), and load tenders. Extract all relevant load details from the provided document.

Guidelines:
- Extract pickup and delivery locations (city, state)
- Parse dates into YYYY-MM-DD format
- Extract rate/revenue as a numeric string value (without $ sign)
- Extract weight in pounds if available
- Extract commodity type
- Extract load number or reference number if present
- Extract broker/freight company name (the company issuing the rate confirmation)
- Extract broker full address including street, city, state, and ZIP code
- Extract broker phone number if available
- Extract broker email address if available
- Include any special instructions or notes
- Return null for any field that is not found

Respond ONLY with a valid JSON object (no markdown, no code block, raw JSON):
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
    if (!fileData.startsWith("data:")) {
      throw new Error("Invalid file format. Please ensure the file is properly encoded.");
    }

    const base64Content = fileData.split(",")[1] || fileData;
    let message: Anthropic.Message;

    if (fileType === "application/pdf") {
      console.log("[AI Extract] Processing PDF with Claude native PDF support");
      message = await client.messages.create({
        model: "claude-haiku-4-5-20251001",
        max_tokens: 1024,
        system: SYSTEM_PROMPT,
        messages: [
          {
            role: "user",
            content: [
              {
                type: "document",
                source: {
                  type: "base64",
                  media_type: "application/pdf",
                  data: base64Content,
                },
              },
              {
                type: "text",
                text: "Extract load information from this rate confirmation document.",
              },
            ],
          },
        ],
      });
      console.log("[AI Extract] Claude native PDF extraction succeeded");
    } else if (fileType.startsWith("image/")) {
      message = await client.messages.create({
        model: "claude-haiku-4-5-20251001",
        max_tokens: 1024,
        system: SYSTEM_PROMPT,
        messages: [
          {
            role: "user",
            content: [
              {
                type: "image",
                source: {
                  type: "base64",
                  media_type: fileType as "image/jpeg" | "image/png" | "image/gif" | "image/webp",
                  data: base64Content,
                },
              },
              {
                type: "text",
                text: "Extract load information from this rate confirmation document.",
              },
            ],
          },
        ],
      });
    } else {
      const textContent = Buffer.from(base64Content, "base64").toString("utf-8");
      message = await client.messages.create({
        model: "claude-haiku-4-5-20251001",
        max_tokens: 1024,
        system: SYSTEM_PROMPT,
        messages: [{ role: "user", content: `Extract load information from this document:\n\n${textContent}` }],
      });
    }

    const responseContent = message.content[0];
    if (!responseContent || responseContent.type !== "text") {
      throw new Error("No text response from AI");
    }

    const rawText = responseContent.text.trim();
    const jsonText = rawText.replace(/^```(?:json)?\s*/i, "").replace(/\s*```$/, "").trim();
    const parsed = JSON.parse(jsonText);
    return extractedLoadSchema.parse(parsed);
  } catch (error: any) {
    console.error("Error extracting load data:", error);
    if (error?.status === 413 || error?.message?.includes("too large")) {
      throw new Error("Document is too large. Please use a smaller file (under 5MB).");
    }
    throw new Error(error?.message || "Failed to extract load information from document");
  }
}
