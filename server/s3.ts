import { S3Client, PutObjectCommand } from "@aws-sdk/client-s3";

const s3Client = new S3Client({
  region: process.env.AWS_REGION || "us-east-1",
  credentials: {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID || "",
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY || "",
  },
});

const BUCKET = process.env.AWS_S3_BUCKET || "readytms-documents";
const REGION = process.env.AWS_REGION || "us-east-1";

async function uploadBufferToS3(
  buffer: Buffer,
  key: string,
  mimeType: string
): Promise<string> {
  await s3Client.send(
    new PutObjectCommand({
      Bucket: BUCKET,
      Key: key,
      Body: buffer,
      ContentType: mimeType,
    })
  );
  return `https://${BUCKET}.s3.${REGION}.amazonaws.com/${key}`;
}

/** Upload a rate confirmation PDF (existing usage) */
export async function uploadPdfToS3(
  base64Data: string,
  fileName: string,
  mimeType: string = "application/pdf"
): Promise<string> {
  const base64 = base64Data.includes(",") ? base64Data.split(",")[1] : base64Data;
  const buffer = Buffer.from(base64, "base64");
  const key = `ratecons/${Date.now()}-${fileName.replace(/[^a-zA-Z0-9._-]/g, "_")}`;
  return uploadBufferToS3(buffer, key, mimeType);
}

/** Upload driver paperwork (POD, BOL, etc.) — stores under paperwork/ folder */
export async function uploadPaperworkToS3(
  base64Data: string,
  fileName: string,
  mimeType: string
): Promise<string> {
  const base64 = base64Data.includes(",") ? base64Data.split(",")[1] : base64Data;
  const buffer = Buffer.from(base64, "base64");
  const safe = fileName.replace(/[^a-zA-Z0-9._-]/g, "_");
  const key = `paperwork/${Date.now()}-${safe}`;
  return uploadBufferToS3(buffer, key, mimeType);
}

/** Upload a raw Buffer directly (e.g. from Gmail attachment) */
export async function uploadBufferPaperworkToS3(
  buffer: Buffer,
  fileName: string,
  mimeType: string
): Promise<string> {
  const safe = fileName.replace(/[^a-zA-Z0-9._-]/g, "_");
  const key = `paperwork/${Date.now()}-${safe}`;
  return uploadBufferToS3(buffer, key, mimeType);
}
