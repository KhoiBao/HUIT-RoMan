import { api } from "./api";

export interface RoomLite {
  status?: string | null;
}

export interface RoomStats {
  trong: number;
  daDat: number;
  dangDung: number;
  baoTri: number;
  total: number;
}

function norm(status?: string | null): string {
  return (status ?? "").trim().toLowerCase();
}

/**
 * Đếm trạng thái live từ GET /api/Rooms.
 * Đã đặt = phần còn lại (tổng − trống − đang dùng − bảo trì).
 */
export function deriveRoomStats(rooms: RoomLite[]): RoomStats {
  let trong = 0;
  let dangDung = 0;
  let baoTri = 0;
  for (const r of rooms) {
    const s = norm(r.status);
    if (s === "bảo trì" || s === "bao tri" || s === "maintenance") baoTri++;
    else if (
      s === "đang sử dụng" ||
      s === "đang su dung" ||
      s === "inuse" ||
      s === "in use" ||
      s === "đang dùng" ||
      s === "dang dung"
    )
      dangDung++;
    else trong++;
  }
  const total = rooms.length;
  return {
    trong,
    daDat: Math.max(0, total - trong - dangDung - baoTri),
    dangDung,
    baoTri,
    total,
  };
}

export async function fetchRooms(): Promise<RoomLite[]> {
  const res = await api.get("/api/Rooms");
  const data = res.data?.data ?? res.data;
  return Array.isArray(data) ? (data as RoomLite[]) : [];
}

export function getNextIndex(current: number, total: number): number {
  return (current + 1) % total;
}

export function getPrevIndex(current: number, total: number): number {
  return (current - 1 + total) % total;
}
