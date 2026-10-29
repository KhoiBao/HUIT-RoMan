import { useState, useEffect, useMemo, useCallback, type FormEvent } from "react";
import { api } from "../lib/api";
import { useAuth } from "../auth/AuthContext";
import { formatRole } from "../lib/auth";
import AdminBookingApprovalTab from "../components/admin/AdminBookingApprovalTab";
import AdminRoomsManagementTab from "../components/admin/AdminRoomsManagementTab";
import AdminEquipmentsManagementTab from "../components/admin/AdminEquipmentsManagementTab";
import AdminRoomTypesTab from "../components/admin/AdminRoomTypesTab";
import AdminDepartmentsTab from "../components/admin/AdminDepartmentsTab";
import AdminEmployeesTab from "../components/admin/AdminEmployeesTab";
import AdminUsersTab from "../components/admin/AdminUsersTab";
import AdminUsageSessionsTab from "../components/admin/AdminUsageSessionsTab";
import AdminViolationsTab from "../components/admin/AdminViolationsTab";
import AdminShiftsTab from "../components/admin/AdminShiftsTab";
import AdminReportsTab from "../components/admin/AdminReportsTab";
import AdminChatTab from "../components/admin/AdminChatTab";
import AdminGlobalSearchModal from "../components/admin/AdminGlobalSearchModal";
import NotificationCenter from "../components/NotificationCenter";
import SchedulePage from "./SchedulePage";
import {
  ClockIcon,
  DoorIcon,
  CheckCircleIcon,
  AlertTriangleIcon,
  BellRingIcon,
  ShieldCheckIcon,
  ClipboardListIcon,
  TvIcon,
  PlusIcon,
  SearchIcon,
  TagIcon,
  BriefcaseIcon,
  GraduationCapIcon,
  BankIcon,
  CalendarIcon,
  XIcon,
  ChatIcon,
  GridIcon,
  SunIcon,
  MoonIcon,
  SidebarIcon,
  LogOutIcon,
} from "../components/Icon";

export type AdminTabType =
  | "overview"
  | "approvals"
  | "sessions"
  | "violations"
  | "shifts"
  | "reports"
  | "chat"
  | "rooms"
  | "equipments"
  | "roomTypes"
  | "departments"
  | "employees"
  | "users"
  | "timeline";

export interface SystemUserOption {
  id: number;
  userName: string;
  cardCode?: string;
  fullName: string;
  email: string;
  phoneNumber?: string;
  departmentName?: string;
  role: string;
}

export interface DbRoomOption {
  id: number;
  roomCode: string;
  name: string;
  capacity: number;
  status: string;
  roomTypeName?: string;
  description?: string;
}

