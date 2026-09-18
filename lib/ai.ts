import { GoogleGenerativeAI } from '@google/generative-ai';

export async function generateContentWithFallback(prompt: string, imageData?: string, isJson: boolean = false): Promise<string> {
  const apiKey = process.env.GOOGLE_GENERATIVE_AI_API_KEY;
  if (!apiKey) {
    throw new Error('Missing AI API Key');
  }

  const genAI = new GoogleGenerativeAI(apiKey);
  const availableModels = [
    'gemini-3.5-flash', 
    'gemini-3.6-flash', 
    'gemini-3.7-flash', 
    'gemini-3.8-flash', 
    'gemini-3.5-flash-lite'
  ];

  const parts: any[] = [{ text: prompt }];
  
  if (imageData) {
    const mimeType = imageData.split(';')[0].split(':')[1];
    const base64Data = imageData.split(',')[1];
    parts.push({
      inlineData: {
        data: base64Data,
        mimeType
      }
    });
  }

  let aiSuccess = false;
  let text = '';

  for (const modelName of availableModels) {
    try {
      const model = genAI.getGenerativeModel({ model: modelName });
      const response = await model.generateContent(parts);
      text = response.response.text();
      aiSuccess = true;
      break; // Thoát vòng lặp khi thành công
    } catch (aiError) {
      console.error(`AI Generation Error with model ${modelName}:`, aiError);
      // Tiếp tục với model tiếp theo trong mảng
    }
  }

  if (!aiSuccess) {
    throw new Error('AI Error, all models failed');
  }

  if (isJson) {
    // Loại bỏ markdown block cho JSON nếu có
    text = text.replace(/```json/gi, '').replace(/```/g, '').trim();
  }

  return text;
}
