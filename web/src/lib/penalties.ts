export interface PenaltyItem {
  id: string;
  code: string;
  name: string;
  category: string;
  severity: number;
  defaultRestrictDays: number;
  description?: string;
  isCustom?: boolean;
  createdAt: string;
}

export const DEFAULT_PENALTIES: PenaltyItem[] = [
  {
    id: "HP01",
    code: "HP01",
    name: "Nhắc nhở / Cảnh cáo lần đầu",
    category: "Mức 1 - Nhẹ",
    severity: 1,
    defaultRestrictDays: 0,
    description: "Nhắc nhở trực tiếp và lập biên bản ghi nhận vi phạm nhẹ lần 1",
    createdAt: "2026-10-01T00:00:00Z",
  },
  {
    id: "HP02",
    code: "HP02",
    name: "Yêu cầu giữ trật tự / Nhắc nhở",
    category: "Mức 1 - Nhẹ",
    severity: 1,
    defaultRestrictDays: 0,
    description: "Yêu cầu điều chỉnh âm lượng, giữ gìn không gian yên tĩnh chung",
    createdAt: "2026-10-01T00:00:00Z",
  },
  {
    id: "HP03",
    code: "HP03",
    name: "Cảnh cáo & Vệ sinh lại phòng",
    category: "Mức 2 - Vừa",
    severity: 2,
    defaultRestrictDays: 0,
    description: "Yêu cầu thu dọn toàn bộ rác, vệ sinh lại bàn ghế, thiết bị trước khi bàn giao",
    createdAt: "2026-10-01T00:00:00Z",
  },
  {
    id: "HP04",
    code: "HP04",
    name: "Cảnh cáo & Cấm mượn phòng 3 ngày",
    category: "Mức 2 - Vừa",
    severity: 2,
    defaultRestrictDays: 3,
    description: "Tạm khóa quyền đăng ký mượn phòng trên hệ thống trong 3 ngày",
    createdAt: "2026-10-01T00:00:00Z",
  },
  {
    id: "HP05",
    code: "HP05",
    name: "Cấm mượn phòng 7 ngày",
    category: "Mức 2 - Vừa",
    severity: 2,
    defaultRestrictDays: 7,
    description: "Khóa quyền mượn phòng 1 tuần do tái phạm vi phạm mức vừa",
    createdAt: "2026-10-01T00:00:00Z",
  },
  {
    id: "HP06",
    code: "HP06",
    name: "Cấm mượn phòng 14 ngày & Bồi thường chi phí sửa chữa",
    category: "Mức 3 - Nghiêm trọng",
    severity: 3,
    defaultRestrictDays: 14,
    description: "Khóa quyền 14 ngày và bồi thường thiệt hại theo biên bản thẩm định tài sản",
    createdAt: "2026-10-01T00:00:00Z",
  },
  {
    id: "HP07",
    code: "HP07",
    name: "Bồi thường chi phí sửa chữa / vệ sinh thiết bị",
    category: "Mức 3 - Nghiêm trọng",
    severity: 3,
    defaultRestrictDays: 0,
    description: "Đền bù hoặc chi trả chi phí phục hồi hư hại thiết bị, tài sản thư viện",
    createdAt: "2026-10-01T00:00:00Z",
  },
  {
    id: "HP08",
    code: "HP08",
    name: "Cấm mượn phòng 14 ngày",
    category: "Mức 3 - Nghiêm trọng",
    severity: 3,
    defaultRestrictDays: 14,
    description: "Khóa quyền mượn phòng trong 14 ngày",
    createdAt: "2026-10-01T00:00:00Z",
  },
  {
    id: "HP09",
    code: "HP09",
    name: "Cấm mượn phòng 30 ngày & Trừ điểm rèn luyện",
    category: "Mức 4 - Rất nghiêm trọng",
    severity: 4,
    defaultRestrictDays: 30,
    description: "Đình chỉ mượn phòng 1 tháng và gửi báo cáo trừ điểm rèn luyện sinh viên",
    createdAt: "2026-10-01T00:00:00Z",
  },
  {
    id: "HP10",
    code: "HP10",
    name: "Cấm mượn phòng vô thời hạn & Chuyển HĐ Kỷ luật nhà trường",
    category: "Mức 4 - Rất nghiêm trọng",
    severity: 4,
    defaultRestrictDays: 365,
    description: "Khóa vĩnh viễn quyền sử dụng phòng tự học và chuyển hồ sơ lên Hội đồng kỷ luật",
    createdAt: "2026-10-01T00:00:00Z",
  },
  {
    id: "HP11",
    code: "HP11",
    name: "Tạm đình chỉ quyền mượn phòng toàn trường",
    category: "Mức 4 - Rất nghiêm trọng",
    severity: 4,
    defaultRestrictDays: 90,
    description: "Khóa quyền đặt phòng toàn bộ các cơ sở thư viện trong học kỳ hiện tại",
    createdAt: "2026-10-01T00:00:00Z",
  },
];