export default function AdminDashboardPage() {
  const { user, logout } = useAuth();
  const isAdmin = user?.role === "Admin" || user?.role === "quan-tri" || user?.role === "Quản trị viên";
  // Navigation active tab: overview | approvals | rooms | roomTypes | departments | employees | users | timeline
  const [activeTab, setActiveTab] = useState<AdminTabType>("overview");
  const [sidebarCollapsed, setSidebarCollapsed] = useState<boolean>(false);
  const [isDarkMode, setIsDarkMode] = useState<boolean>(() => {
    try {
      return localStorage.getItem("roman-admin-theme") === "dark";
    } catch {
      return false;
    }
  });
  const [isNarrow, setIsNarrow] = useState<boolean>(() =>
    typeof window !== "undefined"
      ? window.matchMedia("(max-width: 1024px)").matches
      : false
  );
  const [isMobileNavOpen, setIsMobileNavOpen] = useState<boolean>(false);

  useEffect(() => {
    try {
      localStorage.setItem("roman-admin-theme", isDarkMode ? "dark" : "light");
    } catch {
      // storage bị chặn thì bỏ qua, theme vẫn đổi trong phiên
    }
  }, [isDarkMode]);

  useEffect(() => {
    const mq = window.matchMedia("(max-width: 1024px)");
    const handleChange = (event: MediaQueryListEvent) => {
      setIsNarrow(event.matches);
      if (!event.matches) setIsMobileNavOpen(false);
    };
    mq.addEventListener("change", handleChange);
    return () => mq.removeEventListener("change", handleChange);
  }, []);

  // Trên mobile sidebar luôn mở rộng trong drawer, không dùng trạng thái thu gọn
  const isSidebarCompact = sidebarCollapsed && !isNarrow;


  const [pendingCount, setPendingCount] = useState<number>(0);
  const [approvalRefreshKey, setApprovalRefreshKey] = useState<number>(0);

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

  // Toast notification state
  const [toastMsg, setToastMsg] = useState<{
    text: string;
    type?: "success" | "warning" | "info";
  } | null>(null);

  const showToast = useCallback((
    text: string,
    type: "success" | "warning" | "info" = "success"
  ) => {
    setToastMsg({ text, type });
    setTimeout(() => {
      setToastMsg(null);
    }, 4500);
  }, []);

  // Modals state
  const [showManualModal, setShowManualModal] = useState<boolean>(false);
  const [showGlobalSearchModal, setShowGlobalSearchModal] = useState<boolean>(false);
  const [pendingViolationsCount, setPendingViolationsCount] = useState<number>(0);

  // Keyboard shortcut Ctrl+K to open Global Search
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        setShowGlobalSearchModal((prev) => !prev);
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, []);

  // Fetch pending violations count
  useEffect(() => {
    const fetchViolationsCount = async () => {
      try {
        const res = await api.get("/api/Violations/stats");
        if (res.data?.data) {
          setPendingViolationsCount(res.data.data.pendingRecords || 0);
        }
      } catch {
        // ignore
      }
    };
    fetchViolationsCount();
    const interval = setInterval(fetchViolationsCount, 20000);
    return () => clearInterval(interval);
  }, []);

  // Manual booking form state
  const [manualForm, setManualForm] = useState({
    roomId: 0,
    roomCode: "TV01",
    borrowerName: "",
    studentId: "",
    unit: "Khoa Công nghệ Thông tin",
    email: "",
    phone: "",
    bookingDate: new Date().toISOString().split("T")[0],
    startTime: "13:30",
    endTime: "15:30",
    guestCount: 6,
    purpose: "",
  });

  // System users for manual booking and direct account selection
  const [systemUsers, setSystemUsers] = useState<SystemUserOption[]>([]);
  const [availableDbRooms, setAvailableDbRooms] = useState<DbRoomOption[]>([]);
  const [selectedUserId, setSelectedUserId] = useState<number | "">("");
  const [userSearchQuery, setUserSearchQuery] = useState("");
  const [submittingManual, setSubmittingManual] = useState<boolean>(false);

  // Fetch users & rooms from system
  useEffect(() => {
    const fetchUsers = async () => {
      try {
        const res = await api.get("/api/Users");
        const list = res.data?.data || res.data || [];
        if (Array.isArray(list) && list.length > 0) {
          setSystemUsers(list);
          return;
        }
      } catch {
        // Fallback to search endpoint
      }
      try {
        const resSearch = await api.get("/api/Users/search");
        const listSearch = resSearch.data?.data || resSearch.data || [];
        if (Array.isArray(listSearch)) {
          setSystemUsers(listSearch);
        }
      } catch (err) {
        console.warn("Could not load users for manual booking:", err);
      }
    };

    const fetchRooms = async () => {
      try {
        const res = await api.get("/api/Rooms");
        const list = res.data?.data || res.data || [];
        if (Array.isArray(list) && list.length > 0) {
          setAvailableDbRooms(list);
          setManualForm((prev) => ({
            ...prev,
            roomId: list[0].id,
            roomCode: list[0].roomCode,
          }));
        }
      } catch (err) {
        console.warn("Could not load rooms for manual booking:", err);
      }
    };

    fetchUsers();
    fetchRooms();
  }, []);

  const filteredSystemUsers = useMemo(() => {
    if (!userSearchQuery.trim()) return systemUsers;
    const q = userSearchQuery.toLowerCase().trim();
    return systemUsers.filter((u) => {
      const name = (u.fullName || "").toLowerCase();
      const code = (u.cardCode || u.userName || "").toLowerCase();
      const email = (u.email || "").toLowerCase();
      const dept = (u.departmentName || "").toLowerCase();
      return (
        name.includes(q) ||
        code.includes(q) ||
        email.includes(q) ||
        dept.includes(q)
      );
    });
  }, [systemUsers, userSearchQuery]);

  const handleUserSelect = (uid: number | "") => {
    setSelectedUserId(uid);
    if (!uid) {
      setManualForm((prev) => ({
        ...prev,
        borrowerName: "",
        studentId: "",
        unit: "",
        email: "",
        phone: "",
      }));
      return;
    }
    const found = systemUsers.find((u) => u.id === uid);
    if (found) {
      setManualForm((prev) => ({
        ...prev,
        borrowerName: found.fullName || "",
        studentId: found.cardCode || found.userName || "",
        unit: found.departmentName || "Khoa Công nghệ Thông tin",
        email: found.email || "",
        phone: found.phoneNumber || "0900 000 000",
      }));
    }
  };

  const handleCloseManualModal = () => {
    setShowManualModal(false);
    setSelectedUserId("");
    setUserSearchQuery("");
  };

  // Submit manual booking to API and update system
  const handleManualBookingSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (!manualForm.borrowerName || !manualForm.studentId) {
      alert("Vui lòng điền họ tên và MSSV/Mã cán bộ!");
      return;
    }

    setSubmittingManual(true);
    try {
      // Find roomId from database rooms
      let targetRoomId = manualForm.roomId;
      if (availableDbRooms.length > 0) {
        const found = availableDbRooms.find(
          (r) => r.id === manualForm.roomId || r.roomCode === manualForm.roomCode
        );
        targetRoomId = found ? found.id : availableDbRooms[0].id;
      }

      // Convert local date/time in Vietnam UTC+7
      const startTime =
        manualForm.startTime.length === 5
          ? `${manualForm.startTime}:00`
          : manualForm.startTime;
      const endTime =
        manualForm.endTime.length === 5
          ? `${manualForm.endTime}:00`
          : manualForm.endTime;
      const startLocal = new Date(`${manualForm.bookingDate}T${startTime}`);
      const endLocal = new Date(`${manualForm.bookingDate}T${endTime}`);

      if (endLocal <= startLocal) {
        alert("Giờ kết thúc phải sau giờ bắt đầu!");
        setSubmittingManual(false);
        return;
      }

      if (targetRoomId) {
        const payload = {
          activityName:
            manualForm.purpose ||
            `Đặt phòng trực tiếp (${manualForm.borrowerName})`,
          purpose: manualForm.purpose || "Sử dụng phòng học nhóm / nghiên cứu",
          guestCount: Number(manualForm.guestCount) || 1,
          note: `Đăng ký thủ công tại quầy cho ${manualForm.borrowerName} (${manualForm.studentId} - ${manualForm.unit})`,
          userId: selectedUserId ? Number(selectedUserId) : undefined,
          autoApprove: true,
          details: [
            {
              roomId: targetRoomId,
              startAt: startLocal.toISOString(),
              endAt: endLocal.toISOString(),
              guestCount: Number(manualForm.guestCount) || 1,
              purpose:
                manualForm.purpose || "Sử dụng phòng học nhóm / nghiên cứu",
            },
          ],
        };

        const res = await api.post("/api/Bookings", payload);
        const createdBooking = res.data?.data;

        // If server created as "Chờ duyệt", approve immediately
        if (createdBooking?.id && createdBooking?.status === "Chờ duyệt") {
          try {
            await api.patch(`/api/Bookings/${createdBooking.id}/approve`, {
              decision: "Đã duyệt",
              rejectionReason: "",
            });
          } catch {
            // ignore
          }
        }
      }

      handleCloseManualModal();
      setApprovalRefreshKey((k) => k + 1);
      showToast(
        `Khởi tạo thành công đơn đặt phòng thủ công cho ${manualForm.borrowerName} (${manualForm.roomCode})! Đã duyệt vào hệ thống.`,
        "success"
      );
    } catch (err: any) {
      console.error("Manual booking error:", err);
      const errMsg =
        err.response?.data?.message ||
        err.message ||
        "Không thể lưu đơn đặt phòng vào cơ sở dữ liệu.";
      alert(`Khởi tạo đặt phòng thất bại: ${errMsg}`);
    } finally {
      setSubmittingManual(false);
    }
  };

  const tabConfigList = useMemo(() => {
    const list = [
    {
      id: "overview" as AdminTabType,
      label: "Tổng quan",
      title: "Tổng quan điều hành & Báo cáo thống kê",
      subtitle: "Báo cáo số liệu tổng quan, phân tích tần suất sử dụng và hiệu suất khai thác phòng học HUIT.",
      icon: GridIcon,
    },
    {
      id: "approvals" as AdminTabType,
      label: "Duyệt đơn đặt",
      title: "Duyệt đơn đăng ký mượn phòng",
      subtitle: "Xét duyệt và phân luồng đơn đăng ký mượn phòng từ sinh viên, giảng viên.",
      icon: ClipboardListIcon,
      badge: pendingCount,
      badgeVariant: "primary" as const,
    },
    {
      id: "sessions" as AdminTabType,
      label: "Phiên sử dụng",
      title: "Phiên phòng & Khảo sát bàn giao",
      subtitle: "Giám sát quy trình Check-in, khảo sát hiện trạng và hoàn tất trả phòng.",
      icon: ShieldCheckIcon,
    },
    {
      id: "rooms" as AdminTabType,
      label: "Quản lý phòng",
      title: "Quản lý phòng & Cơ sở vật chất",
      subtitle: "Danh mục phòng học, hội trường và cấu hình trạng thái sử dụng.",
      icon: DoorIcon,
    },
    {
      id: "equipments" as AdminTabType,
      label: "Thiết bị",
      title: "Quản lý thiết bị & Tài sản",
      subtitle: "Theo dõi tình trạng Smart TV, micro, hub kết nối và thiết bị hỗ trợ.",
      icon: TvIcon,
    },
    {
      id: "roomTypes" as AdminTabType,
      label: "Loại phòng",
      title: "Cấu hình phân loại phòng",
      subtitle: "Quản lý nhóm phòng học nhóm, hội thảo và nghiên cứu chuyên sâu.",
      icon: TagIcon,
    },
    {
      id: "departments" as AdminTabType,
      label: "Khoa / Đơn vị",
      title: "Khoa & Đơn vị trực thuộc",
      subtitle: "Cơ cấu tổ chức các khoa và phòng ban chức năng Trường ĐH Công Thương TP.HCM.",
      icon: BankIcon,
    },
    {
      id: "employees" as AdminTabType,
      label: "Nhân sự",
      title: "Quản lý Nhân sự & Thủ thư",
      subtitle: "Danh sách cán bộ quản trị, thủ thư trực ca và phân quyền vận hành.",
      icon: BriefcaseIcon,
    },
    {
      id: "users" as AdminTabType,
      label: "Người dùng",
      title: "Tài khoản Sinh viên & Giảng viên",
      subtitle: "Tra cứu hồ sơ, phân quyền và lịch sử hoạt động của người dùng hệ thống.",
      icon: GraduationCapIcon,
    },
    {
      id: "shifts" as AdminTabType,
      label: "Ca trực & Sổ trực",
      title: "Ca trực & Sổ trực nhật ký",
      subtitle: "Phân bổ lịch trực ca, ghi nhận bàn giao và lưu trữ sự cố trong ca.",
      icon: CalendarIcon,
    },
    {
      id: "violations" as AdminTabType,
      label: "Xử lý vi phạm",
      title: "Xử lý vi phạm & Chế tài mượn",
      subtitle: "Ghi nhận vi phạm quy chế, chế tài điểm rèn luyện và tạm khóa quyền mượn.",
      icon: AlertTriangleIcon,
      badge: pendingViolationsCount,
      badgeVariant: "warning" as const,
    },
    {
      id: "chat" as AdminTabType,
      label: "Tin nhắn hỗ trợ",
      title: "Trung tâm tin nhắn trực tuyến",
      subtitle: "Hỗ trợ giải đáp thắc mắc và tiếp nhận yêu cầu từ người mượn phòng.",
      icon: ChatIcon,
    },
    {
      id: "timeline" as AdminTabType,
      label: "Lịch tổng thể",
      title: "Lịch tổng thể & Giám sát trực quan",
      subtitle: "Ma trận biểu đồ thời gian thực trực quan từng phòng học và khung giờ.",
      icon: ClockIcon,
    },
    ];

    if (!isAdmin) {
      const adminOnlyTabs = new Set(["roomTypes", "departments", "employees", "users"]);
      return list.filter((t) => !adminOnlyTabs.has(t.id));
    }

    return list;
  }, [pendingCount, pendingViolationsCount, isAdmin]);

  useEffect(() => {
    if (!isAdmin && ["roomTypes", "departments", "employees", "users"].includes(activeTab)) {
      setActiveTab("overview");
    }
  }, [isAdmin, activeTab]);

  const activeTabConfig = useMemo(() => {
    return tabConfigList.find((t) => t.id === activeTab) || tabConfigList[0];
  }, [tabConfigList, activeTab]);

  const CurrentTabIcon = activeTabConfig.icon;

  return (
    <div className={`admin-workspace-layout ${isDarkMode ? "dark-mode" : ""}`}>
      {/* Toast Alert */}
      {toastMsg && (
        <div
          className={`admin-toast-alert toast-${toastMsg.type || "success"}`}
          role="status"
          aria-live="polite"
          aria-atomic="true"
        >
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
            aria-label="Đóng thông báo"
          >
            <XIcon size={14} />
          </button>
        </div>
      )}

      {/* Mobile drawer backdrop */}
      <button
        type="button"
        aria-label="Đóng thanh điều hướng"
        tabIndex={isMobileNavOpen ? 0 : -1}
        className={`admin-sidebar-backdrop ${
          isMobileNavOpen ? "is-visible" : ""
        }`}
        onClick={() => setIsMobileNavOpen(false)}
      />

      {/* ── Left Sidebar Modern ───────────────────────────────── */}
      <aside
        className={`admin-sidebar-modern ${
          isSidebarCompact ? "is-collapsed" : ""
        } ${isMobileNavOpen ? "is-mobile-open" : ""}`}
      >
        <div className="admin-sidebar-top-section">
          {/* Brand header */}
          <div className="admin-sidebar-brand">
            <div className="admin-brand-icon-box">H</div>
            {!isSidebarCompact && (
              <div className="admin-brand-info">
                <span className="admin-brand-title">Quản lý phòng HUIT</span>
                <span className="admin-brand-sub">
                  HỆ THỐNG PHÒNG DÙNG CHUNG
                </span>
              </div>
            )}
          </div>

          {!isSidebarCompact && (
            <div style={{ padding: "0 14px 6px" }}>
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "4px" }}>
                <span className="admin-sidebar-section-title" style={{ padding: 0 }}>WORKSPACE</span>
                <span
                  style={{
                    fontSize: "10px",
                    fontWeight: 800,
                    letterSpacing: "0.4px",
                    padding: "2px 6px",
                    borderRadius: "4px",
                    background: isAdmin ? "#DBEAFE" : "#FEF3C7",
                    color: isAdmin ? "#1D4ED8" : "#B45309",
                  }}
                >
                  {isAdmin ? "QUẢN LÝ" : "NHÂN VIÊN"}
                </span>
              </div>
              <div style={{ fontSize: "11px", color: "var(--rp-muted)", fontWeight: 600, paddingLeft: "2px" }}>
                {user?.departmentName || (isAdmin ? "Ban Quản lý HUIT" : "Đơn vị Thư viện")}
              </div>
            </div>
          )}

          {/* Nav Items */}
          <nav className="admin-sidebar-nav-list">
            {tabConfigList.map((t) => {
              const IconComp = t.icon;
              const isActive = activeTab === t.id;
              return (
                <button
                  key={t.id}
                  type="button"
                  className={`admin-nav-item-btn ${isActive ? "is-active" : ""}`}
                  onClick={() => {
                    setActiveTab(t.id);
                    setIsMobileNavOpen(false);
                  }}
                  title={isSidebarCompact ? t.label : undefined}
                >
                  <IconComp size={18} className="admin-nav-icon" />
                  {!isSidebarCompact && (
                    <>
                      <span className="admin-nav-label">{t.label}</span>
                      {t.badge != null && t.badge > 0 && (
                        <span
                          className={`admin-nav-badge ${
                            t.badgeVariant === "warning" ? "badge-warning" : ""
                          }`}
                        >
                          {t.badge}
                        </span>
                      )}
                    </>
                  )}
                </button>
              );
            })}
          </nav>
        </div>

        {/* Sidebar Footer User Capsule */}
        <div className="admin-sidebar-footer">
          {!isSidebarCompact ? (
            <div className="admin-user-capsule">
              <div className="admin-user-avatar-circle">
                {user?.fullName ? user.fullName[0].toUpperCase() : "A"}
              </div>
              <div className="admin-user-details">
                <span className="admin-user-name" title={user?.fullName || "Admin"}>
                  {user?.fullName || user?.cardCode || "Quản trị viên"}
                </span>
                <span className="admin-user-sub" title={user?.departmentName || formatRole(user?.role || "Admin")}>
                  {isAdmin ? "Quản lý đơn vị" : `Nhân viên • ${user?.departmentName || "Thư viện"}`}
                </span>
              </div>
              <button
                type="button"
                className="admin-user-action-btn"
                title="Đăng xuất khỏi hệ thống"
                onClick={() => logout()}
              >
                <LogOutIcon size={16} />
              </button>
            </div>
          ) : (
            <button
              type="button"
              className="admin-user-action-btn"
              style={{ width: "100%", justifyContent: "center" }}
              title="Đăng xuất khỏi hệ thống"
              onClick={() => logout()}
            >
              <LogOutIcon size={18} />
            </button>
          )}
        </div>
      </aside>

      {/* ── Main Workspace Body ───────────────────────────────── */}
      <div className="admin-main-wrapper">
        {/* Topbar Modern */}
        <header className="admin-topbar-modern">
          <div className="admin-topbar-left">
            <button
              type="button"
              className="admin-sidebar-toggle-btn"
              onClick={() => {
                if (isNarrow) setIsMobileNavOpen((open) => !open);
                else setSidebarCollapsed((collapsed) => !collapsed);
              }}
              title={
                isNarrow
                  ? "Mở thanh điều hướng"
                  : isSidebarCompact
                  ? "Mở rộng sidebar"
                  : "Thu gọn sidebar"
              }
              aria-label="Mở thanh điều hướng"
              aria-expanded={isNarrow ? isMobileNavOpen : undefined}
            >
              <SidebarIcon size={18} />
            </button>

            {/* Pill Search Button (Ctrl+K) */}
            <button
              type="button"
              className="admin-search-pill-btn"
              onClick={() => setShowGlobalSearchModal(true)}
              title="Tìm kiếm nhanh phòng, đơn đặt, người dùng (Ctrl+K)"
            >
              <SearchIcon size={16} />
              <span className="admin-search-placeholder-text">
                Tìm phòng, đơn mượn, sinh viên, cán bộ... (Ctrl+K)
              </span>
              <kbd className="admin-search-shortcut-kbd">Ctrl+K</kbd>
            </button>
          </div>

          <div className="admin-topbar-right">
            {/* Notification Center */}
            <NotificationCenter />

            {/* Theme Toggle (Sun/Moon) */}
            <button
              type="button"
              className="admin-topbar-icon-action"
              onClick={() => setIsDarkMode(!isDarkMode)}
              title={isDarkMode ? "Chuyển sang giao diện sáng" : "Chuyển sang giao diện tối"}
              aria-label={isDarkMode ? "Chuyển sang giao diện sáng" : "Chuyển sang giao diện tối"}
              aria-pressed={isDarkMode}
            >
              {isDarkMode ? <SunIcon size={18} /> : <MoonIcon size={18} />}
            </button>
          </div>
        </header>

        {/* Content Body */}
        <div
          className={`admin-workspace-content ${
            activeTab === "timeline" ? "is-timeline" : ""
          }`}
        >
          {activeTab !== "timeline" && (
            <>
              {/* Breadcrumb */}
              <nav className="admin-breadcrumb-bar" aria-label="Breadcrumb">
                <span className="admin-breadcrumb-root">Không gian làm việc</span>
                <span className="admin-breadcrumb-separator">&gt;</span>
                <span className="admin-breadcrumb-current">{activeTabConfig.label}</span>
              </nav>

              {/* Page Header Row */}
              <div className="admin-page-hero-row">
                <div className="admin-page-hero-headings">
                  <div className="admin-hero-icon-square">
                    <CurrentTabIcon size={22} />
                  </div>
                  <div className="admin-hero-text-wrap">
                    <h1 className="admin-hero-main-title">{activeTabConfig.title}</h1>
                    <p className="admin-hero-sub-desc">{activeTabConfig.subtitle}</p>
                  </div>
                </div>

                <div className="admin-hero-actions-group">
                  {(activeTab === "overview" || activeTab === "reports") && (
                    <>
                      <button
                        type="button"
                        className="btn-admin-pill-primary"
                        onClick={() => setShowManualModal(true)}
                      >
                        <PlusIcon size={15} />
                        <span>Đặt phòng nhanh</span>
                      </button>

                      <button
                        type="button"
                        className="btn-admin-pill-secondary"
                        onClick={() => setActiveTab("timeline")}
                      >
                        <span>Xem lịch phòng</span>
                      </button>
                    </>
                  )}

                  <div className="live-sync-pill" style={{ marginLeft: "4px" }} title="Thời gian thực">
                    <span className="live-pulse-dot" />
                    <span className="live-sync-label">{liveClock}</span>
                  </div>
                </div>
              </div>
            </>
          )}

          {/* ── Active Tab Contents ────────────────────────── */}
          {(activeTab === "overview" || activeTab === "reports") && (
          <AdminReportsTab onNotify={showToast} />
        )}

        {activeTab === "approvals" && (
          <AdminBookingApprovalTab key={approvalRefreshKey} onNotify={showToast} />
        )}

        {activeTab === "sessions" && (
          <AdminUsageSessionsTab onNotify={showToast} />
        )}

        {activeTab === "violations" && (
          <AdminViolationsTab onNotify={showToast} />
        )}

        {activeTab === "shifts" && (
          <AdminShiftsTab onNotify={showToast} />
        )}

        {activeTab === "chat" && (
          <AdminChatTab onNotify={showToast} />
        )}

        {activeTab === "rooms" && (
          <AdminRoomsManagementTab onNotify={showToast} />
        )}

        {activeTab === "equipments" && (
          <AdminEquipmentsManagementTab onNotify={showToast} />
        )}

        {activeTab === "roomTypes" && isAdmin && (
          <AdminRoomTypesTab onNotify={showToast} />
        )}

        {activeTab === "departments" && isAdmin && (
          <AdminDepartmentsTab onNotify={showToast} />
        )}

        {activeTab === "employees" && isAdmin && (
          <AdminEmployeesTab onNotify={showToast} />
        )}

        {activeTab === "users" && isAdmin && (
          <AdminUsersTab onNotify={showToast} />
        )}

        {activeTab === "timeline" && (
          <div className="admin-embedded-schedule">
            <SchedulePage />
          </div>
        )}
        </div>
      </div>

      {/* Floating Chat Trigger on bottom-right */}
      <div className="admin-floating-chat-wrap">
        {activeTab === "overview" && (
          <button
            type="button"
            className="btn-floating-chat-pill"
            onClick={() => setActiveTab("chat")}
          >
            + Chat mới
          </button>
        )}
        <button
          type="button"
          className="btn-floating-chat-bubble"
          onClick={() => setActiveTab("chat")}
          title="Mở tin nhắn trực tuyến"
          aria-label="Mở tin nhắn trực tuyến"
        >
          <ChatIcon size={18} />
        </button>
      </div>

      {/* ── Modal 1: Khởi tạo đặt phòng thủ công (+ Đặt phòng) ──────────── */}
      {showManualModal && (
        <div className="admin-modal-overlay">
          <div className="admin-modal-box" style={{ maxWidth: "660px" }}>
            <div className="modal-header">
              <h3 className="modal-title">+ Khởi tạo đặt phòng thủ công</h3>
              <button
                type="button"
                className="modal-close-btn"
                onClick={handleCloseManualModal}
                aria-label="Đóng hộp thoại đặt phòng thủ công"
              >
                <XIcon size={16} />
              </button>
            </div>

            <form onSubmit={handleManualBookingSubmit} className="modal-form">
              <div className="form-group-grid">
                {/* Chọn người đại diện từ hệ thống */}
                <div className="form-field col-full">
                  <label style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                    <span>Chọn người đại diện từ danh sách hệ thống (*):</span>
                    {systemUsers.length > 0 && (
                      <span style={{ fontSize: "11px", fontWeight: "normal", color: "#64748b" }}>
                        ({systemUsers.length} tài khoản trong hệ thống)
                      </span>
                    )}
                  </label>
                  <div style={{ display: "grid", gridTemplateColumns: "1fr 2fr", gap: "8px" }}>
                    <div className="search-input-wrap">
                      <SearchIcon size={16} className="search-icon-inside" />
                      <input
                        type="text"
                        placeholder="Lọc tên / MSSV..."
                        value={userSearchQuery}
                        onChange={(e) => setUserSearchQuery(e.target.value)}
                      />
                    </div>
                    <select
                      value={selectedUserId}
                      onChange={(e) =>
                        handleUserSelect(e.target.value ? Number(e.target.value) : "")
                      }
                      style={{ height: "36px", fontSize: "13px", fontWeight: selectedUserId ? 600 : "normal" }}
                    >
                      <option value="">-- Chọn tài khoản người đại diện ({filteredSystemUsers.length}) --</option>
                      {filteredSystemUsers.map((u) => (
                        <option key={u.id} value={u.id}>
                          {u.fullName} - {u.cardCode || u.userName} [{formatRole(u.role)}] {u.departmentName ? `• ${u.departmentName}` : ""}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                <div className="form-field">
                  <label>Chọn phòng tiếp nhận:</label>
                  <select
                    value={manualForm.roomId || manualForm.roomCode}
                    onChange={(e) => {
                      const val = e.target.value;
                      const found = availableDbRooms.find(
                        (r) => String(r.id) === val || r.roomCode === val
                      );
                      if (found) {
                        setManualForm({
                          ...manualForm,
                          roomId: found.id,
                          roomCode: found.roomCode,
                        });
                      } else {
                        setManualForm({ ...manualForm, roomCode: val });
                      }
                    }}
                  >
                    {availableDbRooms.length > 0 ? (
                      availableDbRooms.map((r) => (
                        <option key={r.id} value={r.id}>
                          {r.name} ({r.roomCode} - {r.capacity} chỗ)
                        </option>
                      ))
                    ) : (
                      <option value="">Đang tải danh sách phòng...</option>
                    )}
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
                  <label>Ngày đặt:</label>
                  <input
                    type="date"
                    required
                    value={manualForm.bookingDate}
                    onChange={(e) =>
                      setManualForm({
                        ...manualForm,
                        bookingDate: e.target.value,
                      })
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

                <div className="form-field">
                  <label>Giờ bắt đầu:</label>
                  <input
                    type="time"
                    required
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
                    required
                    value={manualForm.endTime}
                    onChange={(e) =>
                      setManualForm({ ...manualForm, endTime: e.target.value })
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
                  onClick={handleCloseManualModal}
                >
                  Hủy bỏ
                </button>
                <button
                  type="submit"
                  className="btn-modal-submit"
                  disabled={submittingManual}
                >
                  {submittingManual
                    ? "Đang lưu & Duyệt..."
                    : "Tiếp nhận & Duyệt ngay"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Global Unified Search Modal (Phòng, Người mượn, Phiếu mượn, Biên bản vi phạm) */}
      <AdminGlobalSearchModal
        isOpen={showGlobalSearchModal}
        onClose={() => setShowGlobalSearchModal(false)}
        onSelectCategory={(tab) => setActiveTab(tab)}
      />
    </div>
  );
}
