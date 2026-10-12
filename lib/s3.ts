import { S3Client, DeleteObjectCommand, CopyObjectCommand } from '@aws-sdk/client-s3';

export const s3Client = new S3Client({
  region: process.env.AWS_REGION || 'ap-southeast-2',
  credentials: {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID || '',
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY || '',
  },
});

export const BUCKET_NAME = process.env.AWS_S3_BUCKET_NAME;

export async function deleteS3Object(key: string): Promise<boolean> {
  if (!BUCKET_NAME || !key) return false;
  try {
    await s3Client.send(
      new DeleteObjectCommand({
        Bucket: BUCKET_NAME,
        Key: key,
      })
    );
    return true;
  } catch (error) {
    console.error(`Error deleting object ${key} from S3:`, error);
    return false;
  }
}

export async function copyS3Object(sourceKey: string, destKey: string): Promise<boolean> {
  if (!BUCKET_NAME || !sourceKey || !destKey) return false;
  try {
    await s3Client.send(
      new CopyObjectCommand({
        Bucket: BUCKET_NAME,
        CopySource: `${BUCKET_NAME}/${sourceKey}`,
        Key: destKey,
      })
    );
    return true;
  } catch (error) {
    console.error(`Error copying object from ${sourceKey} to ${destKey} in S3:`, error);
    return false;
  }
}
