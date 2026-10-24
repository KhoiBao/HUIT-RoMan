import { useState, useEffect, useMemo } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import {
  CalendarIcon,
  ClockIcon,
  UsersIcon,
  ChevronLeftIcon,
  ChevronRightIcon,
  InfoIcon,
} from "../components/Icon";
import {
  type RoomItem,
  type RoomScheduleItem,
  MATRIX_TIME_COLUMNS,
  toISODateString,
  formatVietnameseDate,
  calculateCurrentTimeIndicator,
  buildRoomTimelineSegments,
  getRoomBadgeInfo,
  parseRoomAmenities,
  computeMatrixKpis,
  fetchAllRoomsApi,
  fetchRoomScheduleApi,
} from "../lib/schedule";

export default function SchedulePage() {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();

  // Selected date (defaults to today)
  const [selectedDate, setSelectedDate] = useState<string>(
    searchParams.get("date") || toISODateString(new Date())
  );

  // Active view: Ngày | Tuần | Tháng
  const [viewMode, setViewMode] = useState<"day" | "week" | "month">("day");

  // Filters
  const [filterType, setFilterType] = useState<string>("all");
  const [filterFloor, setFilterFloor] = useState<string>("all");
  const [filterStatus, setFilterStatus] = useState<string>("all");

  // Data states
  const [rooms, setRooms] = useState<RoomItem[]>([]);
  const [schedulesByRoom, setSchedulesByRoom] = useState<
    Record<number, RoomScheduleItem[]>
  >({});
  const [loading, setLoading] = useState<boolean>(true);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // Current time in minutes from midnight. Only dùng giờ thật cho ngày hôm nay;
  // các ngày khác dùng mốc 0 để không tự tạo trạng thái "đang sử dụng".
  const currentMinutes = useMemo(() => {
    if (selectedDate === toISODateString(new Date())) {
      const now = new Date();
      return now.getHours() * 60 + now.getMinutes();
    }
    return 0;
  }, [selectedDate]);

  // Current time indicator line
  const timeIndicator = useMemo(
    () => calculateCurrentTimeIndicator(currentMinutes),
    [currentMinutes]
  );

  // 1. Fetch all rooms
  useEffect(() => {
    let isMounted = true;
    async function loadRooms() {
      try {
        setLoading(true);
        setErrorMsg(null);
        const allRooms = await fetchAllRoomsApi();
        if (!isMounted) return;

        // Ưu tiên hiển thị 5 phòng theo đúng mockup nếu có trong danh sách
        const preferredOrder = ["A101", "A102", "A103", "A104", "B201"];
        const sorted = [...allRooms].sort((a, b) => {
          const idxA = preferredOrder.indexOf(a.roomCode);
          const idxB = preferredOrder.indexOf(b.roomCode);
          if (idxA !== -1 && idxB !== -1) return idxA - idxB;
          if (idxA !== -1) return -1;
          if (idxB !== -1) return 1;
          return a.name.localeCompare(b.name);
        });

        setRooms(sorted);
      } catch (err: unknown) {
        if (!isMounted) return;
        setErrorMsg(
          err instanceof Error
            ? err.message
            : "Không thể tải danh mục phòng từ máy chủ."
        );
      } finally {
        if (isMounted) setLoading(false);
      }
    }

    loadRooms();
    return () => {
      isMounted = false;
    };
  }, []);

  // 2. Fetch schedules for all rooms on the selected date
  const loadSchedules = async () => {
    if (rooms.length === 0) return;
    try {
      setLoading(true);
      setErrorMsg(null);
      const results = await Promise.all(
        rooms.map(async (room) => {
          try {
            const data = await fetchRoomScheduleApi(room.id, selectedDate);
            return { roomId: room.id, schedules: data?.schedules || [] };
          } catch {
            return { roomId: room.id, schedules: [] };
          }
        })
      );

      const map: Record<number, RoomScheduleItem[]> = {};
      for (const res of results) {
        map[res.roomId] = res.schedules;
      }
      setSchedulesByRoom(map);
    } catch (err: unknown) {
      setErrorMsg(
        err instanceof Error ? err.message : "Lỗi khi tải lịch phòng."
      );
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadSchedules();
  }, [rooms, selectedDate]);

  // Date handlers
  function handleDateChange(newDateStr: string) {
    setSelectedDate(newDateStr);
    setSearchParams((prev) => {
      const next = new URLSearchParams(prev);
      next.set("date", newDateStr);
      return next;
    });
  }

  function shiftDate(days: number) {
    const [y, m, d] = selectedDate.split("-").map(Number);
    const curr = new Date(y, m - 1, d);
    curr.setDate(curr.getDate() + days);
    handleDateChange(toISODateString(curr));
  }

  // Filter options extracted from rooms
  const roomTypes = useMemo(() => {
    const set = new Set<string>();
    for (const r of rooms) {
      if (r.roomTypeName) set.add(r.roomTypeName);
    }
    return Array.from(set);
  }, [rooms]);

  const floors = useMemo(() => {
    const set = new Set<string>();
    for (const r of rooms) {
      if (r.floor) set.add(r.floor);
    }
    return Array.from(set);
  }, [rooms]);

  // Filtered rooms
  const filteredRooms = useMemo(() => {
    return rooms.filter((room) => {
      // Filter by room type
      if (filterType !== "all") {
        if (filterType === "phong-hoc-nhom" && !room.roomTypeName?.includes("học nhóm") && !room.name.includes("A10")) {
          return false;
        }
        if (filterType === "hoi-truong" && !room.roomTypeName?.includes("Hội trường") && !room.name.includes("B201")) {
          return false;
        }
        if (filterType !== "phong-hoc-nhom" && filterType !== "hoi-truong" && room.roomTypeName !== filterType) {
          return false;
        }
      }

      // Filter by floor
      if (filterFloor !== "all") {
        if (!room.floor?.includes(filterFloor)) return false;
      }

      // Filter by status
      if (filterStatus !== "all") {
        const badge = getRoomBadgeInfo(
          room,
          schedulesByRoom[room.id] || [],
          currentMinutes
        );
        if (filterStatus === "free" && badge.variant !== "free") return false;
        if (filterStatus === "in-use" && badge.variant !== "in-use") return false;
        if (filterStatus === "maintenance" && room.status !== "Bảo trì") return false;
      }

      return true;
    });
  }, [rooms, filterType, filterFloor, filterStatus, schedulesByRoom, currentMinutes]);

  // 4 KPI Summary Cards
  const kpis = useMemo(() => {
    return computeMatrixKpis(
      filteredRooms.length > 0 ? filteredRooms : rooms,
      schedulesByRoom,
      selectedDate,
      currentMinutes
    );
  }, [filteredRooms, rooms, schedulesByRoom, selectedDate, currentMinutes]);

  const isToday = selectedDate === toISODateString(new Date());

  return (
    <div className="schedule-matrix-page">
      <main className="schedule-matrix-main">
        <div className="matrix-content-wrapper">
          {/* Subheader: Title and Date Nav */}
          <section className="matrix-hero-bar">
            <div className="hero-bar-left">
              <div className="realtime-badge">
                <span className="live-dot"></span>
                <span>HỆ THỐNG LỊCH THỜI GIAN THỰC</span>
              </div>
              <h1 className="hero-page-title">
                Lịch sử dụng phòng Thư viện HUIT
              </h1>
            </div>

            <div className="hero-bar-right">
              {/* Date Navigation Pill */}
              <div className="date-nav-pill">
                <button
                  type="button"
                  className="date-nav-arrow"
                  onClick={() => shiftDate(-1)}
                  title="Ngày trước"
                  aria-label="Ngày trước"
                >
                  <ChevronLeftIcon size={16} />
                </button>

                <div className="date-label-clickable">
                  <CalendarIcon size={16} className="date-icon" />
                  <span className="date-label-text">
                    {isToday ? "Hôm nay: " : ""}
                    {formatVietnameseDate(selectedDate)}
                  </span>
                  <input
                    type="date"
                    className="date-native-picker"
                    value={selectedDate}
                    onChange={(e) => handleDateChange(e.target.value)}
                    title="Nhấp để chọn ngày khác"
                  />
                </div>

                <button
                  type="button"
                  className="date-nav-arrow"
                  onClick={() => shiftDate(1)}
                  title="Ngày sau"
                  aria-label="Ngày sau"
                >
                  <ChevronRightIcon size={16} />
                </button>
              </div>

              {/* View mode switcher */}
              <div className="view-mode-segmented">
                <button
                  type="button"
                  className={`segment-btn ${viewMode === "day" ? "active" : ""}`}
                  onClick={() => setViewMode("day")}
                >
                  Ngày
                </button>
                <button
                  type="button"
                  className={`segment-btn ${viewMode === "week" ? "active" : ""}`}
                  onClick={() => setViewMode("week")}
                >
                  Tuần
                </button>
                <button
                  type="button"
                  className={`segment-btn ${viewMode === "month" ? "active" : ""}`}
                  onClick={() => setViewMode("month")}
                >
                  Tháng
                </button>
              </div>

              {/* Refresh button */}
              <button
                type="button"
                className="refresh-matrix-btn"
                onClick={loadSchedules}
                title="Làm mới lịch"
                aria-label="Làm mới"
              >
                <svg
                  width="16"
                  height="16"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2.2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <path d="M21.5 2v6h-6M21.34 15.57a10 10 0 1 1-.57-8.38l5.67-5.67" />
                </svg>
              </button>
            </div>
          </section>

          {/* Operation Notice Banner */}
          <div className="matrix-notice-banner">
            <InfoIcon size={18} className="notice-icon" />
            <div className="notice-text">
              <strong>Quy định vận hành:</strong> Khung giờ sử dụng phòng được
              hiển thị trực tiếp trên lịch. Vui lòng check-in thẻ sinh viên/cán
              bộ tại quầy lễ tân tầng 3 trong vòng 15 phút kể từ giờ bắt đầu.
            </div>
          </div>

          {/* Filter & Legend Row */}
          <section className="matrix-control-row">
            {/* Filters */}
            <div className="matrix-filters-group">
              <div className="control-item">
                <label htmlFor="filter-room-type">LOẠI PHÒNG:</label>
                <div className="select-wrapper">
                  <select
                    id="filter-room-type"
                    value={filterType}
                    onChange={(e) => setFilterType(e.target.value)}
                  >
                    <option value="all">Tất cả loại phòng</option>
                    <option value="phong-hoc-nhom">
                      Phòng học nhóm (5-7 chỗ)
                    </option>
                    <option value="hoi-truong">Hội trường</option>
                    {roomTypes.map((t) => (
                      <option key={t} value={t}>
                        {t}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="control-item">
                <label htmlFor="filter-floor">TẦNG:</label>
                <div className="select-wrapper">
                  <select
                    id="filter-floor"
                    value={filterFloor}
                    onChange={(e) => setFilterFloor(e.target.value)}
                  >
                    <option value="all">Khu Tầng 3 (Học thuật)</option>
                    {floors.map((f) => (
                      <option key={f} value={f}>
                        {f}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="control-item">
                <label htmlFor="filter-status">TRẠNG THÁI:</label>
                <div className="select-wrapper">
                  <select
                    id="filter-status"
                    value={filterStatus}
                    onChange={(e) => setFilterStatus(e.target.value)}
                  >
                    <option value="all">Tất cả trạng thái</option>
                    <option value="free">Còn trống</option>
                    <option value="in-use">Đang sử dụng</option>
                    <option value="maintenance">Bảo trì</option>
                  </select>
                </div>
              </div>
            </div>

            {/* Legends */}
            <div className="matrix-legends">
              <div className="legend-entry">
                <span className="legend-box dashed-free"></span>
                <span>Còn trống (Nhấp chọn)</span>
              </div>
              <div className="legend-entry">
                <span className="legend-box solid-booked"></span>
                <span>Đã đặt trước</span>
              </div>
              <div className="legend-entry">
                <span className="legend-box solid-in-use"></span>
                <span>Đang sử dụng</span>
              </div>
              <div className="legend-entry">
                <span className="legend-box solid-maintenance"></span>
                <span>Bảo trì</span>
              </div>
              <div className="legend-entry">
                <span className="legend-line-current"></span>
                <span>
                  Hiện tại (
                  {timeIndicator.timeLabel})
                </span>
              </div>
            </div>
          </section>

          {/* Loading or Error states */}
          {errorMsg && (
            <div className="matrix-alert error">
              <InfoIcon size={18} />
              <span>{errorMsg}</span>
            </div>
          )}

          {/* Main Gantt Matrix Table */}
          <div className="matrix-table-container">
            <div className="matrix-table">
              {/* Header Row */}
              <div className="matrix-header-row">
                <div className="matrix-cell-corner">
                  <span className="corner-title">
                    KHU VỰC PHÒNG (TẦNG 3)
                  </span>
                  <span className="corner-sub">
                    {filteredRooms.length} Phòng hiển thị
                  </span>
                </div>

                <div className="matrix-header-timeline">
                  {MATRIX_TIME_COLUMNS.map((col, idx) => (
                    <div key={idx} className="timeline-header-slot">
                      {col}
                    </div>
                  ))}
                </div>
              </div>

              {/* Rows */}
              {loading && rooms.length === 0 ? (
                <div className="matrix-loading-placeholder">
                  <div className="spinner"></div>
                  <span>Đang tải ma trận lịch phòng...</span>
                </div>
              ) : filteredRooms.length === 0 ? (
                <div className="matrix-empty-row">
                  Không tìm thấy phòng nào phù hợp với bộ lọc đã chọn.
                </div>
              ) : (
                filteredRooms.map((room, roomIndex) => {
                  const roomSchedules = schedulesByRoom[room.id] || [];
                  const badgeInfo = getRoomBadgeInfo(
                    room,
                    roomSchedules,
                    currentMinutes
                  );
                  const amenities = parseRoomAmenities(room);
                  const segments = buildRoomTimelineSegments(
                    room,
                    roomSchedules,
                    currentMinutes
                  );

                  return (
                    <div key={room.id} className="matrix-body-row">
                      {/* Left Room Info Card */}
                      <div className="room-info-cell">
                        <div className="room-cell-top">
                          <h3 className="room-display-name">{room.name}</h3>
                          <span
                            className={`room-badge-tag badge-${badgeInfo.variant}`}
                          >
                            {badgeInfo.text}
                          </span>
                        </div>

                        <div className="room-cell-location">
                          {room.roomTypeName || "Phòng học nhóm"} •{" "}
                          {room.floor || "Tầng 3"}
                        </div>

                        <div className="room-cell-amenities">
                          {amenities.map((item, idx) => (
                            <span key={idx} className="amenity-chip">
                              {item.iconType === "users" && (
                                <UsersIcon size={12} />
                              )}
                              {item.iconType === "tv" && <span>🖥</span>}
                              {item.iconType === "plug" && <span>🔌</span>}
                              {item.iconType === "wifi" && <span>📶</span>}
                              {item.iconType === "board" && <span>📋</span>}
                              {item.iconType === "mic" && <span>🎙</span>}
                              {item.iconType === "speaker" && <span>📢</span>}
                              <span>{item.label}</span>
                            </span>
                          ))}
                        </div>
                      </div>

                      {/* Right Timeline Grid Area */}
                      <div className="room-timeline-cell">
                        {/* 12 Background Columns */}
                        <div className="timeline-background-grid">
                          {MATRIX_TIME_COLUMNS.map((_, idx) => (
                            <div
                              key={idx}
                              className="timeline-grid-col"
                            ></div>
                          ))}
                        </div>

                        {/* Current Time Red Vertical Line (across rows) */}
                        {timeIndicator.isVisible && (
                          <div
                            className="current-time-vertical-line"
                            style={{ left: `${timeIndicator.leftPercent}%` }}
                          >
                            {roomIndex === 0 && (
                              <div className="current-time-flag">
                                {timeIndicator.timeLabel} HIỆN TẠI
                              </div>
                            )}
                          </div>
                        )}

                        {/* Timeline Segments */}
                        <div className="timeline-segments-layer">
                          {segments.map((seg) => {
                            if (seg.type === "full-free") {
                              return (
                                <div
                                  key={seg.id}
                                  className="segment-card segment-full-free"
                                  style={{
                                    left: `${seg.leftPercent}%`,
                                    width: `${seg.widthPercent}%`,
                                  }}
                                  onClick={() =>
                                    navigate(
                                      `/dat-phong?roomId=${room.id}&date=${selectedDate}&startTime=14:00:00&endTime=16:00:00`
                                    )
                                  }
                                >
                                  <div className="full-free-content">
                                    <div className="full-free-icon">
                                      <CalendarIcon size={18} />
                                    </div>
                                    <div className="full-free-text">
                                      <div className="full-free-title">
                                        {seg.title}
                                      </div>
                                      <div className="full-free-sub">
                                        {seg.subtitle}
                                      </div>
                                    </div>
                                  </div>
                                  <button
                                    type="button"
                                    className="btn-full-free-action"
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      navigate(
                                        `/dat-phong?roomId=${room.id}&date=${selectedDate}&startTime=14:00:00&endTime=16:00:00`
                                      );
                                    }}
                                  >
                                    {seg.actionText}
                                  </button>
                                </div>
                              );
                            }

                            if (seg.type === "past") {
                              return (
                                <div
                                  key={seg.id}
                                  className="segment-card segment-past"
                                  style={{
                                    left: `${seg.leftPercent}%`,
                                    width: `${seg.widthPercent}%`,
                                  }}
                                >
                                  <span className="past-text">
                                    {seg.title}
                                  </span>
                                </div>
                              );
                            }

                            if (seg.type === "free") {
                              return (
                                <div
                                  key={seg.id}
                                  className="segment-card segment-free"
                                  style={{
                                    left: `${seg.leftPercent}%`,
                                    width: `${seg.widthPercent}%`,
                                  }}
                                  title="Nhấp để đăng ký mượn khung giờ này"
                                  onClick={() =>
                                    navigate(
                                      `/dat-phong?roomId=${room.id}&date=${selectedDate}&startTime=${seg.startTimeStr}:00&endTime=${seg.endTimeStr}:00`
                                    )
                                  }
                                >
                                  <span className="free-segment-text">
                                    {seg.title}
                                  </span>
                                </div>
                              );
                            }

                            // Booked, In-use, or Conference
                            return (
                              <div
                                key={seg.id}
                                className={`segment-card segment-${seg.type}`}
                                style={{
                                  left: `${seg.leftPercent}%`,
                                  width: `${seg.widthPercent}%`,
                                }}
                                title={`${seg.title || "Lịch đặt phòng"} (${seg.startTimeStr} - ${seg.endTimeStr})`}
                                onClick={() =>
                                  navigate(
                                    `/dat-phong?tab=my-bookings`
                                  )
                                }
                              >
                                <div className="card-top-row">
                                  <span className="card-time-span">
                                    {seg.type === "in-use" && (
                                      <span className="card-live-dot">●</span>
                                    )}
                                    {seg.type === "conference" && (
                                      <span className="card-speaker-icon">
                                        📢
                                      </span>
                                    )}
                                    {seg.startTimeStr} - {seg.endTimeStr}
                                  </span>
                                  {seg.badgeText && (
                                    <span
                                      className={`card-status-badge ${seg.type}`}
                                    >
                                      {seg.badgeText}
                                    </span>
                                  )}
                                </div>

                                <div className="card-activity-name">
                                  {seg.title}
                                </div>

                                {seg.subtitle && (
                                  <div className="card-sub-info">
                                    {seg.subtitle}
                                  </div>
                                )}
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>

          {/* 4 Bottom KPI Summary Cards */}
          <section className="matrix-kpi-grid">
            {/* Card 1: Available Rooms */}
            <div className="kpi-card">
              <div className="kpi-icon-box teal">
                <svg
                  width="22"
                  height="22"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <path d="M3 21h18M6 21V5a2 2 0 0 1 2-2h8a2 2 0 0 1 2 2v16M14 11v.01" />
                </svg>
              </div>
              <div className="kpi-text-box">
                <div className="kpi-value">{kpis.availableText}</div>
                <div className="kpi-label">{kpis.availableSub}</div>
              </div>
            </div>

            {/* Card 2: Confirmed Bookings */}
            <div className="kpi-card">
              <div className="kpi-icon-box blue">
                <ClockIcon size={22} />
              </div>
              <div className="kpi-text-box">
                <div className="kpi-value">{kpis.confirmedText}</div>
                <div className="kpi-label">{kpis.confirmedSub}</div>
              </div>
            </div>

            {/* Card 3: In Use Session */}
            <div className="kpi-card">
              <div className="kpi-icon-box orange">
                <UsersIcon size={22} />
              </div>
              <div className="kpi-text-box">
                <div className="kpi-value">{kpis.inUseText}</div>
                <div className="kpi-label">{kpis.inUseSub}</div>
              </div>
            </div>

            {/* Card 4: Check-in Rule */}
            <div className="kpi-card">
              <div className="kpi-icon-box slate">
                <svg
                  width="22"
                  height="22"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <rect x="2" y="5" width="20" height="14" rx="2" />
                  <line x1="2" y1="10" x2="22" y2="10" />
                </svg>
              </div>
              <div className="kpi-text-box">
                <div className="kpi-value">{kpis.checkinTitle}</div>
                <div className="kpi-label">{kpis.checkinSub}</div>
              </div>
            </div>
          </section>
        </div>
      </main>
    </div>
  );
}
