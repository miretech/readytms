import Anthropic from "@anthropic-ai/sdk";
import { z } from "zod";

const client = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY || "sk-ant-api03-5AF-qMYd0qjBFAvq5OuR-NqlW2BUO8-UyqdefnNZXJiEYHfOnzUOv3GzVjDh4C-6qMO0mhQS-Q4w1Cx8xg-L_Px2gAA",
});

const SYSTEM_PROMPT = `You are a logistics data extraction assistant. Extract load information from rate confirmation documents and return it as JSON.

Required fields:
- pickupDate: string (ISO date or readable format)
- deliveryDate: string (ISO date or readable format)  
- origin: string (city, state)
- destination: string (city, state)
- rate: number (total rate in dollars)
- commodity: string (what is being shipped)
- weight: number or null (in pounds)
- miles: number or null (total miles)
- specialInstructions: string or null

Return ONLY valid JSON, no markdown, no explanation.`;

export const extractedLoadSchema = z.object({
  pickupDate: z.string(),
  deliveryDate: z.string(),
  origin: z.string(),
  destination: z.string(),
  rate: z.number(),
  commodity: z.string(),
  weight: z.number().nullable().optional(),
  miles: z.number().nullable().optional(),
  specialInstructions: z.string().nullable().optional(),
});

export type ExtractedLoad = z.infer<typeof extractedLoadSchema>;

export async function extractLoadFromDocument(
  fileData: string,
  fileType: string
): Promise<ExtractedLoad> {
  try {
    const isImage = fileType.startsWith("image/");

    if (!fileData.startsWith("data:")) {
      throw new Error(
        "Invalid file format. Please ensure the file is properly encoded."
      );
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
    } else if (isImage) {
      const textContent = `[Image file: ${fileType}. Please provide text content if available.]`;
      const userContent = `Extract load information from this document:\n\n${textContent}`;
      message = await client.messages.create({
        model: "claude-haiku-4-5-20251001",
        max_tokens: 1024,
        system: SYSTEM_PROMPT,
        messages: [{ role: "user", content: userContent }],
      });
    } else {
      const textContent = Buffer.from(base64Content, "base64").toString("utf-8");
      const userContent = `Extract load information from this document:\n\n${textContent}`;
      message = await client.messages.create({
        model: "claude-haiku-4-5-20251001",
        max_tokens: 1024,
        system: SYSTEM_PROMPT,
        messages: [{ role: "user", content: userContent }],
      });
    }

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
      throw new Error(
        "Document is too large. Please use a smaller file (under 5MB)."
      );
    }
    if (
      error?.message?.includes("invalid") ||
      error?.message?.includes("format")
    ) {
      throw new Error(
        "Unable to process this document. Please ensure it\'s a valid PDF or image file."
      );
    }
    throw new Error(
      error?.message || "Failed to extract load information from document"
    );
  }
}
