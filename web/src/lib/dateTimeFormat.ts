/**
 * Chuẩn hóa định dạng thời gian 24 giờ cho toàn bộ hệ thống (Việt Nam)
 * Loại bỏ hoàn toàn định dạng 12 giờ AM/PM ("SA", "CH").
 */

/**
 * Định dạng thời gian theo chuẩn 24h: HH:mm (VD: 07:00, 14:30)
 */
export function formatTime24h(date: Date | string | number | null | undefined): string {
  if (!date) return "";
  const d = date instanceof Date ? date : new Date(date);
  if (isNaN(d.getTime())) return "";
  const hours = String(d.getHours()).padStart(2, "0");
  const minutes = String(d.getMinutes()).padStart(2, "0");
  return `${hours}:${minutes}`;
}

/**
 * Định dạng ngày theo chuẩn Việt Nam: DD/MM/YYYY (VD: 02/11/2026)
 */
export function formatDateVN(date: Date | string | number | null | undefined): string {
  if (!date) return "";
  const d = date instanceof Date ? date : new Date(date);
  if (isNaN(d.getTime())) return "";
  const day = String(d.getDate()).padStart(2, "0");
  const month = String(d.getMonth() + 1).padStart(2, "0");
  const year = d.getFullYear();
  return `${day}/${month}/${year}`;
}

/**
 * Định dạng ngày giờ chuẩn 24h VN: HH:mm DD/MM/YYYY (VD: 14:30 02/11/2026)
 */
export function formatDateTime24h(
  date: Date | string | number | null | undefined,
  separator: string = " "
): string {
  if (!date) return "";
  const d = date instanceof Date ? date : new Date(date);
  if (isNaN(d.getTime())) return "";
  const time = formatTime24h(d);
  const day = formatDateVN(d);
  return `${time}${separator}${day}`;
}

/**
 * Sinh danh sách các khung giờ 24h theo bước nhảy phút (mặc định 15 phút, từ 06:00 đến 22:00)
 */
export function generate24hTimeOptions(
  min: string = "06:00",
  max: string = "22:00",
  stepMinutes: number = 15
): string[] {
  const [minH, minM] = (min || "06:00").split(":").map(Number);
  const [maxH, maxM] = (max || "22:00").split(":").map(Number);
  const startTotal = (isNaN(minH) ? 6 : minH) * 60 + (isNaN(minM) ? 0 : minM);
  const endTotal = (isNaN(maxH) ? 22 : maxH) * 60 + (isNaN(maxM) ? 0 : maxM);
  const step = Math.max(1, stepMinutes || 15);

  const result: string[] = [];
  for (let total = startTotal; total <= endTotal; total += step) {
    const h = Math.floor(total / 60);
    const m = total % 60;
    if (h > 23) break;
    result.push(`${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}`);
  }
  return result;
}

