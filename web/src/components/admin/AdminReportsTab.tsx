import { useState, useEffect, useMemo } from "react";
import {
  fetchOverviewReport,
  fetchBookingStatsReport,
  fetchRoomUsageReport,
  fetchViolationStatsReport,
  downloadReportCsv,
  type SystemOverviewReport,
  type BookingStatsReport,
  type RoomUsageReport,
  type ViolationStatsReport,
} from "../../lib/reports";
import {
  ClockIcon,
  AlertTriangleIcon,
  ClipboardListIcon,
  BriefcaseIcon,
  BarChartIcon,
  BuildingIcon,
  BanIcon,
  DownloadIcon,
  TrendingUpIcon,
  PieChartIcon,
  TargetIcon,
  GraduationCapIcon,
  TrophyIcon,
  TagIcon,
  WrenchIcon,
  ScaleIcon,
  CheckCircleIcon,
} from "../Icon";

interface AdminReportsTabProps {
  onNotify?: (text: string, type?: "success" | "warning" | "info") => void;
}

const BOOKING_STATUS_COLORS = {
  approved: "#10b981",
  pending: "#f59e0b",
  completed: "#3b82f6",
  rejected: "#ef4444",
  cancelled: "#6b7280",
} as const;

const BOOKING_CHART_LEGEND = [
  { label: "Đã duyệt", color: BOOKING_STATUS_COLORS.approved },
  { label: "Chờ duyệt", color: BOOKING_STATUS_COLORS.pending },
  { label: "Hoàn thành", color: BOOKING_STATUS_COLORS.completed },
  { label: "Từ chối", color: BOOKING_STATUS_COLORS.rejected },
  { label: "Đã hủy", color: BOOKING_STATUS_COLORS.cancelled },
];

