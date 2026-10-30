import { GoogleGenerativeAI } from '@google/generative-ai';

// Danh sách các model Flash hoạt động ổn định và phản hồi siêu nhanh (~1 giây)
const DEFAULT_FALLBACK_MODELS = [
  'gemini-2.5-flash',
  'gemini-flash-lite-latest',
  'gemini-3.5-flash-lite',
  'gemini-3.1-flash-lite',
  'gemini-3-flash-preview',
  'gemini-3.5-flash',
  'gemini-3.6-flash'
];

// Danh sách các từ khóa model KHÔNG dùng cho tác vụ sinh text/JSON thông thường
const EXCLUDED_MODEL_KEYWORDS = [
  'tts',
  'transcribe',
  'image',
  'robotics',
  'computer-use',
  'banana',
  'customtools',
  'lyria',
  'antigravity',
  'deep-research',
  'aqa',
  'embedding',
  // Các model Pro thường xuyên vượt hạn mức quota (429) ở tài khoản tiêu chuẩn
  'pro'
];

// Các model hiện đang bị Google quá tải cao điểm hoặc gặp lỗi mạng kéo dài
const OVERLOADED_OR_UNSTABLE_MODELS = [
  'gemini-3.8-flash',
  'gemini-3.7-flash',
  'gemini-flash-latest'
];

// Bộ nhớ đệm danh sách model động lấy từ Google
let activeModelsCache: string[] = [...DEFAULT_FALLBACK_MODELS];
let lastFetchTime: number = 0;
const CACHE_TTL_MS = 60 * 60 * 1000; // 1 giờ

// Theo dõi tạm thời các model vừa bị lỗi quá tải để tránh thử lại liên tục
const temporarilyDisabledModels = new Map<string, number>();
const DISABLE_DURATION_MS = 3 * 60 * 1000; // 3 phút

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
    'invalid model',
    'no longer available'
  ];

  const isNotFound = notFoundKeywords.some(keyword => msg.includes(keyword));

  // Loại trừ các trường hợp quá tải, hết quota, rate limit
  if (isNotFound && !msg.includes('resource_exhausted') && !msg.includes('429') && !msg.includes('quota')) {
    return true;
  }

  return false;
}

/**
 * Kiểm tra xem lỗi có phải do quá tải, cao điểm, rate-limit, 503, timeout hay server bận không
 */
