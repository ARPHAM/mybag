import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import dbConnect from '@/lib/db';
import MealLog from '@/models/MealLog';
import { verifyToken } from '@/lib/auth';
import { generateContentWithFallback } from '@/lib/ai';
import { deleteS3Object } from '@/lib/s3';

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
      if (meal.image_url.startsWith('data:')) {
        image_data = meal.image_url;
      } else {
        try {
          const imageRes = await fetch(meal.image_url);
          if (imageRes.ok) {
            const arrayBuffer = await imageRes.arrayBuffer();
            const buffer = Buffer.from(arrayBuffer);
            const rawMime = imageRes.headers.get('content-type') || 'image/jpeg';
            const mimeType = rawMime.startsWith('image/') ? rawMime : 'image/jpeg';
            image_data = `data:${mimeType};base64,${buffer.toString('base64')}`;
          }
        } catch (err) {
          console.error("Error fetching S3 image for AI:", err);
        }
      }
    }

    const prompt = `Bạn là một chuyên gia dinh dưỡng.
Hãy ước tính lượng Calories, Protein (g), Fat (g), Carbs (g), Sugar (g) cho bữa ăn sau.
Nếu có danh sách nguyên liệu và định lượng thực tế, hãy ưu tiên tính dựa trên định lượng đó. Nếu không, hãy ước lượng dựa trên một khẩu phần ăn tiêu chuẩn bình thường.
Nếu có hình ảnh cung cấp kèm theo, hãy dùng hình ảnh để nhận diện tên món ăn (nếu chưa có tên cụ thể), đánh giá khẩu phần, kích cỡ và thành phần để tính toán lượng calo chính xác nhất có thể.
${promptContext}

Trả về kết quả dưới dạng JSON theo đúng định dạng sau (chỉ trả về JSON, không có text nào khác):
{
  "food_name": string, // Tên món ăn nhận diện được từ ảnh hoặc chuẩn hóa lại ngắn gọn (VD: "Phở bò tái chín", "Cơm tấm sườn bì")
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
      const failedMeal = await MealLog.findOneAndUpdate(
        { _id: mealId, user_id: decoded.userId },
        { $set: { ai_status: 'failed' } },
        { returnDocument: 'after' }
      );
      return NextResponse.json({ error: 'AI Error, all models failed', status: 'failed', mealLog: failedMeal }, { status: 500 });
    }

    // Re-fetch bản ghi mới nhất để tránh ghi đè nếu người dùng vừa chỉnh sửa ngày/nguyên liệu trong lúc chờ AI
    const latestMeal = await MealLog.findOne({ _id: mealId, user_id: decoded.userId });
    if (!latestMeal) {
      return NextResponse.json({ error: 'MealLog đã bị xóa' }, { status: 404 });
    }

    const updateSet: Record<string, any> = {};

    if (result.food_name && (!latestMeal.food_name || latestMeal.food_name.includes('AI đang nhận diện') || latestMeal.food_name === 'Bữa ăn từ ảnh')) {
      updateSet.food_name = result.food_name;
      if (latestMeal.transaction_id) {
        try {
          const Transaction = (await import('@/models/Transaction')).default;
          await Transaction.findByIdAndUpdate(latestMeal.transaction_id, {
            description: `[Ăn ngoài] ${result.food_name}`
          });
        } catch (txErr) {
          console.error("Error updating transaction description with AI food name:", txErr);
        }
      }
    }

    const calo = Number(result.calo) || 0;
    updateSet.calo = calo;
    updateSet.protein = Number(result.protein) || 0;
    updateSet.fat = Number(result.fat) || 0;
    updateSet.carbs = Number(result.carbs) || 0;
    updateSet.sugar = Number(result.sugar) || 0;
    updateSet.ai_description = result.description || '';

    // Delete image from S3 if present
    if (latestMeal.image_url && latestMeal.image_url.includes('.amazonaws.com/')) {
      try {
        const oldKey = latestMeal.image_url.split('.amazonaws.com/')[1];
        await deleteS3Object(oldKey);
      } catch (err) {
        console.error("Error deleting image from S3:", err);
      }
    }

    // Tính HP thực tế dựa trên Calo (Tỉ lệ mới: 1 Calo = 1 HP)
    const trueHp = Math.floor(calo * 1.0);
    const hpDelta = trueHp - (latestMeal.hp_restored || 0);
    updateSet.hp_restored = trueHp;
    updateSet.ai_status = 'completed';

    const updatedMeal = await MealLog.findOneAndUpdate(
      { _id: mealId, user_id: decoded.userId },
      {
        $set: updateSet,
        $unset: { image_url: 1 }
      },
      { returnDocument: 'after' }
    );

    // Hoàn trả / Khấu trừ HP chênh lệch cho User
    const User = (await import('@/models/User')).default;
    const user = await User.findById(latestMeal.user_id);
    if (user) {
      user.current_hp = Math.min(user.max_hp, Math.max(0, user.current_hp + hpDelta));
      await user.save();
    }

    return NextResponse.json({ message: 'Đã tính toán xong', mealLog: updatedMeal }, { status: 200 });

  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: 'Server Error' }, { status: 500 });
  }
}
