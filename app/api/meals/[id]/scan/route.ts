import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import dbConnect from '@/lib/db';
import MealLog from '@/models/MealLog';
import { verifyToken } from '@/lib/auth';
import { GoogleGenerativeAI } from '@google/generative-ai';
import { S3Client, DeleteObjectCommand } from '@aws-sdk/client-s3';

const apiKey = process.env.GEMINI_API_KEY;

export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    await dbConnect();
    const cookieStore = await cookies();
    const token = cookieStore.get('auth_token')?.value;

    if (!token) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    const decoded = await verifyToken(token);
    if (!decoded) return NextResponse.json({ error: 'Invalid Token' }, { status: 401 });

    const resolvedParams = await params;
    const mealId = resolvedParams.id;

    const meal = await MealLog.findOne({ _id: mealId, user_id: decoded.userId });
    if (!meal) return NextResponse.json({ error: 'Meal not found' }, { status: 404 });

    if (!meal.image_url) {
      return NextResponse.json({ error: 'No image attached to this meal' }, { status: 400 });
    }

    if (!apiKey) {
      return NextResponse.json({ error: 'Thiếu cấu hình Gemini API' }, { status: 500 });
    }

    // 1. Fetch the image from S3 URL to get its base64 buffer for Gemini
    const imageRes = await fetch(meal.image_url);
    if (!imageRes.ok) {
      meal.ai_status = 'failed';
      await meal.save();
      return NextResponse.json({ error: 'Could not fetch image from S3' }, { status: 400 });
    }
    
    const arrayBuffer = await imageRes.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);
    const base64Data = buffer.toString('base64');
    const mimeType = imageRes.headers.get('content-type') || 'image/jpeg';

    // 2. Call Gemini API
    const genAI = new GoogleGenerativeAI(apiKey);
    const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });
    
    const prompt = `Bạn là một chuyên gia dinh dưỡng. Dưới đây là hình ảnh một bữa ăn có tên là "${meal.food_name}".
Hãy phân tích hình ảnh này và trả về kết quả định dạng JSON chuẩn với các trường sau:
{
  "calo": number,
  "protein": number, // tính bằng gram
  "fat": number, // tính bằng gram
  "carbs": number, // tính bằng gram
  "sugar": number, // tính bằng gram
  "description": string // Mô tả chi tiết nguyên liệu, thành phần món ăn và bắt buộc ƯỚC TÍNH ĐỊNH LƯỢNG cụ thể (vd: 200g cơm, 100g thịt, 1 bát canh...) dựa vào hình ảnh, khoảng 2-3 câu ngắn gọn.
}
Chỉ trả về JSON, không thêm bất kỳ văn bản nào khác. Ước lượng ở mức tương đối chính xác nhất.`;

    const result = await model.generateContent([
      prompt,
      {
        inlineData: {
          data: base64Data,
          mimeType
        }
      }
    ]);
    
    const response = await result.response;
    let text = response.text();
    text = text.replace(/```json/g, '').replace(/```/g, '').trim();
    
    let parsedData;
    try {
      parsedData = JSON.parse(text);
    } catch (e) {
      meal.ai_status = 'failed';
      await meal.save();
      return NextResponse.json({ error: 'AI không trả về đúng định dạng JSON' }, { status: 500 });
    }

    // 3. Delete the image from S3
    try {
      const bucketName = process.env.AWS_S3_BUCKET_NAME;
      const s3 = new S3Client({
        region: process.env.AWS_REGION!,
        credentials: {
          accessKeyId: process.env.AWS_ACCESS_KEY_ID!,
          secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY!,
        },
      });
      // Extract key from URL
      if (meal.image_url.includes('.amazonaws.com/')) {
        const oldKey = meal.image_url.split('.amazonaws.com/')[1];
        await s3.send(new DeleteObjectCommand({
          Bucket: bucketName,
          Key: oldKey,
        }));
      }
    } catch (err) {
      console.error("Lỗi khi xóa ảnh trên S3:", err);
      // We don't fail the request if S3 deletion fails (it will be cleaned up by lifecycle rule since it's in temp)
    }

    // 4. Update the DB with the AI analysis and clear image_url
    meal.calo = parsedData.calo || meal.calo;
    meal.protein = parsedData.protein || meal.protein;
    meal.fat = parsedData.fat || meal.fat;
    meal.carbs = parsedData.carbs || meal.carbs;
    meal.sugar = parsedData.sugar || meal.sugar;
    meal.ai_description = parsedData.description;
    meal.image_url = undefined; // clear image url since we deleted it
    meal.ai_status = 'completed';

    await meal.save();

    return NextResponse.json({ message: 'AI quét thành công!', mealLog: meal });

  } catch (error) {
    console.error("Meal scan error:", error);
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
}