export default function AdminReportsTab({ onNotify }: AdminReportsTabProps) {
  // Sub-tab selection: "bookings" | "rooms" | "violations"
  const [subTab, setSubTab] = useState<"bookings" | "rooms" | "violations">("bookings");

  // Date Range Quick Filter
  const [rangePreset, setRangePreset] = useState<"7days" | "30days" | "quarter" | "year" | "custom">("30days");
  const [customFromDate, setCustomFromDate] = useState<string>("");
  const [customToDate, setCustomToDate] = useState<string>("");

  // Loading states
  const [loading, setLoading] = useState<boolean>(true);
  const [isExporting, setIsExporting] = useState<boolean>(false);

  // Data states
  const [overview, setOverview] = useState<SystemOverviewReport | null>(null);
  const [bookingReport, setBookingReport] = useState<BookingStatsReport | null>(null);
  const [roomReport, setRoomReport] = useState<RoomUsageReport | null>(null);
  const [violationReport, setViolationReport] = useState<ViolationStatsReport | null>(null);

  // Compute active date range filters
  const dateParams = useMemo(() => {
    const now = new Date();
    let from = new Date();

    if (rangePreset === "7days") {
      from.setDate(now.getDate() - 7);
    } else if (rangePreset === "30days") {
      from.setDate(now.getDate() - 30);
    } else if (rangePreset === "quarter") {
      from.setDate(now.getDate() - 90);
    } else if (rangePreset === "year") {
      from.setDate(now.getDate() - 365);
    } else if (rangePreset === "custom") {
      return {
        fromDate: customFromDate || undefined,
        toDate: customToDate || undefined,
      };
    }

    return {
      fromDate: from.toISOString().slice(0, 10),
      toDate: now.toISOString().slice(0, 10),
    };
  }, [rangePreset, customFromDate, customToDate]);

  // Load report data
  const loadReports = async () => {
    setLoading(true);
    try {
      const [over, book, room, vio] = await Promise.all([
        fetchOverviewReport(dateParams),
        fetchBookingStatsReport(dateParams),
        fetchRoomUsageReport(dateParams),
        fetchViolationStatsReport(dateParams),
      ]);

      setOverview(over);
      setBookingReport(book);
      setRoomReport(room);
      setViolationReport(vio);
    } catch (err: unknown) {
      console.error("Lỗi tải báo cáo thống kê:", err);
      onNotify?.("Không thể tải dữ liệu báo cáo lúc này.", "warning");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadReports();
  }, [dateParams]);

  // Handle Export CSV
  const handleExport = async (type: "bookings" | "rooms" | "violations") => {
    setIsExporting(true);
    try {
      await downloadReportCsv(type, dateParams);
      onNotify?.("Xuất báo cáo định dạng CSV thành công!", "success");
    } catch (err: unknown) {
      console.error("Lỗi xuất file CSV:", err);
      onNotify?.("Không thể xuất file báo cáo lúc này.", "warning");
    } finally {
      setIsExporting(false);
    }
  };

  // Max value for SVG Bar Chart
  const maxBarValue = useMemo(() => {
    if (!bookingReport?.timeSeries || bookingReport.timeSeries.length === 0) return 1;
    const maxVal = Math.max(...bookingReport.timeSeries.map((p) => p.total));
    return Math.max(1, maxVal);
  }, [bookingReport]);

  // Chưa có đơn nào được duyệt / chưa có dữ liệu → không hiển thị 0% gây hiểu sai
  const totalBookingsInRange = overview?.totalBookings ?? 0;
  const approvedBookingsInRange = overview?.approvedBookings ?? 0;
  const hasBookingData = bookingReport?.timeSeries.some((p) => p.total > 0) ?? false;
  const approvalCaption =
    totalBookingsInRange === 0
      ? "Chưa có đơn nào trong kỳ"
      : approvedBookingsInRange === 0
      ? `0/${totalBookingsInRange} đơn đã duyệt`
      : null;

  return (
    <div className="admin-reports-container">
      {/* ── 1. Top Executive KPI Grid ──────────────────────────────────────── */}
      <div className="admin-kpi-grid">
        <div className="kpi-card kpi-blue">
          <div className="kpi-icon-wrap">
            <ClipboardListIcon size={24} />
          </div>
          <div className="kpi-info">
            <span className="kpi-label">Tổng lượt mượn phòng</span>
            <strong className="kpi-value">{overview?.totalBookings || 0}</strong>
            <span className="kpi-sub">
              {approvalCaption ?? (
                <>
                  Đã duyệt: <strong>{overview?.approvalRate ?? 0}%</strong> ·{" "}
                  {approvedBookingsInRange} đơn
                </>
              )}
            </span>
          </div>
        </div>

        <div className="kpi-card kpi-green">
          <div className="kpi-icon-wrap">
            <ClockIcon size={24} />
          </div>
          <div className="kpi-info">
            <span className="kpi-label">Tổng giờ sử dụng thực tế</span>
            <strong className="kpi-value">{overview?.totalUsageHours || 0} giờ</strong>
            <span className="kpi-sub">
              {overview?.totalRoomsUsed || 0} / {overview?.totalRooms || 0} phòng được khai thác
            </span>
          </div>
        </div>

        <div className="kpi-card kpi-red">
          <div className="kpi-icon-wrap">
            <AlertTriangleIcon size={24} />
          </div>
          <div className="kpi-info">
            <span className="kpi-label">Biên bản vi phạm</span>
            <strong className="kpi-value">{overview?.totalViolations || 0}</strong>
            <span className="kpi-sub">
              Đang cấm mượn: <strong>{overview?.activeBannedUsers || 0}</strong> tài khoản
            </span>
          </div>
        </div>

        <div className="kpi-card kpi-purple">
          <div className="kpi-icon-wrap">
            <BriefcaseIcon size={24} />
          </div>
          <div className="kpi-info">
            <span className="kpi-label">Vận hành ca trực</span>
            <strong className="kpi-value">{overview?.totalShifts || 0} ca</strong>
            <span className="kpi-sub">
              Hoàn thành: <strong>{overview?.completedShifts || 0}</strong> ca • {overview?.totalShiftLogs || 0} nhật ký
            </span>
          </div>
        </div>
      </div>

      {/* ── 2. Time Filter & Export Toolbar ─────────────────────────────────── */}
      <div className="table-filter-bar">
        <div style={{ display: "flex", alignItems: "center", gap: "10px", flexWrap: "wrap" }}>
          <span style={{ fontSize: "13px", fontWeight: 700, color: "var(--rp-text)" }}>
            Khung thời gian báo cáo:
          </span>
          <div className="btn-group-segmented">
            <button
              type="button"
              className={`seg-item-btn ${rangePreset === "7days" ? "active" : ""}`}
              onClick={() => setRangePreset("7days")}
            >
              7 ngày qua
            </button>
            <button
              type="button"
              className={`seg-item-btn ${rangePreset === "30days" ? "active" : ""}`}
              onClick={() => setRangePreset("30days")}
            >
              30 ngày qua
            </button>
            <button
              type="button"
              className={`seg-item-btn ${rangePreset === "quarter" ? "active" : ""}`}
              onClick={() => setRangePreset("quarter")}
            >
              Quý này (90 ngày)
            </button>
            <button
              type="button"
              className={`seg-item-btn ${rangePreset === "year" ? "active" : ""}`}
              onClick={() => setRangePreset("year")}
            >
              Năm nay
            </button>
            <button
              type="button"
              className={`seg-item-btn ${rangePreset === "custom" ? "active" : ""}`}
              onClick={() => setRangePreset("custom")}
            >
              Tùy chọn
            </button>
          </div>

          {rangePreset === "custom" && (
            <div style={{ display: "inline-flex", gap: "6px", alignItems: "center" }}>
              <input
                type="date"
                className="filter-select"
                style={{ height: "38px" }}
                value={customFromDate}
                onChange={(e) => setCustomFromDate(e.target.value)}
              />
              <span style={{ color: "var(--rp-muted)" }}>→</span>
              <input
                type="date"
                className="filter-select"
                style={{ height: "38px" }}
                value={customToDate}
                onChange={(e) => setCustomToDate(e.target.value)}
              />
            </div>
          )}
        </div>

        {/* Export CSV button */}
        <div style={{ marginLeft: "auto", display: "flex", gap: "8px" }}>
          <button
            type="button"
            className="btn-toolbar-primary"
            disabled={isExporting}
            onClick={() => handleExport(subTab)}
            style={{
              padding: "7px 16px",
              fontWeight: 600,
              fontSize: "13px",
              display: "inline-flex",
              alignItems: "center",
              gap: "6px",
            }}
          >
            <DownloadIcon size={15} />
            <span>{isExporting ? "Đang xuất..." : "Xuất Excel / CSV"}</span>
          </button>
        </div>
      </div>

      {/* ── 3. Sub-Tab Switcher ────────────────────────────────────────────── */}
      <div className="report-subtab-bar">
        <button
          type="button"
          className={`report-subtab-btn ${subTab === "bookings" ? "active" : ""}`}
          onClick={() => setSubTab("bookings")}
        >
          <BarChartIcon size={16} />
          <span>Thống kê lượt mượn phòng</span>
        </button>
        <button
          type="button"
          className={`report-subtab-btn ${subTab === "rooms" ? "active" : ""}`}
          onClick={() => setSubTab("rooms")}
        >
          <BuildingIcon size={16} />
          <span>Tình trạng &amp; Hiệu suất phòng</span>
        </button>
        <button
          type="button"
          className={`report-subtab-btn ${subTab === "violations" ? "active" : ""}`}
          onClick={() => setSubTab("violations")}
        >
          <BanIcon size={16} />
          <span>Thống kê vi phạm &amp; Kỷ luật</span>
        </button>
      </div>

      {loading ? (
        <div className="table-loading-box">
          <span>Đang tổng hợp dữ liệu thống kê báo cáo...</span>
        </div>
      ) : subTab === "bookings" ? (
        /* ── SUB-TAB 1: BOOKING STATS ─────────────────────────────────────── */
        <div className="report-subtab-view">
          {/* Trend Bar Chart */}
          <div
            className="profile-section-card"
            style={{
              background: "var(--rp-surface)",
              border: "1px solid var(--rp-border)",
              borderRadius: "12px",
              padding: "20px",
              marginBottom: "20px",
            }}
          >
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "flex-start",
                flexWrap: "wrap",
                gap: "10px 16px",
                marginBottom: "14px",
              }}
            >
              <div>
                <h3 style={{ fontSize: "16px", fontWeight: 800, color: "var(--rp-title)", margin: 0, display: "flex", alignItems: "center", gap: "8px" }}>
                  <TrendingUpIcon size={18} />
                  <span>XU HƯỚNG SỐ LƯỢNG ĐƠN MƯỢN THEO NGÀY</span>
                </h3>
                <span style={{ fontSize: "12.5px", color: "var(--rp-muted)" }}>
                  Biến động số lượng yêu cầu đặt phòng và tình hình xét duyệt qua các mốc thời gian.
                </span>
              </div>
              <div style={{ display: "flex", flexWrap: "wrap", gap: "12px", fontSize: "12px" }}>
                {BOOKING_CHART_LEGEND.map((item) => (
                  <span key={item.label} style={{ display: "inline-flex", alignItems: "center", gap: "4px", color: "var(--rp-text)" }}>
                    <span style={{ width: 10, height: 10, background: item.color, borderRadius: "2px" }} /> {item.label}
                  </span>
                ))}
              </div>
            </div>

            {/* SVG Interactive Chart */}
            {!bookingReport?.timeSeries.length || !hasBookingData ? (
              <div
                style={{
                  padding: "48px 24px",
                  textAlign: "center",
                  color: "var(--rp-muted)",
                  border: "1px dashed var(--rp-border-strong)",
                  borderRadius: "10px",
                  background: "var(--rp-soft)",
                }}
              >
                <strong style={{ display: "block", color: "var(--rp-text)", marginBottom: "4px" }}>
                  Chưa có lượt mượn phòng nào trong kỳ
                </strong>
                Biểu đồ sẽ hiển thị khi có đơn đặt phòng trong khoảng thời gian đã chọn.
              </div>
            ) : (
              <div style={{ overflowX: "auto", paddingBottom: "10px" }}>
                <div
                  style={{
                    display: "flex",
                    alignItems: "flex-end",
                    gap: "12px",
                    height: "220px",
                    paddingTop: "20px",
                    borderBottom: "2px solid var(--rp-border-strong)",
                    minWidth: "600px",
                  }}
                >
                  {bookingReport?.timeSeries.map((pt) => {
                    const totalHeightPct = Math.min(100, (pt.total / maxBarValue) * 100);
                    const segments = [
                      { key: "approved", value: pt.approved, color: BOOKING_STATUS_COLORS.approved },
                      { key: "completed", value: pt.completed ?? 0, color: BOOKING_STATUS_COLORS.completed },
                      { key: "pending", value: pt.pending ?? 0, color: BOOKING_STATUS_COLORS.pending },
                      { key: "rejected", value: pt.rejected, color: BOOKING_STATUS_COLORS.rejected },
                      { key: "cancelled", value: pt.cancelled, color: BOOKING_STATUS_COLORS.cancelled },
                    ];
                    const barBase = Math.max(1, pt.total);
                    const barBreakdown =
                      `Ngày ${pt.label}: Tổng ${pt.total} đơn (Đã duyệt: ${pt.approved}, ` +
                      `Chờ duyệt: ${pt.pending ?? 0}, Hoàn thành: ${pt.completed ?? 0}, ` +
                      `Từ chối: ${pt.rejected}, Đã hủy: ${pt.cancelled})`;

                    return (
                      <div
                        key={pt.dateString}
                        style={{
                          flex: 1,
                          display: "flex",
                          flexDirection: "column",
                          alignItems: "center",
                          height: "100%",
                          justifyContent: "flex-end",
                        }}
                      >
                        {/* Value label */}
                        <span style={{ fontSize: "11px", fontWeight: 700, color: "var(--rp-text)", marginBottom: "4px" }}>
                          {pt.total}
                        </span>

                        {/* Stacked bar */}
                        <div
                          style={{
                            width: "100%",
                            maxWidth: "42px",
                            height: `${Math.max(12, totalHeightPct)}%`,
                            borderRadius: "4px 4px 0 0",
                            overflow: "hidden",
                            display: "flex",
                            flexDirection: "column-reverse",
                            background: "var(--rp-border)",
                            boxShadow: "0 1px 3px rgba(0,0,0,0.1)",
                          }}
                          title={barBreakdown}
                          role="img"
                          aria-label={barBreakdown}
                        >
                          {segments.filter((segment) => segment.value > 0).map((segment) => (
                            <div
                              key={segment.key}
                              style={{
                                height: `${(segment.value / barBase) * 100}%`,
                                background: segment.color,
                              }}
                            />
                          ))}
                        </div>

                        {/* X-axis date label */}
                        <span
                          style={{
                            fontSize: "11px",
                            color: "var(--rp-muted)",
                            marginTop: "6px",
                            whiteSpace: "nowrap",
                            fontWeight: 600,
                          }}
                        >
                          {pt.label}
                        </span>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </div>

          {/* Two-column layout: Status Breakdown & Purpose */}
          <div className="report-grid-2" style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "20px", marginBottom: "20px" }}>
            {/* Status Breakdown */}
            <div
              className="profile-section-card"
              style={{
                background: "var(--rp-surface)",
                border: "1px solid var(--rp-border)",
                borderRadius: "12px",
                padding: "20px",
              }}
            >
              <h4 style={{ fontSize: "15px", fontWeight: 800, color: "var(--rp-title)", marginBottom: "14px", display: "flex", alignItems: "center", gap: "8px" }}>
                <PieChartIcon size={17} />
                <span>TỶ LỆ PHÂN BỐ TRẠNG THÁI ĐƠN MƯỢN</span>
              </h4>
              <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
                {bookingReport?.statusDistribution.map((item) => (
                  <div key={item.name}>
                    <div style={{ display: "flex", justifyContent: "space-between", fontSize: "13px", marginBottom: "4px" }}>
                      <span style={{ fontWeight: 600, color: "var(--rp-text)" }}>{item.name}</span>
                      <span style={{ fontWeight: 700, color: "var(--rp-title)" }}>
                        {item.count} đơn ({item.percentage}%)
                      </span>
                    </div>
                    <div style={{ width: "100%", height: "8px", background: "var(--rp-track)", borderRadius: "4px", overflow: "hidden" }}>
                      <div
                        style={{
                          width: `${item.percentage}%`,
                          height: "100%",
                          background: item.color || "var(--rp-link)",
                          borderRadius: "4px",
                        }}
                      />
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Purpose Distribution */}
            <div
              className="profile-section-card"
              style={{
                background: "var(--rp-surface)",
                border: "1px solid var(--rp-border)",
                borderRadius: "12px",
                padding: "20px",
              }}
            >
              <h4 style={{ fontSize: "15px", fontWeight: 800, color: "var(--rp-title)", marginBottom: "14px", display: "flex", alignItems: "center", gap: "8px" }}>
                <TargetIcon size={17} />
                <span>MỤC ĐÍCH SỬ DỤNG PHÒNG PHỔ BIẾN</span>
              </h4>
              <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
                {bookingReport?.purposeDistribution.map((item, idx) => (
                  <div
                    key={item.name}
                    style={{
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "space-between",
                      padding: "8px 12px",
                      background: "var(--rp-soft)",
                      borderRadius: "6px",
                      fontSize: "13px",
                    }}
                  >
                    <span
                      title={item.name}
                      style={{
                        fontWeight: 600,
                        color: "var(--rp-title)",
                        minWidth: 0,
                        overflow: "hidden",
                        textOverflow: "ellipsis",
                        whiteSpace: "nowrap",
                        paddingRight: "10px",
                      }}
                    >
                      {idx + 1}. {item.name}
                    </span>
                    <span
                      style={{
                        fontWeight: 700,
                        background: "var(--rp-info-bg)",
                        color: "var(--rp-info-ink)",
                        padding: "2px 8px",
                        borderRadius: "10px",
                        fontSize: "12px",
                        flexShrink: 0,
                      }}
                    >
                      {item.count} lượt ({item.percentage}%)
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Cancellation Breakdown (nguồn hủy + lý do hủy) */}
          <div
            className="profile-section-card"
            style={{
              background: "var(--rp-surface)",
              border: "1px solid var(--rp-border)",
              borderRadius: "12px",
              padding: "20px",
              marginBottom: "20px",
            }}
          >
            <h4
              style={{
                fontSize: "15px",
                fontWeight: 800,
                color: "var(--rp-title)",
                marginBottom: "14px",
                display: "flex",
                alignItems: "center",
                gap: "8px",
              }}
            >
              <PieChartIcon size={17} />
              <span>HỦY ĐẶT PHÒNG & LÝ DO HỦY</span>
            </h4>
            <div
              style={{
                display: "grid",
                gridTemplateColumns: "repeat(auto-fit, minmax(190px, 1fr))",
                gap: "12px",
                marginBottom: bookingReport?.cancellationReasonStats?.length ? "16px" : 0,
              }}
            >
              <div style={{ background: "var(--rp-success-bg)", border: "1px solid var(--rp-success-border)", borderRadius: "10px", padding: "12px 14px" }}>
                <div style={{ fontSize: "12px", color: "var(--rp-success-text)", fontWeight: 700, marginBottom: "4px" }}>
                  Sinh viên tự hủy
                </div>
                <div style={{ fontSize: "22px", fontWeight: 800, color: "var(--rp-success-ink)" }}>
                  {bookingReport?.overview?.cancelledByStudent ?? 0}
                </div>
              </div>
              <div style={{ background: "var(--rp-warn-bg)", border: "1px solid var(--rp-warn-border)", borderRadius: "10px", padding: "12px 14px" }}>
                <div style={{ fontSize: "12px", color: "var(--rp-warn-text)", fontWeight: 700, marginBottom: "4px" }}>
                  Tự động hủy (không nhận phòng)
                </div>
                <div style={{ fontSize: "22px", fontWeight: 800, color: "var(--rp-warn-ink)" }}>
                  {bookingReport?.overview?.cancelledByNoShow ?? 0}
                </div>
              </div>
              <div style={{ background: "var(--rp-soft)", border: "1px solid var(--rp-border)", borderRadius: "10px", padding: "12px 14px" }}>
                <div style={{ fontSize: "12px", color: "var(--rp-text)", fontWeight: 700, marginBottom: "4px" }}>
                  Quản trị / nhân sự hủy
                </div>
                <div style={{ fontSize: "22px", fontWeight: 800, color: "var(--rp-text)" }}>
                  {bookingReport?.overview?.cancelledByStaff ?? 0}
                </div>
              </div>
              <div style={{ background: "var(--rp-track)", border: "1px dashed var(--rp-border-strong)", borderRadius: "10px", padding: "12px 14px" }}>
                <div style={{ fontSize: "12px", color: "var(--rp-muted)", fontWeight: 700, marginBottom: "4px" }}>
                  Đơn cũ chưa rõ lý do
                </div>
                <div style={{ fontSize: "22px", fontWeight: 800, color: "var(--rp-muted)" }}>
                  {bookingReport?.overview?.cancelledUnknownSource ?? 0}
                </div>
              </div>
            </div>

            {(bookingReport?.cancellationReasonStats?.length ?? 0) > 0 && (
              <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
                <div style={{ fontSize: "13px", fontWeight: 700, color: "var(--rp-text)" }}>
                  Số lượng hủy theo lý do:
                </div>
                {bookingReport?.cancellationReasonStats?.map((item) => (
                  <div
                    key={item.name}
                    style={{ display: "flex", justifyContent: "space-between", alignItems: "center", background: "var(--rp-soft)", borderRadius: "8px", padding: "8px 12px" }}
                  >
                    <span style={{ fontSize: "13px", color: "var(--rp-text)" }}>{item.name}</span>
                    <span
                      style={{
                        fontWeight: 700,
                        background: "var(--rp-danger-bg)",
                        color: "var(--rp-danger-text)",
                        padding: "2px 8px",
                        borderRadius: "10px",
                        fontSize: "12px",
                        flexShrink: 0,
                      }}
                    >
                      {item.count} đơn ({item.percentage}%)
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Department Booking Table */}
          <div
            className="profile-section-card"
            style={{
              background: "var(--rp-surface)",
              border: "1px solid var(--rp-border)",
              borderRadius: "12px",
              padding: "20px",
            }}
          >
            <h4 style={{ fontSize: "15px", fontWeight: 800, color: "var(--rp-title)", marginBottom: "12px", display: "flex", alignItems: "center", gap: "8px" }}>
              <GraduationCapIcon size={17} />
              <span>THỐNG KÊ LƯỢT MƯỢN THEO KHOA / ĐƠN VỊ</span>
            </h4>
            <table className="admin-custom-table">
              <thead>
                <tr>
                  <th>Tên Khoa / Đơn vị</th>
                  <th style={{ width: "140px", textAlign: "center" }}>Tổng đơn đặt</th>
                  <th style={{ width: "140px", textAlign: "center" }}>Đã duyệt</th>
                  <th style={{ width: "140px", textAlign: "center" }}>Tỷ lệ duyệt (%)</th>
                  <th style={{ width: "160px", textAlign: "right" }}>Tổng giờ sử dụng</th>
                </tr>
              </thead>
              <tbody>
                {bookingReport?.departmentStats.map((dept) => (
                  <tr key={dept.departmentName}>
                    <td>
                      <strong style={{ color: "var(--rp-title)" }}>{dept.departmentName}</strong>
                    </td>
                    <td style={{ textAlign: "center", fontWeight: 700 }}>{dept.totalBookings}</td>
                    <td style={{ textAlign: "center", color: "var(--rp-success-text)", fontWeight: 700 }}>
                      {dept.approvedBookings}
                    </td>
                    <td style={{ textAlign: "center" }}>
                      <span className="table-status-pill pill-approved">{dept.successRate}%</span>
                    </td>
                    <td style={{ textAlign: "right", fontWeight: 800, color: "var(--rp-link)" }}>
                      {dept.totalHoursUsed} giờ
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      ) : subTab === "rooms" ? (
        /* ── SUB-TAB 2: ROOM USAGE & PERFORMANCE ─────────────────────────── */
        <div className="report-subtab-view">
          {/* Top Room Leaderboard Table */}
          <div
            className="profile-section-card"
            style={{
              background: "var(--rp-surface)",
              border: "1px solid var(--rp-border)",
              borderRadius: "12px",
              padding: "20px",
              marginBottom: "20px",
            }}
          >
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "12px" }}>
              <div>
                <h3 style={{ fontSize: "16px", fontWeight: 800, color: "var(--rp-title)", margin: 0, display: "flex", alignItems: "center", gap: "8px" }}>
                  <TrophyIcon size={18} />
                  <span>BẢNG XẾP HẠNG PHÒNG ĐƯỢC MƯỢN NHIỀU NHẤT</span>
                </h3>
                <span style={{ fontSize: "12.5px", color: "var(--rp-muted)" }}>
                  Tỷ lệ lấp đầy (Occupancy Rate) và số giờ khai thác thực tế của từng phòng thư viện.
                </span>
              </div>
            </div>

            <table className="admin-custom-table">
              <thead>
                <tr>
                  <th style={{ width: "60px", textAlign: "center" }}>Hạng</th>
                  <th style={{ width: "120px" }}>Mã phòng</th>
                  <th>Tên phòng</th>
                  <th>Vị trí &amp; Tầng</th>
                  <th>Loại phòng</th>
                  <th style={{ width: "90px", textAlign: "center" }}>Sức chứa</th>
                  <th style={{ width: "110px", textAlign: "center" }}>Lượt mượn</th>
                  <th style={{ width: "120px", textAlign: "right" }}>Tổng giờ dùng</th>
                  <th style={{ width: "140px", textAlign: "center" }}>Tỷ lệ lấp đầy</th>
                </tr>
              </thead>
              <tbody>
                {roomReport?.topRooms.map((room, idx) => (
                  <tr key={room.roomId}>
                    <td style={{ textAlign: "center" }}>
                      <span className={`rank-badge ${idx < 3 ? `rank-${idx + 1}` : "rank-other"}`}>
                        {idx + 1}
                      </span>
                    </td>
                    <td>
                      <span className="font-mono bold color-blue">{room.roomCode}</span>
                    </td>
                    <td>
                      <strong style={{ color: "var(--rp-title)" }}>{room.roomName}</strong>
                    </td>
                    <td>
                      {room.building} — {room.floor}
                    </td>
                    <td>
                      <span className="user-badge-pill" style={{ background: "var(--rp-track)" }}>
                        {room.roomTypeName}
                      </span>
                    </td>
                    <td style={{ textAlign: "center" }}>{room.capacity} chỗ</td>
                    <td style={{ textAlign: "center", fontWeight: 700 }}>{room.totalBookings}</td>
                    <td style={{ textAlign: "right", fontWeight: 800, color: "var(--rp-link)" }}>
                      {room.totalHours} giờ
                    </td>
                    <td style={{ textAlign: "center" }}>
                      <div style={{ display: "flex", alignItems: "center", gap: "6px", justifyContent: "center" }}>
                        <div style={{ width: "60px", height: "6px", background: "var(--rp-border)", borderRadius: "3px" }}>
                          <div
                            style={{
                              width: `${Math.min(100, room.occupancyRate)}%`,
                              height: "100%",
                              background: room.occupancyRate > 50 ? "#16a34a" : "var(--rp-link)",
                              borderRadius: "3px",
                            }}
                          />
                        </div>
                        <span style={{ fontSize: "12px", fontWeight: 700 }}>{room.occupancyRate}%</span>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Two Columns: Room Types & Building Stats */}
          <div className="report-grid-2" style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "20px" }}>
            <div
              className="profile-section-card"
              style={{
                background: "var(--rp-surface)",
                border: "1px solid var(--rp-border)",
                borderRadius: "12px",
                padding: "20px",
              }}
            >
              <h4 style={{ fontSize: "15px", fontWeight: 800, color: "var(--rp-title)", marginBottom: "14px", display: "flex", alignItems: "center", gap: "8px" }}>
                <TagIcon size={17} />
                <span>KHAI THÁC THEO LOẠI PHÒNG</span>
              </h4>
              <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
                {roomReport?.roomTypeStats.map((item) => (
                  <div
                    key={item.roomTypeName}
                    style={{
                      display: "flex",
                      justifyContent: "space-between",
                      alignItems: "center",
                      padding: "8px 12px",
                      background: "var(--rp-soft)",
                      borderRadius: "6px",
                      fontSize: "13px",
                    }}
                  >
                    <div>
                      <strong style={{ color: "var(--rp-title)" }}>{item.roomTypeName}</strong>
                      <span style={{ fontSize: "12px", color: "var(--rp-muted)", marginLeft: "6px" }}>
                        ({item.roomCount} phòng)
                      </span>
                    </div>
                    <span style={{ fontWeight: 800, color: "var(--rp-link)" }}>
                      {item.totalHours} giờ ({item.sharePercentage}%)
                    </span>
                  </div>
                ))}
              </div>
            </div>

            <div
              className="profile-section-card"
              style={{
                background: "var(--rp-surface)",
                border: "1px solid var(--rp-border)",
                borderRadius: "12px",
                padding: "20px",
              }}
            >
              <h4 style={{ fontSize: "15px", fontWeight: 800, color: "var(--rp-title)", marginBottom: "14px", display: "flex", alignItems: "center", gap: "8px" }}>
                <WrenchIcon size={17} />
                <span>TÌNH TRẠNG THIẾT BỊ SAU KHI TRẢ PHÒNG</span>
              </h4>
              <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
                <div style={{ display: "flex", justifyContent: "space-between", fontSize: "13.5px" }}>
                  <span>Tỷ lệ bàn giao thiết bị tốt:</span>
                  <strong style={{ color: "var(--rp-success-text)" }}>{roomReport?.equipmentGoodRate || 100}%</strong>
                </div>
                <div style={{ display: "flex", justifyContent: "space-between", fontSize: "13.5px" }}>
                  <span>Số ca trả phòng bình thường / sạch sẽ:</span>
                  <strong>{roomReport?.normalCheckoutCount || 0} ca</strong>
                </div>
                <div style={{ display: "flex", justifyContent: "space-between", fontSize: "13.5px" }}>
                  <span>Số ca ghi nhận thiết bị lỗi / cần bảo trì:</span>
                  <strong style={{ color: "#dc2626" }}>{roomReport?.issueCheckoutCount || 0} ca</strong>
                </div>
              </div>
            </div>
          </div>
        </div>
      ) : (
        /* ── SUB-TAB 3: VIOLATIONS & DISCIPLINE ───────────────────────────── */
        <div className="report-subtab-view">
          {/* Active Bans Alert Card */}
          <div
            className="profile-section-card"
            style={{
              background: "var(--rp-surface)",
              border: "1px solid var(--rp-border)",
              borderRadius: "12px",
              padding: "20px",
              marginBottom: "20px",
            }}
          >
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "12px" }}>
              <div>
                <h3 style={{ fontSize: "16px", fontWeight: 800, color: "var(--rp-danger-text)", margin: 0, display: "flex", alignItems: "center", gap: "8px" }}>
                  <AlertTriangleIcon size={18} /> DANH SÁCH TÀI KHOẢN ĐANG BỊ CẤM MƯỢN PHÒNG ({violationReport?.activeBansCount || 0})
                </h3>
                <span style={{ fontSize: "12.5px", color: "var(--rp-muted)" }}>
                  Các sinh viên / người dùng có quyết định kỷ luật cấm mượn phòng còn hiệu lực thi hành.
                </span>
              </div>
            </div>

            {violationReport?.currentActiveBans.length === 0 ? (
              <div style={{ padding: "24px", textAlign: "center", color: "var(--rp-success-text)", fontWeight: 600, display: "flex", alignItems: "center", justifyContent: "center", gap: "6px" }}>
                <CheckCircleIcon size={16} />
                <span>Hiện không có tài khoản nào bị cấm mượn phòng.</span>
              </div>
            ) : (
              <table className="admin-custom-table">
                <thead>
                  <tr>
                    <th>Mã số định danh</th>
                    <th>Họ và tên</th>
                    <th>Hình thức kỷ luật</th>
                    <th>Lý do vi phạm</th>
                    <th>Ngày bắt đầu</th>
                    <th>Ngày kết thúc</th>
                    <th style={{ width: "120px", textAlign: "center" }}>Số ngày còn</th>
                  </tr>
                </thead>
                <tbody>
                  {violationReport?.currentActiveBans.map((ban) => (
                    <tr key={ban.id}>
                      <td>
                        <span className="font-mono bold color-blue">{ban.cardCode}</span>
                      </td>
                      <td>
                        <strong style={{ color: "var(--rp-title)" }}>{ban.fullName}</strong>
                      </td>
                      <td>
                        <span className="table-status-pill pill-rejected" style={{ fontWeight: 700 }}>
                          {ban.restrictionType}
                        </span>
                      </td>
                      <td style={{ fontSize: "13px", color: "var(--rp-text)" }}>{ban.reason}</td>
                      <td>{new Date(ban.startAt).toLocaleDateString("vi-VN")}</td>
                      <td>
                        {ban.endAt ? new Date(ban.endAt).toLocaleDateString("vi-VN") : "Vô thời hạn"}
                      </td>
                      <td style={{ textAlign: "center" }}>
                        <span
                          style={{
                            background: "var(--rp-danger-bg)",
                            color: "var(--rp-danger-ink)",
                            padding: "3px 8px",
                            borderRadius: "10px",
                            fontWeight: 800,
                            fontSize: "12px",
                          }}
                        >
                          {ban.remainingDays} ngày
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>

          {/* Severity & Violation Type Breakdown */}
          <div className="report-grid-2" style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "20px" }}>
            <div
              className="profile-section-card"
              style={{
                background: "var(--rp-surface)",
                border: "1px solid var(--rp-border)",
                borderRadius: "12px",
                padding: "20px",
              }}
            >
              <h4 style={{ fontSize: "15px", fontWeight: 800, color: "var(--rp-title)", marginBottom: "14px", display: "flex", alignItems: "center", gap: "8px" }}>
                <ScaleIcon size={17} />
                <span>PHÂN BỐ THEO MỨC ĐỘ NGHIÊM TRỌNG</span>
              </h4>
              <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
                {violationReport?.severityDistribution.map((item) => (
                  <div key={item.name}>
                    <div style={{ display: "flex", justifyContent: "space-between", fontSize: "13px", marginBottom: "4px" }}>
                      <span style={{ fontWeight: 600, color: "var(--rp-text)" }}>{item.name}</span>
                      <span style={{ fontWeight: 700, color: "var(--rp-title)" }}>
                        {item.count} vụ ({item.percentage}%)
                      </span>
                    </div>
                    <div style={{ width: "100%", height: "8px", background: "var(--rp-track)", borderRadius: "4px", overflow: "hidden" }}>
                      <div
                        style={{
                          width: `${item.percentage}%`,
                          height: "100%",
                          background: item.color || "#ef4444",
                          borderRadius: "4px",
                        }}
                      />
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div
              className="profile-section-card"
              style={{
                background: "var(--rp-surface)",
                border: "1px solid var(--rp-border)",
                borderRadius: "12px",
                padding: "20px",
              }}
            >
              <h4 style={{ fontSize: "15px", fontWeight: 800, color: "var(--rp-title)", marginBottom: "14px", display: "flex", alignItems: "center", gap: "8px" }}>
                <ClipboardListIcon size={17} />
                <span>CÁC LỖI VI PHẠM THƯỜNG GẶP</span>
              </h4>
              <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
                {violationReport?.typeDistribution.map((item, idx) => (
                  <div
                    key={item.name}
                    style={{
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "space-between",
                      padding: "8px 12px",
                      background: "var(--rp-soft)",
                      borderRadius: "6px",
                      fontSize: "13px",
                    }}
                  >
                    <span
                      title={item.name}
                      style={{
                        fontWeight: 600,
                        color: "var(--rp-title)",
                        minWidth: 0,
                        overflow: "hidden",
                        textOverflow: "ellipsis",
                        whiteSpace: "nowrap",
                        paddingRight: "10px",
                      }}
                    >
                      {idx + 1}. {item.name}
                    </span>
                    <span
                      style={{
                        fontWeight: 700,
                        background: "var(--rp-danger-bg)",
                        color: "var(--rp-danger-ink)",
                        padding: "2px 8px",
                        borderRadius: "10px",
                        fontSize: "12px",
                        flexShrink: 0,
                      }}
                    >
                      {item.count} biên bản
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
