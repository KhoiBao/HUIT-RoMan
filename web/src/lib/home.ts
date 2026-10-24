import { api } from "./api";
import {
  fetchAllRoomsApi,
  fetchPeriodsApi,
  fetchRoomScheduleApi,
  type Period,
  type RoomItem,
  type RoomScheduleItem,
} from "./schedule";

export interface RoomTypeItem {
  id: number;
  name: string;
  description?: string | null;
  defaultCapacity: number;
  departmentId?: number | null;
  isBookingByPeriod: boolean;
}

export type LiveRoomState =
  | "available"
  | "upcoming"
  | "inUse"
  | "maintenance";

export interface LiveRoomStats {
  available: number;
  upcoming: number;
  inUse: number;
  maintenance: number;
  total: number;
}

export interface RoomTypeSummary {
  id: number;
  name: string;
  description: string;
  defaultCapacity: number;
  isBookingByPeriod: boolean;
  roomCount: number;
  rooms: RoomItem[];
  minCapacity: number;
  maxCapacity: number;
  floors: string[];
  buildings: string[];
  amenities: string[];
  availableCount: number;
  upcomingCount: number;
  inUseCount: number;
  maintenanceCount: number;
}

export interface HomeSnapshot {
  rooms: RoomItem[];
  roomTypes: RoomTypeItem[];
  periods: Period[];
  scheduleByRoom: Record<number, RoomScheduleItem[]>;
  states: Record<number, LiveRoomState>;
  stats: LiveRoomStats;
  roomTypeSummaries: RoomTypeSummary[];
}

const CANCELLED_STATUSES = new Set([
  "từ chối",
  "tu choi",
  "đã hủy",
  "da huy",
  "cancelled",
  "canceled",
  "rejected",
]);

function normalize(value?: string | null): string {
  return (value ?? "").trim().toLowerCase();
}

export function isMaintenanceStatus(status?: string | null): boolean {
  const value = normalize(status);
  return (
    value === "bảo trì" ||
    value === "bao tri" ||
    value === "đang bảo trì" ||
    value === "dang bao tri" ||
    value === "maintenance"
  );
}

export function isInUseStatus(status?: string | null): boolean {
  const value = normalize(status);
  return (
    value === "đang sử dụng" ||
    value === "dang su dung" ||
    value === "đang dùng" ||
    value === "dang dung" ||
    value === "inuse" ||
    value === "in use" ||
    value === "occupied"
  );
}

function isActiveSchedule(schedule: RoomScheduleItem): boolean {
  return !CANCELLED_STATUSES.has(normalize(schedule.status));
}

function scheduleWindow(schedule: RoomScheduleItem): {
  start: number;
  end: number;
} | null {
  const start = new Date(schedule.startAt).getTime();
  const end = new Date(schedule.endAt).getTime();
  if (!Number.isFinite(start) || !Number.isFinite(end)) return null;
  return { start, end };
}

/**
 * Trạng thái hiển thị của từng phòng tại thời điểm hiện tại.
 * Ưu tiên trạng thái vận hành của phòng, sau đó mới tới lịch đặt trong ngày.
 */
export function deriveRoomStates(
  rooms: RoomItem[],
  scheduleByRoom: Record<number, RoomScheduleItem[]>,
  now: Date = new Date()
): Record<number, LiveRoomState> {
  const nowMs = now.getTime();
  const result: Record<number, LiveRoomState> = {};

  for (const room of rooms) {
    if (isMaintenanceStatus(room.status)) {
      result[room.id] = "maintenance";
      continue;
    }
    if (isInUseStatus(room.status)) {
      result[room.id] = "inUse";
      continue;
    }

    const schedules = (scheduleByRoom[room.id] ?? [])
      .filter(isActiveSchedule)
      .map(scheduleWindow)
      .filter((window): window is { start: number; end: number } => Boolean(window));

    if (schedules.some((window) => window.start <= nowMs && window.end > nowMs)) {
      result[room.id] = "inUse";
      continue;
    }
    if (schedules.some((window) => window.start > nowMs)) {
      result[room.id] = "upcoming";
      continue;
    }
    result[room.id] = "available";
  }

  return result;
}

export function summarizeStates(
  states: Record<number, LiveRoomState>
): LiveRoomStats {
  const stats: LiveRoomStats = {
    available: 0,
    upcoming: 0,
    inUse: 0,
    maintenance: 0,
    total: 0,
  };

  for (const state of Object.values(states)) {
    stats.total += 1;
    stats[state] += 1;
  }
  return stats;
}

export function parseAmenities(description?: string | null): string[] {
  const raw = (description ?? "").trim();
  if (!raw) return [];

  const parts = raw
    .split(/[•·|;]/)
    .map((part) => part.trim())
    .filter(Boolean);

  const result: string[] = [];
  const seen = new Set<string>();
  for (const part of parts) {
    const lower = part.toLowerCase();
    if (lower.includes("chỗ") || /^\d+$/.test(part)) continue;
    if (seen.has(lower)) continue;
    seen.add(lower);
    result.push(part);
  }
  return result;
}

export function formatFloorList(floors: string[]): string {
  const clean = Array.from(
    new Set(floors.map((floor) => floor.trim()).filter(Boolean))
  ).sort((a, b) => Number(a) - Number(b));
  if (clean.length === 0) return "Đang cập nhật";
  return `Tầng ${clean.join(", ")}`;
}

export function formatCapacityRange(min: number, max: number): string {
  if (!Number.isFinite(min) || !Number.isFinite(max) || max <= 0) {
    return "Đang cập nhật";
  }
  if (min === max) return `${min} chỗ`;
  return `${min}–${max} chỗ`;
}

