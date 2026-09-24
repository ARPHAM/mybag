import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import dbConnect from '@/lib/db';
import MealLog from '@/models/MealLog';
import { verifyToken } from '@/lib/auth';
import { generateContentWithFallback } from '@/lib/ai';

export async function POST(req: Request) {
  try {
    await dbConnect();
    const cookieStore = await cookies();
    const token = cookieStore.get('auth_token')?.value;

    if (!token) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const decoded = await verifyToken(token);
    if (!decoded) {
      return NextResponse.json({ error: 'Invalid Token' }, { status: 401 });
    }

    const body = await req.json();
    let { mealId, food_name, ingredients_context, image_data } = body;

    if (!mealId || !food_name) {
      return NextResponse.json({ error: 'Thiếu mealId hoặc food_name' }, { status: 400 });
    }

    const meal = await MealLog.findOne({ _id: mealId, user_id: decoded.userId });
    if (!meal) {
      return NextResponse.json({ error: 'Không tìm thấy MealLog' }, { status: 404 });
    }

    let promptContext = `Tên món ăn: ${food_name}`;
    if (ingredients_context) {
      promptContext += `\nNguyên liệu sử dụng thực tế: ${ingredients_context}`;
    }

    if (!image_data && meal.image_url) {
      try {
        const imageRes = await fetch(meal.image_url);
        if (imageRes.ok) {
          const arrayBuffer = await imageRes.arrayBuffer();
          const buffer = Buffer.from(arrayBuffer);
          const mimeType = imageRes.headers.get('content-type') || 'image/jpeg';
          image_data = `data:${mimeType};base64,${buffer.toString('base64')}`;
        }
      } catch (err) {
        console.error("Error fetching S3 image for AI:", err);
      }
    }

    const prompt = `Bạn là một chuyên gia dinh dưỡng.
Hãy ước tính lượng Calories, Protein (g), Fat (g), Carbs (g), Sugar (g) cho bữa ăn sau.
Nếu có danh sách nguyên liệu và định lượng thực tế, hãy ưu tiên tính dựa trên định lượng đó. Nếu không, hãy ước lượng dựa trên một khẩu phần ăn tiêu chuẩn bình thường.
Nếu có hình ảnh cung cấp kèm theo, hãy dùng hình ảnh để đánh giá khẩu phần, kích cỡ và thành phần để tính toán lượng calo chính xác nhất có thể.
${promptContext}

Trả về kết quả dưới dạng JSON theo đúng định dạng sau (chỉ trả về JSON, không có text nào khác):
{
  "calo": number,
  "protein": number,
  "fat": number,
  "carbs": number,
  "sugar": number,
  "description": string // Mô tả chi tiết nguyên liệu, thành phần món ăn và bắt buộc ƯỚC TÍNH ĐỊNH LƯỢNG cụ thể (vd: 200g cơm, 100g thịt, 1 bát canh...) dựa vào hình ảnh hoặc dữ liệu, khoảng 2-3 câu ngắn gọn.
}`;

    let result;
    try {
      const text = await generateContentWithFallback(prompt, image_data, true);
      result = JSON.parse(text);
    } catch (aiError) {
      console.error("AI Generation Error:", aiError);
      meal.ai_status = 'failed';
      await meal.save();
      return NextResponse.json({ error: 'AI Error, all models failed', status: 'failed', mealLog: meal }, { status: 500 });
    }

    meal.calo = result.calo || 0;
    meal.protein = result.protein || 0;
    meal.fat = result.fat || 0;
    meal.carbs = result.carbs || 0;
    meal.sugar = result.sugar || 0;
    meal.ai_description = result.description || '';

    // Delete image from S3 if present
    if (meal.image_url && meal.image_url.includes('.amazonaws.com/')) {
      try {
        const { S3Client, DeleteObjectCommand } = require("@aws-sdk/client-s3");
        const bucketName = process.env.AWS_S3_BUCKET_NAME;
        const s3 = new S3Client({
          region: process.env.AWS_REGION!,
          credentials: {
            accessKeyId: process.env.AWS_ACCESS_KEY_ID!,
            secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY!,
          },
        });
        const oldKey = meal.image_url.split('.amazonaws.com/')[1];
        await s3.send(new DeleteObjectCommand({
          Bucket: bucketName,
          Key: oldKey,
        }));
      } catch (err) {
        console.error("Error deleting image from S3:", err);
      }
    }
    meal.image_url = undefined;

    
    // Tính HP thực tế dựa trên Calo (Tỉ lệ mới: 1 Calo = 1 HP)
    // Giúp người dùng dù ăn kiêng (VD 1200 Calo/ngày) vẫn đủ sống sót bù trừ lượng máu tụt 1200 HP/ngày
    const trueHp = Math.floor(meal.calo * 1.0);
    // Tính phần chênh lệch (Delta) so với lượng HP đã tạm ứng ngẫu nhiên lúc tạo bữa ăn
    const hpDelta = trueHp - meal.hp_restored;
    
    meal.hp_restored = trueHp;
    meal.ai_status = 'completed';
    await meal.save();

    // Hoàn trả / Khấu trừ HP chênh lệch cho User
    const User = (await import('@/models/User')).default;
    const user = await User.findById(meal.user_id);
    if (user) {
      user.current_hp = Math.min(user.max_hp, Math.max(0, user.current_hp + hpDelta));
      await user.save();
    }

    return NextResponse.json({ message: 'Đã tính toán xong', mealLog: meal }, { status: 200 });

  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: 'Server Error' }, { status: 500 });
  }
}
