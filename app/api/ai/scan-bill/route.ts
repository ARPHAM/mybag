import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { verifyToken } from '@/lib/auth';
import { GoogleGenerativeAI } from '@google/generative-ai';

export async function POST(req: Request) {
  try {
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
    const { image_data } = body;

    if (!image_data) {
      return NextResponse.json({ error: 'Missing image_data' }, { status: 400 });
    }

    const apiKey = process.env.GOOGLE_GENERATIVE_AI_API_KEY;
    if (!apiKey) {
      return NextResponse.json({ error: 'Missing AI API Key' }, { status: 500 });
    }

    const genAI = new GoogleGenerativeAI(apiKey);
    const model = genAI.getGenerativeModel({ model: 'gemini-3.5-flash' });

    const prompt = `Bạn là một trợ lý tài chính và quản lý kho thông minh.
Hãy bóc tách hóa đơn mua sắm trong hình ảnh. Trả về kết quả là một mảng các món đồ đã mua.
Đối với mỗi món đồ, hãy xác định các thông tin sau:
- "name": Tên món đồ (string).
- "quantity": Số lượng (number).
- "unit": Đơn vị tính (VD: "kg", "gói", "hộp", "lít", "cái"...). Nếu không có, hãy tự suy luận đơn vị hợp lý (string).
- "price": TỔNG GIÁ TIỀN của món đó (tức là Đơn giá x Số lượng) tính theo VND (number). Không có chữ "VND" hay dấu phẩy.
- "category": CHỈ được phép chọn MỘT trong các giá trị sau:
   - "food": Dành cho thực phẩm, thịt cá, rau củ quả, đồ ăn vặt, nguyên liệu nấu ăn, nước uống.
   - "spices": Dành cho gia vị (mắm, muối, mì chính, dầu ăn).
   - "utilities": Dành cho đồ dùng gia đình, thiết bị, bột giặt, nước rửa chén...
   - "housing": Các chi phí liên quan tới nhà cửa, điện nước (nếu có trên bill).
   - "health": Thuốc men, y tế.
   - "other": Các mục khác không thuộc các nhóm trên.

Trả về DUY NHẤT một mảng JSON các object theo đúng cấu trúc sau (không có văn bản nào khác):
[
  {
    "name": "...",
    "quantity": ...,
    "unit": "...",
    "price": ...,
    "category": "..."
  }
]`;

    let result;
    try {
      const parts: any[] = [{ text: prompt }];
      
      // image_data có định dạng: "data:image/jpeg;base64,/9j/4AAQSk..."
      const mimeType = image_data.split(';')[0].split(':')[1];
      const base64Data = image_data.split(',')[1];
      parts.push({
        inlineData: {
          data: base64Data,
          mimeType
        }
      });

      const response = await model.generateContent(parts);
      let text = response.response.text();
      // Loại bỏ markdown nếu có
      text = text.replace(/```json/g, '').replace(/```/g, '').trim();
      result = JSON.parse(text);
    } catch (aiError) {
      console.error("AI Generation Error:", aiError);
      return NextResponse.json({ error: 'AI Error hoặc AI không nhận diện được hóa đơn.' }, { status: 500 });
    }

    return NextResponse.json({ items: result }, { status: 200 });

  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: 'Server Error' }, { status: 500 });
  }
}
