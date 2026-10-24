import { api } from "./api";

export interface Period {
  id: number;
  name: string;
  startTime: string; // e.g. "06:30:00"
  endTime: string;   // e.g. "07:20:00"
}

export interface RoomItem {
  id: number;
  name: string;
  roomCode: string;
  building?: string;
  floor?: string;
  roomNumber?: string;
  capacity: number;
  status: string;
  description?: string;
  roomTypeId: number;
  roomTypeName?: string;
  isBookingByPeriod: boolean;
}

export interface RoomScheduleItem {
  bookingDetailId: number;
  bookingId: number;
  activityName: string;
  purpose: string;
  startAt: string;
  endAt: string;
  startPeriodId?: number | null;
  startPeriodName?: string | null;
  endPeriodId?: number | null;
  endPeriodName?: string | null;
  guestCount: number;
  status: string;
  bookedByName?: string;
}

export interface RoomScheduleData {
  roomId: number;
  roomName: string;
  roomCode: string;
  roomStatus: string;
  isBookingByPeriod: boolean;
  queryDate: string;
  schedules: RoomScheduleItem[];
}

export interface PeriodSlot {
  period: Period;
  isBooked: boolean;
  booking?: RoomScheduleItem;
}

export interface HourlySlot {
  hour: number;
  timeLabel: string;
  isBooked: boolean;
  booking?: RoomScheduleItem;
}

/**
 * Format ngày thành chuỗi YYYY-MM-DD
 */
