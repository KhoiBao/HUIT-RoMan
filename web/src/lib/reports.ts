import { api } from "./api";

export interface SystemOverviewReport {
  totalBookings: number;
  approvedBookings: number;
  pendingBookings: number;
  rejectedBookings: number;
  cancelledBookings: number;
  /** Số đơn bị sinh viên chủ động hủy (cancelSource = STUDENT) */
  cancelledByStudent?: number;
  /** Số đơn bị tự động hủy do không nhận phòng đúng hạn (cancelSource = AUTO) */
  cancelledByNoShow?: number;
  /** Số đơn bị quản trị/nhân sự hủy (cancelSource = STAFF) */
  cancelledByStaff?: number;
  /** Đơn đã hủy nhưng chưa ghi nhận nguồn (đơn cũ) */
  cancelledUnknownSource?: number;
  approvalRate: number;
  totalRooms: number;
  activeRooms: number;
  totalRoomsUsed: number;
  totalUsageHours: number;
  averageSessionHours: number;
  overallOccupancyRate: number;
  totalViolations: number;
  resolvedViolations: number;
  pendingViolations: number;
  severeViolations: number;
  activeBannedUsers: number;
  totalShifts: number;
  completedShifts: number;
  totalShiftLogs: number;
}

export interface TimeSeriesPoint {
  label: string;
  dateString: string;
  total: number;
  approved: number;
  pending?: number;
  completed?: number;
  rejected: number;
  cancelled: number;
}

export interface CategoryShare {
  name: string;
  count: number;
  percentage: number;
  color?: string;
}

export interface DepartmentBookingStat {
  departmentId: number;
  departmentName: string;
  totalBookings: number;
  approvedBookings: number;
  successRate: number;
  totalHoursUsed: number;
}

export interface BookingStatsReport {
  overview: SystemOverviewReport;
  timeSeries: TimeSeriesPoint[];
  statusDistribution: CategoryShare[];
  purposeDistribution: CategoryShare[];
  departmentStats: DepartmentBookingStat[];
  /** Thống kê hủy theo lý do (chỉ tính đơn đã hủy có ghi nhận lý do) */
  cancellationReasonStats?: CategoryShare[];
}

export interface RoomPerformance {
  roomId: number;
  roomCode: string;
  roomName: string;
  building: string;
  floor: string;
  roomTypeName: string;
  capacity: number;
  totalBookings: number;
  totalCheckIns: number;
  totalHours: number;
  occupancyRate: number;
  status: string;
}

export interface RoomTypeStat {
  roomTypeId: number;
  roomTypeName: string;
  roomCount: number;
  totalSessions: number;
  totalHours: number;
  sharePercentage: number;
}

export interface RoomUsageReport {
  totalRooms: number;
  totalUsageHours: number;
  averageOccupancyRate: number;
  topRooms: RoomPerformance[];
  roomTypeStats: RoomTypeStat[];
  buildingStats: CategoryShare[];
  normalCheckoutCount: number;
  issueCheckoutCount: number;
  equipmentGoodRate: number;
}

export interface OffenderSummary {
  userId: number;
  cardCode: string;
  fullName: string;
  email: string;
  role: string;
  departmentName?: string;
  violationCount: number;
  hasActiveBan: boolean;
}

export interface ActiveBanSummary {
  id: number;
  userId: number;
  cardCode: string;
  fullName: string;
  restrictionType: string;
  reason: string;
  startAt: string;
  endAt?: string;
  remainingDays: number;
}

export interface ViolationStatsReport {
  totalRecords: number;
  pendingRecords: number;
  resolvedRecords: number;
  activeBansCount: number;
  severityDistribution: CategoryShare[];
  typeDistribution: CategoryShare[];
  frequentOffenders: OffenderSummary[];
  currentActiveBans: ActiveBanSummary[];
}

export interface ReportFilter {
  fromDate?: string;
  toDate?: string;
  departmentId?: number;
  roomId?: number;
}

export async function fetchOverviewReport(
  params?: ReportFilter
): Promise<SystemOverviewReport> {
  const res = await api.get("/api/Reports/overview", { params });
  return (
    res.data?.data || {
      totalBookings: 0,
      approvedBookings: 0,
      pendingBookings: 0,
      rejectedBookings: 0,
      cancelledBookings: 0,
      approvalRate: 0,
      totalRooms: 0,
      activeRooms: 0,
      totalRoomsUsed: 0,
      totalUsageHours: 0,
      averageSessionHours: 0,
      overallOccupancyRate: 0,
      totalViolations: 0,
      resolvedViolations: 0,
      pendingViolations: 0,
      severeViolations: 0,
      activeBannedUsers: 0,
      totalShifts: 0,
      completedShifts: 0,
      totalShiftLogs: 0,
    }
  );
}

export async function fetchBookingStatsReport(
  params?: ReportFilter
): Promise<BookingStatsReport> {
  const res = await api.get("/api/Reports/bookings", { params });
  return res.data?.data || null;
}

export async function fetchRoomUsageReport(
  params?: ReportFilter
): Promise<RoomUsageReport> {
  const res = await api.get("/api/Reports/room-usage", { params });
  return res.data?.data || null;
}

export async function fetchViolationStatsReport(
  params?: ReportFilter
): Promise<ViolationStatsReport> {
  const res = await api.get("/api/Reports/violations", { params });
  return res.data?.data || null;
}

export async function downloadReportCsv(
  reportType: "bookings" | "rooms" | "violations",
  params?: ReportFilter
): Promise<void> {
  const res = await api.get("/api/Reports/export", {
    params: { reportType, ...params },
    responseType: "blob",
  });

  const blob = new Blob([res.data], { type: "text/csv;charset=utf-8;" });
  const url = window.URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  const fileName = `BaoCao_${reportType}_${new Date().toISOString().slice(0, 10)}.csv`;
  link.setAttribute("download", fileName);
  document.body.appendChild(link);
  link.click();
  link.remove();
  window.URL.revokeObjectURL(url);
}
