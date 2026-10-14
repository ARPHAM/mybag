import { GoogleGenerativeAI } from '@google/generative-ai';

// Danh sách dự phòng ban đầu (chỉ dùng các model thực tế, tránh các model hư cấu gây lỗi 404)
const DEFAULT_FALLBACK_MODELS = [
  'gemini-2.5-flash',
  'gemini-2.0-flash',
  'gemini-1.5-flash',
  'gemini-1.5-pro',
  'gemini-2.5-pro',
  'gemini-2.0-pro-exp-02-05'
];

// Bộ nhớ đệm danh sách model động lấy từ Google
let activeModelsCache: string[] | null = null;
let lastFetchTime: number = 0;
const CACHE_TTL_MS = 60 * 60 * 1000; // 1 giờ

/**
 * Kiểm tra xem lỗi có phải do model không còn khả dụng (bị Google khai tử / 404 / unsupported) hay không
 */
function isModelUnavailableError(err: any): boolean {
  if (!err) return false;
  const msg = (err.message || String(err)).toLowerCase();
  const status = err.status || err.response?.status || err.code;

  if (status === 404) return true;

  const notFoundKeywords = [
    'not found',
    'not_found',
    '404',
    'is not supported',
    'unsupported model',
    'deprecated',
    'sunset',
    'unknown model',
    'invalid model'
  ];

  const isNotFound = notFoundKeywords.some(keyword => msg.includes(keyword));

  // Loại trừ các trường hợp quá tải, hết quota, rate limit
  if (isNotFound && !msg.includes('resource_exhausted') && !msg.includes('429') && !msg.includes('quota')) {
    return true;
  }

  return false;
}

/**
 * Kiểm tra xem lỗi có phải do quá tải, cao điểm, rate-limit hay server bận không
 */
function isOverloadedError(err: any): boolean {
  if (!err) return false;
  const msg = (err.message || String(err)).toLowerCase();
  const status = err.status || err.response?.status || err.code;

  if (status === 429 || status === 503 || status === 500) return true;

  const overloadKeywords = [
    'resource_exhausted',
    '429',
    'quota',
    'rate limit',
    'overloaded',
    'high demand',
    'unavailable',
    '503',
    'internal server error'
  ];

  return overloadKeywords.some(keyword => msg.includes(keyword));
}

/**
 * Gọi API Google để lấy danh sách model thực tế còn khả dụng
 */