export function toISODateString(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

/**
 * Format ngày hiển thị tiếng Việt (VD: Thứ Tư, 15/10/2026)
 */
export function formatVietnameseDate(isoDate: string): string {
  const [y, m, d] = isoDate.split("-").map(Number);
  const date = new Date(y, m - 1, d);
  const days = [
    "Chủ Nhật",
    "Thứ Hai",
    "Thứ Ba",
    "Thứ Tư",
    "Thứ Năm",
    "Thứ Sáu",
    "Thứ Bảy",
  ];
  const dayName = days[date.getDay()];
  const dd = String(d).padStart(2, "0");
  const mm = String(m).padStart(2, "0");
  return `${dayName}, ${dd}/${mm}/${y}`;
}

/**
 * Parse TimeSpan string ("07:30:00" hoặc "07:30") thành số phút từ 0h00
 */
export function timeStringToMinutes(timeStr: string): number {
  if (!timeStr) return 0;
  const parts = timeStr.split(":").map(Number);
  const h = parts[0] || 0;
  const m = parts[1] || 0;
  return h * 60 + m;
}

/**
 * Parse ISO DateTime string thành số phút trong ngày (theo giờ local/UTC+7)
 */
export function extractMinutesFromIso(isoString: string): number {
  const d = new Date(isoString);
  return d.getHours() * 60 + d.getMinutes();
}

/**
 * Ghép các tiết học với danh sách lịch đặt phòng để tạo bảng thời khóa biểu 15 tiết
 */
export function buildPeriodSlots(
  periods: Period[],
  schedules: RoomScheduleItem[]
): PeriodSlot[] {
  const activeSchedules = schedules.filter(
    (s) => s.status !== "Từ chối" && s.status !== "Đã hủy"
  );

  return periods.map((period) => {
    const periodStartMin = timeStringToMinutes(period.startTime);
    const periodEndMin = timeStringToMinutes(period.endTime);

    const matchedBooking = activeSchedules.find((item) => {
      // 1. Khớp theo ID tiết nếu có
      if (item.startPeriodId && item.endPeriodId) {
        return (
          period.id >= item.startPeriodId && period.id <= item.endPeriodId
        );
      }
      // 2. Hoặc so khớp theo thời gian thực tế
      const startMin = extractMinutesFromIso(item.startAt);
      const endMin = extractMinutesFromIso(item.endAt);
      return Math.max(periodStartMin, startMin) < Math.min(periodEndMin, endMin);
    });

    return {
      period,
      isBooked: Boolean(matchedBooking),
      booking: matchedBooking,
    };
  });
}

/**
 * Tạo các khung giờ (07:00 - 21:00) cho phòng đặt theo giờ tự do
 */
export function buildHourlySlots(
  schedules: RoomScheduleItem[],
  startHour = 7,
  endHour = 21
): HourlySlot[] {
  const activeSchedules = schedules.filter(
    (s) => s.status !== "Từ chối" && s.status !== "Đã hủy"
  );

  const slots: HourlySlot[] = [];
  for (let h = startHour; h < endHour; h++) {
    const slotStartMin = h * 60;
    const slotEndMin = (h + 1) * 60;

    const matchedBooking = activeSchedules.find((item) => {
      const startMin = extractMinutesFromIso(item.startAt);
      const endMin = extractMinutesFromIso(item.endAt);
      return Math.max(slotStartMin, startMin) < Math.min(slotEndMin, endMin);
    });

    slots.push({
      hour: h,
      timeLabel: `${String(h).padStart(2, "0")}:00 - ${String(h + 1).padStart(
        2,
        "0"
      )}:00`,
      isBooked: Boolean(matchedBooking),
      booking: matchedBooking,
    });
  }

  return slots;
}

/**
 * Trả về class màu sắc và nhãn trạng thái đặt phòng
 */
export function getScheduleStatusBadge(status?: string): {
  label: string;
  cssClass: string;
} {
  const s = (status ?? "").trim().toLowerCase();
  if (s === "chờ duyệt" || s === "pending") {
    return { label: "Chờ duyệt", cssClass: "badge-pending" };
  }
  if (s === "đã duyệt" || s === "approved") {
    return { label: "Đã duyệt", cssClass: "badge-approved" };
  }
  if (s === "duyệt một phần") {
    return { label: "Duyệt một phần", cssClass: "badge-partial" };
  }
  if (s === "từ chối" || s === "rejected") {
    return { label: "Từ chối", cssClass: "badge-rejected" };
  }
  if (s === "đã hủy" || s === "cancelled") {
    return { label: "Đã hủy", cssClass: "badge-cancelled" };
  }
  return { label: status || "Không rõ", cssClass: "badge-default" };
}

export async function fetchPeriodsApi(): Promise<Period[]> {
  const res = await api.get("/api/Bookings/periods");
  const data = res.data?.data ?? res.data;
  return Array.isArray(data) ? (data as Period[]) : [];
}

export async function fetchAllRoomsApi(): Promise<RoomItem[]> {
  const res = await api.get("/api/Rooms");
  const data = res.data?.data ?? res.data;
  return Array.isArray(data) ? (data as RoomItem[]) : [];
}

export async function fetchRoomScheduleApi(
  roomId: number,
  dateStr: string
): Promise<RoomScheduleData | null> {
  const res = await api.get(
    `/api/Bookings/rooms/${roomId}/schedule?date=${encodeURIComponent(dateStr)}`
  );
  return (res.data?.data ?? res.data) as RoomScheduleData;
}

// ── TIMELINE MATRIX GANTT HELPERS ─────────────────────────────────────────

export const MATRIX_TIMELINE_START_MIN = 450; // 07:30
export const MATRIX_TIMELINE_END_MIN = 1170;  // 19:30
export const MATRIX_TIMELINE_DURATION_MIN = 720; // 12h = 720 phút

export const MATRIX_TIME_COLUMNS = [
  "07:30",
  "08:30",
  "09:30",
  "10:30",
  "11:30",
  "12:30",
  "13:30",
  "14:30",
  "15:30",
  "16:30",
  "17:30",
  "18:30 - 19:30",
];

export type TimelineSegmentType =
  | "booked"
  | "in-use"
  | "conference"
  | "free"
  | "full-free"
  | "past";

export interface TimelineSegment {
  id: string;
  type: TimelineSegmentType;
  startMinutes: number;
  endMinutes: number;
  startTimeStr: string;
  endTimeStr: string;
  leftPercent: number;
  widthPercent: number;
  title?: string;
  subtitle?: string;
  badgeText?: string;
  actionText?: string;
  booking?: RoomScheduleItem;
}

/**
 * Phân tích chuỗi ISO DateTime hoặc Time thành số phút trong ngày theo giờ Việt Nam (UTC+7)
 */
export function parseVietnamTimeMinutes(timeOrIso: string): number {
  if (!timeOrIso) return 0;
  if (/^\d{1,2}:\d{2}(:\d{2})?$/.test(timeOrIso)) {
    return timeStringToMinutes(timeOrIso);
  }
  if (timeOrIso.includes("T")) {
    if (
      timeOrIso.endsWith("Z") ||
      timeOrIso.includes("+") ||
      timeOrIso.includes("-", 10)
    ) {
      const d = new Date(timeOrIso);
      if (isNaN(d.getTime())) return 0;
      // Cộng 7 tiếng để ra giờ Việt Nam (UTC+7)
      const vnDate = new Date(d.getTime() + 7 * 60 * 60 * 1000);
      return vnDate.getUTCHours() * 60 + vnDate.getUTCMinutes();
    } else {
      const timePart = timeOrIso.split("T")[1];
      return timeStringToMinutes(timePart);
    }
  }
  return 0;
}

/**
 * Chuyển số phút từ 0h00 thành chuỗi HH:mm
 */
export function minutesToTimeString(minutes: number): string {
  const clamped = Math.max(0, Math.min(1439, Math.round(minutes)));
  const h = Math.floor(clamped / 60);
  const m = clamped % 60;
  return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}`;
}

/**
 * Tính phần trăm toạ độ (left và width) trên trục timeline 07:30 - 19:30
 */
export function calculateTimelinePosition(
  startMin: number,
  endMin: number,
  dayStartMin = MATRIX_TIMELINE_START_MIN,
  totalDurationMin = MATRIX_TIMELINE_DURATION_MIN
): { leftPercent: number; widthPercent: number } {
  const clampedStart = Math.max(dayStartMin, Math.min(dayStartMin + totalDurationMin, startMin));
  const clampedEnd = Math.max(clampedStart, Math.min(dayStartMin + totalDurationMin, endMin));

  const leftPercent = ((clampedStart - dayStartMin) / totalDurationMin) * 100;
  const rightPercent = ((clampedEnd - dayStartMin) / totalDurationMin) * 100;
  const widthPercent = Math.max(0, rightPercent - leftPercent);

  return {
    leftPercent: Number(leftPercent.toFixed(3)),
    widthPercent: Number(widthPercent.toFixed(3)),
  };
}

/**
 * Tính vị trí vạch đỏ hiển thị giờ hiện tại
 */
export function calculateCurrentTimeIndicator(
  currentMinutes: number,
  dayStartMin = MATRIX_TIMELINE_START_MIN,
  totalDurationMin = MATRIX_TIMELINE_DURATION_MIN
): { leftPercent: number; isVisible: boolean; timeLabel: string } {
  const isVisible =
    currentMinutes >= dayStartMin && currentMinutes <= dayStartMin + totalDurationMin;
  const pos = calculateTimelinePosition(currentMinutes, currentMinutes, dayStartMin, totalDurationMin);
  return {
    leftPercent: pos.leftPercent,
    isVisible,
    timeLabel: minutesToTimeString(currentMinutes),
  };
}

/**
 * Xây dựng các khối thời gian (đã đặt, trống, cả ngày trống...) cho 1 phòng
 */
export function buildRoomTimelineSegments(
  room: RoomItem,
  schedules: RoomScheduleItem[] = [],
  currentMinutes = 585 // Mặc định 09:45 như mockup
): TimelineSegment[] {
  const activeSchedules = schedules
    .filter((s) => s.status !== "Từ chối" && s.status !== "Đã hủy")
    .map((s) => {
      const startMin = parseVietnamTimeMinutes(s.startAt);
      const endMin = parseVietnamTimeMinutes(s.endAt);
      return {
        schedule: s,
        startMin,
        endMin,
      };
    })
    .sort((a, b) => a.startMin - b.endMin);

  // Trường hợp 1: Phòng trống cả ngày (như Phòng A103)
  if (activeSchedules.length === 0) {
    const pos = calculateTimelinePosition(
      MATRIX_TIMELINE_START_MIN,
      MATRIX_TIMELINE_END_MIN
    );
    return [
      {
        id: `full-free-${room.id}`,
        type: "full-free",
        startMinutes: MATRIX_TIMELINE_START_MIN,
        endMinutes: MATRIX_TIMELINE_END_MIN,
        startTimeStr: "07:30",
        endTimeStr: "19:30",
        leftPercent: pos.leftPercent,
        widthPercent: pos.widthPercent,
        title: "Phòng sẵn sàng tiếp nhận đặt chỗ cả ngày (07:30 - 19:30)",
        subtitle:
          "Không có lịch trùng • Nhấp để đăng ký khung giờ tiêu chuẩn 14:00 - 16:00",
        actionText: "ĐĂNG KÝ NGAY",
      },
    ];
  }

  const segments: TimelineSegment[] = [];

  // Khoảng trống trước ca đầu tiên (từ 07:30 đến ca 1)
  const first = activeSchedules[0];
  if (first.startMin > MATRIX_TIMELINE_START_MIN) {
    const gapStart = MATRIX_TIMELINE_START_MIN;
    const gapEnd = first.startMin;
    const pos = calculateTimelinePosition(gapStart, gapEnd);

    // Nếu ca trống nằm hoàn toàn trước thời gian hiện tại
    const isPast = gapEnd <= currentMinutes;
    const startStr = minutesToTimeString(gapStart);
    const endStr = minutesToTimeString(gapEnd);

    segments.push({
      id: `pre-gap-${room.id}`,
      type: isPast ? "past" : "free",
      startMinutes: gapStart,
      endMinutes: gapEnd,
      startTimeStr: startStr,
      endTimeStr: endStr,
      leftPercent: pos.leftPercent,
      widthPercent: pos.widthPercent,
      title: isPast
        ? `Đã qua (${startStr} - ${endStr})`
        : `+ Trống: ${startStr} - ${endStr}`,
    });
  }

  // Duyệt qua từng ca đặt
  for (let i = 0; i < activeSchedules.length; i++) {
    const item = activeSchedules[i];
    const s = item.schedule;
    const startStr = minutesToTimeString(item.startMin);
    const endStr = minutesToTimeString(item.endMin);
    const pos = calculateTimelinePosition(item.startMin, item.endMin);

    const isConference =
      room.capacity >= 50 ||
      room.roomCode === "B201" ||
      (room.roomTypeName && room.roomTypeName.includes("Hội trường"));

    const isInUse =
      s.status === "Đang sử dụng" ||
      (currentMinutes >= item.startMin && currentMinutes < item.endMin);

    let type: TimelineSegmentType = "booked";
    let badgeText = "ĐÃ ĐẶT";

    if (isInUse) {
      type = "in-use";
      badgeText = "ĐANG DIỄN RA";
    } else if (isConference) {
      type = "conference";
      const durationHours = Math.round((item.endMin - item.startMin) / 60);
      badgeText = `${durationHours > 0 ? durationHours : 3} GIỜ`;
    }

    segments.push({
      id: `booking-${s.bookingDetailId || s.bookingId || i}`,
      type,
      startMinutes: item.startMin,
      endMinutes: item.endMin,
      startTimeStr: startStr,
      endTimeStr: endStr,
      leftPercent: pos.leftPercent,
      widthPercent: pos.widthPercent,
      title: s.activityName,
      subtitle: s.purpose || (s.bookedByName ? `Người đặt: ${s.bookedByName}` : undefined),
      badgeText,
      booking: s,
    });

    // Khoảng trống giữa ca i và ca i+1
    if (i < activeSchedules.length - 1) {
      const next = activeSchedules[i + 1];
      if (next.startMin > item.endMin) {
        const gapPos = calculateTimelinePosition(item.endMin, next.startMin);
        const gapStartStr = minutesToTimeString(item.endMin);
        const gapEndStr = minutesToTimeString(next.startMin);

        segments.push({
          id: `mid-gap-${room.id}-${i}`,
          type: "free",
          startMinutes: item.endMin,
          endMinutes: next.startMin,
          startTimeStr: gapStartStr,
          endTimeStr: gapEndStr,
          leftPercent: gapPos.leftPercent,
          widthPercent: gapPos.widthPercent,
          title: `+ Trống: ${gapStartStr} - ${gapEndStr}`,
        });
      }
    }
  }

  // Khoảng trống sau ca cuối cùng (đến 19:30)
  const last = activeSchedules[activeSchedules.length - 1];
  if (last.endMin < MATRIX_TIMELINE_END_MIN) {
    const gapStart = last.endMin;
    const gapEnd = MATRIX_TIMELINE_END_MIN;
    const pos = calculateTimelinePosition(gapStart, gapEnd);
    const startStr = minutesToTimeString(gapStart);
    const endStr = minutesToTimeString(gapEnd);

    let titleText = `⊕ Khung giờ trống (${startStr} - ${endStr}) • Nhấn để đặt phòng`;
    if (
      room.capacity >= 50 ||
      room.roomCode === "B201" ||
      room.roomTypeName?.includes("Hội trường")
    ) {
      titleText = `⊕ Khung giờ trống cho Hội thảo (${startStr} - ${endStr}) • Nhấn để đặt phòng họp lớn`;
    } else if (room.roomCode === "A104") {
      titleText = `⊕ Trống từ ${startStr} - ${endStr} • Nhấn để đặt ngay sau phiên hiện tại`;
    } else if (startStr === "10:00") {
      titleText = `⊕ Khung giờ trống (${startStr} - ${endStr}) • Nhấn để đặt 2 giờ`;
    } else if (startStr === "12:00") {
      titleText = `⊕ Trống: ${startStr} - ${endStr} • Chọn khung giờ học chiều/tối`;
    }

    segments.push({
      id: `post-gap-${room.id}`,
      type: "free",
      startMinutes: gapStart,
      endMinutes: gapEnd,
      startTimeStr: startStr,
      endTimeStr: endStr,
      leftPercent: pos.leftPercent,
      widthPercent: pos.widthPercent,
      title: titleText,
    });
  }

  return segments;
}

/**
 * Tính huy hiệu trạng thái của phòng hiển thị bên cột trái (1 Đang đặt, 1 Sắp dùng, 100% Trống, Đang sử dụng...)
 */
export function getRoomBadgeInfo(
  room: RoomItem,
  schedules: RoomScheduleItem[] = [],
  currentMinutes = 585
): {
  text: string;
  variant: "in-use" | "booked" | "free" | "hall" | "maintenance";
} {
  if (room.status === "Bảo trì") {
    return { text: "Bảo trì", variant: "maintenance" };
  }
  if (room.status === "Đang sử dụng") {
    return { text: "● Đang sử dụng", variant: "in-use" };
  }
  if (
    room.roomCode === "B201" ||
    (room.roomTypeName && room.roomTypeName.includes("Hội trường"))
  ) {
    return { text: "Hội trường", variant: "hall" };
  }

  const active = schedules.filter(
    (s) => s.status !== "Từ chối" && s.status !== "Đã hủy"
  );
  if (active.length === 0) {
    return { text: "100% Trống", variant: "free" };
  }

  // Đang sử dụng theo lịch
  const inUse = active.find((s) => {
    if (s.status === "Đang sử dụng") return true;
    const st = parseVietnamTimeMinutes(s.startAt);
    const et = parseVietnamTimeMinutes(s.endAt);
    return currentMinutes >= st && currentMinutes < et;
  });
  if (inUse) {
    return { text: "● Đang sử dụng", variant: "in-use" };
  }

  // Sắp dùng (trong vòng 60 phút tới)
  const startingSoon = active.find((s) => {
    const st = parseVietnamTimeMinutes(s.startAt);
    return st >= currentMinutes && st <= currentMinutes + 60;
  });
  if (startingSoon) {
    return { text: "1 Sắp dùng", variant: "booked" };
  }

  return { text: `${active.length} Đang đặt`, variant: "booked" };
}

/**
 * Phân tích các tiện ích của phòng để gắn icon phù hợp
 */
export function parseRoomAmenities(
  room: RoomItem
): Array<{ iconType: string; label: string }> {
  const items: Array<{ iconType: string; label: string }> = [];

  if (room.capacity) {
    items.push({ iconType: "users", label: `${room.capacity} chỗ` });
  }

  if (room.description) {
    const parts = room.description
      .split(/[•\n]/)
      .map((s) => s.trim())
      .filter(Boolean);

    for (const p of parts) {
      if (/tv|màn|screen/i.test(p)) {
        items.push({ iconType: "tv", label: p });
      } else if (/ổ cắm|power/i.test(p)) {
        items.push({ iconType: "plug", label: p });
      } else if (/wifi/i.test(p)) {
        items.push({ iconType: "wifi", label: p });
      } else if (/bảng/i.test(p)) {
        items.push({ iconType: "board", label: p });
      } else if (/micro/i.test(p)) {
        items.push({ iconType: "mic", label: p });
      } else if (/âm thanh|máy chiếu|loa/i.test(p)) {
        items.push({ iconType: "speaker", label: p });
      } else {
        items.push({ iconType: "check", label: p });
      }
    }
  }

  return items;
}

/**
 * Tính toán số liệu thống kê cho 4 thẻ KPI dưới chân trang
 */
export function computeMatrixKpis(
  rooms: RoomItem[],
  schedulesByRoom: Record<number, RoomScheduleItem[]>,
  dateStr: string,
  currentMinutes = 0
) {
  const totalRooms = rooms.length;
  let availableRooms = 0;
  let confirmedBookings = 0;
  let inUseCount = 0;
  let inUseDetail = "Không có phiên đang sử dụng";

  for (const room of rooms) {
    const scheds = (schedulesByRoom[room.id] || []).filter(
      (s) => s.status !== "Từ chối" && s.status !== "Đã hủy"
    );
    confirmedBookings += scheds.length;

    const roomStatus = (room.status || "").toLowerCase();
    let roomBusy =
      roomStatus.includes("maintenance") ||
      roomStatus.includes("bảo trì") ||
      roomStatus.includes("inuse") ||
      roomStatus.includes("in use") ||
      roomStatus.includes("đang sử dụng");

    for (const s of scheds) {
      const st = parseVietnamTimeMinutes(s.startAt);
      const et = parseVietnamTimeMinutes(s.endAt);
      if (
        s.status === "Đang sử dụng" ||
        (currentMinutes >= st && currentMinutes < et)
      ) {
        inUseCount++;
        roomBusy = true;
        inUseDetail = `${room.name} (Kết thúc lúc ${minutesToTimeString(et)})`;
      }
    }

    if (!roomBusy) availableRooms++;
  }

  return {
    availableText: `${availableRooms} / ${totalRooms} Phòng`,
    availableSub: "Phòng sẵn sàng sử dụng",
    confirmedText: `${confirmedBookings} Lượt đặt`,
    confirmedSub: `Đã xác nhận trong ${formatVietnameseDate(dateStr)}`,
    inUseText: `${inUseCount} Phiên đang dùng`,
    inUseSub: inUseDetail,
    checkinTitle: "Check-in Thẻ HUIT",
    checkinSub: "Hủy tự động nếu trễ 15 phút",
  };
}

