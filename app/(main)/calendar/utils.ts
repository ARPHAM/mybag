/**
 * Chuyển đổi Date hoặc chuỗi ngày thành key YYYY-MM-DD theo giờ địa phương của trình duyệt.
 * Đảm bảo so sánh ngày luôn khớp chính xác tuyệt đối giữa các bộ lọc ngày, tuần, tháng.
 */
export function getLocalDateKey(d: Date | string | null | undefined): string {
  if (!d) return '';
  const date = new Date(d);
  if (isNaN(date.getTime())) return '';
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

/**
 * Kiểm tra 2 ngày có cùng ngày/tháng/năm theo giờ địa phương không
 */
export function isSameLocalDate(d1: Date | string, d2: Date | string): boolean {
  return getLocalDateKey(d1) === getLocalDateKey(d2);
}
