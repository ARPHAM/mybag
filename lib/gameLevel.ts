// lib/gameLevel.ts
// Hệ thống cấp độ & thăng tiến EXP chuẩn SAO Game Mechanics

export const MAX_LEVEL = 10;

/**
 * Bảng điểm EXP cần để lên cấp tiếp theo.
 * Càng về sau càng cần cực nhiều điểm để thăng cấp.
 * - Lv1 -> Lv2: 500 EXP
 * - Lv2 -> Lv3: 1,000 EXP
 * - Lv3 -> Lv4: 2,000 EXP
 * - Lv4 -> Lv5: 3,500 EXP
 * - Lv5 -> Lv6: 6,000 EXP
 * - Lv6 -> Lv7: 10,000 EXP
 * - Lv7 -> Lv8: 16,000 EXP
 * - Lv8 -> Lv9: 25,000 EXP
 * - Lv9 -> Lv10: 40,000 EXP
 */
export const LEVEL_EXP_TABLE: Record<number, number> = {
  1: 500,
  2: 1000,
  3: 2000,
  4: 3500,
  5: 6000,
  6: 10000,
  7: 16000,
  8: 25000,
  9: 40000,
};

/**
 * Lấy số điểm EXP cần để đạt cấp độ kế tiếp
 */
export function getExpForNextLevel(level: number): number {
  if (level >= MAX_LEVEL) return LEVEL_EXP_TABLE[9];
  return LEVEL_EXP_TABLE[level] || (level * 2500);
}

/**
 * Tính toán thăng cấp tự động khi nhận EXP
 */
export function calculateLevelProgression(currentExp: number, currentLevel: number) {
  let level = Math.max(1, currentLevel);
  let exp = Math.max(0, currentExp);
  let leveledUp = false;

  while (level < MAX_LEVEL && exp >= getExpForNextLevel(level)) {
    exp -= getExpForNextLevel(level);
    level += 1;
    leveledUp = true;
  }

  if (level >= MAX_LEVEL) {
    level = MAX_LEVEL;
  }

  return { level, currentExp: exp, leveledUp };
}