export function formatRoomCodeRange(rooms: RoomItem[]): string {
  const codes = rooms.map((room) => room.roomCode).filter(Boolean);
  if (codes.length === 0) return "Đang cập nhật";
  if (codes.length === 1) return codes[0];
  return `${codes[0]} – ${codes[codes.length - 1]}`;
}

export function buildRoomTypeSummaries(
  roomTypes: RoomTypeItem[],
  rooms: RoomItem[],
  states: Record<number, LiveRoomState> = {}
): RoomTypeSummary[] {
  return roomTypes
    .map((type) => {
      const typeRooms = rooms
        .filter((room) => room.roomTypeId === type.id)
        .sort((a, b) => a.roomCode.localeCompare(b.roomCode));
      const capacities = typeRooms
        .map((room) => room.capacity)
        .filter((value) => Number.isFinite(value) && value > 0);
      const summary: RoomTypeSummary = {
        id: type.id,
        name: type.name,
        description: type.description?.trim() ?? "",
        defaultCapacity: type.defaultCapacity,
        isBookingByPeriod: type.isBookingByPeriod,
        roomCount: typeRooms.length,
        rooms: typeRooms,
        minCapacity: capacities.length ? Math.min(...capacities) : 0,
        maxCapacity: capacities.length ? Math.max(...capacities) : 0,
        floors: Array.from(
          new Set(typeRooms.map((room) => room.floor?.trim()).filter(Boolean))
        ) as string[],
        buildings: Array.from(
          new Set(
            typeRooms.map((room) => room.building?.trim()).filter(Boolean)
          )
        ) as string[],
        amenities: Array.from(
          new Set(typeRooms.flatMap((room) => parseAmenities(room.description)))
        ).slice(0, 4),
        availableCount: 0,
        upcomingCount: 0,
        inUseCount: 0,
        maintenanceCount: 0,
      };

      for (const room of typeRooms) {
        const state = states[room.id];
        if (state === "maintenance") summary.maintenanceCount += 1;
        else if (state === "inUse") summary.inUseCount += 1;
        else if (state === "upcoming") summary.upcomingCount += 1;
        else summary.availableCount += 1;
      }

      return summary;
    })
    .sort((a, b) => {
      if (b.roomCount !== a.roomCount) return b.roomCount - a.roomCount;
      return a.name.localeCompare(b.name, "vi");
    });
}

export function pickFeaturedRoomTypes(
  summaries: RoomTypeSummary[]
): { featured: RoomTypeSummary[]; others: RoomTypeSummary[] } {
  const featured: RoomTypeSummary[] = [];
  const findByName = (keyword: string) =>
    summaries.find((item) =>
      normalize(item.name).includes(normalize(keyword))
    );

  for (const keyword of ["nhóm", "hội trường"]) {
    const match = findByName(keyword);
    if (match && !featured.some((item) => item.id === match.id)) {
      featured.push(match);
    }
  }
  for (const item of summaries) {
    if (featured.length >= 2) break;
    if (!featured.some((selected) => selected.id === item.id)) {
      featured.push(item);
    }
  }

  const featuredIds = new Set(featured.map((item) => item.id));
  return {
    featured,
    others: summaries.filter((item) => !featuredIds.has(item.id)),
  };
}

export function getServiceHours(periods: Period[]): {
  open: string;
  close: string;
} | null {
  const rows = periods
    .map((period) => ({
      start: period.startTime,
      end: period.endTime,
    }))
    .filter((row) => row.start && row.end);
  if (rows.length === 0) return null;

  const toMinutes = (value: string): number => {
    const [hour = "0", minute = "0"] = value.split(":");
    return Number(hour) * 60 + Number(minute);
  };
  const toLabel = (value: string): string => value.slice(0, 5);

  let earliest = rows[0].start;
  let latest = rows[0].end;
  for (const row of rows) {
    if (toMinutes(row.start) < toMinutes(earliest)) earliest = row.start;
    if (toMinutes(row.end) > toMinutes(latest)) latest = row.end;
  }
  return { open: toLabel(earliest), close: toLabel(latest) };
}

export async function fetchRoomTypesApi(): Promise<RoomTypeItem[]> {
  const res = await api.get("/api/RoomTypes");
  const data = res.data?.data ?? res.data;
  return Array.isArray(data) ? (data as RoomTypeItem[]) : [];
}

/**
 * Tải toàn bộ dữ liệu cần cho trang chủ từ API thật:
 * phòng, loại phòng, tiết học và lịch đặt phòng trong ngày.
 */
export async function loadHomeSnapshot(
  date: string,
  now: Date = new Date()
): Promise<HomeSnapshot> {
  const [rooms, roomTypes, periods] = await Promise.all([
    fetchAllRoomsApi(),
    fetchRoomTypesApi(),
    fetchPeriodsApi(),
  ]);

  const scheduleEntries = await Promise.all(
    rooms.map(async (room) => {
      try {
        const data = await fetchRoomScheduleApi(room.id, date);
        return [room.id, data?.schedules ?? []] as const;
      } catch {
        return [room.id, []] as const;
      }
    })
  );

  const scheduleByRoom = Object.fromEntries(scheduleEntries);
  const states = deriveRoomStates(rooms, scheduleByRoom, now);
  const stats = summarizeStates(states);
  const roomTypeSummaries = buildRoomTypeSummaries(roomTypes, rooms, states);

  return {
    rooms,
    roomTypes,
    periods,
    scheduleByRoom,
    states,
    stats,
    roomTypeSummaries,
  };
}
