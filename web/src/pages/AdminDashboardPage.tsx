import { useState, useEffect, useMemo, type FormEvent } from "react";
import SiteHeader from "../components/SiteHeader";
import { api } from "../lib/api";
import { useAuth } from "../auth/AuthContext";
import AdminBookingApprovalTab from "../components/admin/AdminBookingApprovalTab";
import AdminRoomsManagementTab from "../components/admin/AdminRoomsManagementTab";
import AdminEquipmentsManagementTab from "../components/admin/AdminEquipmentsManagementTab";
import AdminRoomTypesTab from "../components/admin/AdminRoomTypesTab";
import AdminDepartmentsTab from "../components/admin/AdminDepartmentsTab";
import AdminEmployeesTab from "../components/admin/AdminEmployeesTab";
import AdminUsersTab from "../components/admin/AdminUsersTab";
import {
  ClockIcon,
  UsersIcon,
  ChevronLeftIcon,
  ChevronRightIcon,
  DoorIcon,
  CheckCircleIcon,
  BookmarkIcon,
  AlertTriangleIcon,
  FilterIcon,
  ShieldCheckIcon,
  WrenchIcon,
  BellRingIcon,
  BanIcon,
  ClipboardListIcon,
  PlusIcon,
  SearchIcon,
  TvIcon,
  TagIcon,
  BriefcaseIcon,
  GraduationCapIcon,
  BankIcon,
  XIcon,
} from "../components/Icon";

export type AdminTabType =
  | "approvals"
  | "rooms"
  | "equipments"
  | "roomTypes"
  | "departments"
  | "employees"
  | "users"
  | "timeline";

export interface AdminBookingInfo {
  id: string; // e.g. "HUIT-84920"
  activityTitle: string;
  roomCode: string;
  roomName: string;
  borrowerName: string;
  studentId: string;
  unit: string;
  email: string;
  phone: string;
  startTime: string; // "09:00"
  endTime: string;   // "11:00"
  dateStr: string;   // "24/10/2024"
  durationHours?: string; // "3 giờ"
  guestCount: number;
  purpose: string;
  statusText: string; // "Đã nhận phòng lúc 08:58"
  statusBadge: "ĐÃ ĐẶT" | "ĐANG SỬ DỤNG" | "WORKSHOP" | "TRỐNG";
  checkInTag?: string; // "CHECK-IN 08:58" or "55 người"
  checkInTime?: string;
  note?: string;
}

export interface AdminRoomRow {
  code: string;
  name: string;
  typeDesc: string;
  capacityText: string;
  amenityText: string;
  hasIssue?: boolean;
  issueDesc?: string;
  status: "ĐÃ ĐẶT" | "TRỐNG" | "ĐANG SỬ DỤNG" | "WORKSHOP";
  booking?: AdminBookingInfo;
}

export interface TechnicalIncident {
  id: number;
  roomCode: string;
  content: string;
  receivedAt: string;
  technicianStatus: string;
  severityLevel: number;
  isResolved: boolean;
}

// ── Initial Mock / Default Data strictly matching user screenshot ───────────

const INITIAL_BOOKINGS: Record<string, AdminBookingInfo> = {
  A101: {
    id: "HUIT-84917",
    activityTitle: "Học nhóm Đa phương tiện & Đồ họa",
    roomCode: "A101",
    roomName: "Phòng A101 (Tầng 3)",
    borrowerName: "Nguyễn Văn A",
    studentId: "2001230417",
    unit: "11DHTH01 - Khoa CNTT",
    email: "2001230417@huit.edu.vn",
    phone: "0901 234 567",
    startTime: "08:00",
    endTime: "10:00",
    dateStr: "24/10/2024",
    guestCount: 8,
    purpose: "Ôn tập đồ án kết thúc học phần Hệ phân tán",
    statusText: "Đã duyệt - Chờ nhận phòng (Hạn check-in: 08:15)",
    statusBadge: "ĐÃ ĐẶT",
  },
  A102: {
    id: "HUIT-84918",
    activityTitle: "Thảo luận nhóm Chuyên đề AI",
    roomCode: "A102",
    roomName: "Phòng A102 (Tầng 3)",
    borrowerName: "Trần Văn B",
    studentId: "2001230418",
    unit: "12DHTH03 - Khoa CNTT",
    email: "2001230418@huit.edu.vn",
    phone: "0909 888 777",
    startTime: "10:30",
    endTime: "12:00",
    dateStr: "24/10/2024",
    guestCount: 6,
    purpose: "Phân tích thiết kế hệ thống Microservices",
    statusText: "Đã duyệt - Chờ nhận phòng (Hạn check-in: 10:45)",
    statusBadge: "ĐÃ ĐẶT",
  },
  A104: {
    id: "HUIT-84920",
    activityTitle: "Bảo vệ tiến độ Khóa luận tốt nghiệp",
    roomCode: "A104",
    roomName: "A104 (Tầng 3)",
    borrowerName: "Lê Minh C",
    studentId: "2001230419",
    unit: "11DHTH02 - Khoa CNTT",
    email: "2001230419@huit.edu.vn",
    phone: "0912 345 678",
    startTime: "09:00",
    endTime: "11:00",
    dateStr: "24/10/2024",
    guestCount: 6,
    purpose: "Bảo vệ tiến độ Khóa luận tốt nghiệp",
    statusText: "Đã nhận phòng lúc 08:58",
    statusBadge: "ĐANG SỬ DỤNG",
    checkInTag: "CHECK-IN 08:58",
    checkInTime: "08:58",
  },
  B201: {
    id: "HUIT-84915",
    activityTitle: "Workshop CNTT - Chủ trì: Nguyễn Văn D",
    roomCode: "B201",
    roomName: "Hội trường B201 (Khu Giảng đường)",
    borrowerName: "Nguyễn Văn D",
    studentId: "GV10010001",
    unit: "Quy mô khoa | Đăng ký theo công văn viện",
    email: "nguyenvand@huit.edu.vn",
    phone: "0988 123 456",
    startTime: "08:30",
    endTime: "11:30",
    durationHours: "3 giờ",
    dateStr: "24/10/2024",
    guestCount: 55,
    purpose: "Hội thảo hướng nghiệp & Công nghệ AI thực chiến 2024",
    statusText: "Đang diễn ra Workshop (55 người tham dự)",
    statusBadge: "WORKSHOP",
    checkInTag: "55 người",
  },
};

