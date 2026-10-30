import { useCallback, useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import HomeHero from "../components/HomeHero";
import ProcessSection from "../components/ProcessSection";
import RoomTypesSection from "../components/RoomTypesSection";
import {
  buildRoomTypeSummaries,
  deriveRoomStates,
  loadHomeSnapshot,
  summarizeStates,
  type HomeSnapshot,
} from "../lib/home";
import { formatVietnameseDate, toISODateString } from "../lib/schedule";
import { evaluateCheckInWindow } from "../lib/booking";
import { fetchMyUsageSessions, type UsageSessionItem } from "../lib/usage";
import { useAuth } from "../auth/AuthContext";
import { XIcon } from "../components/Icon";

export default function HomePage() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [snapshot, setSnapshot] = useState<HomeSnapshot | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [now, setNow] = useState(() => new Date());
  const [updatedAt, setUpdatedAt] = useState<Date | null>(null);
  const [activeSessions, setActiveSessions] = useState<UsageSessionItem[]>([]);
  const [sessionToastClosed, setSessionToastClosed] = useState(false);

  const loadData = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await loadHomeSnapshot(toISODateString(new Date()), new Date());
      setSnapshot(data);
      setNow(new Date());
      setUpdatedAt(new Date());
    } catch {
      setError(
        "Không thể tải dữ liệu phòng từ hệ thống. Vui lòng thử lại sau ít phút."
      );
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadData();
  }, [loadData]);

  useEffect(() => {
    const timer = window.setInterval(() => setNow(new Date()), 60_000);
    return () => window.clearInterval(timer);
  }, []);

  useEffect(() => {
    if (!user) {
      setActiveSessions([]);
      return;
    }
    let mounted = true;
    fetchMyUsageSessions()
      .then((list) => {
        if (!mounted) return;
        setActiveSessions(
          list.filter(
            (session) =>
              session.status === "Chờ nhận phòng" ||
              session.status === "Đang sử dụng"
          )
        );
      })
      .catch(() => {
        if (mounted) setActiveSessions([]);
      });
    return () => {
      mounted = false;
    };
  }, [user]);

  const states = useMemo(
    () =>
      snapshot
        ? deriveRoomStates(snapshot.rooms, snapshot.scheduleByRoom, now)
        : {},
    [snapshot, now]
  );

  const stats = useMemo(
    () => (snapshot ? summarizeStates(states) : null),
    [snapshot, states]
  );

  const summaries = useMemo(
    () =>
      snapshot
        ? buildRoomTypeSummaries(snapshot.roomTypes, snapshot.rooms, states)
        : [],
    [snapshot, states]
  );

  const pendingSession = activeSessions.find(
    (session) => session.status === "Chờ nhận phòng"
  );
  const inUseSession = activeSessions.find(
    (session) => session.status === "Đang sử dụng"
  );

  // Chỉ nhắc "sẵn sàng nhận" khi đã mở cửa sổ nhận phòng (T-15 phút).
  const pendingWindow = pendingSession
    ? evaluateCheckInWindow(pendingSession.startAt, now)
    : null;
  const readySession =
    pendingWindow?.state === "open" ? pendingSession : undefined;
  const sessionToast = readySession ?? inUseSession;

  useEffect(() => {
    setSessionToastClosed(false);
    if (!sessionToast) return;
    const timer = window.setTimeout(() => setSessionToastClosed(true), 8000);
    return () => window.clearTimeout(timer);
  }, [sessionToast?.id, sessionToast?.status]);

  const dateLabel = formatVietnameseDate(toISODateString(now));
  const updatedLabel = updatedAt
    ? updatedAt.toLocaleTimeString("vi-VN", {
        hour: "2-digit",
        minute: "2-digit",
      })
    : null;

  return (
    <div className="rh-page">
      {sessionToast && !sessionToastClosed && (
        <div
          className={`rh-session-toast ${sessionToast === inUseSession ? "is-inuse" : ""}`}
          role="status"
        >
          <span className="rh-session-dot" />
          <div className="rh-session-text">
            {sessionToast === inUseSession ? (
              <>
                <strong>
                  Bạn đang sử dụng phòng: {sessionToast.roomCode} (
                  {sessionToast.roomName})
                </strong>
                <p>Đừng quên trả phòng khi kết thúc buổi sử dụng.</p>
              </>
            ) : (
              <>
                <strong>
                  Bạn có phòng sẵn sàng nhận: {sessionToast.roomCode} (
                  {sessionToast.roomName})
                </strong>
                <p>
                  Mã nhận phòng: <strong>{sessionToast.confirmationCode}</strong>
                </p>
              </>
            )}
          </div>
          <button
            type="button"
            className="rh-session-action"
            onClick={() => navigate("/dat-phong?tab=my-bookings")}
          >
            {sessionToast === inUseSession ? "Xem & trả phòng" : "Nhận phòng ngay"}
          </button>
          <button
            type="button"
            className="rh-session-toast-close"
            aria-label="Đóng thông báo"
            onClick={() => setSessionToastClosed(true)}
          >
            <XIcon size={14} />
          </button>
        </div>
      )}

      {error && (
        <div className="rh-error-wrap">
          <div className="rh-error">
            <span>{error}</span>
            <button type="button" onClick={() => void loadData()}>
              Thử lại
            </button>
          </div>
        </div>
      )}

      <HomeHero
        stats={stats}
        loading={loading}
        dateLabel={dateLabel}
        updatedLabel={updatedLabel}
      />

      <RoomTypesSection types={summaries} loading={loading && !snapshot} />

      <ProcessSection />
    </div>
  );
}
