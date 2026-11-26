/**
 * Chuẩn hóa tên đơn vị tính về dạng canonical để so sánh và quy đổi chính xác.
 */
export type CanonicalUnit = 'g' | 'kg' | 'lang' | 'ml' | 'l' | string;

export function getCanonicalUnit(rawUnit?: string): CanonicalUnit {
  if (!rawUnit || typeof rawUnit !== 'string') return '';
  const u = rawUnit
    .toLowerCase()
    .trim()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/đ/g, 'd');

  if (['g', 'gam', 'gram', 'gr', 'grams'].includes(u)) return 'g';
  if (['kg', 'kilo', 'kilogram', 'kilograms', 'ky', 'can'].includes(u)) return 'kg';
  if (['lang'].includes(u)) return 'lang';
  if (['ml', 'mililit', 'milliliter', 'milliliters', 'cc'].includes(u)) return 'ml';
  if (['l', 'lit', 'liter', 'liters'].includes(u)) return 'l';
  return u;
}

/**
 * Quy đổi số lượng từ đơn vị đầu vào (inputUnit) sang đơn vị gốc của kho (inventoryUnit).
 * Hỗ trợ:
 * - Quy đổi tường minh giữa g <-> kg <-> lạng, ml <-> l
 * - Phát hiện và sửa lỗi tự động khi AI/người dùng nhập 0.15 (kg) vào món có đơn vị gốc trong kho là 'g' (gam)
 *   hoặc ngược lại nhập 150 (g) vào món có đơn vị gốc trong kho là 'kg'.
 */
export function convertQtyToInventoryUnit(
  inputQty: number,
  inputUnit: string | undefined,
  inventoryUnit: string | undefined,
  referenceStockQty?: number
): number {
  const qty = Number(inputQty);
  if (isNaN(qty) || qty <= 0) return 0;

  const fromUnit = getCanonicalUnit(inputUnit);
  const toUnit = getCanonicalUnit(inventoryUnit);

  // 1. Nếu có cả 2 đơn vị và chúng khác nhau -> Quy đổi chính xác theo hệ số
  if (fromUnit && toUnit && fromUnit !== toUnit) {
    // Khối lượng: g, kg, lạng (1 kg = 1000 g, 1 lạng = 100 g)
    const massToGrams: Record<string, number> = {
      g: 1,
      lang: 100,
      kg: 1000,
    };
    if (massToGrams[fromUnit] && massToGrams[toUnit]) {
      const inGrams = qty * massToGrams[fromUnit];
      return Number((inGrams / massToGrams[toUnit]).toFixed(4));
    }

    // Thể tích: ml, l (1 l = 1000 ml)
    const volToMl: Record<string, number> = {
      ml: 1,
      l: 1000,
    };
    if (volToMl[fromUnit] && volToMl[toUnit]) {
      const inMl = qty * volToMl[fromUnit];
      return Number((inMl / volToMl[toUnit]).toFixed(4));
    }
  }

  // 2. Bảo vệ chống lỗi AI tự chia 1000 (đổi gam -> kg ngầm, vd: ăn 150g ức gà nhưng truyền qty = 0.15 vào kho đơn vị 'g')
  // Trong thực tế nấu ăn, không ai lấy < 1 gam (0.15g) thịt/cá/rau khi kho đang lưu đơn vị gam (vd 450g).
  if (toUnit === 'g' && qty > 0 && qty < 1) {
    const refStock = Number(referenceStockQty) || 0;
    if (refStock >= 5 || refStock === 0) {
      return Number((qty * 1000).toFixed(4));
    }
  }

  if (toUnit === 'ml' && qty > 0 && qty < 1) {
    const refStock = Number(referenceStockQty) || 0;
    if (refStock >= 5 || refStock === 0) {
      return Number((qty * 1000).toFixed(4));
    }
  }

  // 3. Bảo vệ ngược lại: Kho lưu đơn vị 'kg' (vd 0.45 kg hoặc 2 kg), nhưng đầu vào truyền số gam >= 10 (vd 150) mà quên ghi unit 'g'
  if (toUnit === 'kg' && (!fromUnit || fromUnit === 'kg') && qty >= 15) {
    const refStock = Number(referenceStockQty) || 0;
    if (refStock > 0 && qty > refStock && qty / 1000 <= refStock + 1e-6) {
      return Number((qty / 1000).toFixed(4));
    }
  }

  if (toUnit === 'l' && (!fromUnit || fromUnit === 'l') && qty >= 15) {
    const refStock = Number(referenceStockQty) || 0;
    if (refStock > 0 && qty > refStock && qty / 1000 <= refStock + 1e-6) {
      return Number((qty / 1000).toFixed(4));
    }
  }

  return Number(qty.toFixed(4));
}

/**
 * Bóc tách định lượng và đơn vị từ chuỗi nguyên liệu trong công thức
 * Ví dụ: "150g ức gà" -> { qty: 150, unit: "g", cleanName: "ức gà" }
 *        "0.15 kg thịt bò" -> { qty: 0.15, unit: "kg", cleanName: "thịt bò" }
 */
export function parseRecipeIngredientString(raw: string): {
  qty?: number;
  unit?: string;
  cleanName: string;
} {
  if (!raw || typeof raw !== 'string') {
    return { cleanName: '' };
  }
  const trimmed = raw.trim();
  // Match pattern: "150g ức gà", "0,15 kg ức gà", "2 quả trứng"
  const match = trimmed.match(/^(\d+(?:[.,]\d+)?)\s*(kg|kilo|gam|gram|gr|g|lạng|lang|ml|lít|lit|l|quả|trái|củ|gói|hộp|chai|lon|bát|chén|muỗng|thìa|miếng|lát|cây|bó|nhánh|tép)?\b\s*(.*)$/i);
  if (match) {
    const num = parseFloat(match[1].replace(',', '.'));
    const unit = match[2] ? match[2].trim() : undefined;
    const restName = (match[3] || '').replace(/^(của|món)\s+/i, '').trim();
    if (!isNaN(num) && num > 0 && restName) {
      return {
        qty: num,
        unit,
        cleanName: restName
      };
    }
  }
  return { cleanName: trimmed };
}

/**
 * Danh sách từ khóa nhận diện gia vị / chất nêm nếm.
 * Dùng để ngăn việc tự động map gia vị vào danh sách nguyên liệu trừ kho khi nấu ăn.
 */
export const COMMON_SPICE_KEYWORDS = [
  'mắm', 'muối', 'tiêu', 'đường', 'bột ngọt', 'mì chính', 'hạt nêm', 'knorr',
  'maggi', 'bột canh', 'dầu ăn', 'dầu hào', 'dầu mè', 'dầu oliu', 'nước tương',
  'xì dầu', 'tương ớt', 'tương cà', 'giấm', 'dấm', 'sa tế', 'ớt bột', 'bột nghệ',
  'bột cà ri', 'ngũ vị hương', 'bột quế', 'hoa hồi', 'thảo quả', 'sốt', 'mayonnaise'
];

export function isSpiceIngredient(name?: string): boolean {
  if (!name || typeof name !== 'string') return false;
  const n = name.toLowerCase().trim();
  return COMMON_SPICE_KEYWORDS.some(kw => n.includes(kw));
}