const INITIAL_ROOMS: AdminRoomRow[] = [
  {
    code: "A101",
    name: "Phòng A101",
    typeDesc: "Học nhóm đa phương tiện",
    capacityText: "08 chỗ",
    amenityText: "Smart TV",
    status: "ĐÃ ĐẶT",
    booking: INITIAL_BOOKINGS.A101,
  },
  {
    code: "A102",
    name: "Phòng A102",
    typeDesc: "Phòng thảo luận chuyên sâu",
    capacityText: "06 chỗ",
    amenityText: "Bảng kính",
    status: "ĐÃ ĐẶT",
    booking: INITIAL_BOOKINGS.A102,
  },
  {
    code: "A103",
    name: "Phòng A103",
    typeDesc: "Phòng học nhóm linh hoạt",
    capacityText: "10 chỗ",
    amenityText: "Hub điện",
    status: "TRỐNG",
    booking: undefined,
  },
  {
    code: "A104",
    name: "Phòng A104",
    typeDesc: "Phòng nghiên cứu đề tài",
    capacityText: "06 chỗ",
    amenityText: "Họp Hybrid",
    status: "ĐANG SỬ DỤNG",
    booking: INITIAL_BOOKINGS.A104,
  },
  {
    code: "B201",
    name: "Hội trường B201",
    typeDesc: "Không gian hội thảo trung tâm",
    capacityText: "60 chỗ",
    amenityText: "Cần chỉnh mic",
    hasIssue: true,
    issueDesc: "Micro không dây số 2 rè âm thanh, pin yếu",
    status: "WORKSHOP",
    booking: INITIAL_BOOKINGS.B201,
  },
];

const TIME_SLOTS = [
  "07:30",
  "08:30",
  "09:30",
  "10:30",
  "11:30",
  "12:30",
  "13:30",
  "14:30",
  "15:30",
  "16:30",
  "17:30",
];

