import { api } from "./api";
import { recordViolation, type ViolationRecordItem, fetchViolationTypes } from "./violations";

export interface SessionReminderItem {
  id: string;
  sessionId: number;
  userId: number;
  userName?: string;
  userFullName: string;
  userCardCode?: string | null;
  roomId: number;
  roomCode: string;
  roomName: string;
  reason: string;
  note?: string;
  remindedAt: string;
  remindedByStaff: string;
  warningLevel: number; // 1, 2, 3, 4 (>= 4 = quá 3 lần -> đã chuyển thành biên bản)
  escalatedToViolation?: boolean;
  violationCode?: string;
}

export const REMINDER_PRESETS = [
  "Gây ồn ào, làm mất trật tự ảnh hưởng xung quanh",
  "Mang đồ ăn, thức uống có mùi vào phòng trái quy định",
  "Không giữ vệ sinh, xả rác bừa bãi trong phòng",
  "Sử dụng sai mục đích / sai số lượng người đã đăng ký",
  "Sử dụng thiết bị, đèn chiếu, điều hòa sai quy định",
  "Quá giờ mượn quy định nhưng chưa chuẩn bị bàn giao phòng",
  "Không mang theo thẻ sinh viên / thẻ bạn đọc HUIT",
] as const;

export const MAX_REMINDERS_BEFORE_VIOLATION = 3;

const REMINDERS_STORAGE_KEY = "huit_session_reminders_v1";

/**
 * Tải toàn bộ danh sách lịch sử nhắc nhở
 */
export function getAllReminders(): SessionReminderItem[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(REMINDERS_STORAGE_KEY);
    if (!raw) return [];
    return JSON.parse(raw);
  } catch (err) {
    console.warn("Failed to load reminders from localStorage:", err);
    return [];
  }
}

/**
 * Lưu toàn bộ danh sách lịch sử nhắc nhở
 */
export function saveAllReminders(list: SessionReminderItem[]): void {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(REMINDERS_STORAGE_KEY, JSON.stringify(list));
  } catch (err) {
    console.warn("Failed to save reminders to localStorage:", err);
  }
}

/**
 * Lấy danh sách nhắc nhở của một phiên sử dụng
 */
export function getRemindersForSession(sessionId: number): SessionReminderItem[] {
  const all = getAllReminders();
  return all.filter((r) => r.sessionId === sessionId);
}

/**
 * Lấy danh sách nhắc nhở của một người dùng
 */
export function getRemindersForUser(userId: number): SessionReminderItem[] {
  const all = getAllReminders();
  return all.filter((r) => r.userId === userId);
}

export interface AddReminderParams {
  sessionId: number;
  userId: number;
  userName?: string;
  userFullName: string;
  userCardCode?: string | null;
  roomId: number;
  roomCode: string;
  roomName: string;
  reason: string;
  note?: string;
  remindedByStaff: string;
}

export interface AddReminderResult {
  reminder: SessionReminderItem;
  isEscalated: boolean;
  violationRecord?: ViolationRecordItem;
  warningLevel: number;
}

/**
 * Ghi nhận một lần nhắc nhở.
 * NẾU QUÁ 3 LẦN (lần thứ 4 trở đi) -> TỰ ĐỘNG CHUYỂN THÀNH LẬP BIÊN BẢN VI PHẠM VÀ CẤM MƯỢN PHÒNG!
 */
