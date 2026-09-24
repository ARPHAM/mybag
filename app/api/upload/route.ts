import { NextResponse } from "next/server";
import { S3Client, PutObjectCommand } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";

const s3 = new S3Client({
  region: process.env.AWS_REGION!,
  credentials: {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID!,
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY!,
  },
});

export async function POST(request: Request) {
  try {
    const { filename, contentType } = await request.json();
    
    // Create a safe, unique filename in the temp folder
    const safeFilename = filename.replace(/[^a-zA-Z0-9.-]/g, "_");
    const uniqueFilename = `temp/${Date.now()}-${safeFilename}`;

    const command = new PutObjectCommand({
      Bucket: process.env.AWS_S3_BUCKET_NAME,
      Key: uniqueFilename,
      ContentType: contentType,
    });

    // Create a Presigned URL valid for 60 seconds
    const presignedUrl = await getSignedUrl(s3, command, { expiresIn: 60 });
    
    // The public URL to access the image after it's uploaded
    const publicUrl = `https://${process.env.AWS_S3_BUCKET_NAME}.s3.${process.env.AWS_REGION}.amazonaws.com/${uniqueFilename}`;

    return NextResponse.json({ presignedUrl, publicUrl });
  } catch (error) {
    console.error("Error creating upload URL:", error);
    return NextResponse.json({ error: "Lỗi tạo URL upload" }, { status: 500 });
  }
}