const PENALTIES_STORAGE_KEY = "huit_violation_penalties_v1";

export function getCategoryBySeverity(severity: number): string {
  switch (severity) {
    case 1:
      return "Mức 1 - Nhẹ";
    case 2:
      return "Mức 2 - Vừa";
    case 3:
      return "Mức 3 - Nghiêm trọng";
    case 4:
      return "Mức 4 - Rất nghiêm trọng";
    default:
      return "Mức 1 - Nhẹ";
  }
}

/**
 * Tải toàn bộ danh mục hình phạt
 */
export function getAllPenalties(): PenaltyItem[] {
  if (typeof window === "undefined") return DEFAULT_PENALTIES;
  try {
    const raw = localStorage.getItem(PENALTIES_STORAGE_KEY);
    if (raw === null || raw === undefined) {
      localStorage.setItem(PENALTIES_STORAGE_KEY, JSON.stringify(DEFAULT_PENALTIES));
      return DEFAULT_PENALTIES;
    }
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) {
      localStorage.setItem(PENALTIES_STORAGE_KEY, JSON.stringify(DEFAULT_PENALTIES));
      return DEFAULT_PENALTIES;
    }
    return parsed;
  } catch (err) {
    console.warn("Failed to load penalties from localStorage:", err);
    return DEFAULT_PENALTIES;
  }
}

/**
 * Lưu danh mục hình phạt vào localStorage
 */
export function saveAllPenalties(list: PenaltyItem[]): void {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(PENALTIES_STORAGE_KEY, JSON.stringify(list));
  } catch (err) {
    console.warn("Failed to save penalties to localStorage:", err);
  }
}

/**
 * Thêm hình phạt mới
 */
export function createPenalty(data: {
  code?: string;
  name: string;
  severity: number;
  defaultRestrictDays: number;
  description?: string;
}): PenaltyItem {
  const current = getAllPenalties();
  const nextNum = current.length + 1;
  const code = (data.code || `HP${String(nextNum).padStart(2, "0")}`).toUpperCase().trim();
  const newPenalty: PenaltyItem = {
    id: `pen_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
    code,
    name: data.name.trim(),
    category: getCategoryBySeverity(data.severity),
    severity: data.severity,
    defaultRestrictDays: Math.max(0, data.defaultRestrictDays || 0),
    description: data.description?.trim(),
    isCustom: true,
    createdAt: new Date().toISOString(),
  };

  const updated = [newPenalty, ...current];
  saveAllPenalties(updated);
  return newPenalty;
}

/**
 * Cập nhật hình phạt
 */
export function updatePenalty(
  id: string,
  data: Partial<Omit<PenaltyItem, "id" | "createdAt">>
): PenaltyItem | null {
  const current = getAllPenalties();
  const index = current.findIndex((p) => p.id === id || p.code === id);
  if (index === -1) return null;

  const existing = current[index];
  const severity = data.severity ?? existing.severity;
  const updatedItem: PenaltyItem = {
    ...existing,
    ...data,
    category: getCategoryBySeverity(severity),
    severity,
    defaultRestrictDays:
      data.defaultRestrictDays !== undefined
        ? Math.max(0, data.defaultRestrictDays)
        : existing.defaultRestrictDays,
  };

  current[index] = updatedItem;
  saveAllPenalties(current);
  return updatedItem;
}

/**
 * Xóa hình phạt
 */
export function deletePenalty(id: string): boolean {
  const current = getAllPenalties();
  const filtered = current.filter((p) => p.id !== id && p.code !== id);
  if (filtered.length === current.length) return false;

  saveAllPenalties(filtered);
  return true;
}

/**
 * Khôi phục về danh mục hình phạt mặc định chuẩn
 */
export function resetToDefaultPenalties(): PenaltyItem[] {
  saveAllPenalties(DEFAULT_PENALTIES);
  return DEFAULT_PENALTIES;
}