export async function fetchLiveGeminiModels(apiKey: string, force: boolean = false): Promise<string[]> {
  const now = Date.now();
  if (!force && activeModelsCache && activeModelsCache.length > 0 && now - lastFetchTime < CACHE_TTL_MS) {
    return activeModelsCache;
  }

  try {
    const url = `https://generativelanguage.googleapis.com/v1beta/models?key=${apiKey}`;
    const res = await fetch(url, { headers: { 'Content-Type': 'application/json' } });

    if (!res.ok) {
      console.warn(`[Gemini AI] Google API ListModels returned HTTP ${res.status}`);
      return activeModelsCache || DEFAULT_FALLBACK_MODELS;
    }

    const data = await res.json();
    if (!data.models || !Array.isArray(data.models)) {
      return activeModelsCache || DEFAULT_FALLBACK_MODELS;
    }

    // Lọc các model hợp lệ hỗ trợ generateContent
    const validModels = data.models.filter((m: any) => {
      const name = (m.name || '').toLowerCase();
      const methods: string[] = m.supportedGenerationMethods || [];
      return (
        name.includes('gemini') &&
        methods.includes('generateContent') &&
        !name.includes('embedding') &&
        !name.includes('aqa') &&
        !name.includes('imagen')
      );
    });

    // Sắp xếp ưu tiên:
    // 1. Model Flash trước (nhanh, nhẹ, rate limit cao), sau đó đến Pro
    // 2. Phiên bản cao hơn lên trước (2.5 > 2.0 > 1.5)
    validModels.sort((a: any, b: any) => {
      const nameA = a.name.toLowerCase();
      const nameB = b.name.toLowerCase();

      const isFlashA = nameA.includes('flash');
      const isFlashB = nameB.includes('flash');
      if (isFlashA && !isFlashB) return -1;
      if (!isFlashA && isFlashB) return 1;

      const extractVer = (n: string) => {
        const match = n.match(/gemini-(\d+(?:\.\d+)?)/);
        return match ? parseFloat(match[1]) : 0;
      };
      const verA = extractVer(nameA);
      const verB = extractVer(nameB);
      if (verB !== verA) return verB - verA;

      return nameA.localeCompare(nameB);
    });

    const modelNames = validModels.map((m: any) => m.name.replace(/^models\//, ''));

    if (modelNames.length > 0) {
      activeModelsCache = modelNames;
      lastFetchTime = now;
      console.log(`[Gemini AI] Cập nhật thành công ${modelNames.length} model khả dụng từ Google API:`, modelNames);
      return modelNames;
    }
  } catch (err) {
    console.error('[Gemini AI] Lỗi khi gọi Google API để lấy danh sách model:', err);
  }

  return activeModelsCache || DEFAULT_FALLBACK_MODELS;
}

export async function generateContentWithFallback(
  prompt: string,
  imageData?: string,
  isJson: boolean = false
): Promise<string> {
  const apiKey = process.env.GOOGLE_GENERATIVE_AI_API_KEY || process.env.GEMINI_API_KEY;
  if (!apiKey) {
    throw new Error('Missing AI API Key');
  }

  const genAI = new GoogleGenerativeAI(apiKey);

  // Lấy danh sách model hiện có (từ cache hoặc danh sách mặc định)
  let modelsToTry = activeModelsCache && activeModelsCache.length > 0
    ? [...activeModelsCache]
    : [...DEFAULT_FALLBACK_MODELS];

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
  let refreshedModelsOnce = false;

  for (let i = 0; i < modelsToTry.length; i++) {
    const modelName = modelsToTry[i];
    try {
      const model = genAI.getGenerativeModel({ model: modelName });
      const response = await model.generateContent(parts);
      text = response.response.text();
      aiSuccess = true;
      break; // Thành công -> thoát vòng lặp
    } catch (aiError: any) {
      // 1. TRƯỜNG HỢP MODEL BỊ KHAI TỬ / 404 / KHÔNG CÒN KHẢ DỤNG
      if (isModelUnavailableError(aiError)) {
        console.warn(`[Gemini AI] Model '${modelName}' không còn khả dụng hoặc đã bị khai tử (404/Unsupported).`);

        // Xóa ngay model chết khỏi bộ nhớ đệm
        if (activeModelsCache) {
          activeModelsCache = activeModelsCache.filter(m => m !== modelName);
        }

        // Gọi Google API lấy danh sách mới nếu chưa cập nhật trong lượt gọi này
        if (!refreshedModelsOnce) {
          refreshedModelsOnce = true;
          console.log(`[Gemini AI] Đang gọi Google API để tải danh sách các model mới nhất...`);
          const liveModels = await fetchLiveGeminiModels(apiKey, true);

          // Bổ sung các model mới khám phá vào danh sách chờ thử
          const newModels = liveModels.filter(m => m !== modelName && !modelsToTry.includes(m));
          if (newModels.length > 0) {
            modelsToTry.push(...newModels);
            console.log(`[Gemini AI] Đã thêm ${newModels.length} model mới từ Google vào hàng đợi fallback:`, newModels);
          }
        }
      }
      // 2. TRƯỜNG HỢP QUÁ TẢI CAO ĐIỂM / RATE LIMIT / 429 / 503
      else if (isOverloadedError(aiError)) {
        console.warn(`[Gemini AI] Model '${modelName}' đang bận/quá tải cao điểm (429/503). Chuyển sang model dự phòng kế tiếp...`);
        // Theo yêu cầu: nếu chỉ bị quá tải/cao điểm thì KHÔNG cần gọi lại Google API, chỉ chuyển model kế tiếp!
      }
      // 3. CÁC LỖI KHÁC
      else {
        console.error(`[Gemini AI] Model '${modelName}' gặp lỗi:`, aiError?.message || aiError);
      }
    }
  }

  if (!aiSuccess) {
    throw new Error('AI Error, all models failed');
  }

  if (isJson) {
    text = text.replace(/```json/gi, '').replace(/```/g, '').trim();
  }

  return text;
}