function isOverloadedOrTransientError(err: any): boolean {
  if (!err) return false;
  const msg = (err.message || String(err)).toLowerCase();
  const status = err.status || err.response?.status || err.code;

  if (status === 429 || status === 503 || status === 500 || status === 504) return true;

  const overloadKeywords = [
    'resource_exhausted',
    '429',
    'quota',
    'rate limit',
    'overloaded',
    'high demand',
    'unavailable',
    '503',
    'internal server error',
    'service unavailable',
    'abort',
    'aborted',
    'timeout',
    'fetch failed',
    'econnreset',
    'etimedout'
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
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 6000);
    const res = await fetch(url, {
      headers: { 'Content-Type': 'application/json' },
      signal: controller.signal
    });
    clearTimeout(timeoutId);

    if (!res.ok) {
      console.warn(`[Gemini AI] Google API ListModels returned HTTP ${res.status}`);
      return activeModelsCache.length > 0 ? activeModelsCache : DEFAULT_FALLBACK_MODELS;
    }

    const data = await res.json();
    if (!data.models || !Array.isArray(data.models)) {
      return activeModelsCache.length > 0 ? activeModelsCache : DEFAULT_FALLBACK_MODELS;
    }

    // Lọc các model hợp lệ hỗ trợ generateContent, loại trừ các model chuyên dụng (audio/tts/image/pro)
    const validModels = data.models.filter((m: any) => {
      const name = (m.name || '').toLowerCase().replace(/^models\//, '');
      const methods: string[] = m.supportedGenerationMethods || [];
      if (!methods.includes('generateContent')) return false;

      // Loại trừ các model không phù hợp
      for (const excluded of EXCLUDED_MODEL_KEYWORDS) {
        if (name.includes(excluded)) return false;
      }

      return true;
    });

    const modelNames = validModels.map((m: any) => m.name.replace(/^models\//, ''));

    // Sắp xếp ưu tiên:
    // 1. Các model đã được kiểm chứng hoạt động tốt (DEFAULT_FALLBACK_MODELS) lên trước
    // 2. Đẩy các model thường quá tải (gemini-3.8-flash, 3.7-flash) xuống cuối danh sách
    const orderedModels: string[] = [];

    for (const defModel of DEFAULT_FALLBACK_MODELS) {
      if (modelNames.includes(defModel)) {
        orderedModels.push(defModel);
      }
    }

    for (const name of modelNames) {
      if (!orderedModels.includes(name) && !OVERLOADED_OR_UNSTABLE_MODELS.includes(name)) {
        orderedModels.push(name);
      }
    }

    // Cuối cùng mới thêm các model không ổn định làm phương án dự phòng chót
    for (const unstable of OVERLOADED_OR_UNSTABLE_MODELS) {
      if (modelNames.includes(unstable) && !orderedModels.includes(unstable)) {
        orderedModels.push(unstable);
      }
    }

    if (orderedModels.length > 0) {
      activeModelsCache = orderedModels;
      lastFetchTime = now;
      console.log(`[Gemini AI] Cập nhật thành công ${orderedModels.length} model khả dụng từ Google API:`, orderedModels);
      return orderedModels;
    }
  } catch (err) {
    console.warn('[Gemini AI] Lỗi/hết thời gian khi lấy danh sách model từ Google:', err);
  }

  return activeModelsCache.length > 0 ? activeModelsCache : DEFAULT_FALLBACK_MODELS;
}

export async function generateContentWithFallback(
  prompt: string,
  imageData?: string,
  isJson: boolean = false,
  timeoutMs: number = 9000
): Promise<string> {
  const apiKey = process.env.GOOGLE_GENERATIVE_AI_API_KEY || process.env.GEMINI_API_KEY;
  if (!apiKey) {
    throw new Error('Missing AI API Key');
  }

  const genAI = new GoogleGenerativeAI(apiKey);
  const now = Date.now();

  // Dọn dẹp danh sách tạm khóa quá 3 phút
  for (const [mName, expireAt] of temporarilyDisabledModels.entries()) {
    if (now > expireAt) {
      temporarilyDisabledModels.delete(mName);
    }
  }

  // Lấy danh sách model khả dụng, lọc bỏ các model đang bị tạm khóa (nếu còn model khác)
  let candidateList = activeModelsCache && activeModelsCache.length > 0
    ? [...activeModelsCache]
    : [...DEFAULT_FALLBACK_MODELS];

  const activeCandidates = candidateList.filter(m => !temporarilyDisabledModels.has(m));
  let modelsToTry = activeCandidates.length > 0 ? activeCandidates : candidateList;

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
    const callStart = Date.now();

    try {
      // Đặt timeout giới hạn chặt chẽ (mặc định 9s) để không bao giờ bị đứng hình chờ đợi
      const model = genAI.getGenerativeModel(
        { model: modelName },
        { timeout: timeoutMs }
      );

      const response = await model.generateContent(parts);
      text = response.response.text();
      aiSuccess = true;

      // [TỐI ƯU HÓA TỐC ĐỘ]: Khi model này thành công siêu nhanh, đẩy nó lên vị trí số 1 trong Cache
      // để các yêu cầu tiếp theo dùng ngay lập tức, không tốn thời gian thử vòng lại!
      if (activeModelsCache.length > 0 && activeModelsCache[0] !== modelName) {
        activeModelsCache = [modelName, ...activeModelsCache.filter(m => m !== modelName)];
      }

      break; // Thành công -> thoát vòng lặp
    } catch (aiError: any) {
      const elapsed = Date.now() - callStart;

      // 1. TRƯỜNG HỢP MODEL BỊ KHAI TỬ / 404 / KHÔNG CÒN KHẢ DỤNG
      if (isModelUnavailableError(aiError)) {
        console.warn(`[Gemini AI] Model '${modelName}' không còn khả dụng hoặc đã bị khai tử (${elapsed}ms). Xóa khỏi danh sách.`);

        // Xóa vĩnh viễn model chết khỏi bộ nhớ đệm
        activeModelsCache = activeModelsCache.filter(m => m !== modelName);

        // Gọi Google API lấy danh sách mới nếu chưa cập nhật
        if (!refreshedModelsOnce) {
          refreshedModelsOnce = true;
          const liveModels = await fetchLiveGeminiModels(apiKey, true);
          const newModels = liveModels.filter(m => m !== modelName && !modelsToTry.includes(m));
          if (newModels.length > 0) {
            modelsToTry.push(...newModels);
          }
        }
      }
      // 2. TRƯỜNG HỢP QUÁ TẢI CAO ĐIỂM / RATE LIMIT / 429 / 503 / TIMEOUT / FETCH FAILED
      else if (isOverloadedOrTransientError(aiError)) {
        console.warn(`[Gemini AI] Model '${modelName}' bận/quá tải/timeout sau ${elapsed}ms. Tạm chuyển model kế tiếp...`);

        // Đánh dấu tạm khóa model này trong 3 phút để các request sau không bị nghẽn
        temporarilyDisabledModels.set(modelName, Date.now() + DISABLE_DURATION_MS);

        // Đẩy model bị lỗi xuống cuối danh sách cache
        activeModelsCache = [...activeModelsCache.filter(m => m !== modelName), modelName];
      }
      // 3. CÁC LỖI KHÁC
      else {
        console.error(`[Gemini AI] Model '${modelName}' gặp lỗi sau ${elapsed}ms:`, aiError?.message || aiError);
        // Đẩy xuống cuối danh sách
        activeModelsCache = [...activeModelsCache.filter(m => m !== modelName), modelName];
      }
    }
  }

  if (!aiSuccess) {
    throw new Error('AI Error: Toàn bộ model dự phòng đều không phản hồi');
  }

  if (isJson) {
    text = text.replace(/```json/gi, '').replace(/```/g, '').trim();
  }

  return text;
}
