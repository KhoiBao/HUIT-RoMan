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
    if (!bookingReport?.timeSeries || bookingReport.timeSeries.length === 0) return 10;
    const maxVal = Math.max(...bookingReport.timeSeries.map((p) => p.total));
    return Math.max(10, maxVal);
  }, [bookingReport]);

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
              Duyệt thành công: <strong>{overview?.approvalRate || 0}%</strong> ({overview?.approvedBookings || 0} đơn)
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
          <span style={{ fontSize: "13px", fontWeight: 700, color: "#475569" }}>
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
              <span style={{ color: "#64748b" }}>→</span>
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
              background: "#059669",
              borderColor: "#059669",
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
              background: "#ffffff",
              border: "1px solid #e2e8f0",
              borderRadius: "12px",
              padding: "20px",
              marginBottom: "20px",
            }}
          >
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "14px" }}>
              <div>
                <h3 style={{ fontSize: "16px", fontWeight: 800, color: "#1e293b", margin: 0, display: "flex", alignItems: "center", gap: "8px" }}>
                  <TrendingUpIcon size={18} />
                  <span>XU HƯỚNG SỐ LƯỢNG ĐƠN MƯỢN THEO NGÀY</span>
                </h3>
                <span style={{ fontSize: "12.5px", color: "#64748b" }}>
                  Biến động số lượng yêu cầu đặt phòng và tình hình xét duyệt qua các mốc thời gian.
                </span>
              </div>
              <div style={{ display: "flex", gap: "12px", fontSize: "12px" }}>
                <span style={{ display: "inline-flex", alignItems: "center", gap: "4px" }}>
                  <span style={{ width: 10, height: 10, background: "#10b981", borderRadius: "2px" }} /> Đã duyệt
                </span>
                <span style={{ display: "inline-flex", alignItems: "center", gap: "4px" }}>
                  <span style={{ width: 10, height: 10, background: "#f59e0b", borderRadius: "2px" }} /> Chờ duyệt
                </span>
                <span style={{ display: "inline-flex", alignItems: "center", gap: "4px" }}>
                  <span style={{ width: 10, height: 10, background: "#ef4444", borderRadius: "2px" }} /> Từ chối
                </span>
              </div>
            </div>

            {/* SVG Interactive Chart */}
            {bookingReport?.timeSeries.length === 0 ? (
              <div style={{ padding: "40px", textAlign: "center", color: "#94a3b8" }}>
                Không có dữ liệu lượt mượn trong khoảng thời gian đã chọn.
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
                    borderBottom: "2px solid #cbd5e1",
                    minWidth: "600px",
                  }}
                >
                  {bookingReport?.timeSeries.map((pt) => {
                    const totalHeightPct = Math.min(100, (pt.total / maxBarValue) * 100);
                    const approvedHeightPct = pt.total > 0 ? (pt.approved / pt.total) * 100 : 0;
                    const rejectedHeightPct = pt.total > 0 ? (pt.rejected / pt.total) * 100 : 0;

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
                        <span style={{ fontSize: "11px", fontWeight: 700, color: "#334155", marginBottom: "4px" }}>
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
                            background: "#e2e8f0",
                            boxShadow: "0 1px 3px rgba(0,0,0,0.1)",
                          }}
                          title={`Ngày ${pt.dateString}: Tổng ${pt.total} đơn (Đã duyệt: ${pt.approved}, Từ chối: ${pt.rejected}, Hủy: ${pt.cancelled})`}
                        >
                          <div style={{ height: `${approvedHeightPct}%`, background: "#10b981" }} />
                          <div style={{ height: `${rejectedHeightPct}%`, background: "#ef4444" }} />
                        </div>

                        {/* X-axis date label */}
                        <span
                          style={{
                            fontSize: "11px",
                            color: "#64748b",
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
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "20px", marginBottom: "20px" }}>
            {/* Status Breakdown */}
            <div
              className="profile-section-card"
              style={{
                background: "#ffffff",
                border: "1px solid #e2e8f0",
                borderRadius: "12px",
                padding: "20px",
              }}
            >
              <h4 style={{ fontSize: "15px", fontWeight: 800, color: "#1e293b", marginBottom: "14px", display: "flex", alignItems: "center", gap: "8px" }}>
                <PieChartIcon size={17} />
                <span>TỶ LỆ PHÂN BỐ TRẠNG THÁI ĐƠN MƯỢN</span>
              </h4>
              <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
                {bookingReport?.statusDistribution.map((item) => (
                  <div key={item.name}>
                    <div style={{ display: "flex", justifyContent: "space-between", fontSize: "13px", marginBottom: "4px" }}>
                      <span style={{ fontWeight: 600, color: "#334155" }}>{item.name}</span>
                      <span style={{ fontWeight: 700, color: item.color || "#0f172a" }}>
                        {item.count} đơn ({item.percentage}%)
                      </span>
                    </div>
                    <div style={{ width: "100%", height: "8px", background: "#f1f5f9", borderRadius: "4px", overflow: "hidden" }}>
                      <div
                        style={{
                          width: `${item.percentage}%`,
                          height: "100%",
                          background: item.color || "#3b82f6",
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
                background: "#ffffff",
                border: "1px solid #e2e8f0",
                borderRadius: "12px",
                padding: "20px",
              }}
            >
              <h4 style={{ fontSize: "15px", fontWeight: 800, color: "#1e293b", marginBottom: "14px", display: "flex", alignItems: "center", gap: "8px" }}>
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
                      background: "#f8fafc",
                      borderRadius: "6px",
                      fontSize: "13px",
                    }}
                  >
                    <span style={{ fontWeight: 600, color: "#1e293b" }}>
                      {idx + 1}. {item.name}
                    </span>
                    <span
                      style={{
                        fontWeight: 700,
                        background: "#e0f2fe",
                        color: "#0369a1",
                        padding: "2px 8px",
                        borderRadius: "10px",
                        fontSize: "12px",
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
              background: "#ffffff",
              border: "1px solid #e2e8f0",
              borderRadius: "12px",
              padding: "20px",
              marginBottom: "20px",
            }}
          >
            <h4
              style={{
                fontSize: "15px",
                fontWeight: 800,
                color: "#1e293b",
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
              <div style={{ background: "#f0fdf4", border: "1px solid #bbf7d0", borderRadius: "10px", padding: "12px 14px" }}>
                <div style={{ fontSize: "12px", color: "#15803d", fontWeight: 700, marginBottom: "4px" }}>
                  Sinh viên tự hủy
                </div>
                <div style={{ fontSize: "22px", fontWeight: 800, color: "#166534" }}>
                  {bookingReport?.overview?.cancelledByStudent ?? 0}
                </div>
              </div>
              <div style={{ background: "#fff7ed", border: "1px solid #fed7aa", borderRadius: "10px", padding: "12px 14px" }}>
                <div style={{ fontSize: "12px", color: "#c2410c", fontWeight: 700, marginBottom: "4px" }}>
                  Tự động hủy (không nhận phòng)
                </div>
                <div style={{ fontSize: "22px", fontWeight: 800, color: "#9a3412" }}>
                  {bookingReport?.overview?.cancelledByNoShow ?? 0}
                </div>
              </div>
              <div style={{ background: "#f8fafc", border: "1px solid #e2e8f0", borderRadius: "10px", padding: "12px 14px" }}>
                <div style={{ fontSize: "12px", color: "#475569", fontWeight: 700, marginBottom: "4px" }}>
                  Quản trị / nhân sự hủy
                </div>
                <div style={{ fontSize: "22px", fontWeight: 800, color: "#334155" }}>
                  {bookingReport?.overview?.cancelledByStaff ?? 0}
                </div>
              </div>
              <div style={{ background: "#f1f5f9", border: "1px dashed #cbd5e1", borderRadius: "10px", padding: "12px 14px" }}>
                <div style={{ fontSize: "12px", color: "#64748b", fontWeight: 700, marginBottom: "4px" }}>
                  Đơn cũ chưa rõ lý do
                </div>
                <div style={{ fontSize: "22px", fontWeight: 800, color: "#94a3b8" }}>
                  {bookingReport?.overview?.cancelledUnknownSource ?? 0}
                </div>
              </div>
            </div>

            {(bookingReport?.cancellationReasonStats?.length ?? 0) > 0 && (
              <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
                <div style={{ fontSize: "13px", fontWeight: 700, color: "#334155" }}>
                  Số lượng hủy theo lý do:
                </div>
                {bookingReport?.cancellationReasonStats?.map((item) => (
                  <div
                    key={item.name}
                    style={{ display: "flex", justifyContent: "space-between", alignItems: "center", background: "#f8fafc", borderRadius: "8px", padding: "8px 12px" }}
                  >
                    <span style={{ fontSize: "13px", color: "#334155" }}>{item.name}</span>
                    <span
                      style={{
                        fontWeight: 700,
                        background: "#fee2e2",
                        color: "#b91c1c",
                        padding: "2px 8px",
                        borderRadius: "10px",
                        fontSize: "12px",
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
              background: "#ffffff",
              border: "1px solid #e2e8f0",
              borderRadius: "12px",
              padding: "20px",
            }}
          >
            <h4 style={{ fontSize: "15px", fontWeight: 800, color: "#1e293b", marginBottom: "12px", display: "flex", alignItems: "center", gap: "8px" }}>
              <GraduationCapIcon size={17} />
              <span>THỐNG KÊ LƯỢT MƯỢN THEO KHOA / ĐƠN VỊ</span>
            </h4>
            <table className="admin-custom-table">
              <thead>
                <tr>
                  <th>Tên Khoa / Đơn vị</th>
                  <th style={{ width: "140px", textAlign: "center" }}>Tổng đơn đặt</th>
                  <th style={{ width: "140px", textAlign: "center" }}>Đã duyệt thành công</th>
                  <th style={{ width: "140px", textAlign: "center" }}>Tỷ lệ duyệt (%)</th>
                  <th style={{ width: "160px", textAlign: "right" }}>Tổng giờ sử dụng</th>
                </tr>
              </thead>
              <tbody>
                {bookingReport?.departmentStats.map((dept) => (
                  <tr key={dept.departmentName}>
                    <td>
                      <strong style={{ color: "#0f172a" }}>{dept.departmentName}</strong>
                    </td>
                    <td style={{ textAlign: "center", fontWeight: 700 }}>{dept.totalBookings}</td>
                    <td style={{ textAlign: "center", color: "#15803d", fontWeight: 700 }}>
                      {dept.approvedBookings}
                    </td>
                    <td style={{ textAlign: "center" }}>
                      <span className="table-status-pill pill-approved">{dept.successRate}%</span>
                    </td>
                    <td style={{ textAlign: "right", fontWeight: 800, color: "#0284c7" }}>
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
              background: "#ffffff",
              border: "1px solid #e2e8f0",
              borderRadius: "12px",
              padding: "20px",
              marginBottom: "20px",
            }}
          >
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "12px" }}>
              <div>
                <h3 style={{ fontSize: "16px", fontWeight: 800, color: "#1e293b", margin: 0, display: "flex", alignItems: "center", gap: "8px" }}>
                  <TrophyIcon size={18} />
                  <span>BẢNG XẾP HẠNG PHÒNG ĐƯỢC MƯỢN NHIỀU NHẤT</span>
                </h3>
                <span style={{ fontSize: "12.5px", color: "#64748b" }}>
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
                      <strong style={{ color: "#0f172a" }}>{room.roomName}</strong>
                    </td>
                    <td>
                      {room.building} — {room.floor}
                    </td>
                    <td>
                      <span className="user-badge-pill" style={{ background: "#f1f5f9" }}>
                        {room.roomTypeName}
                      </span>
                    </td>
                    <td style={{ textAlign: "center" }}>{room.capacity} chỗ</td>
                    <td style={{ textAlign: "center", fontWeight: 700 }}>{room.totalBookings}</td>
                    <td style={{ textAlign: "right", fontWeight: 800, color: "#0284c7" }}>
                      {room.totalHours} giờ
                    </td>
                    <td style={{ textAlign: "center" }}>
                      <div style={{ display: "flex", alignItems: "center", gap: "6px", justifyContent: "center" }}>
                        <div style={{ width: "60px", height: "6px", background: "#e2e8f0", borderRadius: "3px" }}>
                          <div
                            style={{
                              width: `${Math.min(100, room.occupancyRate)}%`,
                              height: "100%",
                              background: room.occupancyRate > 50 ? "#16a34a" : "#3b82f6",
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
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "20px" }}>
            <div
              className="profile-section-card"
              style={{
                background: "#ffffff",
                border: "1px solid #e2e8f0",
                borderRadius: "12px",
                padding: "20px",
              }}
            >
              <h4 style={{ fontSize: "15px", fontWeight: 800, color: "#1e293b", marginBottom: "14px", display: "flex", alignItems: "center", gap: "8px" }}>
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
                      background: "#f8fafc",
                      borderRadius: "6px",
                      fontSize: "13px",
                    }}
                  >
                    <div>
                      <strong style={{ color: "#1e293b" }}>{item.roomTypeName}</strong>
                      <span style={{ fontSize: "12px", color: "#64748b", marginLeft: "6px" }}>
                        ({item.roomCount} phòng)
                      </span>
                    </div>
                    <span style={{ fontWeight: 800, color: "#0284c7" }}>
                      {item.totalHours} giờ ({item.sharePercentage}%)
                    </span>
                  </div>
                ))}
              </div>
            </div>

            <div
              className="profile-section-card"
              style={{
                background: "#ffffff",
                border: "1px solid #e2e8f0",
                borderRadius: "12px",
                padding: "20px",
              }}
            >
              <h4 style={{ fontSize: "15px", fontWeight: 800, color: "#1e293b", marginBottom: "14px", display: "flex", alignItems: "center", gap: "8px" }}>
                <WrenchIcon size={17} />
                <span>TÌNH TRẠNG THIẾT BỊ SAU KHI TRẢ PHÒNG</span>
              </h4>
              <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
                <div style={{ display: "flex", justifyContent: "space-between", fontSize: "13.5px" }}>
                  <span>Tỷ lệ bàn giao thiết bị tốt:</span>
                  <strong style={{ color: "#15803d" }}>{roomReport?.equipmentGoodRate || 100}%</strong>
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
              background: "#ffffff",
              border: "1px solid #e2e8f0",
              borderRadius: "12px",
              padding: "20px",
              marginBottom: "20px",
            }}
          >
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "12px" }}>
              <div>
                <h3 style={{ fontSize: "16px", fontWeight: 800, color: "#b91c1c", margin: 0, display: "flex", alignItems: "center", gap: "8px" }}>
                  <AlertTriangleIcon size={18} /> DANH SÁCH TÀI KHOẢN ĐANG BỊ CẤM MƯỢN PHÒNG ({violationReport?.activeBansCount || 0})
                </h3>
                <span style={{ fontSize: "12.5px", color: "#64748b" }}>
                  Các sinh viên / người dùng có quyết định kỷ luật cấm mượn phòng còn hiệu lực thi hành.
                </span>
              </div>
            </div>

            {violationReport?.currentActiveBans.length === 0 ? (
              <div style={{ padding: "24px", textAlign: "center", color: "#15803d", fontWeight: 600, display: "flex", alignItems: "center", justifyContent: "center", gap: "6px" }}>
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
                        <strong style={{ color: "#0f172a" }}>{ban.fullName}</strong>
                      </td>
                      <td>
                        <span className="table-status-pill pill-rejected" style={{ fontWeight: 700 }}>
                          {ban.restrictionType}
                        </span>
                      </td>
                      <td style={{ fontSize: "13px", color: "#334155" }}>{ban.reason}</td>
                      <td>{new Date(ban.startAt).toLocaleDateString("vi-VN")}</td>
                      <td>
                        {ban.endAt ? new Date(ban.endAt).toLocaleDateString("vi-VN") : "Vô thời hạn"}
                      </td>
                      <td style={{ textAlign: "center" }}>
                        <span
                          style={{
                            background: "#fee2e2",
                            color: "#991b1b",
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
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "20px" }}>
            <div
              className="profile-section-card"
              style={{
                background: "#ffffff",
                border: "1px solid #e2e8f0",
                borderRadius: "12px",
                padding: "20px",
              }}
            >
              <h4 style={{ fontSize: "15px", fontWeight: 800, color: "#1e293b", marginBottom: "14px", display: "flex", alignItems: "center", gap: "8px" }}>
                <ScaleIcon size={17} />
                <span>PHÂN BỐ THEO MỨC ĐỘ NGHIÊM TRỌNG</span>
              </h4>
              <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
                {violationReport?.severityDistribution.map((item) => (
                  <div key={item.name}>
                    <div style={{ display: "flex", justifyContent: "space-between", fontSize: "13px", marginBottom: "4px" }}>
                      <span style={{ fontWeight: 600, color: "#334155" }}>{item.name}</span>
                      <span style={{ fontWeight: 700, color: item.color || "#0f172a" }}>
                        {item.count} vụ ({item.percentage}%)
                      </span>
                    </div>
                    <div style={{ width: "100%", height: "8px", background: "#f1f5f9", borderRadius: "4px", overflow: "hidden" }}>
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
                background: "#ffffff",
                border: "1px solid #e2e8f0",
                borderRadius: "12px",
                padding: "20px",
              }}
            >
              <h4 style={{ fontSize: "15px", fontWeight: 800, color: "#1e293b", marginBottom: "14px", display: "flex", alignItems: "center", gap: "8px" }}>
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
                      background: "#f8fafc",
                      borderRadius: "6px",
                      fontSize: "13px",
                    }}
                  >
                    <span style={{ fontWeight: 600, color: "#1e293b" }}>
                      {idx + 1}. {item.name}
                    </span>
                    <span
                      style={{
                        fontWeight: 700,
                        background: "#fee2e2",
                        color: "#991b1b",
                        padding: "2px 8px",
                        borderRadius: "10px",
                        fontSize: "12px",
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
