import fs from 'fs';
import path from 'path';

const SIM_CLOCK_FILE = path.resolve(process.cwd(), '.sim-clock.json');

/**
 * Trả về thời gian hiện tại cho nghiệp vụ ứng dụng.
 * - Ở môi trường Production hoặc khi không bật ENABLE_SIM_CLOCK=1: LUÔN trả về `new Date()` thực.
 * - Khi bật ENABLE_SIM_CLOCK=1 (chỉ dùng cho mô phỏng/kiểm thử vòng xoay):
 *   1) Ưu tiên đọc header `x-sim-now` từ Request để nhiều user sống song song tại các mốc giờ ảo độc lập.
 *   2) Nếu không có header (ví dụ mở bằng trình duyệt thật), đọc file `.sim-clock.json`.
 * Lưu ý: KHÔNG can thiệp global `Date` để bảo toàn tuyệt đối TLS MongoDB và hạn JWT.
 */
export function getRequestNow(req?: Request | null): Date {
  if (process.env.NODE_ENV === 'production' || process.env.ENABLE_SIM_CLOCK !== '1') {
    return new Date();
  }

  try {
    const headerVal = req?.headers?.get('x-sim-now');
    if (headerVal) {
      const parsed = new Date(headerVal);
      if (!isNaN(parsed.getTime())) return parsed;
    }
  } catch {
    // ignore header parse error
  }

  try {
    if (fs.existsSync(SIM_CLOCK_FILE)) {
      const raw = JSON.parse(fs.readFileSync(SIM_CLOCK_FILE, 'utf8'));
      if (raw?.now) {
        const parsed = new Date(raw.now);
        if (!isNaN(parsed.getTime())) return parsed;
      }
    }
  } catch {
    // ignore file parse error
  }

  return new Date();
}
