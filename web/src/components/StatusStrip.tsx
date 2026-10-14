import { useEffect, useState } from "react";
import { deriveRoomStats, fetchRooms, type RoomStats } from "../lib/rooms";

function pad(n: number): string {
  return n.toString().padStart(2, "0");
}

function nowLabel(): string {
  const d = new Date();
  const hh = d.getHours().toString().padStart(2, "0");
  const mm = d.getMinutes().toString().padStart(2, "0");
  return `${hh}:${mm}`;
}

export default function StatusStrip() {
  const [stats, setStats] = useState<RoomStats | null>(null);

  useEffect(() => {
    fetchRooms()
      .then((rooms) => setStats(deriveRoomStats(rooms)))
      .catch(() => setStats(null));
  }, []);

  const cell = (label: string, value: string | null, tone: string) => (
    <div className={`stat-box ${tone}`}>
      <span>{label}</span>
      <strong>{value ?? "--"}</strong>
    </div>
  );

  return (
    <div className="status-strip">
      <div className="status-head">
        <span>TRẠNG THÁI PHÒNG TRỰC TIẾP</span>
        <span className="status-time">Cập nhật: {nowLabel()}</span>
      </div>
      <div className="status-grid">
        {cell("Phòng trống", stats ? pad(stats.trong) : null, "ok")}
        {cell("Đã đặt", stats ? pad(stats.daDat) : null, "info")}
        {cell("Đang dùng", stats ? pad(stats.dangDung) : null, "warn")}
        {cell("Bảo trì", stats ? pad(stats.baoTri) : null, "muted")}
      </div>
    </div>
  );
}
