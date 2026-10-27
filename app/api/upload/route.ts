import { NextResponse } from "next/server";
import { PutObjectCommand } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import { s3Client, BUCKET_NAME } from "@/lib/s3";

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { filename, contentType, base64Data } = body;
    
    const resolvedContentType = contentType || "image/jpeg";
    // Create a safe, unique filename in the temp folder
    const safeFilename = (filename || "upload.jpg").replace(/[^a-zA-Z0-9.-]/g, "_");
    const uniqueFilename = `temp/${Date.now()}-${safeFilename}`;
    const publicUrl = `https://${BUCKET_NAME}.s3.${process.env.AWS_REGION}.amazonaws.com/${uniqueFilename}`;

    // Server-side direct upload fallback (avoids browser S3 CORS issues)
    if (base64Data) {
      if (!BUCKET_NAME) {
        return NextResponse.json({ publicUrl: base64Data });
      }
      try {
        const base64Clean = base64Data.replace(/^data:[^;]+;base64,/, "");
        const buffer = Buffer.from(base64Clean, "base64");
        await s3Client.send(
          new PutObjectCommand({
            Bucket: BUCKET_NAME,
            Key: uniqueFilename,
            Body: buffer,
            ContentType: resolvedContentType,
          })
        );
        return NextResponse.json({ publicUrl });
      } catch (s3Error) {
        console.error("Server S3 upload fallback failed, using inline data URI:", s3Error);
        return NextResponse.json({ publicUrl: base64Data });
      }
    }

    const command = new PutObjectCommand({
      Bucket: BUCKET_NAME,
      Key: uniqueFilename,
      ContentType: resolvedContentType,
    });

    // Create a Presigned URL valid for 300 seconds
    const presignedUrl = await getSignedUrl(s3Client, command, { expiresIn: 300 });

    return NextResponse.json({ presignedUrl, publicUrl, contentType: resolvedContentType });
  } catch (error) {
    console.error("Error creating upload URL:", error);
    return NextResponse.json({ error: "Lỗi tạo URL upload" }, { status: 500 });
  }
}
