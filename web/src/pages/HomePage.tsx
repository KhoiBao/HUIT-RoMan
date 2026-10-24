import { useCallback, useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import HomeHero from "../components/HomeHero";
import ProcessSection from "../components/ProcessSection";
import RoomTypesSection from "../components/RoomTypesSection";
import {
  buildRoomTypeSummaries,
  deriveRoomStates,
  loadHomeSnapshot,
  pickFeaturedRoomTypes,
  summarizeStates,
  type HomeSnapshot,
} from "../lib/home";
import { formatVietnameseDate, toISODateString } from "../lib/schedule";
import { fetchMyUsageSessions, type UsageSessionItem } from "../lib/usage";

export default function HomePage() {
  const navigate = useNavigate();
  const [snapshot, setSnapshot] = useState<HomeSnapshot | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [now, setNow] = useState(() => new Date());
  const [activeSessions, setActiveSessions] = useState<UsageSessionItem[]>([]);

  const loadData = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await loadHomeSnapshot(toISODateString(new Date()), new Date());
      setSnapshot(data);
      setNow(new Date());
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
  }, []);

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

  const { featured, others } = useMemo(
    () => pickFeaturedRoomTypes(summaries),
    [summaries]
  );

  const pendingSession = activeSessions.find(
    (session) => session.status === "Chờ nhận phòng"
  );
  const inUseSession = activeSessions.find(
    (session) => session.status === "Đang sử dụng"
  );

  const dateLabel = formatVietnameseDate(toISODateString(now));
  const updatedLabel = now.toLocaleTimeString("vi-VN", {
    hour: "2-digit",
    minute: "2-digit",
  });

  return (
    <div className="rh-page">
      {(pendingSession || inUseSession) && (
        <div className="rh-session-wrap">
          <div
            className={`rh-session-banner ${
              inUseSession && !pendingSession ? "is-inuse" : ""
            }`}
          >
            <span className="rh-session-dot" />
            <div className="rh-session-text">
              {pendingSession ? (
                <>
                  <strong>
                    Bạn có phòng sẵn sàng nhận: {pendingSession.roomCode} (
                    {pendingSession.roomName})
                  </strong>
                  <p>
                    Mã nhận phòng: <strong>{pendingSession.confirmationCode}</strong>
                  </p>
                </>
              ) : (
                <>
                  <strong>
                    Bạn đang sử dụng phòng: {inUseSession?.roomCode} (
                    {inUseSession?.roomName})
                  </strong>
                  <p>Đừng quên trả phòng khi kết thúc buổi sử dụng.</p>
                </>
              )}
            </div>
            <button
              type="button"
              className="rh-session-action"
              onClick={() => navigate("/dat-phong?tab=my-bookings")}
            >
              {pendingSession ? "Nhận phòng ngay" : "Xem & trả phòng"}
            </button>
          </div>
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

      <RoomTypesSection
        featured={featured}
        others={others}
        loading={loading && !snapshot}
      />

      <ProcessSection />
    </div>
  );
}
