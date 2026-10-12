import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import dbConnect from '@/lib/db';
import MealLog from '@/models/MealLog';
import { verifyToken } from '@/lib/auth';
import { generateContentWithFallback } from '@/lib/ai';
import { deleteS3Object } from '@/lib/s3';

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
    const imageDataUri = `data:${mimeType};base64,${base64Data}`;

    // 2. Call Gemini API via shared helper
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

    let parsedData;
    try {
      const text = await generateContentWithFallback(prompt, imageDataUri, true);
      parsedData = JSON.parse(text);
    } catch (aiError) {
      console.error("AI Generation Error in meal scan:", aiError);
      meal.ai_status = 'failed';
      await meal.save();
      return NextResponse.json({ error: 'AI không thể phân tích hoặc lỗi định dạng JSON' }, { status: 500 });
    }

    // 3. Delete the image from S3
    if (meal.image_url && meal.image_url.includes('.amazonaws.com/')) {
      try {
        const oldKey = meal.image_url.split('.amazonaws.com/')[1];
        await deleteS3Object(oldKey);
      } catch (err) {
        console.error("Lỗi khi xóa ảnh trên S3:", err);
      }
    }

    // 4. Update the DB with the AI analysis and clear image_url
    meal.calo = parsedData.calo || meal.calo;
    meal.protein = parsedData.protein || meal.protein;
    meal.fat = parsedData.fat || meal.fat;
    meal.carbs = parsedData.carbs || meal.carbs;
    meal.sugar = parsedData.sugar || meal.sugar;
    meal.ai_description = parsedData.description;
    meal.image_url = undefined; // clear image url since we deleted it
    // Cập nhật HP thực tế dựa trên Calo (1 Calo = 1 HP)
    const trueHp = Math.floor((meal.calo || 0) * 1.0);
    const hpDelta = trueHp - meal.hp_restored;
    meal.hp_restored = trueHp;
    meal.ai_status = 'completed';

    await meal.save();

    const User = (await import('@/models/User')).default;
    const user = await User.findById(meal.user_id);
    if (user) {
      user.current_hp = Math.min(user.max_hp, Math.max(0, user.current_hp + hpDelta));
      await user.save();
    }

    return NextResponse.json({ message: 'AI quét thành công!', mealLog: meal });

  } catch (error) {
    console.error("Meal scan error:", error);
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
}