export default function AdminDashboardPage() {
  const { user } = useAuth();
  // Navigation active tab: approvals | rooms | roomTypes | departments | employees | users | timeline
  const [activeTab, setActiveTab] = useState<AdminTabType>("approvals");
  const [pendingCount, setPendingCount] = useState<number>(0);

  // Real-time live ticking clock (e.g. 09:14:22)
  const [liveClock, setLiveClock] = useState<string>("09:14:22");

  useEffect(() => {
    const updateTime = () => {
      const d = new Date();
      const hh = String(d.getHours()).padStart(2, "0");
      const mm = String(d.getMinutes()).padStart(2, "0");
      const ss = String(d.getSeconds()).padStart(2, "0");
      setLiveClock(`${hh}:${mm}:${ss}`);
    };
    updateTime();
    const interval = setInterval(updateTime, 1000);
    return () => clearInterval(interval);
  }, []);

  // Fetch pending bookings count for tab badge
  useEffect(() => {
    const fetchPending = async () => {
      try {
        const res = await api.get("/api/Bookings");
        const list = res.data?.data || res.data || [];
        const count = list.filter((b: any) => b.status === "Chờ duyệt").length;
        setPendingCount(count);
      } catch {
        // ignore
      }
    };
    fetchPending();
    const poll = setInterval(fetchPending, 15000);
    return () => clearInterval(poll);
  }, []);

  // Rooms and bookings state
  const [rooms, setRooms] = useState<AdminRoomRow[]>(INITIAL_ROOMS);
  // Default selected booking is A104 as shown in mockup
  const [selectedRoomCode, setSelectedRoomCode] = useState<string>("A104");

  // Selected date
  const [dateDisplay, setDateDisplay] = useState<string>("THỨ NĂM, 24/10/2024");

  // Technical incident state
  const [incident, setIncident] = useState<TechnicalIncident>({
    id: 1,
    roomCode: "B201",
    content: "Micro không dây số 2 rè âm thanh, pin yếu",
    receivedAt: "08:42:15",
    technicianStatus: "Kỹ thuật viên: Đang điều phối",
    severityLevel: 2,
    isResolved: false,
  });

  // Toast notification state
  const [toastMsg, setToastMsg] = useState<{
    text: string;
    type?: "success" | "warning" | "info";
  } | null>(null);

  const showToast = (
    text: string,
    type: "success" | "warning" | "info" = "success"
  ) => {
    setToastMsg({ text, type });
    setTimeout(() => {
      setToastMsg(null);
    }, 4500);
  };

  // Modals state
  const [showManualModal, setShowManualModal] = useState<boolean>(false);
  const [showFilterModal, setShowFilterModal] = useState<boolean>(false);
  const [showSurveyModal, setShowSurveyModal] = useState<boolean>(false);

  // Filter criteria
  const [filterStatus, setFilterStatus] = useState<string>("ALL");
  const [filterSearch, setFilterSearch] = useState<string>("");

  // Manual booking form state
  const [manualForm, setManualForm] = useState({
    roomCode: "A103",
    borrowerName: "",
    studentId: "",
    unit: "Khoa Công nghệ Thông tin",
    email: "",
    phone: "",
    startTime: "13:30",
    endTime: "15:30",
    guestCount: 6,
    purpose: "",
  });

  // Survey checkout state
  const [surveyChecklist, setSurveyChecklist] = useState({
    cleaned: true,
    devicesOk: true,
    lightsOff: true,
    staffNote: "Bàn giao đầy đủ thiết bị, phòng sạch sẽ.",
  });

  // Calculate current active booking for the right panel
  const selectedBooking = useMemo(() => {
    const r = rooms.find((x) => x.code === selectedRoomCode);
    return r?.booking || null;
  }, [rooms, selectedRoomCode]);

  const selectedRoom = useMemo(() => {
    return rooms.find((x) => x.code === selectedRoomCode) || null;
  }, [rooms, selectedRoomCode]);

  // Compute KPI counts dynamically
  const kpiStats = useMemo(() => {
    const totalRooms = rooms.length;
    const availableRooms = rooms.filter((r) => r.status === "TRỐNG").length;
    const bookedRooms = rooms.filter((r) => r.status === "ĐÃ ĐẶT").length;
    const inUseRooms = rooms.filter(
      (r) => r.status === "ĐANG SỬ DỤNG" || r.status === "WORKSHOP"
    ).length;
    const issueCount = incident.isResolved ? 0 : 1;
    return {
      totalRooms,
      availableRooms,
      bookedRooms,
      inUseRooms,
      issueCount,
    };
  }, [rooms, incident.isResolved]);

  // ── Handlers for Staff Operations ──────────────────────────────────────────

  // 1. Nhắc nhở kết thúc giờ
  const handleRemindTime = () => {
    if (!selectedBooking) return;
    showToast(
      `Đã phát thông báo nhắc nhở sắp kết thúc khung giờ đến ${selectedBooking.borrowerName} (${selectedBooking.phone}) qua SMS & thông báo ứng dụng!`,
      "info"
    );
  };

  // 2. Hủy do No-show > 15 phút
  const handleCancelNoShow = () => {
    if (!selectedBooking) return;
    const confirmed = window.confirm(
      `Xác nhận hủy đặt phòng #${selectedBooking.id} do Người đại diện ${selectedBooking.borrowerName} không đến nhận phòng sau 15 phút?\n\nHệ thống sẽ giải phóng phòng và lưu chế tài vào hồ sơ MSSV.`
    );
    if (!confirmed) return;

    setRooms((prev) =>
      prev.map((r) => {
        if (r.code === selectedBooking.roomCode) {
          return {
            ...r,
            status: "TRỐNG",
            booking: undefined,
          };
        }
        return r;
      })
    );
    showToast(
      `Đã hủy đơn đặt phòng #${selectedBooking.id} (Lý do: No-show >15p). Phòng ${selectedBooking.roomCode} đã sẵn sàng tiếp nhận!`,
      "warning"
    );
  };

  // 3. Check-in thủ công
  const handleCheckInNow = (roomCode: string) => {
    setRooms((prev) =>
      prev.map((r) => {
        if (r.code === roomCode && r.booking) {
          const nowStr = `${String(new Date().getHours()).padStart(
            2,
            "0"
          )}:${String(new Date().getMinutes()).padStart(2, "0")}`;
          return {
            ...r,
            status: "ĐANG SỬ DỤNG",
            booking: {
              ...r.booking,
              statusBadge: "ĐANG SỬ DỤNG",
              statusText: `Đã nhận phòng lúc ${nowStr}`,
              checkInTag: `CHECK-IN ${nowStr}`,
              checkInTime: nowStr,
            },
          };
        }
        return r;
      })
    );
    showToast(
      `Xác nhận Check-in thành công cho phòng ${roomCode}! Chuyển trạng thái sang "Đang sử dụng".`,
      "success"
    );
  };

  // 4. Trả phòng & Khảo sát thiết bị
  const handleCompleteSurveyCheckout = () => {
    if (!selectedBooking) return;
    setRooms((prev) =>
      prev.map((r) => {
        if (r.code === selectedBooking.roomCode) {
          return {
            ...r,
            status: "TRỐNG",
            booking: undefined,
          };
        }
        return r;
      })
    );
    setShowSurveyModal(false);
    showToast(
      `Ghi nhận trả phòng ${selectedBooking.roomCode} thành công! Đã lưu biên bản khảo sát thiết bị và hoàn tất lịch sử dụng.`,
      "success"
    );
  };

  // 5. Xử lý sự cố kỹ thuật
  const handleDispatchTechnician = () => {
    setIncident((prev) => ({
      ...prev,
      technicianStatus:
        "Kỹ thuật viên: Nguyễn Tuấn Anh (Tổ Thiết bị) đang xử lý tại B201",
    }));
    showToast(
      "Đã gửi lệnh điều phối khẩn cấp đến Kỹ thuật viên phụ trách!",
      "info"
    );
  };

  const handleResolveIncident = () => {
    setIncident((prev) => ({
      ...prev,
      isResolved: true,
      technicianStatus: "Đã khắc phục hoàn toàn lúc 09:10:00",
    }));
    // Remove warning from B201 room
    setRooms((prev) =>
      prev.map((r) => {
        if (r.code === "B201") {
          return {
            ...r,
            hasIssue: false,
            amenityText: "Đã chỉnh mic",
          };
        }
        return r;
      })
    );
    showToast(
      "Đã ghi nhận khắc phục xong sự cố Micro tại B201. Cập nhật nhật ký kỹ thuật thành công!",
      "success"
    );
  };

  // 6. Submit manual booking
  const handleManualBookingSubmit = (e: FormEvent) => {
    e.preventDefault();
    if (!manualForm.borrowerName || !manualForm.studentId) {
      alert("Vui lòng điền họ tên và MSSV/Mã cán bộ!");
      return;
    }

    const newId = `HUIT-${Math.floor(10000 + Math.random() * 90000)}`;
    const newBooking: AdminBookingInfo = {
      id: newId,
      activityTitle: manualForm.purpose || "Đặt phòng học trực tiếp tại quầy",
      roomCode: manualForm.roomCode,
      roomName: `Phòng ${manualForm.roomCode}`,
      borrowerName: manualForm.borrowerName,
      studentId: manualForm.studentId,
      unit: manualForm.unit,
      email: manualForm.email || `${manualForm.studentId}@huit.edu.vn`,
      phone: manualForm.phone || "0900 000 000",
      startTime: manualForm.startTime,
      endTime: manualForm.endTime,
      dateStr: "24/10/2024",
      guestCount: manualForm.guestCount,
      purpose: manualForm.purpose || "Sử dụng phòng học nhóm / nghiên cứu",
      statusText: `Đã duyệt tiếp nhận lúc ${liveClock}`,
      statusBadge: "ĐÃ ĐẶT",
    };

    setRooms((prev) =>
      prev.map((r) => {
        if (r.code === manualForm.roomCode) {
          return {
            ...r,
            status: "ĐÃ ĐẶT",
            booking: newBooking,
          };
        }
        return r;
      })
    );

    setSelectedRoomCode(manualForm.roomCode);
    setShowManualModal(false);
    showToast(
      `Khởi tạo thành công đơn đặt phòng thủ công #${newId} cho phòng ${manualForm.roomCode}!`,
      "success"
    );
  };

  // Filter rooms
  const filteredRooms = useMemo(() => {
    return rooms.filter((r) => {
      if (filterStatus === "AVAILABLE" && r.status !== "TRỐNG") return false;
      if (filterStatus === "BOOKED" && r.status !== "ĐÃ ĐẶT") return false;
      if (
        filterStatus === "IN_USE" &&
        r.status !== "ĐANG SỬ DỤNG" &&
        r.status !== "WORKSHOP"
      )
        return false;
      if (filterStatus === "ISSUE" && !r.hasIssue) return false;

      if (filterSearch.trim()) {
        const query = filterSearch.toLowerCase().trim();
        const matchesRoom =
          r.name.toLowerCase().includes(query) ||
          r.code.toLowerCase().includes(query);
        const matchesUser =
          r.booking?.borrowerName.toLowerCase().includes(query) ||
          r.booking?.studentId.toLowerCase().includes(query);
        if (!matchesRoom && !matchesUser) return false;
      }
      return true;
    });
  }, [rooms, filterStatus, filterSearch]);

  return (
    <div className="admin-page-root">
      <SiteHeader />

      {/* Toast Alert */}
      {toastMsg && (
        <div className={`admin-toast-alert toast-${toastMsg.type || "success"}`}>
          <div className="toast-icon-wrap">
            {toastMsg.type === "warning" ? (
              <AlertTriangleIcon size={20} />
            ) : toastMsg.type === "info" ? (
              <BellRingIcon size={20} />
            ) : (
              <CheckCircleIcon size={20} />
            )}
          </div>
          <div className="toast-text-wrap">{toastMsg.text}</div>
          <button
            type="button"
            className="toast-close-btn"
            onClick={() => setToastMsg(null)}
          >
            <XIcon size={14} />
          </button>
        </div>
      )}

      <main className="admin-main-container">
        {/* ── 1. Top Super-header & Title Row ────────────────────────────── */}
        <section className="admin-command-hero">
          <div className="hero-eyebrow-row">
            <span className="badge-command-center">TRUNG TÂM ĐIỀU HÀNH</span>
            <span className="badge-command-sub">
              {user?.role === "Employee"
                ? `Nhân sự quản trị: ${user?.departmentName || "Đơn vị được phân công"}`
                : "Khu vực kiểm soát quyền Quản trị viên"}
            </span>
          </div>

          <div className="hero-main-flex">
            <div className="hero-headings">
              <h1 className="admin-hero-title">
                {user?.role === "Employee"
                  ? `Bảng điều khiển Nhân sự — ${user?.departmentName || "Đơn vị HUIT"}`
                  : "Bảng điều khiển Quản lý phòng Thư viện HUIT (Admin)"}
              </h1>
              <p className="admin-hero-subtitle">
                {user?.role === "Employee"
                  ? `Bạn đang quản lý dữ liệu và xét duyệt phòng thuộc phạm vi: ${user?.departmentName || "Đơn vị của bạn"}.`
                  : "Giám sát thời gian thực, điều phối nhận phòng và xử lý sự cố toàn hệ thống."}
              </p>
            </div>

            <div className="hero-toolbar-actions">
              {/* Live sync pill */}
              <div className="live-sync-pill" title="Tự động đồng bộ thời gian thực">
                <span className="live-pulse-dot" />
                <span className="live-sync-label">
                  ĐỒNG BỘ TRỰC TIẾP: <strong>{liveClock}</strong>
                </span>
              </div>

              {/* Advanced Filter button */}
              <button
                type="button"
                className={`btn-toolbar-filter ${
                  filterStatus !== "ALL" || filterSearch ? "active-filter" : ""
                }`}
                onClick={() => setShowFilterModal(true)}
              >
                <FilterIcon size={16} />
                <span>Bộ lọc nâng cao</span>
                {(filterStatus !== "ALL" || filterSearch) && (
                  <span className="filter-count-badge" />
                )}
              </button>

              {/* Manual Booking button */}
              <button
                type="button"
                className="btn-toolbar-primary"
                onClick={() => setShowManualModal(true)}
              >
                <PlusIcon size={16} />
                <span>+ Khởi tạo đặt phòng thủ công</span>
              </button>
            </div>
          </div>
        </section>

        {/* ── Admin Navigation Tabs Bar ──────────────────────────────────── */}
        <nav className="admin-nav-tabs-bar">
          <button
            type="button"
            className={`admin-nav-tab-item ${
              activeTab === "approvals" ? "active-tab" : ""
            }`}
            onClick={() => setActiveTab("approvals")}
          >
            <ClipboardListIcon size={18} />
            <span>Duyệt đơn đăng ký</span>
            {pendingCount > 0 && (
              <span className="tab-badge-pulse">{pendingCount}</span>
            )}
          </button>

          <button
            type="button"
            className={`admin-nav-tab-item ${
              activeTab === "rooms" ? "active-tab" : ""
            }`}
            onClick={() => setActiveTab("rooms")}
          >
            <DoorIcon size={18} />
            <span>Quản lý phòng</span>
          </button>

          <button
            type="button"
            className={`admin-nav-tab-item ${
              activeTab === "equipments" ? "active-tab" : ""
            }`}
            onClick={() => setActiveTab("equipments")}
          >
            <TvIcon size={18} />
            <span>Quản lý thiết bị</span>
          </button>

          <button
            type="button"
            className={`admin-nav-tab-item ${
              activeTab === "roomTypes" ? "active-tab" : ""
            }`}
            onClick={() => setActiveTab("roomTypes")}
          >
            <TagIcon size={18} />
            <span>Loại phòng</span>
          </button>

          <button
            type="button"
            className={`admin-nav-tab-item ${
              activeTab === "departments" ? "active-tab" : ""
            }`}
            onClick={() => setActiveTab("departments")}
          >
            <BankIcon size={18} />
            <span>Quản lý đơn vị</span>
          </button>

          <button
            type="button"
            className={`admin-nav-tab-item ${
              activeTab === "employees" ? "active-tab" : ""
            }`}
            onClick={() => setActiveTab("employees")}
          >
            <BriefcaseIcon size={18} />
            <span>Nhân sự / Thủ thư</span>
          </button>

          <button
            type="button"
            className={`admin-nav-tab-item ${
              activeTab === "users" ? "active-tab" : ""
            }`}
            onClick={() => setActiveTab("users")}
          >
            <GraduationCapIcon size={18} />
            <span>Sinh viên &amp; Giảng viên</span>
          </button>

          <button
            type="button"
            className={`admin-nav-tab-item ${
              activeTab === "timeline" ? "active-tab" : ""
            }`}
            onClick={() => setActiveTab("timeline")}
          >
            <ClockIcon size={18} />
            <span>Giám sát trực quan (Live Timeline)</span>
          </button>
        </nav>

        {/* ── Tab Views ─────────────────────────────────────────────────── */}
        {activeTab === "approvals" && (
          <AdminBookingApprovalTab onNotify={showToast} />
        )}

        {activeTab === "rooms" && (
          <AdminRoomsManagementTab onNotify={showToast} />
        )}

        {activeTab === "equipments" && (
          <AdminEquipmentsManagementTab onNotify={showToast} />
        )}

        {activeTab === "roomTypes" && (
          <AdminRoomTypesTab onNotify={showToast} />
        )}

        {activeTab === "departments" && (
          <AdminDepartmentsTab onNotify={showToast} />
        )}

        {activeTab === "employees" && (
          <AdminEmployeesTab onNotify={showToast} />
        )}

        {activeTab === "users" && (
          <AdminUsersTab onNotify={showToast} />
        )}

        {activeTab === "timeline" && (
          <>
            {/* ── 2. Top 5 KPI Summary Cards ─────────────────────────────────── */}
            <section className="admin-kpi-summary-strip">
          {/* Card 1: Tổng số phòng */}
          <div className="admin-kpi-card">
            <div className="kpi-header-row">
              <span className="kpi-title-small">TỔNG SỐ PHÒNG</span>
              <DoorIcon size={20} className="kpi-icon-slate" />
            </div>
            <div className="kpi-value-row">
              <span className="kpi-number-huge">{kpiStats.totalRooms}</span>
            </div>
            <div className="kpi-sub-note">hoạt động tiêu chuẩn</div>
          </div>

          {/* Card 2: Phòng trống */}
          <div className="admin-kpi-card">
            <div className="kpi-header-row">
              <span className="kpi-title-small">PHÒNG TRỐNG</span>
              <CheckCircleIcon size={20} className="kpi-icon-green" />
            </div>
            <div className="kpi-value-row">
              <span className="kpi-number-huge color-green">
                {kpiStats.availableRooms}
              </span>
            </div>
            <div className="kpi-sub-note">sẵn sàng tiếp nhận</div>
          </div>

          {/* Card 3: Đã đặt */}
          <div className="admin-kpi-card">
            <div className="kpi-header-row">
              <span className="kpi-title-small">ĐÃ ĐẶT</span>
              <BookmarkIcon size={20} className="kpi-icon-blue" />
            </div>
            <div className="kpi-value-row">
              <span className="kpi-number-huge color-blue">
                {kpiStats.bookedRooms}
              </span>
            </div>
            <div className="kpi-sub-note">chờ xác nhận đến</div>
          </div>

          {/* Card 4: Đang sử dụng */}
          <div className="admin-kpi-card">
            <div className="kpi-header-row">
              <span className="kpi-title-small">ĐANG SỬ DỤNG</span>
              <UsersIcon size={20} className="kpi-icon-orange" />
            </div>
            <div className="kpi-value-row">
              <span className="kpi-number-huge color-orange">
                {kpiStats.inUseRooms}
              </span>
            </div>
            <div className="kpi-sub-note">đã hoàn tất check-in</div>
          </div>

          {/* Card 5: Sự cố cần xử lý (Highlight Red) */}
          <div
            className={`admin-kpi-card kpi-card-danger ${
              kpiStats.issueCount > 0 ? "has-active-issue" : "issue-resolved"
            }`}
          >
            <div className="kpi-header-row">
              <span className="kpi-title-small color-red">SỰ CỐ CẦN XỬ LÝ</span>
              <AlertTriangleIcon size={20} className="kpi-icon-red" />
            </div>
            <div className="kpi-value-row">
              <span className="kpi-number-huge color-red">
                {kpiStats.issueCount}
              </span>
            </div>
            <div className="kpi-sub-note color-red-dark">
              {kpiStats.issueCount > 0
                ? "Báo cáo bảo trì mic B201"
                : "Tất cả phòng hoạt động tốt"}
            </div>
          </div>
        </section>

        {/* ── 3. Main Workspace: Schedule Matrix + Right Detail Drawer ───── */}
        <section className="admin-workspace-split">
          {/* Left Column: Timeline Schedule Matrix */}
          <div className="admin-timeline-column">
            {/* Header control bar for timeline */}
            <div className="timeline-control-header">
              <div className="timeline-nav-left">
                <div className="date-control-pill">
                  <button
                    type="button"
                    className="date-arrow-btn"
                    title="Ngày trước"
                    onClick={() => setDateDisplay("THỨ TƯ, 23/10/2024")}
                  >
                    <ChevronLeftIcon size={16} />
                  </button>
                  <span className="date-current-text">{dateDisplay}</span>
                  <button
                    type="button"
                    className="date-arrow-btn"
                    title="Ngày kế tiếp"
                    onClick={() => setDateDisplay("THỨ SÁU, 25/10/2024")}
                  >
                    <ChevronRightIcon size={16} />
                  </button>
                </div>

                <button
                  type="button"
                  className="btn-today-pill"
                  onClick={() => setDateDisplay("THỨ NĂM, 24/10/2024")}
                >
                  Hôm nay
                </button>
              </div>

              {/* Legend matching mockup */}
              <div className="timeline-legend-group">
                <div className="legend-item">
                  <span className="legend-box-sq border-green" />
                  <span>Phòng trống</span>
                </div>
                <div className="legend-item">
                  <span className="legend-box-sq border-blue" />
                  <span>Đã đặt</span>
                </div>
                <div className="legend-item">
                  <span className="legend-box-sq border-orange" />
                  <span>Đang sử dụng</span>
                </div>
              </div>
            </div>

            {/* Matrix Table */}
            <div className="admin-matrix-scroll-wrapper">
              <table className="admin-matrix-table">
                <thead>
                  <tr>
                    <th className="th-room-spec">PHÒNG & CƠ SỞ VẬT CHẤT</th>
                    {TIME_SLOTS.map((t) => (
                      <th key={t} className="th-time-hour">
                        {t}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {filteredRooms.map((room) => {
                    const isSelected = selectedRoomCode === room.code;

                    return (
                      <tr
                        key={room.code}
                        className={`admin-room-row ${
                          isSelected ? "row-selected" : ""
                        }`}
                        onClick={() => setSelectedRoomCode(room.code)}
                      >
                        {/* Room Meta Left Column */}
                        <td className="td-room-info-cell">
                          <div className="room-info-cell-inner">
                            <div className="room-code-badge-row">
                              <span className="room-name-bold">{room.name}</span>
                              {room.status === "ĐÃ ĐẶT" && (
                                <span className="status-badge-blue">ĐÃ ĐẶT</span>
                              )}
                              {room.status === "TRỐNG" && (
                                <span className="status-badge-green">TRỐNG</span>
                              )}
                              {room.status === "ĐANG SỬ DỤNG" && (
                                <span className="status-badge-orange">
                                  ĐANG SỬ DỤNG
                                </span>
                              )}
                              {room.status === "WORKSHOP" && (
                                <span className="status-badge-purple">
                                  WORKSHOP
                                </span>
                              )}
                            </div>

                            <div className="room-desc-small">{room.typeDesc}</div>

                            <div className="room-amenities-row">
                              <span className="amenity-item">
                                <UsersIcon size={13} /> {room.capacityText}
                              </span>
                              {room.hasIssue ? (
                                <span className="amenity-item text-danger">
                                  <WrenchIcon size={13} /> {room.amenityText}
                                </span>
                              ) : (
                                <span className="amenity-item">
                                  {room.amenityText.includes("TV") ? (
                                    <TvIcon size={13} />
                                  ) : (
                                    <ClipboardListIcon size={13} />
                                  )}{" "}
                                  {room.amenityText}
                                </span>
                              )}
                            </div>
                          </div>
                        </td>

                        {/* Timeline Cells Track */}
                        <td
                          colSpan={TIME_SLOTS.length}
                          className="td-timeline-track-cell"
                        >
                          <div className="timeline-track-relative">
                            {/* Grid vertical guidelines */}
                            <div className="timeline-grid-guidelines">
                              {TIME_SLOTS.map((_, i) => (
                                <div key={i} className="guideline-col" />
                              ))}
                            </div>

                            {/* Case 1: Room A101 (08:00 - 10:00) */}
                            {room.code === "A101" && (
                              <div
                                className={`booking-block-card block-blue ${
                                  isSelected ? "active-ring" : ""
                                }`}
                                style={{
                                  left: "5%",
                                  width: "20%",
                                }}
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setSelectedRoomCode("A101");
                                }}
                              >
                                <div className="block-header-time">
                                  <span>08:00 - 10:00</span>
                                  <ClockIcon size={13} />
                                </div>
                                <div className="block-title-user">
                                  Nguyễn Văn A
                                </div>
                                <div className="block-sub-code">
                                  MSSV: 2001230417
                                </div>
                              </div>
                            )}

                            {/* Case 2: Room A102 (10:30 - 12:00) */}
                            {room.code === "A102" && (
                              <div
                                className={`booking-block-card block-blue ${
                                  isSelected ? "active-ring" : ""
                                }`}
                                style={{
                                  left: "30%",
                                  width: "15%",
                                }}
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setSelectedRoomCode("A102");
                                }}
                              >
                                <div className="block-header-time">
                                  <span>10:30 - 12:00</span>
                                  <DoorIcon size={13} />
                                </div>
                                <div className="block-title-user">
                                  Trần Văn B
                                </div>
                                <div className="block-sub-code">
                                  MSSV: 2001230418
                                </div>
                              </div>
                            )}

                            {/* Case 3: Room A103 (TRỐNG CẢ NGÀY) */}
                            {room.code === "A103" && (
                              <div
                                className="block-all-day-free"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setSelectedRoomCode("A103");
                                  setManualForm((prev) => ({
                                    ...prev,
                                    roomCode: "A103",
                                  }));
                                }}
                              >
                                <div className="free-banner-content">
                                  <CheckCircleIcon size={16} />
                                  <span>
                                    KHÔNG GIAN TRỐNG CẢ NGÀY - SẴN SÀNG TIẾP NHẬN
                                  </span>
                                </div>
                              </div>
                            )}

                            {/* Case 4: Room A104 (ĐANG SỬ DỤNG - CHECK-IN 08:58) */}
                            {room.code === "A104" && (
                              <div
                                className={`booking-block-card block-orange ${
                                  isSelected ? "active-ring" : ""
                                }`}
                                style={{
                                  left: "15%",
                                  width: "20%",
                                }}
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setSelectedRoomCode("A104");
                                }}
                              >
                                <div className="block-header-orange-tag">
                                  <span>09:00 - 11:00</span>
                                  <span className="pill-checkin-highlight">
                                    CHECK-IN 08:58
                                  </span>
                                </div>
                                <div className="block-title-user">
                                  Lê Minh C
                                </div>
                                <div className="block-sub-code">
                                  MSSV: 2001230419
                                </div>
                              </div>
                            )}

                            {/* Case 5: Room B201 (WORKSHOP 08:30 - 11:30) */}
                            {room.code === "B201" && (
                              <div
                                className={`booking-block-card block-purple ${
                                  isSelected ? "active-ring" : ""
                                }`}
                                style={{
                                  left: "10%",
                                  width: "30%",
                                }}
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setSelectedRoomCode("B201");
                                }}
                              >
                                <div className="block-header-workshop">
                                  <span>08:30 - 11:30 (3 giờ)</span>
                                  <span className="pill-workshop-count">
                                    55 người
                                  </span>
                                </div>
                                <div className="block-title-user">
                                  Workshop CNTT - Chủ trì: Nguyễn Văn D
                                </div>
                                <div className="block-sub-code">
                                  Quy mô khoa | Đăng ký theo công văn viện
                                </div>
                              </div>
                            )}
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>

          {/* Right Column: Side Drawer / Detail Card */}
          <aside className="admin-side-detail-panel">
            <div className="detail-panel-inner">
              {/* Header */}
              <div className="panel-header-strip">
                <div className="panel-header-title-box">
                  <div className="panel-header-icon-title">
                    <ClipboardListIcon size={18} className="panel-header-svg" />
                    <h3 className="panel-title-text">
                      Chi tiết Đặt phòng #{selectedBooking?.id || "HUIT-ROOM"}
                    </h3>
                  </div>
                  <div className="panel-header-subtitle">
                    Kiểm duyệt hồ sơ tiếp nhận & Quản lý chế tài
                  </div>
                </div>

                <button
                  type="button"
                  className="panel-close-btn"
                  title="Đóng / Bỏ chọn"
                  onClick={() => setSelectedRoomCode("")}
                >
                  <XIcon size={16} />
                </button>
              </div>

              {selectedBooking ? (
                <div className="panel-body-content">
                  {/* Current Status Box */}
                  <div className="status-current-box">
                    <div className="status-box-header">
                      <span className="status-dot-pulse" />
                      <span className="status-box-tag">TRẠNG THÁI HIỆN TẠI</span>
                    </div>
                    <div className="status-box-value">
                      <span>{selectedBooking.statusText}</span>
                      <ShieldCheckIcon size={20} className="status-verified-icon" />
                    </div>
                  </div>

                  {/* Section 1: Thông tin người đại diện */}
                  <div className="detail-section-block">
                    <h4 className="detail-section-title">
                      THÔNG TIN NGƯỜI ĐẠI DIỆN
                    </h4>
                    <div className="detail-rows-list">
                      <div className="detail-info-row">
                        <span className="row-label">Họ và tên:</span>
                        <span className="row-value bold">
                          {selectedBooking.borrowerName}
                        </span>
                      </div>
                      <div className="detail-info-row">
                        <span className="row-label">MSSV / Mã cán bộ:</span>
                        <span className="row-value font-mono">
                          {selectedBooking.studentId}
                        </span>
                      </div>
                      <div className="detail-info-row">
                        <span className="row-label">Đơn vị / Chi đoàn:</span>
                        <span className="row-value">{selectedBooking.unit}</span>
                      </div>
                      <div className="detail-info-row">
                        <span className="row-label">Email trường:</span>
                        <span className="row-value color-blue-text">
                          {selectedBooking.email}
                        </span>
                      </div>
                      <div className="detail-info-row">
                        <span className="row-label">Số điện thoại:</span>
                        <span className="row-value font-mono">
                          {selectedBooking.phone}
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Section 2: Không gian & khung giờ */}
                  <div className="detail-section-block">
                    <h4 className="detail-section-title">
                      KHÔNG GIAN & KHUNG GIỜ
                    </h4>
                    <div className="detail-rows-list">
                      <div className="detail-info-row">
                        <span className="row-label">Phòng đăng ký:</span>
                        <span className="row-value bold">
                          {selectedBooking.roomName}
                        </span>
                      </div>
                      <div className="detail-info-row">
                        <span className="row-label">Thời gian sử dụng:</span>
                        <span className="row-value bold color-primary">
                          {selectedBooking.startTime} - {selectedBooking.endTime} (
                          {selectedBooking.dateStr})
                        </span>
                      </div>
                      <div className="detail-info-row">
                        <span className="row-label">Số lượng thành viên:</span>
                        <span className="row-value">
                          {selectedBooking.guestCount} người
                        </span>
                      </div>
                      <div className="detail-info-row">
                        <span className="row-label">Mục đích học thuật:</span>
                        <span className="row-value academic-purpose">
                          {selectedBooking.purpose}
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Section 3: Thao tác nghiệp vụ thủ thư */}
                  <div className="detail-section-block">
                    <h4 className="detail-section-title">
                      THAO TÁC NGHIỆP VỤ THỦ THƯ
                    </h4>
                    <div className="librarian-action-buttons">
                      {/* Button 1: Nhắc nhở kết thúc giờ */}
                      <button
                        type="button"
                        className="btn-action-outline-neutral"
                        onClick={handleRemindTime}
                      >
                        <BellRingIcon size={16} />
                        <span>Nhắc nhở kết thúc giờ (Thông báo qua app/SMS)</span>
                      </button>

                      {/* If waiting for check-in: show quick check-in */}
                      {selectedBooking.statusBadge === "ĐÃ ĐẶT" && (
                        <button
                          type="button"
                          className="btn-action-solid-green"
                          onClick={() => handleCheckInNow(selectedBooking.roomCode)}
                        >
                          <ShieldCheckIcon size={16} />
                          <span>Xác nhận nhận phòng (Check-in ngay)</span>
                        </button>
                      )}

                      {/* Button 2: Hủy do không nhận phòng (No-show) */}
                      <button
                        type="button"
                        className="btn-action-outline-danger"
                        onClick={handleCancelNoShow}
                      >
                        <BanIcon size={16} />
                        <span>Hủy do không nhận phòng (No-show &gt;15p)</span>
                      </button>

                      {/* Button 3: Ghi nhận trả phòng & Khảo sát thiết bị */}
                      <button
                        type="button"
                        className="btn-action-solid-teal"
                        onClick={() => setShowSurveyModal(true)}
                      >
                        <ClipboardListIcon size={16} />
                        <span>Ghi nhận trả phòng &amp; Khảo sát thiết bị</span>
                      </button>
                    </div>
                  </div>
                </div>
              ) : selectedRoom ? (
                /* When an empty room is clicked */
                <div className="panel-empty-room-state">
                  <div className="empty-room-icon-box">
                    <DoorIcon size={36} />
                  </div>
                  <h4 className="empty-room-title">{selectedRoom.name}</h4>
                  <p className="empty-room-sub">
                    {selectedRoom.typeDesc} • {selectedRoom.capacityText}
                  </p>
                  <div className="empty-status-tag">
                    Trạng thái hiện tại: <strong>{selectedRoom.status}</strong>
                  </div>

                  <button
                    type="button"
                    className="btn-primary-block"
                    onClick={() => {
                      setManualForm((prev) => ({
                        ...prev,
                        roomCode: selectedRoom.code,
                      }));
                      setShowManualModal(true);
                    }}
                  >
                    + Khởi tạo mượn phòng này ngay
                  </button>
                </div>
              ) : (
                <div className="panel-unselected-placeholder">
                  <p>Vui lòng bấm chọn một phòng học trên bảng để xem chi tiết.</p>
                </div>
              )}
            </div>
          </aside>
        </section>

        {/* ── 4. Bottom Incident Alert Strip ─────────────────────────────── */}
        <section
          className={`admin-incident-strip ${
            incident.isResolved ? "incident-cleared" : ""
          }`}
        >
          <div className="incident-header-bar">
            <div className="incident-title-box">
              <AlertTriangleIcon size={18} className="incident-alert-svg" />
              <span className="incident-title-text">
                Nhật ký sự cố kỹ thuật phòng học cần xử lý ngay
              </span>
            </div>
            <div className="incident-count-pill">
              {incident.isResolved
                ? "00 Sự cố tồn đọng (Hoàn tất)"
                : `0${incident.severityLevel} Yêu cầu cấp độ ${incident.severityLevel}`}
            </div>
          </div>

          {!incident.isResolved ? (
            <div className="incident-card-content">
              <div className="incident-field-col col-space">
                <span className="incident-col-label">KHÔNG GIAN</span>
                <span className="incident-col-value bold">
                  {incident.roomCode === "B201"
                    ? "Hội trường B201"
                    : incident.roomCode}
                </span>
              </div>

              <div className="incident-field-col col-desc">
                <span className="incident-col-label">NỘI DUNG BÁO CÁO</span>
                <span className="incident-col-value">{incident.content}</span>
              </div>

              <div className="incident-field-col col-time">
                <span className="incident-col-label">THỜI ĐIỂM TIẾP NHẬN</span>
                <span className="incident-col-value font-mono">
                  {incident.receivedAt} - {incident.technicianStatus}
                </span>
              </div>

              <div className="incident-actions-col">
                <button
                  type="button"
                  className="btn-incident-secondary"
                  onClick={handleDispatchTechnician}
                >
                  Chuyển KTV
                </button>
                <button
                  type="button"
                  className="btn-incident-primary"
                  onClick={handleResolveIncident}
                >
                  Đã khắc phục
                </button>
              </div>
            </div>
          ) : (
            <div className="incident-resolved-msg">
              <CheckCircleIcon size={18} />
              <span>
                Không có sự cố kỹ thuật nào đang chờ xử lý. Thiết bị tất cả các
                phòng hoạt động bình thường!
              </span>
            </div>
          )}
        </section>
      </>
    )}
  </main>

      {/* ── Modal 1: Khởi tạo đặt phòng thủ công (+ Đặt phòng) ──────────── */}
      {showManualModal && (
        <div className="admin-modal-overlay">
          <div className="admin-modal-box">
            <div className="modal-header">
              <h3 className="modal-title">+ Khởi tạo đặt phòng thủ công (Staff)</h3>
              <button
                type="button"
                className="modal-close-btn"
                onClick={() => setShowManualModal(false)}
              >
                <XIcon size={16} />
              </button>
            </div>

            <form onSubmit={handleManualBookingSubmit} className="modal-form">
              <div className="form-group-grid">
                <div className="form-field">
                  <label>Chọn phòng tiếp nhận:</label>
                  <select
                    value={manualForm.roomCode}
                    onChange={(e) =>
                      setManualForm({ ...manualForm, roomCode: e.target.value })
                    }
                  >
                    <option value="A101">Phòng A101 (8 chỗ - Smart TV)</option>
                    <option value="A102">Phòng A102 (6 chỗ - Bảng kính)</option>
                    <option value="A103">Phòng A103 (10 chỗ - Hub điện)</option>
                    <option value="A104">Phòng A104 (6 chỗ - Họp Hybrid)</option>
                    <option value="B201">Hội trường B201 (60 chỗ - Hội thảo)</option>
                  </select>
                </div>

                <div className="form-field">
                  <label>Họ và tên người đại diện:</label>
                  <input
                    type="text"
                    required
                    placeholder="VD: Nguyễn Văn A"
                    value={manualForm.borrowerName}
                    onChange={(e) =>
                      setManualForm({
                        ...manualForm,
                        borrowerName: e.target.value,
                      })
                    }
                  />
                </div>

                <div className="form-field">
                  <label>MSSV / Mã Cán bộ:</label>
                  <input
                    type="text"
                    required
                    placeholder="VD: 2001230417"
                    value={manualForm.studentId}
                    onChange={(e) =>
                      setManualForm({
                        ...manualForm,
                        studentId: e.target.value,
                      })
                    }
                  />
                </div>

                <div className="form-field">
                  <label>Đơn vị / Chi đoàn:</label>
                  <input
                    type="text"
                    placeholder="VD: 11DHTH01 - Khoa CNTT"
                    value={manualForm.unit}
                    onChange={(e) =>
                      setManualForm({ ...manualForm, unit: e.target.value })
                    }
                  />
                </div>

                <div className="form-field">
                  <label>Giờ bắt đầu:</label>
                  <input
                    type="time"
                    value={manualForm.startTime}
                    onChange={(e) =>
                      setManualForm({
                        ...manualForm,
                        startTime: e.target.value,
                      })
                    }
                  />
                </div>

                <div className="form-field">
                  <label>Giờ kết thúc:</label>
                  <input
                    type="time"
                    value={manualForm.endTime}
                    onChange={(e) =>
                      setManualForm({ ...manualForm, endTime: e.target.value })
                    }
                  />
                </div>

                <div className="form-field">
                  <label>Số lượng người tham gia:</label>
                  <input
                    type="number"
                    min="1"
                    max="100"
                    value={manualForm.guestCount}
                    onChange={(e) =>
                      setManualForm({
                        ...manualForm,
                        guestCount: Number(e.target.value),
                      })
                    }
                  />
                </div>

                <div className="form-field col-full">
                  <label>Mục đích học thuật / Nội dung hoạt động:</label>
                  <input
                    type="text"
                    placeholder="VD: Ôn tập nhóm đồ án tốt nghiệp"
                    value={manualForm.purpose}
                    onChange={(e) =>
                      setManualForm({ ...manualForm, purpose: e.target.value })
                    }
                  />
                </div>
              </div>

              <div className="modal-footer-actions">
                <button
                  type="button"
                  className="btn-modal-cancel"
                  onClick={() => setShowManualModal(false)}
                >
                  Hủy bỏ
                </button>
                <button type="submit" className="btn-modal-submit">
                  Tiếp nhận &amp; Duyệt ngay
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ── Modal 2: Bộ lọc nâng cao ───────────────────────────────────── */}
      {showFilterModal && (
        <div className="admin-modal-overlay">
          <div className="admin-modal-box modal-box-sm">
            <div className="modal-header">
              <h3 className="modal-title">Bộ lọc điều hành nâng cao</h3>
              <button
                type="button"
                className="modal-close-btn"
                onClick={() => setShowFilterModal(false)}
              >
                <XIcon size={16} />
              </button>
            </div>

            <div className="modal-form">
              <div className="form-field">
                <label>Trạng thái phòng:</label>
                <select
                  value={filterStatus}
                  onChange={(e) => setFilterStatus(e.target.value)}
                >
                  <option value="ALL">Tất cả trạng thái</option>
                  <option value="AVAILABLE">Phòng trống (Sẵn sàng)</option>
                  <option value="BOOKED">Đã đặt (Chờ đến)</option>
                  <option value="IN_USE">Đang sử dụng / Workshop</option>
                  <option value="ISSUE">Phòng có sự cố kỹ thuật</option>
                </select>
              </div>

              <div className="form-field">
                <label>Tìm kiếm phòng hoặc người đặt:</label>
                <div className="search-input-wrap">
                  <SearchIcon size={16} className="search-icon-inside" />
                  <input
                    type="text"
                    placeholder="Nhập tên phòng, họ tên hoặc MSSV..."
                    value={filterSearch}
                    onChange={(e) => setFilterSearch(e.target.value)}
                  />
                </div>
              </div>

              <div className="modal-footer-actions">
                <button
                  type="button"
                  className="btn-modal-cancel"
                  onClick={() => {
                    setFilterStatus("ALL");
                    setFilterSearch("");
                  }}
                >
                  Đặt lại bộ lọc
                </button>
                <button
                  type="button"
                  className="btn-modal-submit"
                  onClick={() => setShowFilterModal(false)}
                >
                  Áp dụng bộ lọc
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ── Modal 3: Khảo sát trả phòng & Thiết bị ──────────────────────── */}
      {showSurveyModal && selectedBooking && (
        <div className="admin-modal-overlay">
          <div className="admin-modal-box">
            <div className="modal-header">
              <h3 className="modal-title">
                Khảo sát hoàn tất &amp; Ghi nhận trả phòng #{selectedBooking.roomCode}
              </h3>
              <button
                type="button"
                className="modal-close-btn"
                onClick={() => setShowSurveyModal(false)}
              >
                <XIcon size={16} />
              </button>
            </div>

            <div className="modal-form">
              <p className="survey-desc">
                Thủ thư kiểm tra hiện trạng phòng học trước khi kết thúc ca sử
                dụng của <strong>{selectedBooking.borrowerName}</strong> (MSSV:{" "}
                {selectedBooking.studentId}):
              </p>

              <div className="checklist-group">
                <label className="checkbox-item-row">
                  <input
                    type="checkbox"
                    checked={surveyChecklist.devicesOk}
                    onChange={(e) =>
                      setSurveyChecklist({
                        ...surveyChecklist,
                        devicesOk: e.target.checked,
                      })
                    }
                  />
                  <span>
                    Thiết bị điện tử, Smart TV, micro, hub dây cáp nguyên vẹn,
                    hoạt động tốt.
                  </span>
                </label>

                <label className="checkbox-item-row">
                  <input
                    type="checkbox"
                    checked={surveyChecklist.cleaned}
                    onChange={(e) =>
                      setSurveyChecklist({
                        ...surveyChecklist,
                        cleaned: e.target.checked,
                      })
                    }
                  />
                  <span>
                    Bàn ghế được sắp xếp ngăn nắp, không xả rác trong phòng học.
                  </span>
                </label>

                <label className="checkbox-item-row">
                  <input
                    type="checkbox"
                    checked={surveyChecklist.lightsOff}
                    onChange={(e) =>
                      setSurveyChecklist({
                        ...surveyChecklist,
                        lightsOff: e.target.checked,
                      })
                    }
                  />
                  <span>
                    Đã tắt hệ thống điều hòa và ngắt cầu dao trước khi ra về.
                  </span>
                </label>
              </div>

              <div className="form-field">
                <label>Ghi chú của Thủ thư tiếp nhận:</label>
                <textarea
                  rows={3}
                  value={surveyChecklist.staffNote}
                  onChange={(e) =>
                    setSurveyChecklist({
                      ...surveyChecklist,
                      staffNote: e.target.value,
                    })
                  }
                />
              </div>

              <div className="modal-footer-actions">
                <button
                  type="button"
                  className="btn-modal-cancel"
                  onClick={() => setShowSurveyModal(false)}
                >
                  Đóng
                </button>
                <button
                  type="button"
                  className="btn-modal-submit"
                  onClick={handleCompleteSurveyCheckout}
                >
                  Xác nhận hoàn tất trả phòng
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
