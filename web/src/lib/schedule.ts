import { api } from "./api";

export interface Period {
  id: number;
  name: string;
  startTime: string; // e.g. "06:30:00"
  endTime: string;   // e.g. "07:20:00"
  roomTypeId?: number | null;
  roomTypeName?: string | null;
}

/**
 * Nhãn tiết học dùng chung cho mọi nơi hiển thị: một tiết luôn in đúng cặp
 * giờ bắt đầu - kết thúc lấy từ cùng bản ghi Period của backend, tránh việc
 * ô chọn tiết bắt đầu và tiết kết thúc in hai mốc thời gian khác nhau.
 */
export function formatPeriodLabel(period: Period): string {
  return `${period.name} (${period.startTime.slice(0, 5)} - ${period.endTime.slice(0, 5)})`;
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
  roomId?: number;
  roomName?: string;
  roomCode?: string;
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
 * Format ngày ngắn cho tiêu đề cột tuần/tháng (VD: "T2 27/10")
 */
export function formatShortDate(isoDate: string): string {
  const [y, m, d] = isoDate.split("-").map(Number);
  const date = new Date(y, m - 1, d);
  const shortDays = ["CN", "T2", "T3", "T4", "T5", "T6", "T7"];
  return `${shortDays[date.getDay()]} ${String(d).padStart(2, "0")}/${String(m).padStart(2, "0")}`;
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
  if (s === "đang sử dụng" || s === "in use" || s === "inuse") {
    return { label: "Đang sử dụng", cssClass: "badge-in-use" };
  }
  if (s === "hoàn thành" || s === "hoàn tất") {
    return { label: "Hoàn thành", cssClass: "badge-completed" };
  }
  return { label: status || "Không rõ", cssClass: "badge-default" };
}

/**
 * DB có thể lưu trạng thái phòng bằng tiếng Việt hoặc tiếng Anh.
 * Chuẩn hóa về 3 nhóm trạng thái vận hành mà giao diện sử dụng.
 */
export type RoomOperationalStatus = "available" | "in-use" | "maintenance" | "other";

export function normalizeRoomStatus(status?: string): RoomOperationalStatus {
  const s = (status ?? "").trim().toLowerCase();
  if (!s) return "available";
  if (s === "bảo trì" || s === "maintenance") return "maintenance";
  if (s === "đang sử dụng" || s === "inuse" || s === "in use") return "in-use";
  if (s === "trống" || s === "available") return "available";
  return "other";
}

export async function fetchPeriodsApi(roomTypeId?: number): Promise<Period[]> {
  const query = roomTypeId ? `?roomTypeId=${roomTypeId}` : "";
  const res = await api.get(`/api/Bookings/periods${query}`);
  const data = res.data?.data ?? res.data;
  return Array.isArray(data) ? (data as Period[]) : [];
}

export async function fetchAllRoomsApi(): Promise<RoomItem[]> {
  const res = await api.get("/api/Rooms");
  const data = res.data?.data ?? res.data;
  return Array.isArray(data) ? (data as RoomItem[]) : [];
}

export interface PagedRoomsQuery {
  page?: number;
  pageSize?: number;
  keyword?: string;
  roomType?: string;
  building?: string;
  floor?: string;
  status?: string;
  minCapacity?: number;
  date?: string;
}

export interface PagedRoomsResult {
  items: RoomItem[];
  page: number;
  pageSize: number;
  totalItems: number;
  totalPages: number;
}

/**
 * Danh mục phòng có phân trang từ API. Các bộ lọc và trạng thái vận hành
 * (free / in-use / maintenance) được xử lý ở máy chủ theo ngày đang xem.
 */
export async function fetchPagedRoomsApi(
  query: PagedRoomsQuery
): Promise<PagedRoomsResult> {
  const params = new URLSearchParams({
    page: String(query.page ?? 1),
    pageSize: String(query.pageSize ?? 10),
  });
  if (query.keyword?.trim()) params.set("keyword", query.keyword.trim());
  if (query.roomType && query.roomType !== "all") {
    params.set("roomType", query.roomType);
  }
  if (query.building && query.building !== "all") {
    params.set("building", query.building);
  }
  if (query.floor && query.floor !== "all") params.set("floor", query.floor);
  if (query.status && query.status !== "all") params.set("status", query.status);
  if (query.minCapacity && query.minCapacity > 0) {
    params.set("minCapacity", String(query.minCapacity));
  }
  params.set("date", query.date ?? toISODateString(new Date()));

  const res = await api.get(`/api/Rooms/paged?${params.toString()}`);
  const data = res.data?.data ?? res.data;
  return {
    items: Array.isArray(data?.items) ? (data.items as RoomItem[]) : [],
    page: Number(data?.page) || 1,
    pageSize: Number(data?.pageSize) || query.pageSize || 10,
    totalItems: Number(data?.totalItems) || 0,
    totalPages: Number(data?.totalPages) || 0,
  };
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

/**
 * Lịch của tất cả phòng trong khoảng ngày (giờ Việt Nam), dùng cho chế độ Ngày/Tuần/Tháng.
 */
export async function fetchSchedulesRangeApi(
  fromDate: string,
  toDate: string
): Promise<RoomScheduleItem[]> {
  const res = await api.get(
    `/api/Bookings/schedules?from=${encodeURIComponent(fromDate)}&to=${encodeURIComponent(toDate)}`
  );
  const data = res.data?.data ?? res.data;
  return Array.isArray(data) ? (data as RoomScheduleItem[]) : [];
}

// ── TIMELINE MATRIX GANTT HELPERS ─────────────────────────────────────────

export const MATRIX_TIMELINE_START_MIN = 7 * 60;   // 07:00
export const MATRIX_TIMELINE_END_MIN = 20 * 60;    // 20:00
export const MATRIX_TIMELINE_DURATION_MIN =
  MATRIX_TIMELINE_END_MIN - MATRIX_TIMELINE_START_MIN;

export interface TimelineColumn {
  startMin: number;
  endMin: number;
  label: string;
}

export interface TimelineWindow {
  startMin: number;
  endMin: number;
  durationMin: number;
  columns: TimelineColumn[];
}

/**
 * Chia khung thời gian thành các cột 1 giờ. Nhãn là mốc bắt đầu của cột để
 * khớp trực tiếp với đường kẻ dọc trên lưới timeline. Mốc kết thúc của toàn
 * khung được hiển thị riêng ở cuối trục thời gian.
 */
export function buildTimelineColumns(
  startMin: number,
  endMin: number
): TimelineColumn[] {
  const columns: TimelineColumn[] = [];
  for (let m = startMin; m < endMin; m += 60) {
    const columnEnd = Math.min(m + 60, endMin);
    columns.push({
      startMin: m,
      endMin: columnEnd,
      label: minutesToTimeString(m),
    });
  }
  return columns;
}

/**
 * Khung giờ hiển thị: mặc định 07:00–20:00, tự mở rộng nếu có lịch sớm/muộn hơn
 * để không cắt mất khung giờ hợp lệ.
 */
export function computeTimelineWindow(
  schedules: RoomScheduleItem[] = [],
  defaultStartMin = MATRIX_TIMELINE_START_MIN,
  defaultEndMin = MATRIX_TIMELINE_END_MIN
): TimelineWindow {
  let startMin = defaultStartMin;
  let endMin = defaultEndMin;

  for (const item of schedules) {
    if (item.status === "Từ chối" || item.status === "Đã hủy") continue;
    const start = parseVietnamTimeMinutes(item.startAt);
    const end = parseVietnamTimeMinutes(item.endAt);
    if (!start && !end) continue;
    if (end <= start) continue;
    startMin = Math.min(startMin, Math.floor(start / 60) * 60);
    endMin = Math.max(endMin, Math.ceil(end / 60) * 60);
  }

  startMin = Math.max(0, Math.min(startMin, 23 * 60));
  endMin = Math.max(startMin + 60, Math.min(24 * 60, endMin));

  return {
    startMin,
    endMin,
    durationMin: endMin - startMin,
    columns: buildTimelineColumns(startMin, endMin),
  };
}

export const MATRIX_TIME_COLUMNS = buildTimelineColumns(
  MATRIX_TIMELINE_START_MIN,
  MATRIX_TIMELINE_END_MIN
).map((column) => column.label);

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
  isPending?: boolean;
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
 * Trả về khoá ngày YYYY-MM-DD theo giờ Việt Nam của một mốc ISO.
 */
export function toVietnamDateKey(isoString: string): string {
  if (!isoString) return "";
  if (!isoString.includes("T")) return isoString;
  const hasZone = /Z$|[+-]\d{2}:?\d{2}$/.test(isoString);
  if (!hasZone) return isoString.slice(0, 10);
  const d = new Date(isoString);
  if (isNaN(d.getTime())) return isoString.slice(0, 10);
  const vnDate = new Date(d.getTime() + 7 * 60 * 60 * 1000);
  return vnDate.toISOString().slice(0, 10);
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
 * Tính phần trăm toạ độ (left và width) trên trục timeline
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
  currentMinutes = 585,
  windowStartMin = MATRIX_TIMELINE_START_MIN,
  windowEndMin = MATRIX_TIMELINE_END_MIN,
  bookableStartMin = windowStartMin,
  bookableEndMin = windowEndMin
): TimelineSegment[] {
  const totalDuration = Math.max(60, windowEndMin - windowStartMin);
  const position = (startMin: number, endMin: number) =>
    calculateTimelinePosition(startMin, endMin, windowStartMin, totalDuration);

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
    .filter((item) => item.endMin > windowStartMin && item.startMin < windowEndMin)
    .sort((a, b) => a.startMin - b.startMin);

  const isPastDay = currentMinutes >= bookableEndMin;
  const roomTypeName = room.roomTypeName?.toLowerCase() ?? "";
  const isConferenceRoom =
    roomTypeName.includes("hội thảo") ||
    roomTypeName.includes("hoi thao") ||
    roomTypeName.includes("hội trường") ||
    roomTypeName.includes("hoi truong");

  // Trường hợp 1: Phòng trống cả ngày
  if (activeSchedules.length === 0) {
    const fullFreeTitle = `Trống cả ngày (${minutesToTimeString(bookableStartMin)} - ${minutesToTimeString(bookableEndMin)})`;
    const splitMin = Math.min(currentMinutes, bookableEndMin);

    // Hôm nay: phần thời gian đã qua không đặt được nên tách thành dải xám
    // riêng, ranh giới đúng vạch giờ hiện tại; phần còn lại giữ màu xanh.
    if (!isPastDay && splitMin > bookableStartMin) {
      const pastPos = position(bookableStartMin, splitMin);
      const futurePos = position(splitMin, bookableEndMin);
      const pastStartStr = minutesToTimeString(bookableStartMin);
      const pastEndStr = minutesToTimeString(splitMin);
      return [
        {
          id: `full-free-past-${room.id}`,
          type: "past",
          startMinutes: bookableStartMin,
          endMinutes: splitMin,
          startTimeStr: pastStartStr,
          endTimeStr: pastEndStr,
          leftPercent: pastPos.leftPercent,
          widthPercent: pastPos.widthPercent,
          title: `Đã qua: ${pastStartStr} - ${pastEndStr}`,
        },
        {
          id: `full-free-${room.id}`,
          type: "full-free",
          startMinutes: splitMin,
          endMinutes: bookableEndMin,
          startTimeStr: minutesToTimeString(splitMin),
          endTimeStr: minutesToTimeString(bookableEndMin),
          leftPercent: futurePos.leftPercent,
          widthPercent: futurePos.widthPercent,
          title: fullFreeTitle,
        },
      ];
    }

    const pos = position(bookableStartMin, bookableEndMin);
    return [
      {
        id: `full-free-${room.id}`,
        type: "full-free",
        startMinutes: bookableStartMin,
        endMinutes: bookableEndMin,
        startTimeStr: minutesToTimeString(bookableStartMin),
        endTimeStr: minutesToTimeString(bookableEndMin),
        leftPercent: pos.leftPercent,
        widthPercent: pos.widthPercent,
        title: fullFreeTitle,
        subtitle: isPastDay ? "Ngày đã qua" : undefined,
      },
    ];
  }

  const segments: TimelineSegment[] = [];

  const pushGap = (id: string, gapStart: number, gapEnd: number) => {
    if (gapEnd <= gapStart) return;

    // Khoảng trống vắt qua giờ hiện tại được cắt làm đôi: phần đã qua hiển thị
    // xám và không bấm được, phần còn lại mới là dải xanh đặt phòng.
    const pastEnd = Math.min(gapEnd, currentMinutes);
    if (pastEnd > gapStart) {
      const pos = position(gapStart, pastEnd);
      const startStr = minutesToTimeString(gapStart);
      const endStr = minutesToTimeString(pastEnd);
      segments.push({
        id: `${id}-past`,
        type: "past",
        startMinutes: gapStart,
        endMinutes: pastEnd,
        startTimeStr: startStr,
        endTimeStr: endStr,
        leftPercent: pos.leftPercent,
        widthPercent: pos.widthPercent,
        title: `Đã qua: ${startStr} - ${endStr}`,
      });
    }

    const freeStart = Math.max(gapStart, currentMinutes);
    if (gapEnd > freeStart) {
      const pos = position(freeStart, gapEnd);
      const startStr = minutesToTimeString(freeStart);
      const endStr = minutesToTimeString(gapEnd);
      segments.push({
        id,
        type: "free",
        startMinutes: freeStart,
        endMinutes: gapEnd,
        startTimeStr: startStr,
        endTimeStr: endStr,
        leftPercent: pos.leftPercent,
        widthPercent: pos.widthPercent,
        title: `Trống: ${startStr} - ${endStr}`,
      });
    }
  };

  // Khoảng trống trước ca đầu tiên
  const first = activeSchedules[0];
  pushGap(`pre-gap-${room.id}`, bookableStartMin, Math.max(bookableStartMin, first.startMin));

  // Duyệt qua từng ca đặt
  for (let i = 0; i < activeSchedules.length; i++) {
    const item = activeSchedules[i];
    const s = item.schedule;
    const startStr = minutesToTimeString(item.startMin);
    const endStr = minutesToTimeString(item.endMin);
    const pos = position(item.startMin, item.endMin);

    const isPending = s.status === "Chờ duyệt";
    const isInUse =
      s.status === "Đang sử dụng" ||
      (currentMinutes >= item.startMin && currentMinutes < item.endMin);

    let type: TimelineSegmentType = "booked";
    let badgeText = "ĐÃ ĐẶT";

    if (isPending) {
      badgeText = "CHỜ DUYỆT";
    } else if (isInUse) {
      type = "in-use";
      badgeText = "ĐANG DIỄN RA";
    } else if (isConferenceRoom) {
      type = "conference";
      const durationHours = Math.round((item.endMin - item.startMin) / 60);
      badgeText = `${durationHours > 0 ? durationHours : 1} GIỜ`;
    }

    // Lịch đặt theo tiết hiển thị rõ tiết bắt đầu → kết thúc để giảng viên
    // đối chiếu với thời khóa biểu.
    const periodLabel = s.startPeriodName
      ? s.endPeriodName && s.endPeriodName !== s.startPeriodName
        ? `${s.startPeriodName} – ${s.endPeriodName}`
        : s.startPeriodName
      : "";
    const subtitleText = [periodLabel, s.purpose]
      .filter((part): part is string => Boolean(part))
      .join(" • ");

    segments.push({
      id: `booking-${s.bookingDetailId || s.bookingId || i}`,
      type,
      startMinutes: item.startMin,
      endMinutes: item.endMin,
      startTimeStr: startStr,
      endTimeStr: endStr,
      leftPercent: pos.leftPercent,
      widthPercent: pos.widthPercent,
      title: s.activityName || "Lịch đặt phòng",
      subtitle: subtitleText || undefined,
      badgeText,
      isPending,
      booking: s,
    });

    // Khoảng trống giữa ca i và ca i+1
    if (i < activeSchedules.length - 1) {
      const next = activeSchedules[i + 1];
      pushGap(`mid-gap-${room.id}-${i}`, item.endMin, next.startMin);
    }
  }

  // Khoảng trống sau ca cuối cùng
  const last = activeSchedules[activeSchedules.length - 1];
  pushGap(`post-gap-${room.id}`, last.endMin, bookableEndMin);

  return segments;
}

/**
 * Tính huy hiệu trạng thái của phòng hiển thị bên cột trái
 */
export function getRoomBadgeInfo(
  room: RoomItem,
  schedules: RoomScheduleItem[] = [],
  currentMinutes = 585
): {
  text: string;
  variant: "in-use" | "booked" | "free" | "maintenance";
} {
  const status = normalizeRoomStatus(room.status);
  if (status === "maintenance") {
    return { text: "Bảo trì", variant: "maintenance" };
  }
  if (status === "in-use") {
    return { text: "● Đang sử dụng", variant: "in-use" };
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

const CONFIRMED_STATUSES = new Set([
  "Đã duyệt",
  "Duyệt một phần",
  "Đang sử dụng",
  "Hoàn thành",
  "Hoàn tất",
]);

/**
 * Tính toán số liệu thống kê cho 4 thẻ KPI dưới chân trang (chế độ Ngày)
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
  const inUseRooms: Array<{ name: string; endMin: number }> = [];

  for (const room of rooms) {
    const scheds = (schedulesByRoom[room.id] || []).filter(
      (s) => s.status !== "Từ chối" && s.status !== "Đã hủy"
    );
    confirmedBookings += scheds.filter((s) => CONFIRMED_STATUSES.has(s.status)).length;

    const status = normalizeRoomStatus(room.status);
    let roomBusy = status === "maintenance" || status === "in-use";

    for (const s of scheds) {
      const st = parseVietnamTimeMinutes(s.startAt);
      const et = parseVietnamTimeMinutes(s.endAt);
      if (
        s.status === "Đang sử dụng" ||
        (currentMinutes >= st && currentMinutes < et)
      ) {
        inUseCount++;
        roomBusy = true;
        inUseRooms.push({ name: room.name, endMin: et });
      }
    }

    if (!roomBusy) availableRooms++;
  }

  let inUseDetail = "Không có phiên đang sử dụng";
  if (inUseRooms.length === 1) {
    inUseDetail = `${inUseRooms[0].name} (Kết thúc lúc ${minutesToTimeString(inUseRooms[0].endMin)})`;
  } else if (inUseRooms.length > 1) {
    inUseDetail = `${inUseRooms[0].name} và ${inUseRooms.length - 1} phòng khác`;
  }

  return {
    availableText: `${availableRooms} / ${totalRooms} Phòng`,
    availableSub: "Phòng sẵn sàng sử dụng",
    confirmedText: `${confirmedBookings} Lượt đặt`,
    confirmedSub: `Đã duyệt trong ${formatVietnameseDate(dateStr)}`,
    inUseText: `${inUseCount} Phiên đang dùng`,
    inUseSub: inUseDetail,
    checkinTitle: "Nhận phòng trực tuyến",
    checkinSub: "Mở 15 phút trước giờ bắt đầu",
  };
}

// ── WEEK / MONTH HELPERS ─────────────────────────────────────────────────

/**
 * 7 ngày của tuần (Thứ Hai → Chủ Nhật) chứa ngày được chọn.
 */
export function getWeekDays(isoDate: string): string[] {
  const [y, m, d] = isoDate.split("-").map(Number);
  const date = new Date(y, m - 1, d);
  const offsetToMonday = (date.getDay() + 6) % 7;
  const monday = new Date(y, m - 1, d - offsetToMonday);
  return Array.from({ length: 7 }, (_, index) =>
    toISODateString(
      new Date(monday.getFullYear(), monday.getMonth(), monday.getDate() + index)
    )
  );
}

/**
 * Lưới lịch tháng (bắt đầu Thứ Hai), gồm cả các ngày của tháng kề.
 */
export function getMonthGrid(
  isoDate: string
): Array<{ dateKey: string; inMonth: boolean }> {
  const [y, m] = isoDate.split("-").map(Number);
  const firstDay = new Date(y, m - 1, 1);
  const offsetToMonday = (firstDay.getDay() + 6) % 7;
  const daysInMonth = new Date(y, m, 0).getDate();
  const totalCells = Math.ceil((offsetToMonday + daysInMonth) / 7) * 7;

  return Array.from({ length: totalCells }, (_, index) => {
    const date = new Date(y, m - 1, 1 - offsetToMonday + index);
    return {
      dateKey: toISODateString(date),
      inMonth: date.getMonth() === m - 1,
    };
  });
}

export interface DayAvailabilityStat {
  dateKey: string;
  bookingCount: number;
  busyRoomCount: number;
  freeRoomCount: number;
  maintenanceRoomCount: number;
  totalRooms: number;
}

/**
 * Thống kê số lượt đặt và số phòng còn trống theo từng ngày.
 * "Phòng trống" ở đây nghĩa là phòng không có lịch đặt nào trong ngày.
 */
export function buildDayStats(
  rooms: RoomItem[],
  schedules: RoomScheduleItem[],
  dateKeys: string[]
): Record<string, DayAvailabilityStat> {
  const roomIds = new Set(rooms.map((room) => room.id));
  const maintenanceIds = new Set(
    rooms
      .filter((room) => normalizeRoomStatus(room.status) === "maintenance")
      .map((room) => room.id)
  );
  const busyRoomsByDate: Record<string, Set<number>> = {};
  const bookingCountByDate: Record<string, number> = {};

  for (const item of schedules) {
    if (item.status === "Từ chối" || item.status === "Đã hủy") continue;
    const dateKey = toVietnamDateKey(item.startAt);
    if (!dateKey) continue;
    const roomId = item.roomId ?? -1;
    if (!roomIds.has(roomId)) continue;
    if (!busyRoomsByDate[dateKey]) busyRoomsByDate[dateKey] = new Set<number>();
    busyRoomsByDate[dateKey].add(roomId);
    bookingCountByDate[dateKey] = (bookingCountByDate[dateKey] ?? 0) + 1;
  }

  const maintenanceRoomCount = maintenanceIds.size;

  const result: Record<string, DayAvailabilityStat> = {};
  for (const dateKey of dateKeys) {
    const busyIds = busyRoomsByDate[dateKey] ?? new Set<number>();
    let busyNonMaintenance = 0;
    for (const roomId of busyIds) {
      if (!maintenanceIds.has(roomId)) busyNonMaintenance++;
    }
    result[dateKey] = {
      dateKey,
      bookingCount: bookingCountByDate[dateKey] ?? 0,
      busyRoomCount: busyIds.size,
      freeRoomCount: Math.max(
        0,
        rooms.length - maintenanceRoomCount - busyNonMaintenance
      ),
      maintenanceRoomCount,
      totalRooms: rooms.length,
    };
  }
  return result;
}

/**
 * Gom lịch theo phòng, dùng cho chế độ Ngày.
 */
export function groupSchedulesByRoom(
  schedules: RoomScheduleItem[]
): Record<number, RoomScheduleItem[]> {
  const result: Record<number, RoomScheduleItem[]> = {};
  for (const item of schedules) {
    const roomId = item.roomId ?? -1;
    if (!result[roomId]) result[roomId] = [];
    result[roomId].push(item);
  }
  return result;
}

/**
 * Gom lịch theo phòng + ngày Việt Nam, dùng cho chế độ Tuần.
 */
export function groupSchedulesByRoomAndDate(
  schedules: RoomScheduleItem[]
): Record<string, RoomScheduleItem[]> {
  const result: Record<string, RoomScheduleItem[]> = {};
  for (const item of schedules) {
    const dateKey = toVietnamDateKey(item.startAt);
    if (!dateKey) continue;
    const key = `${item.roomId ?? -1}|${dateKey}`;
    if (!result[key]) result[key] = [];
    result[key].push(item);
  }
  return result;
}

/**
 * Khung giờ gợi ý khi bấm vào ô "Trống cả ngày": 2 giờ gần nhất còn hợp lệ
 * trong ngày hôm nay, hoặc 07:00–09:00 cho ngày tương lai.
 */
export function getSuggestedBookingSlot(
  selectedDate: string,
  todayKey: string,
  currentMinutes: number
): { start: string; end: string } | null {
  if (selectedDate < todayKey) return null;

  const openMin = MATRIX_TIMELINE_START_MIN;
  const closeMin = MATRIX_TIMELINE_END_MIN;

  let startMin = openMin;
  if (selectedDate === todayKey) {
    startMin = Math.max(openMin, Math.ceil((currentMinutes + 1) / 60) * 60);
  }
  if (startMin + 60 > closeMin) return null;

  const endMin = Math.min(startMin + 120, closeMin);
  return {
    start: minutesToTimeString(startMin),
    end: minutesToTimeString(endMin),
  };
}