export async function addReminder(params: AddReminderParams): Promise<AddReminderResult> {
  const all = getAllReminders();
  const sessionReminders = all.filter((r) => r.sessionId === params.sessionId);
  const currentCount = sessionReminders.length;
  const newCount = currentCount + 1;
  const nowIso = new Date().toISOString();

  let isEscalated = false;
  let violationRecord: ViolationRecordItem | undefined;

  if (newCount > MAX_REMINDERS_BEFORE_VIOLATION) {
    // QUÁ 3 LẦN: TỰ ĐỘNG LẬP BIÊN BẢN VI PHẠM CHÍNH THỨC
    isEscalated = true;

    let violationTypeId = 1;
    try {
      const types = await fetchViolationTypes();
      const found = types.find(
        (t) => t.code === "VT02" || t.code === "VT01" || t.severity >= 2
      ) || types[0];
      if (found) violationTypeId = found.id;
    } catch {
      // ignore
    }

    const previousReasons = sessionReminders
      .map((r, i) => `Lần ${i + 1}: ${r.reason}`)
      .join(" | ");

    const fullDesc = `[TÁI PHẠM NỘI QUY - VƯỢT QUÁ 3 LẦN NHẮC NHỞ] Phiên #${params.sessionId} tại phòng ${params.roomCode} (${params.roomName}). Lý do vi phạm lần ${newCount}: ${params.reason}. ${
      params.note ? `Ghi chú: ${params.note}. ` : ""
    }Lịch sử các lần nhắc trước: [${previousReasons}]. Cán bộ thực hiện: ${params.remindedByStaff}.`;

    try {
      violationRecord = await recordViolation({
        userId: params.userId,
        usageSessionId: params.sessionId,
        violationTypeId,
        incidentTime: nowIso,
        description: fullDesc,
        severity: 2, // Mức 2 (Vừa) theo quy chế HUIT
        penaltyApplied:
          "Lập biên bản vi phạm do tái phạm sau 3 lần nhắc nhở & Cấm mượn phòng 3 ngày",
        restrictDays: 3, // Cấm mượn 3 ngày
        status: "Chờ xử lý",
      });
    } catch (err) {
      console.error("Lỗi khi tự động lập biên bản vi phạm:", err);
    }

    // Gửi thông báo kỷ luật chính thức cho sinh viên
    try {
      await api.post("/api/Notifications", {
        userId: params.userId,
        title: `[BIÊN BẢN VI PHẠM KỶ LUẬT] Lập biên bản vi phạm do quá 3 lần nhắc nhở`,
        content: `Do bạn đã bị cán bộ trực ban nhắc nhở quá 3 lần tại phòng ${params.roomCode} (${params.roomName}) nhưng vẫn tái phạm nội quy (${params.reason}), hệ thống đã chính thức thiết lập Biên bản vi phạm ${
          violationRecord?.code ? `#${violationRecord.code}` : ""
        } và ban hành lệnh cấm mượn phòng 3 ngày.`,
        type: 4, // Violation
      });
    } catch (err) {
      console.warn("Lỗi gửi notification kỷ luật:", err);
    }
  } else {
    // LẦN 1, 2, 3: Gửi thông báo nhắc nhở cảnh báo sinh viên
    try {
      await api.post("/api/Notifications", {
        userId: params.userId,
        title: `[CẢNH BÁO NHẮC NHỞ LẦN ${newCount}/3] Phòng ${params.roomCode}`,
        content: `Cán bộ trực ban (${params.remindedByStaff}) gửi lời nhắc nhở tại phòng ${params.roomCode} (${params.roomName}): "${params.reason}". ${
          params.note ? `Chi tiết: ${params.note}. ` : ""
        }Bạn đã bị nhắc nhở ${newCount}/3 lần. Lưu ý: Theo quy chế HUIT, nếu bị nhắc nhở quá 3 lần, hệ thống sẽ tự động lập biên bản vi phạm và cấm mượn phòng!`,
        type: 4, // Warning
      });
    } catch (err) {
      console.warn("Lỗi gửi notification nhắc nhở:", err);
    }
  }

  const reminder: SessionReminderItem = {
    id: `remind-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
    sessionId: params.sessionId,
    userId: params.userId,
    userName: params.userName,
    userFullName: params.userFullName,
    userCardCode: params.userCardCode,
    roomId: params.roomId,
    roomCode: params.roomCode,
    roomName: params.roomName,
    reason: params.reason,
    note: params.note,
    remindedAt: nowIso,
    remindedByStaff: params.remindedByStaff,
    warningLevel: newCount,
    escalatedToViolation: isEscalated,
    violationCode: violationRecord?.code,
  };

  all.unshift(reminder);
  saveAllReminders(all);

  return {
    reminder,
    isEscalated,
    violationRecord,
    warningLevel: newCount,
  };
}

/**
 * Xóa toàn bộ lịch sử nhắc nhở của phiên sử dụng
 */
export function clearRemindersForSession(sessionId: number): void {
  const all = getAllReminders();
  const filtered = all.filter((r) => r.sessionId !== sessionId);
  saveAllReminders(filtered);
}

