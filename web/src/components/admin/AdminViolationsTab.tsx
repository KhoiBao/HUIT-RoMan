import { useState, useEffect, useMemo, useRef, type FormEvent } from "react";
import { createPortal } from "react-dom";
import {
  fetchViolations,
  fetchViolationTypes,
  fetchRestrictions,
  fetchViolationStats,
  recordViolation,
  updateViolation,
  deleteViolation,
  uploadViolationAttachment,
  deleteViolationAttachment,
  createViolationType,
  updateViolationType,
  deleteViolationType,
  liftRestriction,
  createRestriction,
  isImageAttachment,
  isPdfAttachment,
  getAttachmentViewUrl,
  getAttachmentDownloadUrl,
  type ViolationRecordItem,
  type ViolationTypeItem,
  type UserRestrictionItem,
  type ViolationAttachmentItem,
  type ViolationStats,
} from "../../lib/violations";
import { api } from "../../lib/api";
import { formatRole } from "../../lib/auth";
import {
  AlertTriangleIcon,
  BanIcon,
  ShieldCheckIcon,
  CheckCircleIcon,
  SearchIcon,
  ClockIcon,
  RefreshCwIcon,
  CheckIcon,
  XIcon,
  PlusIcon,
  DoorIcon,
  TagIcon,
  BellRingIcon,
  MegaphoneIcon,
  FlameIcon,
  ScaleIcon,
  DownloadIcon,
  FileTextIcon,
  TrashIcon,
  EyeIcon,
  ExternalLinkIcon,
  DotsIcon,
  InfoIcon,
  PencilIcon,
} from "../Icon";
import { getAllReminders, fetchReminders, type SessionReminderItem } from "../../lib/reminders";
import {
  getAllPenalties,
  createPenalty,
  updatePenalty,
  deletePenalty,
  resetToDefaultPenalties,
  type PenaltyItem,
} from "../../lib/penalties";
import { useConfirm } from "../../context/ConfirmContext";
import { useAuth } from "../../auth/AuthContext";
import { formatTime24h, formatDateVN, formatDateTime24h } from "../../lib/dateTimeFormat";
import AdminPagination from "../common/AdminPagination";

interface Props {
  onNotify: (msg: string, type?: "success" | "warning" | "info") => void;
  initialSessionForViolation?: {
    sessionId: number;
    userId: number;
    userName: string;
    roomCode: string;
    roomName: string;
  } | null;
  onClearInitialSession?: () => void;
}

interface UserOption {
  id: number;
  fullName: string;
  cardCode: string;
  email: string;
  role: string;
  departmentName?: string;
}

const SUGGESTED_PENALTIES = [
  {
    category: "Mức 1 - Nhẹ",
    items: [
      "Nhắc nhở / Cảnh cáo lần đầu",
      "Yêu cầu giữ trật tự / Nhắc nhở",
      "Nhắc nhở và ghi nhận biên bản vi phạm lần 1",
    ],
  },
  {
    category: "Mức 2 - Vừa",
    items: [
      "Cảnh cáo & Vệ sinh lại phòng",
      "Cảnh cáo & Cấm mượn phòng 3 ngày",
      "Cấm mượn phòng 7 ngày",
    ],
  },
  {
    category: "Mức 3 - Nghiêm trọng",
    items: [
      "Cấm mượn phòng 14 ngày & Bồi thường chi phí sửa chữa",
      "Bồi thường chi phí sửa chữa / vệ sinh thiết bị",
      "Cấm mượn phòng 14 ngày",
    ],
  },
  {
    category: "Mức 4 - Rất nghiêm trọng",
    items: [
      "Cấm mượn phòng 30 ngày & Trừ điểm rèn luyện",
      "Cấm mượn phòng vô thời hạn & Chuyển HĐ Kỷ luật nhà trường",
      "Tạm đình chỉ quyền mượn phòng toàn trường",
    ],
  },
];

const QUICK_PENALTY_PILLS = [
  "Nhắc nhở / Cảnh cáo lần đầu",
  "Yêu cầu giữ trật tự / Nhắc nhở",
  "Cảnh cáo & Vệ sinh lại phòng",
  "Cảnh cáo & Cấm mượn phòng 3 ngày",
  "Cấm mượn phòng 7 ngày",
  "Cấm mượn phòng 14 ngày & Bồi thường chi phí sửa chữa",
  "Cấm mượn phòng 30 ngày & Trừ điểm rèn luyện",
];

function formatFileSize(bytes: number): string {
  if (!bytes || bytes <= 0) return "0 B";
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export default function AdminViolationsTab({
  onNotify,
  initialSessionForViolation,
  onClearInitialSession,
}: Props) {
  const { user } = useAuth();
  const isAdmin = user?.role === "Admin" || user?.role === "quan-tri" || user?.role === "Quản trị viên";
  const { confirm, alert } = useConfirm();

  // Department filter for Admin: "ALL" | "3" (Thư viện) | "2" (Phòng Đào tạo)
  const [selectedDepartmentId, setSelectedDepartmentId] = useState<string>("ALL");

  const activeDepartmentId = useMemo(() => {
    if (!isAdmin && user?.departmentId) {
      return user.departmentId;
    }
    if (isAdmin && selectedDepartmentId !== "ALL") {
      return Number(selectedDepartmentId);
    }
    return undefined;
  }, [isAdmin, user?.departmentId, selectedDepartmentId]);

  // List of active/recent usage sessions for picker in violation modal
  const [sessionsList, setSessionsList] = useState<
    Array<{
      id: number;
      roomCode: string;
      roomName: string;
      userFullName: string;
      userId?: number;
      userCardCode?: string;
    }>
  >([]);

  // Navigation Sub-tabs: 'records' | 'restrictions' | 'reminders' | 'types'
  const [activeSubTab, setActiveSubTab] = useState<
    "records" | "restrictions" | "reminders" | "types" | "penalties"
  >("records");

  // State: Data
  const [violations, setViolations] = useState<ViolationRecordItem[]>([]);
  const [violationTypes, setViolationTypes] = useState<ViolationTypeItem[]>([]);
  const [restrictions, setRestrictions] = useState<UserRestrictionItem[]>([]);
  const [stats, setStats] = useState<ViolationStats>({
    totalRecords: 0,
    pendingRecords: 0,
    resolvedRecords: 0,
    activeRestrictions: 0,
    severeRecords: 0,
  });
  const [usersList, setUsersList] = useState<UserOption[]>([]);
  const [loading, setLoading] = useState(false);

  // Filters and Pagination for Records
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedTypeFilter, setSelectedTypeFilter] = useState<string>("ALL");
  const [selectedSeverityFilter, setSelectedSeverityFilter] =
    useState<string>("ALL");
  const [selectedStatusFilter, setSelectedStatusFilter] =
    useState<string>("ALL");
  const [recordSortBy, setRecordSortBy] = useState<
    "newest" | "oldest" | "severity_desc" | "severity_asc" | "user"
  >("newest");
  const [recordDateFilter, setRecordDateFilter] = useState<string>("");
  const [recordPage, setRecordPage] = useState<number>(1);
  const [recordPageSize, setRecordPageSize] = useState<number>(10);

  // Filters and Pagination for Restrictions
  const [restrictionSearch, setRestrictionSearch] = useState("");
  const [restrictionStatusFilter, setRestrictionStatusFilter] =
    useState<string>("ACTIVE");
  const [restrictionSortBy, setRestrictionSortBy] = useState<
    "end_date_asc" | "end_date_desc" | "newest" | "user"
  >("end_date_asc");
  const [restrictionPage, setRestrictionPage] = useState<number>(1);
  const [restrictionPageSize, setRestrictionPageSize] = useState<number>(10);

  // Filters and Pagination for Types
  const [typeSearchTerm, setTypeSearchTerm] = useState("");
  const [typeSeverityFilter, setTypeSeverityFilter] = useState<string>("ALL");
  const [typePage, setTypePage] = useState<number>(1);
  const [typePageSize, setTypePageSize] = useState<number>(10);

  // Filters and Pagination for Reminders (Rule of 3)
  const [reminders, setReminders] = useState<SessionReminderItem[]>([]);
  const [reminderSearch, setReminderSearch] = useState("");
  const [reminderLevelFilter, setReminderLevelFilter] = useState<string>("ALL");
  const [reminderPage, setReminderPage] = useState<number>(1);
  const [reminderPageSize, setReminderPageSize] = useState<number>(10);

  // Dropdown Action Menu (3 dots) state & handlers
  const [rowMenu, setRowMenu] = useState<{
    key: string | number;
    top: number;
    left: number;
    openUp?: boolean;
  } | null>(null);
  const rowMenuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!rowMenu) return;
    const close = () => setRowMenu(null);
    const onPointerDown = (event: PointerEvent) => {
      const target = event.target as HTMLElement;
      if (rowMenuRef.current?.contains(target)) return;
      if (target.closest(".btn-table-more")) return;
      close();
    };
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") close();
    };
    document.addEventListener("pointerdown", onPointerDown);
    document.addEventListener("keydown", onKeyDown);
    window.addEventListener("scroll", close, true);
    window.addEventListener("resize", close);
    return () => {
      document.removeEventListener("pointerdown", onPointerDown);
      document.removeEventListener("keydown", onKeyDown);
      window.removeEventListener("scroll", close, true);
      window.removeEventListener("resize", close);
    };
  }, [rowMenu]);

  function toggleRowMenu(key: string | number, btn: HTMLElement) {
    if (rowMenu?.key === key) {
      setRowMenu(null);
      return;
    }
    const rect = btn.getBoundingClientRect();
    const menuWidth = 230;
    const menuHeight = 160;
    const openUp =
      rect.bottom + menuHeight + 12 > window.innerHeight &&
      rect.top > menuHeight + 12;
    setRowMenu({
      key,
      top: openUp ? rect.top - 8 : rect.bottom + 8,
      left: Math.max(8, Math.min(rect.right - menuWidth, window.innerWidth - menuWidth - 8)),
      openUp,
    });
  }

  const refreshReminders = async () => {
    try {
      const list = await fetchReminders(
        activeDepartmentId ? { departmentId: activeDepartmentId } : undefined
      );
      setReminders(list);
    } catch {
      setReminders(getAllReminders());
    }
  };

  useEffect(() => {
    void refreshReminders();
  }, [activeDepartmentId]);

  useEffect(() => {
    setReminderPage(1);
  }, [reminderSearch, reminderLevelFilter]);

  const filteredReminders = useMemo(() => {
    return reminders.filter((r) => {
      if (reminderLevelFilter !== "ALL") {
        if (reminderLevelFilter === "ESCALATED" && !r.escalatedToViolation) return false;
        if (
          reminderLevelFilter === "LEVEL_3" &&
          (r.warningLevel !== 3 || r.escalatedToViolation)
        )
          return false;
        if (
          reminderLevelFilter === "LEVEL_1_2" &&
          (r.warningLevel > 2 || r.escalatedToViolation)
        )
          return false;
      }
      if (reminderSearch.trim()) {
        const q = reminderSearch.toLowerCase().trim();
        const matchUser =
          r.userFullName.toLowerCase().includes(q) ||
          (r.userCardCode || "").toLowerCase().includes(q) ||
          (r.userName || "").toLowerCase().includes(q);
        const matchRoom =
          r.roomCode.toLowerCase().includes(q) ||
          r.roomName.toLowerCase().includes(q);
        const matchReason =
          r.reason.toLowerCase().includes(q) ||
          (r.note || "").toLowerCase().includes(q);
        const matchStaff = r.remindedByStaff.toLowerCase().includes(q);
        if (!matchUser && !matchRoom && !matchReason && !matchStaff) return false;
      }
      return true;
    });
  }, [reminders, reminderSearch, reminderLevelFilter]);

  const pagedReminders = useMemo(() => {
    const start = (reminderPage - 1) * reminderPageSize;
    return filteredReminders.slice(start, start + reminderPageSize);
  }, [filteredReminders, reminderPage, reminderPageSize]);

  useEffect(() => {
    setRecordPage(1);
  }, [searchTerm, selectedTypeFilter, selectedSeverityFilter, selectedStatusFilter, recordDateFilter, recordSortBy]);

  useEffect(() => {
    setRestrictionPage(1);
  }, [restrictionSearch, restrictionStatusFilter, restrictionSortBy]);

  useEffect(() => {
    setTypePage(1);
  }, [typeSearchTerm, typeSeverityFilter]);

  // State: Penalties Management
  const [penalties, setPenalties] = useState<PenaltyItem[]>([]);
  const [penaltySearchTerm, setPenaltySearchTerm] = useState("");
  const [penaltySeverityFilter, setPenaltySeverityFilter] = useState<string>("ALL");
  const [penaltyPage, setPenaltyPage] = useState(1);
  const [penaltyPageSize, setPenaltyPageSize] = useState(10);

  useEffect(() => {
    setPenaltyPage(1);
  }, [penaltySearchTerm, penaltySeverityFilter]);

  // Modal: Add / Edit Penalty
  const [showPenaltyModal, setShowPenaltyModal] = useState(false);
  const [editingPenaltyId, setEditingPenaltyId] = useState<string | null>(null);
  const [penaltyFormCode, setPenaltyFormCode] = useState("");
  const [penaltyFormName, setPenaltyFormName] = useState("");
  const [penaltyFormSeverity, setPenaltyFormSeverity] = useState(1);
  const [penaltyFormRestrictDays, setPenaltyFormRestrictDays] = useState(0);
  const [penaltyFormDesc, setPenaltyFormDesc] = useState("");
  const [submittingPenalty, setSubmittingPenalty] = useState(false);

  // Multi-select state in Type Modal
  const [selectedPenaltyIds, setSelectedPenaltyIds] = useState<string[]>([]);
  const [typeModalPenaltyFilter, setTypeModalPenaltyFilter] = useState<string>("ALL");
  const [typeModalPenaltySearch, setTypeModalPenaltySearch] = useState<string>("");

  // Modal: Record Violation
  const [showRecordModal, setShowRecordModal] = useState(false);
  const [formUserId, setFormUserId] = useState<number>(0);
  const [formUserSearch, setFormUserSearch] = useState("");
  const [formViolationTypeId, setFormViolationTypeId] = useState<number>(0);
  const [formUsageSessionId, setFormUsageSessionId] = useState<string>("");
  const [formIncidentTime, setFormIncidentTime] = useState<string>(
    new Date().toISOString().slice(0, 16)
  );
  const [formDescription, setFormDescription] = useState("");
  const [formSeverity, setFormSeverity] = useState<number>(1);
  const [formPenaltyApplied, setFormPenaltyApplied] = useState("");
  const [formRestrictDays, setFormRestrictDays] = useState<number>(0);
  const [formStatus, setFormStatus] = useState<string>("Đã xử lý");
  const [submittingRecord, setSubmittingRecord] = useState(false);

  // Attachments state (MinIO / S3)
  const [creationFiles, setCreationFiles] = useState<File[]>([]);
  const [uploadingAttachment, setUploadingAttachment] = useState(false);
  const [previewAttachment, setPreviewAttachment] = useState<ViolationAttachmentItem | null>(null);
  const [previewImageFailed, setPreviewImageFailed] = useState(false);
  const detailFileInputRef = useRef<HTMLInputElement>(null);
  const creationFileInputRef = useRef<HTMLInputElement>(null);

  // Modal: Detail & Handle Violation
  const [selectedRecord, setSelectedRecord] =
    useState<ViolationRecordItem | null>(null);
  const [editStatus, setEditStatus] = useState<string>("");
  const [editPenalty, setEditPenalty] = useState<string>("");
  const [editDescription, setEditDescription] = useState<string>("");
  const [editSeverity, setEditSeverity] = useState<number>(1);
  const [updatingRecord, setUpdatingRecord] = useState(false);

  // Modal: Add / Edit Violation Type
  const [showTypeModal, setShowTypeModal] = useState(false);
  const [editingTypeId, setEditingTypeId] = useState<number | null>(null);
  const [typeFormCode, setTypeFormCode] = useState("");
  const [typeFormName, setTypeFormName] = useState("");
  const [typeFormDesc, setTypeFormDesc] = useState("");
  const [typeFormSeverity, setTypeFormSeverity] = useState(1);
  const [typeFormPenalty, setTypeFormPenalty] = useState("");
  const [submittingType, setSubmittingType] = useState(false);

  // Modal: Manual Restriction
  const [showManualRestrictionModal, setShowManualRestrictionModal] =
    useState(false);
  const [restrUserId, setRestrUserId] = useState<number>(0);
  const [restrReason, setRestrReason] = useState("");
  const [restrDays, setRestrDays] = useState<number>(7);
  const [submittingRestr, setSubmittingRestr] = useState(false);

  // Modal: Lift Restriction Confirmation
  const [liftTarget, setLiftTarget] = useState<UserRestrictionItem | null>(null);
  const [liftReason, setLiftReason] = useState("");
  const [submittingLift, setSubmittingLift] = useState(false);

  // Load all initial data
  const loadAllData = async () => {
    try {
      setLoading(true);
      const [vList, tList, rList, sData, sessRes] = await Promise.all([
        fetchViolations({ departmentId: activeDepartmentId }),
        fetchViolationTypes(),
        fetchRestrictions({ departmentId: activeDepartmentId }),
        fetchViolationStats(activeDepartmentId),
        api
          .get("/api/UsageSessions", {
            params: activeDepartmentId ? { departmentId: activeDepartmentId } : undefined,
          })
          .catch(() => ({ data: [] })),
      ]);
      setViolations(vList);
      setViolationTypes(tList);
      setRestrictions(rList);
      setStats(sData);
      setPenalties(getAllPenalties());
      void refreshReminders();

      const rawSessions = sessRes.data?.data || sessRes.data || [];
      if (Array.isArray(rawSessions)) {
        setSessionsList(
          rawSessions.map((s: any) => ({
            id: s.id,
            roomCode: s.roomCode || s.bookingDetail?.room?.roomCode || "",
            roomName: s.roomName || s.bookingDetail?.room?.name || "",
            userFullName: s.userFullName || s.user?.fullName || "",
            userId: s.userId || s.user?.id || s.bookingDetail?.booking?.userId || 0,
            userCardCode: s.userCardCode || s.user?.cardCode || "",
          }))
        );
      }

      if (tList.length > 0 && formViolationTypeId === 0) {
        setFormViolationTypeId(tList[0].id);
        setFormSeverity(tList[0].severity);
        setFormPenaltyApplied(tList[0].defaultPenalty || "Cảnh cáo");
        setFormStatus(tList[0].severity >= 3 ? "Đang xử lý" : "Đã xử lý");
      }
    } catch (err: any) {
      console.error("Error loading violation data:", err);
      onNotify("Không thể nạp dữ liệu phân hệ vi phạm từ máy chủ.", "warning");
    } finally {
      setLoading(false);
    }
  };

  // Fetch users for selector
  const loadUsers = async () => {
    try {
      const res = await api.get("/api/Users");
      const list = res.data?.data || res.data || [];
      if (Array.isArray(list) && list.length > 0) {
        setUsersList(list);
        return;
      }
    } catch {
      // Fallback to search endpoint
    }

    try {
      const resSearch = await api.get("/api/Users/search");
      const listSearch = resSearch.data?.data || resSearch.data || [];
      if (Array.isArray(listSearch)) {
        setUsersList(listSearch);
      }
    } catch (err) {
      console.warn("Could not load users list:", err);
    }
  };

  useEffect(() => {
    loadAllData();
  }, [activeDepartmentId]);

  useEffect(() => {
    loadUsers();
  }, []);

  // Handle incoming session if pre-selected from UsageSessions tab
  useEffect(() => {
    if (initialSessionForViolation) {
      setFormUserId(initialSessionForViolation.userId);
      setFormUserSearch(initialSessionForViolation.userName || "");
      setFormUsageSessionId(String(initialSessionForViolation.sessionId));
      setFormDescription(
        `Ghi nhận vi phạm tại phòng ${initialSessionForViolation.roomCode} (${initialSessionForViolation.roomName}) trong phiên sử dụng #${initialSessionForViolation.sessionId}.`
      );
      setFormStatus(formSeverity >= 3 ? "Đang xử lý" : "Đã xử lý");
      setShowRecordModal(true);
      if (onClearInitialSession) onClearInitialSession();
    }
  }, [initialSessionForViolation]);

  // When changing violation type in form, auto-suggest severity, penalty and status
  const handleTypeChange = (typeId: number) => {
    setFormViolationTypeId(typeId);
    const vt = violationTypes.find((t) => t.id === typeId);
    if (vt) {
      setFormSeverity(vt.severity);
      setFormPenaltyApplied(vt.defaultPenalty || "Cảnh cáo");
      if (vt.severity >= 3) {
        setFormRestrictDays(14);
        setFormStatus("Đang xử lý");
      } else if (vt.severity === 2) {
        setFormRestrictDays(3);
        setFormStatus("Đã xử lý");
      } else {
        setFormRestrictDays(0);
        setFormStatus("Đã xử lý");
      }
    }
  };

  // When changing usage session in modal: auto sync User & Description
  const handleSessionChange = (sessionIdStr: string) => {
    setFormUsageSessionId(sessionIdStr);
    if (!sessionIdStr) return;
    const sess = sessionsList.find((s) => String(s.id) === sessionIdStr);
    if (sess) {
      if (sess.userId) {
        setFormUserId(sess.userId);
        setFormUserSearch(`${sess.userFullName}${sess.userCardCode ? ` (${sess.userCardCode})` : ""}`);
      }
      if (!formDescription.trim()) {
        setFormDescription(
          `Ghi nhận vi phạm tại phòng ${sess.roomCode} (${sess.roomName}) trong phiên sử dụng #${sess.id}.`
        );
      }
    }
  };

  // Filtered & Sorted Violations list
  const filteredViolations = useMemo(() => {
    let result = violations.filter((v) => {
      if (
        selectedTypeFilter !== "ALL" &&
        v.violationTypeId !== Number(selectedTypeFilter)
      )
        return false;
      if (
        selectedSeverityFilter !== "ALL" &&
        v.severity !== Number(selectedSeverityFilter)
      )
        return false;
      if (selectedStatusFilter !== "ALL") {
        const filterLower = selectedStatusFilter.toLowerCase();
        const statusLower = (v.status || "").toLowerCase();
        if (filterLower === "đang xử lý" || filterLower === "chờ xử lý") {
          if (statusLower !== "đang xử lý" && statusLower !== "chờ xử lý") return false;
        } else if (statusLower !== filterLower) {
          return false;
        }
      }
      if (recordDateFilter && (!v.incidentTime || !v.incidentTime.startsWith(recordDateFilter))) {
        return false;
      }

      if (searchTerm.trim()) {
        const q = searchTerm.toLowerCase().trim();
        const matchCode = (v.code || "").toLowerCase().includes(q);
        const matchUser =
          (v.userFullName || "").toLowerCase().includes(q) ||
          (v.userCardCode || "").toLowerCase().includes(q) ||
          (v.userName || "").toLowerCase().includes(q);
        const matchType = (v.violationTypeName || "").toLowerCase().includes(q);
        const matchDesc = (v.description || "").toLowerCase().includes(q);
        const matchPenalty = (v.penaltyApplied || "").toLowerCase().includes(q);
        const matchRoom = (v.roomCode || "").toLowerCase().includes(q);
        if (
          !matchCode &&
          !matchUser &&
          !matchType &&
          !matchDesc &&
          !matchPenalty &&
          !matchRoom
        )
          return false;
      }
      return true;
    });

    result.sort((a, b) => {
      if (recordSortBy === "newest") {
        return new Date(b.incidentTime).getTime() - new Date(a.incidentTime).getTime();
      }
      if (recordSortBy === "oldest") {
        return new Date(a.incidentTime).getTime() - new Date(b.incidentTime).getTime();
      }
      if (recordSortBy === "severity_desc") {
        return b.severity - a.severity;
      }
      if (recordSortBy === "severity_asc") {
        return a.severity - b.severity;
      }
      if (recordSortBy === "user") {
        return (a.userFullName || "").localeCompare(b.userFullName || "");
      }
      return 0;
    });

    return result;
  }, [
    violations,
    selectedTypeFilter,
    selectedSeverityFilter,
    selectedStatusFilter,
    recordDateFilter,
    recordSortBy,
    searchTerm,
  ]);

  const pagedViolations = useMemo(() => {
    const start = (recordPage - 1) * recordPageSize;
    return filteredViolations.slice(start, start + recordPageSize);
  }, [filteredViolations, recordPage, recordPageSize]);

  // Filtered & Sorted Restrictions list
  const filteredRestrictions = useMemo(() => {
    let result = restrictions.filter((r) => {
      if (restrictionStatusFilter === "ACTIVE" && !r.isActive) return false;
      if (
        restrictionStatusFilter === "EXPIRED" &&
        (r.isActive || r.status === "Đã gỡ")
      )
        return false;
      if (
        restrictionStatusFilter === "LIFTED" &&
        r.status !== "Đã gỡ"
      )
        return false;

      if (restrictionSearch.trim()) {
        const q = restrictionSearch.toLowerCase().trim();
        const matchUser =
          (r.userFullName || "").toLowerCase().includes(q) ||
          (r.userCardCode || "").toLowerCase().includes(q) ||
          (r.userEmail || "").toLowerCase().includes(q);
        const matchReason = (r.reason || "").toLowerCase().includes(q);
        if (!matchUser && !matchReason) return false;
      }
      return true;
    });

    result.sort((a, b) => {
      if (restrictionSortBy === "end_date_asc") {
        return new Date(a.endAt || 0).getTime() - new Date(b.endAt || 0).getTime();
      }
      if (restrictionSortBy === "end_date_desc") {
        return new Date(b.endAt || 0).getTime() - new Date(a.endAt || 0).getTime();
      }
      if (restrictionSortBy === "newest") {
        return new Date(b.startAt).getTime() - new Date(a.startAt).getTime();
      }
      if (restrictionSortBy === "user") {
        return (a.userFullName || "").localeCompare(b.userFullName || "");
      }
      return 0;
    });

    return result;
  }, [restrictions, restrictionStatusFilter, restrictionSearch, restrictionSortBy]);

  const pagedRestrictions = useMemo(() => {
    const start = (restrictionPage - 1) * restrictionPageSize;
    return filteredRestrictions.slice(start, start + restrictionPageSize);
  }, [filteredRestrictions, restrictionPage, restrictionPageSize]);

  // Filtered & Sorted Violation Types
  const filteredPenalties = useMemo(() => {
    return penalties.filter((p) => {
      const matchSearch =
        !penaltySearchTerm ||
        p.code.toLowerCase().includes(penaltySearchTerm.toLowerCase()) ||
        p.name.toLowerCase().includes(penaltySearchTerm.toLowerCase()) ||
        (p.description && p.description.toLowerCase().includes(penaltySearchTerm.toLowerCase()));

      const matchSeverity =
        penaltySeverityFilter === "ALL" || String(p.severity) === penaltySeverityFilter;

      return matchSearch && matchSeverity;
    });
  }, [penalties, penaltySearchTerm, penaltySeverityFilter]);

  const pagedPenalties = useMemo(() => {
    const start = (penaltyPage - 1) * penaltyPageSize;
    return filteredPenalties.slice(start, start + penaltyPageSize);
  }, [filteredPenalties, penaltyPage, penaltyPageSize]);

  const filteredTypes = useMemo(() => {
    return violationTypes.filter((vt) => {
      if (typeSeverityFilter !== "ALL" && vt.severity !== Number(typeSeverityFilter)) {
        return false;
      }
      if (typeSearchTerm.trim()) {
        const q = typeSearchTerm.toLowerCase().trim();
        const mCode = (vt.code || "").toLowerCase().includes(q);
        const mName = (vt.name || "").toLowerCase().includes(q);
        const mDesc = (vt.description || "").toLowerCase().includes(q);
        const mPenalty = (vt.defaultPenalty || "").toLowerCase().includes(q);
        if (!mCode && !mName && !mDesc && !mPenalty) return false;
      }
      return true;
    });
  }, [violationTypes, typeSeverityFilter, typeSearchTerm]);

  const pagedTypes = useMemo(() => {
    const start = (typePage - 1) * typePageSize;
    return filteredTypes.slice(start, start + typePageSize);
  }, [filteredTypes, typePage, typePageSize]);

  // Users filtered for user picker
  const filteredUsersForPicker = useMemo(() => {
    if (!formUserSearch.trim()) return usersList.slice(0, 8);
    const q = formUserSearch.toLowerCase().trim();
    return usersList
      .filter(
        (u) =>
          (u.fullName || "").toLowerCase().includes(q) ||
          (u.cardCode || "").toLowerCase().includes(q) ||
          (u.email || "").toLowerCase().includes(q)
      )
      .slice(0, 10);
  }, [usersList, formUserSearch]);

  // Submit: Record New Violation
  const handleRecordSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (!formUserId) {
      await alert({
        title: "Thiếu thông tin",
        message: "Vui lòng chọn người vi phạm!",
        type: "warning",
      });
      return;
    }
    if (!formViolationTypeId) {
      await alert({
        title: "Thiếu thông tin",
        message: "Vui lòng chọn loại vi phạm!",
        type: "warning",
      });
      return;
    }
    if (!formDescription.trim()) {
      await alert({
        title: "Thiếu thông tin",
        message: "Vui lòng nhập mô tả chi tiết sự việc vi phạm!",
        type: "warning",
      });
      return;
    }

    try {
      setSubmittingRecord(true);
      const createdRecord = await recordViolation({
        userId: formUserId,
        violationTypeId: formViolationTypeId,
        usageSessionId: formUsageSessionId
          ? Number(formUsageSessionId)
          : undefined,
        incidentTime: formIncidentTime
          ? new Date(formIncidentTime).toISOString()
          : undefined,
        description: formDescription.trim(),
        severity: formSeverity,
        penaltyApplied: formPenaltyApplied.trim() || "Cảnh cáo",
        restrictDays: formRestrictDays,
        status: formStatus,
      });

      // Tải lên các tệp đính kèm lên MinIO nếu có
      if (creationFiles.length > 0 && createdRecord?.id) {
        for (const file of creationFiles) {
          try {
            await uploadViolationAttachment(createdRecord.id, file);
          } catch (uploadErr) {
            console.error("Lỗi tải tệp đính kèm lên MinIO:", uploadErr);
          }
        }
      }

      onNotify(
        `Ghi nhận biên bản vi phạm thành công! ${formRestrictDays > 0
          ? `Đã tự động áp dụng lệnh cấm mượn phòng ${formRestrictDays} ngày.`
          : ""
        }${creationFiles.length > 0 ? ` (Đã tải ${creationFiles.length} tệp lên MinIO)` : ""}`,
        "success"
      );
      setShowRecordModal(false);
      resetRecordForm();
      loadAllData();
    } catch (err: any) {
      console.error("Failed to record violation:", err);
      const serverMsg =
        err.response?.data?.message ||
        err.response?.data?.title ||
        (err.response?.data?.errors
          ? Object.values(err.response.data.errors).flat().join(", ")
          : null) ||
        err.message ||
        "Không thể lưu biên bản vi phạm.";
      onNotify(serverMsg, "warning");
    } finally {
      setSubmittingRecord(false);
    }
  };

  const resetRecordForm = () => {
    setFormUserId(0);
    setFormUserSearch("");
    setFormUsageSessionId("");
    setFormIncidentTime(new Date().toISOString().slice(0, 16));
    setFormDescription("");
    setFormRestrictDays(0);
    setCreationFiles([]);
    if (violationTypes.length > 0) {
      const firstType = violationTypes[0];
      setFormViolationTypeId(firstType.id);
      setFormSeverity(firstType.severity);
      setFormPenaltyApplied(firstType.defaultPenalty || "Cảnh cáo");
      setFormStatus(firstType.severity >= 3 ? "Đang xử lý" : "Đã xử lý");
    } else {
      setFormPenaltyApplied("Cảnh cáo");
      setFormStatus("Đã xử lý");
    }
  };

  // Upload tệp đính kèm trực tiếp vào biên bản trong modal chi tiết
  const handleUploadDetailFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !selectedRecord) return;
    try {
      setUploadingAttachment(true);
      const newAtt = await uploadViolationAttachment(selectedRecord.id, file);
      onNotify(`Đã tải tệp "${file.name}" lên MinIO thành công!`, "success");
      setSelectedRecord((prev) =>
        prev
          ? {
            ...prev,
            attachments: [...(prev.attachments || []), newAtt],
          }
          : null
      );
      setViolations((prevList) =>
        prevList.map((v) =>
          v.id === selectedRecord.id
            ? { ...v, attachments: [...(v.attachments || []), newAtt] }
            : v
        )
      );
    } catch (err: any) {
      onNotify(err.response?.data?.message || "Không thể tải lên tệp đính kèm.", "warning");
    } finally {
      setUploadingAttachment(false);
      if (detailFileInputRef.current) detailFileInputRef.current.value = "";
    }
  };

  // Xóa tệp đính kèm khỏi MinIO và CSDL
  const handleDeleteAttachment = async (attId: number, fileName: string) => {
    const confirmed = await confirm({
      title: "Xóa tệp đính kèm",
      message: `Bạn có chắc chắn muốn xóa tệp "${fileName}" khỏi hệ thống lưu trữ MinIO?`,
      confirmText: "Xóa tệp",
      type: "danger",
    });
    if (!confirmed || !selectedRecord) return;
    try {
      await deleteViolationAttachment(attId);
      onNotify(`Đã xóa tệp "${fileName}" thành công.`, "info");
      setSelectedRecord((prev) =>
        prev
          ? {
            ...prev,
            attachments: (prev.attachments || []).filter((a) => a.id !== attId),
          }
          : null
      );
      setViolations((prevList) =>
        prevList.map((v) =>
          v.id === selectedRecord.id
            ? {
              ...v,
              attachments: (v.attachments || []).filter((a) => a.id !== attId),
            }
            : v
        )
      );
    } catch (err: any) {
      onNotify(err.response?.data?.message || "Không thể xóa tệp đính kèm.", "warning");
    }
  };

  // Xem trước tệp đính kèm (Ảnh phóng to / PDF trực tiếp / Tải file Word)
  const handleViewAttachment = (att: ViolationAttachmentItem) => {
    setPreviewImageFailed(false);
    if (isImageAttachment(att.originalFileName, att.contentType) || isPdfAttachment(att.originalFileName, att.contentType)) {
      setPreviewAttachment(att);
    } else {
      onNotify(`Tệp "${att.originalFileName}" không hỗ trợ xem trực tiếp trên trình duyệt. Đang tải về máy...`, "info");
      const url = att.downloadUrl || getAttachmentDownloadUrl(att.id);
      const a = document.createElement("a");
      a.href = url;
      a.download = att.originalFileName;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
    }
  };

  // Open Detail / Update modal
  const openDetailModal = (record: ViolationRecordItem) => {
    setSelectedRecord(record);
    setEditStatus(record.status);
    setEditPenalty(record.penaltyApplied);
    setEditDescription(record.description);
    setEditSeverity(record.severity);
  };

  // Submit: Update Violation Status & Penalty
  const handleUpdateRecordSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (!selectedRecord) return;

    try {
      setUpdatingRecord(true);
      await updateViolation(selectedRecord.id, {
        status: editStatus,
        penaltyApplied: editPenalty.trim(),
        description: editDescription.trim(),
        severity: editSeverity,
      });

      onNotify(
        `Cập nhật tiến trình xử lý biên bản #${selectedRecord.code} thành công!`,
        "success"
      );
      setSelectedRecord(null);
      loadAllData();
    } catch (err: any) {
      onNotify(
        err.response?.data?.message || "Không thể cập nhật biên bản vi phạm.",
        "warning"
      );
    } finally {
      setUpdatingRecord(false);
    }
  };

  // Delete violation
  const handleDeleteViolation = async (record: ViolationRecordItem) => {
    const confirmed = await confirm({
      title: "Xác nhận xóa biên bản vi phạm",
      message: `Bạn có chắc chắn muốn xóa biên bản vi phạm #${record.code} của ${record.userFullName}?`,
      subMessage: "Dữ liệu biên bản đã xóa sẽ không thể phục hồi.",
      itemDetails: [
        { label: "Mã biên bản", value: `#${record.code}` },
        { label: "Người vi phạm", value: record.userFullName },
        { label: "Loại vi phạm", value: record.violationTypeName },
        { label: "Hình thức xử lý", value: record.penaltyApplied || "—" },
      ],
      type: "danger",
      confirmText: "Xác nhận xóa",
      cancelText: "Hủy bỏ",
    });

    if (!confirmed) return;

    try {
      await deleteViolation(record.id);
      onNotify(`Đã xóa biên bản vi phạm #${record.code}.`, "info");
      loadAllData();
    } catch (err: any) {
      onNotify(
        err.response?.data?.message || "Không thể xóa biên bản vi phạm.",
        "warning"
      );
    }
  };

  // Lift restriction early
  const handleLiftRestrictionSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (!liftTarget) return;

    try {
      setSubmittingLift(true);
      await liftRestriction(liftTarget.id, liftReason.trim());
      onNotify(
        `Đã gỡ bỏ lệnh cấm mượn phòng cho ${liftTarget.userFullName} thành công!`,
        "success"
      );
      setLiftTarget(null);
      setLiftReason("");
      loadAllData();
    } catch (err: any) {
      onNotify(
        err.response?.data?.message || "Không thể gỡ bỏ lệnh cấm.",
        "warning"
      );
    } finally {
      setSubmittingLift(false);
    }
  };

  // Manual Restriction Submit
  const handleManualRestrictionSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (!restrUserId) {
      await alert({
        title: "Thiếu thông tin",
        message: "Vui lòng chọn người dùng cần áp dụng hạn chế!",
        type: "warning",
      });
      return;
    }
    if (!restrReason.trim()) {
      await alert({
        title: "Thiếu thông tin",
        message: "Vui lòng nhập lý do cấm mượn phòng!",
        type: "warning",
      });
      return;
    }

    try {
      setSubmittingRestr(true);
      await createRestriction({
        userId: restrUserId,
        reason: restrReason.trim(),
        days: restrDays,
        restrictionType: "Cấm mượn phòng",
      });

      onNotify(
        `Đã thiết lập lệnh cấm mượn phòng ${restrDays} ngày thành công!`,
        "success"
      );
      setShowManualRestrictionModal(false);
      setRestrUserId(0);
      setRestrReason("");
      setRestrDays(7);
      loadAllData();
    } catch (err: any) {
      onNotify(
        err.response?.data?.message || "Không thể tạo lệnh hạn chế.",
        "warning"
      );
    } finally {
      setSubmittingRestr(false);
    }
  };

  // Submit Violation Type
  const handleTypeSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (!typeFormName.trim()) {
      await alert({
        title: "Thiếu thông tin",
        message: "Vui lòng nhập tên loại vi phạm!",
        type: "warning",
      });
      return;
    }

    if (!typeFormPenalty.trim()) {
      await alert({
        title: "Thiếu thông tin",
        message: "Vui lòng chọn hoặc nhập hình phạt / xử lý gợi ý!",
        type: "warning",
      });
      return;
    }

    try {
      setSubmittingType(true);
      if (editingTypeId) {
        await updateViolationType(editingTypeId, {
          name: typeFormName.trim(),
          description: typeFormDesc.trim(),
          severity: typeFormSeverity,
          defaultPenalty: typeFormPenalty.trim(),
        });
        onNotify("Cập nhật loại vi phạm thành công!", "success");
      } else {
        if (!typeFormCode.trim()) {
          await alert({
            title: "Thiếu thông tin",
            message: "Vui lòng nhập mã loại vi phạm (VD: VT07)!",
            type: "warning",
          });
          return;
        }
        await createViolationType({
          code: typeFormCode.trim().toUpperCase(),
          name: typeFormName.trim(),
          description: typeFormDesc.trim(),
          severity: typeFormSeverity,
          defaultPenalty: typeFormPenalty.trim(),
        });
        onNotify("Tạo loại vi phạm mới thành công!", "success");
      }
      setShowTypeModal(false);
      setEditingTypeId(null);
      setTypeFormCode("");
      setTypeFormName("");
      setTypeFormDesc("");
      setTypeFormPenalty("");
      loadAllData();
    } catch (err: any) {
      onNotify(
        err.response?.data?.message || "Lỗi thao tác loại vi phạm.",
        "warning"
      );
    } finally {
      setSubmittingType(false);
    }
  };

  const openCreateTypeModal = () => {
    setEditingTypeId(null);
    const nextCode = `VT0${violationTypes.length + 1}`;
    setTypeFormCode(nextCode);
    setTypeFormName("");
    setTypeFormDesc("");
    setTypeFormSeverity(1);
    const defaultPen = penalties.find((p) => p.severity === 1) || penalties[0];
    if (defaultPen) {
      setSelectedPenaltyIds([defaultPen.id]);
      setTypeFormPenalty(defaultPen.name);
    } else {
      setSelectedPenaltyIds([]);
      setTypeFormPenalty("Nhắc nhở / Cảnh cáo lần đầu");
    }
    setTypeModalPenaltyFilter("ALL");
    setTypeModalPenaltySearch("");
    setShowTypeModal(true);
  };

  const openEditTypeModal = (vt: ViolationTypeItem) => {
    setEditingTypeId(vt.id);
    setTypeFormCode(vt.code);
    setTypeFormName(vt.name);
    setTypeFormDesc(vt.description || "");
    setTypeFormSeverity(vt.severity);
    const currentPenalty = vt.defaultPenalty || "";
    setTypeFormPenalty(currentPenalty);
    const matched = penalties
      .filter((p) => currentPenalty.toLowerCase().includes(p.name.toLowerCase()))
      .map((p) => p.id);
    setSelectedPenaltyIds(matched);
    setTypeModalPenaltyFilter("ALL");
    setTypeModalPenaltySearch("");
    setShowTypeModal(true);
  };

  const togglePenaltySelection = (p: PenaltyItem) => {
    let nextIds: string[];
    if (selectedPenaltyIds.includes(p.id)) {
      nextIds = selectedPenaltyIds.filter((id) => id !== p.id);
    } else {
      nextIds = [...selectedPenaltyIds, p.id];
    }
    setSelectedPenaltyIds(nextIds);
    const selectedPens = penalties.filter((item) => nextIds.includes(item.id));
    if (selectedPens.length > 0) {
      setTypeFormPenalty(selectedPens.map((item) => item.name).join(" & "));
    } else {
      setTypeFormPenalty("");
    }
  };

  const openCreatePenaltyModal = () => {
    setEditingPenaltyId(null);
    const nextNum = penalties.length + 1;
    setPenaltyFormCode(`HP${String(nextNum).padStart(2, "0")}`);
    setPenaltyFormName("");
    setPenaltyFormSeverity(1);
    setPenaltyFormRestrictDays(0);
    setPenaltyFormDesc("");
    setShowPenaltyModal(true);
  };

  const openEditPenaltyModal = (p: PenaltyItem) => {
    setEditingPenaltyId(p.id);
    setPenaltyFormCode(p.code);
    setPenaltyFormName(p.name);
    setPenaltyFormSeverity(p.severity);
    setPenaltyFormRestrictDays(p.defaultRestrictDays);
    setPenaltyFormDesc(p.description || "");
    setShowPenaltyModal(true);
  };

  const handlePenaltySubmit = (e: FormEvent) => {
    e.preventDefault();
    if (!penaltyFormName.trim()) {
      onNotify("Vui lòng nhập tên hình phạt / chế tài.", "warning");
      return;
    }
    setSubmittingPenalty(true);
    try {
      if (editingPenaltyId) {
        const res = updatePenalty(editingPenaltyId, {
          code: penaltyFormCode,
          name: penaltyFormName,
          severity: penaltyFormSeverity,
          defaultRestrictDays: penaltyFormRestrictDays,
          description: penaltyFormDesc,
        });
        if (res) {
          onNotify(`Đã cập nhật hình phạt "${res.name}".`, "success");
        }
      } else {
        const res = createPenalty({
          code: penaltyFormCode,
          name: penaltyFormName,
          severity: penaltyFormSeverity,
          defaultRestrictDays: penaltyFormRestrictDays,
          description: penaltyFormDesc,
        });
        onNotify(`Đã thêm mới hình phạt "${res.name}".`, "success");
      }
      setPenalties(getAllPenalties());
      void refreshReminders();
      setShowPenaltyModal(false);
    } catch {
      onNotify("Có lỗi xảy ra khi lưu hình phạt.", "warning");
    } finally {
      setSubmittingPenalty(false);
    }
  };

  const handleDeletePenalty = async (p: PenaltyItem) => {
    const confirmed = await confirm({
      title: "Xác nhận xóa hình phạt",
      message: `Bạn có chắc chắn muốn xóa hình phạt "${p.name}" (${p.code})?`,
      subMessage: "Hình phạt này sẽ bị gỡ khỏi danh mục gợi ý khi thêm/sửa loại vi phạm.",
      itemDetails: [
        { label: "Mã hình phạt", value: p.code },
        { label: "Tên hình phạt", value: p.name },
        { label: "Mức độ áp dụng", value: `Mức ${p.severity}` },
        { label: "Thời hạn cấm mượn", value: p.defaultRestrictDays > 0 ? `${p.defaultRestrictDays} ngày` : "Không cấm mượn" },
      ],
      type: "danger",
      confirmText: "Xác nhận xóa",
      cancelText: "Hủy bỏ",
    });
    if (!confirmed) return;

    deletePenalty(p.id);
    setPenalties(getAllPenalties());
    onNotify(`Đã xóa hình phạt "${p.name}" khỏi danh mục.`, "info");
  };

  const handleResetPenalties = async () => {
    const confirmed = await confirm({
      title: "Khôi phục danh mục hình phạt mặc định",
      message: "Bạn có chắc chắn muốn đặt lại danh mục hình phạt về cấu hình chuẩn ban đầu của Thư viện?",
      subMessage: "Các hình phạt tùy chỉnh do bạn thêm mới sẽ bị xóa và thay bằng danh mục hình phạt chuẩn của quy chế.",
      type: "warning",
      confirmText: "Khôi phục mặc định",
      cancelText: "Giữ nguyên",
    });
    if (!confirmed) return;

    const resetList = resetToDefaultPenalties();
    setPenalties(resetList);
    onNotify("Đã khôi phục danh mục hình phạt về cấu hình chuẩn của Thư viện.", "success");
  };

  const handleDeleteType = async (vt: ViolationTypeItem) => {
    const confirmed = await confirm({
      title: "Xác nhận xóa loại vi phạm",
      message: `Bạn có chắc chắn muốn xóa loại vi phạm "${vt.name}" (${vt.code})?`,
      subMessage:
        "Lưu ý: Chỉ có thể xóa nếu chưa có biên bản vi phạm nào áp dụng loại vi phạm này.",
      itemDetails: [
        { label: "Mã loại", value: vt.code },
        { label: "Tên loại vi phạm", value: vt.name },
        { label: "Mức phạt mặc định", value: vt.defaultPenalty || "—" },
      ],
      type: "danger",
      confirmText: "Xác nhận xóa",
      cancelText: "Hủy bỏ",
    });

    if (!confirmed) return;

    try {
      await deleteViolationType(vt.id);
      onNotify(`Đã xóa loại vi phạm ${vt.code}.`, "info");
      loadAllData();
    } catch (err: any) {
      onNotify(
        err.response?.data?.message || "Không thể xóa loại vi phạm.",
        "warning"
      );
    }
  };

  // Helper colors
  const getSeverityBadgeClass = (severity: number) => {
    switch (severity) {
      case 1:
        return "badge-severity-1"; // green / low
      case 2:
        return "badge-severity-2"; // amber / medium
      case 3:
        return "badge-severity-3"; // orange / high
      case 4:
        return "badge-severity-4"; // red / critical
      default:
        return "badge-severity-1";
    }
  };

  const getStatusBadgeClass = (status: string) => {
    switch (status) {
      case "Đang xử lý":
      case "Chờ xử lý":
        return "admin-status-pill pill-pending";
      case "Đã xử lý":
        return "admin-status-pill pill-approved";
      case "Đã nộp phạt":
        return "admin-status-pill pill-completed";
      case "Hủy bỏ":
        return "admin-status-pill pill-cancelled";
      default:
        return "admin-status-pill";
    }
  };

  return (
    <div className="admin-violations-tab-container">
      {/* ── 0. Department Filter Bar for Admin / Badge for Staff ──────────────── */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          marginBottom: "16px",
          padding: "10px 16px",
          background: "white",
          borderRadius: "8px",
          border: "1px solid #e2e8f0",
          boxShadow: "0 1px 3px rgba(0,0,0,0.05)",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
          <span style={{ fontSize: "13.5px", fontWeight: 600, color: "#475569" }}>
            Đơn vị xử lý vi phạm:
          </span>
          {isAdmin ? (
            <select
              value={selectedDepartmentId}
              onChange={(e) => setSelectedDepartmentId(e.target.value)}
              className="filter-select"
              style={{
                height: "36px",
                minWidth: "220px",
                fontWeight: 600,
                color: "#1e293b",
                borderRadius: "6px",
                borderColor: "#cbd5e1",
              }}
              title="Lọc biên bản vi phạm theo đơn vị quản lý"
            >
              <option value="ALL">Toàn trường (Tất cả đơn vị)</option>
              <option value="3">Thư viện</option>
              <option value="2">Phòng Đào tạo</option>
            </select>
          ) : (
            <span
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: "6px",
                padding: "6px 14px",
                borderRadius: "6px",
                background: "var(--rp-soft, #f1f5f9)",
                border: "1px solid var(--rp-border, #cbd5e1)",
                fontSize: "13.5px",
                fontWeight: 700,
                color: "var(--rp-link, #0284c7)",
              }}
            >
              {user?.departmentId === 2 ? "Phòng Đào tạo" : "Thư viện"}
            </span>
          )}
        </div>


      </div>

      {/* ── 1. Top Hero Stat Cards ─────────────────────────────────────── */}
      <div className="admin-kpi-grid">
        <div className="kpi-card kpi-card-total">
          <div className="kpi-icon-wrap icon-blue">
            <AlertTriangleIcon size={24} />
          </div>
          <div className="kpi-info">
            <span className="kpi-label">Tổng biên bản vi phạm</span>
            <strong className="kpi-value">{stats.totalRecords}</strong>
            <span className="kpi-subtext">
              {activeDepartmentId === 3
                ? "Đơn vị Thư viện"
                : activeDepartmentId === 2
                  ? "Đơn vị Phòng Đào tạo"
                  : "Đã ghi nhận toàn hệ thống"}
            </span>
          </div>
        </div>

        <div className="kpi-card kpi-card-pending">
          <div className="kpi-icon-wrap icon-amber">
            <ClockIcon size={24} />
          </div>
          <div className="kpi-info">
            <span className="kpi-label">Đang chờ xử lý</span>
            <strong className="kpi-value text-amber">{stats.pendingRecords}</strong>
            <span className="kpi-subtext">Cần giải quyết &amp; nộp phạt</span>
          </div>
        </div>

        <div className="kpi-card kpi-card-resolved">
          <div className="kpi-icon-wrap icon-green">
            <CheckCircleIcon size={24} />
          </div>
          <div className="kpi-info">
            <span className="kpi-label">Đã hoàn tất xử lý</span>
            <strong className="kpi-value text-green">
              {stats.resolvedRecords}
            </strong>
            <span className="kpi-subtext">Đã bồi thường / chấp hành</span>
          </div>
        </div>

        <div className="kpi-card kpi-card-restricted">
          <div className="kpi-icon-wrap icon-rose">
            <BanIcon size={24} />
          </div>
          <div className="kpi-info">
            <span className="kpi-label">Đang bị cấm mượn phòng</span>
            <strong className="kpi-value text-rose">
              {stats.activeRestrictions}
            </strong>
            <span className="kpi-subtext">Tài khoản bị hạn chế hiệu lực</span>
          </div>
        </div>
      </div>

      {/* ── 2. Sub-tab Navigation Bar ──────────────────────────────────── */}
      <div className="violations-subtab-bar">
        <div className="subtab-buttons-group">
          <button
            type="button"
            className={`subtab-btn ${activeSubTab === "records" ? "active" : ""
              }`}
            onClick={() => setActiveSubTab("records")}
          >
            <AlertTriangleIcon size={16} />
            <span>Danh sách Biên bản vi phạm</span>
            <span className="subtab-count">{violations.length}</span>
          </button>

          <button
            type="button"
            className={`subtab-btn ${activeSubTab === "restrictions" ? "active" : ""
              }`}
            onClick={() => setActiveSubTab("restrictions")}
          >
            <BanIcon size={16} />
            <span>Lệnh cấm &amp; Hạn chế mượn phòng</span>
            <span className="subtab-count highlight-red">
              {restrictions.filter((r) => r.isActive).length}
            </span>
          </button>

          <button
            type="button"
            className={`subtab-btn ${activeSubTab === "reminders" ? "active" : ""
              }`}
            onClick={() => setActiveSubTab("reminders")}
          >
            <BellRingIcon size={16} />
            <span>Theo dõi Nhắc nhở</span>
            <span className="subtab-count highlight-amber">
              {reminders.length}
            </span>
          </button>

          <button
            type="button"
            className={`subtab-btn ${activeSubTab === "types" ? "active" : ""}`}
            onClick={() => setActiveSubTab("types")}
          >
            <TagIcon size={16} />
            <span>Danh mục Loại vi phạm</span>
            <span className="subtab-count">{violationTypes.length}</span>
          </button>

          <button
            type="button"
            className={`subtab-btn ${activeSubTab === "penalties" ? "active" : ""}`}
            onClick={() => setActiveSubTab("penalties")}
          >
            <ScaleIcon size={16} />
            <span>Danh mục Hình phạt &amp; Chế tài</span>
            <span className="subtab-count">{penalties.length}</span>
          </button>
        </div>

        <div className="subtab-actions-group">
          {activeSubTab === "records" && (
            <button
              type="button"
              className="btn-primary-action"
              onClick={() => {
                resetRecordForm();
                setShowRecordModal(true);
              }}
            >
              <PlusIcon size={16} />
              <span>+ Lập biên bản vi phạm</span>
            </button>
          )}

          {activeSubTab === "restrictions" && (
            <button
              type="button"
              className="btn-primary-action"
              onClick={() => setShowManualRestrictionModal(true)}
            >
              <PlusIcon size={16} />
              <span>+ Áp dụng lệnh cấm thủ công</span>
            </button>
          )}

          {activeSubTab === "types" && (
            <button
              type="button"
              className="btn-primary-action"
              onClick={openCreateTypeModal}
            >
              <PlusIcon size={16} />
              <span>+ Thêm loại vi phạm mới</span>
            </button>
          )}

          {activeSubTab === "penalties" && (
            <button
              type="button"
              className="btn-primary-action"
              onClick={openCreatePenaltyModal}
            >
              <PlusIcon size={16} />
              <span>+ Thêm hình phạt mới</span>
            </button>
          )}

          <button
            type="button"
            className="btn-icon-refresh"
            onClick={loadAllData}
            title="Làm mới dữ liệu"
          >
            <RefreshCwIcon size={16} />
          </button>
        </div>
      </div>

      {/* ── 3. Content Views by Sub-Tab ─────────────────────────────────── */}

      {/* ── SUB-TAB 1: VIOLATION RECORDS ───────────────────────────────── */}
      {activeSubTab === "records" && (
        <div className="violations-content-card">
          {/* Filter Bar */}
          <div className="table-filter-bar">
            <div className="search-input-wrap">
              <SearchIcon size={16} className="search-icon" />
              <input
                type="text"
                placeholder="Tìm mã biên bản, họ tên, MSSV, loại vi phạm, phòng..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="search-input"
              />
              {searchTerm && (
                <button
                  type="button"
                  className="clear-search-btn"
                  onClick={() => setSearchTerm("")}
                >
                  <XIcon size={14} />
                </button>
              )}
            </div>

            <div className="filter-select-group">
              <div className="filter-item">
                <span className="filter-label">Loại vi phạm:</span>
                <select
                  value={selectedTypeFilter}
                  onChange={(e) => setSelectedTypeFilter(e.target.value)}
                  className="filter-select"
                >
                  <option value="ALL">Tất cả loại vi phạm</option>
                  {violationTypes.map((t) => (
                    <option key={t.id} value={t.id}>
                      {t.code} - {t.name}
                    </option>
                  ))}
                </select>
              </div>

              <div className="filter-item">
                <span className="filter-label">Mức độ:</span>
                <select
                  value={selectedSeverityFilter}
                  onChange={(e) => setSelectedSeverityFilter(e.target.value)}
                  className="filter-select"
                >
                  <option value="ALL">Tất cả mức độ</option>
                  <option value="1">Mức 1 - Nhẹ</option>
                  <option value="2">Mức 2 - Vừa</option>
                  <option value="3">Mức 3 - Nghiêm trọng</option>
                  <option value="4">Mức 4 - Rất nghiêm trọng</option>
                </select>
              </div>

              <div className="filter-item">
                <span className="filter-label">Trạng thái:</span>
                <select
                  value={selectedStatusFilter}
                  onChange={(e) => setSelectedStatusFilter(e.target.value)}
                  className="filter-select"
                >
                  <option value="ALL">Tất cả trạng thái</option>
                  <option value="Đang xử lý">Đang xử lý / Chờ xử lý</option>
                  <option value="Đã xử lý">Đã xử lý</option>
                  <option value="Đã nộp phạt">Đã nộp phạt</option>
                  <option value="Hủy bỏ">Hủy bỏ</option>
                </select>
              </div>

              <div className="filter-item">
                <span className="filter-label">Ngày vi phạm:</span>
                <input
                  type="date"
                  value={recordDateFilter}
                  onChange={(e) => setRecordDateFilter(e.target.value)}
                  className="filter-select"
                  style={{ padding: "5px 8px" }}
                />
              </div>

              <div className="filter-item">
                <span className="filter-label">Sắp xếp:</span>
                <select
                  value={recordSortBy}
                  onChange={(e) => setRecordSortBy(e.target.value as any)}
                  className="filter-select"
                >
                  <option value="newest">Mới nhất trước</option>
                  <option value="oldest">Cũ nhất trước</option>
                  <option value="severity_desc">Mức độ nghiêm trọng giảm dần</option>
                  <option value="severity_asc">Mức độ nghiêm trọng tăng dần</option>
                  <option value="user">Người vi phạm (A-Z)</option>
                </select>
              </div>

              {(Boolean(searchTerm || selectedTypeFilter !== "ALL" || selectedSeverityFilter !== "ALL" || selectedStatusFilter !== "ALL" || recordDateFilter || recordSortBy !== "newest")) && (
                <button
                  type="button"
                  className="btn-link"
                  onClick={() => {
                    setSearchTerm("");
                    setSelectedTypeFilter("ALL");
                    setSelectedSeverityFilter("ALL");
                    setSelectedStatusFilter("ALL");
                    setRecordDateFilter("");
                    setRecordSortBy("newest");
                    setRecordPage(1);
                  }}
                  style={{ fontSize: "12px", color: "#2563eb", fontWeight: 600, padding: "4px 8px", cursor: "pointer", background: "none", border: "none" }}
                >
                  Xóa bộ lọc
                </button>
              )}
            </div>
          </div>

          {/* Table */}
          <div className="table-responsive-wrapper">
            <table className="admin-custom-table">
              <thead>
                <tr>
                  <th style={{ width: "120px", whiteSpace: "nowrap" }}>Mã biên bản</th>
                  <th>Người vi phạm</th>
                  <th>Loại vi phạm</th>
                  <th style={{ whiteSpace: "nowrap" }}>Thời điểm vi phạm</th>
                  <th style={{ width: "120px", whiteSpace: "nowrap" }}>Mức độ</th>
                  <th>Hình thức xử lý / Phạt</th>
                  <th style={{ width: "135px", whiteSpace: "nowrap" }}>Trạng thái</th>
                  <th style={{ width: "90px", textAlign: "right", whiteSpace: "nowrap" }}>Thao tác</th>
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr>
                    <td colSpan={8} className="table-empty-row">
                      <RefreshCwIcon size={24} className="spin-icon" />
                      <p>Đang tải danh sách biên bản vi phạm...</p>
                    </td>
                  </tr>
                ) : filteredViolations.length === 0 ? (
                  <tr>
                    <td colSpan={8} className="table-empty-row">
                      <AlertTriangleIcon size={36} className="text-muted" />
                      <p>Không tìm thấy biên bản vi phạm nào phù hợp với bộ lọc.</p>
                      {searchTerm && (
                        <button
                          type="button"
                          className="btn-link"
                          onClick={() => {
                            setSearchTerm("");
                            setSelectedTypeFilter("ALL");
                            setSelectedSeverityFilter("ALL");
                            setSelectedStatusFilter("ALL");
                          }}
                        >
                          Xóa bộ lọc &amp; xem tất cả
                        </button>
                      )}
                    </td>
                  </tr>
                ) : (
                  pagedViolations.map((v) => (
                    <tr
                      key={v.id}
                      className="admin-clickable-row"
                      onClick={() => openDetailModal(v)}
                      title="Bấm vào dòng để xem chi tiết & cập nhật xử lý biên bản"
                    >
                      <td>
                        <span className="code-pill">{v.code}</span>
                        {v.roomCode && (
                          <span className="room-ref-badge" title="Phòng liên quan">
                            <DoorIcon size={12} /> {v.roomCode}
                          </span>
                        )}
                        {v.attachments && v.attachments.length > 0 && (
                          <div>
                            <button
                              type="button"
                              className="attachment-table-pill"
                              onClick={(e) => {
                                e.stopPropagation();
                                handleViewAttachment(v.attachments![0]);
                              }}
                              title={`Có ${v.attachments.length} tệp đính kèm. Bấm để xem tệp`}
                            >
                              <FileTextIcon size={11} /> {v.attachments.length} tệp
                            </button>
                          </div>
                        )}
                      </td>
                      <td>
                        <div className="user-info-cell">
                          <strong className="user-name">{v.userFullName}</strong>
                          <span className="user-sub">
                            {v.userCardCode} • {v.departmentName || v.userEmail}
                          </span>
                        </div>
                      </td>
                      <td>
                        <div className="violation-type-cell">
                          <span className="vt-name">{v.violationTypeName}</span>
                          <p className="vt-desc-snippet" title={v.description}>
                            {v.description.length > 60
                              ? v.description.slice(0, 60) + "..."
                              : v.description}
                          </p>
                        </div>
                      </td>
                      <td>
                        <span className="time-display">
                          {formatDateVN(v.incidentTime)} • {formatTime24h(v.incidentTime)}
                        </span>
                      </td>
                      <td>
                        <span
                          className={`severity-badge ${getSeverityBadgeClass(
                            v.severity
                          )}`}
                        >
                          {v.severityText}
                        </span>
                      </td>
                      <td>
                        <div className="penalty-cell">
                          <span className="penalty-text">{v.penaltyApplied}</span>
                        </div>
                      </td>
                      <td>
                        <span
                          className={getStatusBadgeClass(v.status)}
                        >
                          {v.status}
                        </span>
                      </td>
                      <td onClick={(e) => e.stopPropagation()} style={{ textAlign: "right", whiteSpace: "nowrap" }}>
                        <div style={{ display: "inline-flex", alignItems: "center", justifyContent: "flex-end" }}>
                          <button
                            type="button"
                            className={`btn-table-more ${rowMenu?.key === `rec-${v.id}` ? "active" : ""}`}
                            title="Thao tác"
                            aria-label="Thao tác"
                            onClick={(evt) => toggleRowMenu(`rec-${v.id}`, evt.currentTarget)}
                          >
                            <DotsIcon size={17} />
                          </button>

                          {rowMenu?.key === `rec-${v.id}` &&
                            createPortal(
                              <div
                                ref={rowMenuRef}
                                className={`row-actions-menu ${rowMenu.openUp ? "open-up" : ""}`}
                                style={{ top: rowMenu.top, left: rowMenu.left }}
                                role="menu"
                                onClick={(evt) => evt.stopPropagation()}
                              >
                                <button
                                  type="button"
                                  role="menuitem"
                                  className="row-actions-menu-item accent-blue"
                                  onClick={() => {
                                    setRowMenu(null);
                                    openDetailModal(v);
                                  }}
                                >
                                  <FileTextIcon size={14} />
                                  <span>Chi tiết & Cập nhật xử lý</span>
                                </button>

                                {v.attachments && v.attachments.length > 0 && (
                                  <button
                                    type="button"
                                    role="menuitem"
                                    className="row-actions-menu-item accent-indigo"
                                    onClick={() => {
                                      setRowMenu(null);
                                      handleViewAttachment(v.attachments![0]);
                                    }}
                                  >
                                    <EyeIcon size={14} />
                                    <span>Xem tệp đính kèm ({v.attachments.length})</span>
                                  </button>
                                )}

                                <button
                                  type="button"
                                  role="menuitem"
                                  className="row-actions-menu-item"
                                  onClick={() => {
                                    setRowMenu(null);
                                    navigator.clipboard.writeText(v.code);
                                    onNotify(`Đã sao chép mã biên bản ${v.code}!`, "info");
                                  }}
                                >
                                  <InfoIcon size={14} />
                                  <span>Sao chép mã biên bản</span>
                                </button>

                                {isAdmin && (
                                  <button
                                    type="button"
                                    role="menuitem"
                                    className="row-actions-menu-item danger"
                                    onClick={() => {
                                      setRowMenu(null);
                                      handleDeleteViolation(v);
                                    }}
                                  >
                                    <TrashIcon size={14} />
                                    <span>Xóa biên bản này</span>
                                  </button>
                                )}
                              </div>,
                              document.body
                            )}
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>

          <AdminPagination
            currentPage={recordPage}
            totalItems={filteredViolations.length}
            pageSize={recordPageSize}
            onPageChange={(p) => setRecordPage(p)}
            onPageSizeChange={(sz) => setRecordPageSize(sz)}
            itemLabel="biên bản vi phạm"
          />
        </div>
      )}

      {/* ── SUB-TAB 2: USER RESTRICTIONS ─────────────────────────────────── */}
      {activeSubTab === "restrictions" && (
        <div className="violations-content-card">
          <div className="table-filter-bar">
            <div className="search-input-wrap">
              <SearchIcon size={16} className="search-icon" />
              <input
                type="text"
                placeholder="Tìm người dùng đang bị cấm theo họ tên, MSSV, email, lý do..."
                value={restrictionSearch}
                onChange={(e) => setRestrictionSearch(e.target.value)}
                className="search-input"
              />
            </div>

            <div className="filter-select-group">
              <div className="filter-item">
                <span className="filter-label">Trạng thái lệnh:</span>
                <select
                  value={restrictionStatusFilter}
                  onChange={(e) => setRestrictionStatusFilter(e.target.value)}
                  className="filter-select"
                >
                  <option value="ACTIVE">Đang có hiệu lực (Cấm mượn)</option>
                  <option value="ALL">Tất cả lệnh cấm</option>
                  <option value="LIFTED">Đã được gỡ sớm</option>
                  <option value="EXPIRED">Đã hết hạn</option>
                </select>
              </div>

              <div className="filter-item">
                <span className="filter-label">Sắp xếp:</span>
                <select
                  value={restrictionSortBy}
                  onChange={(e) => setRestrictionSortBy(e.target.value as any)}
                  className="filter-select"
                >
                  <option value="end_date_asc">Hạn cấm sắp hết trước</option>
                  <option value="end_date_desc">Hạn cấm xa nhất trước</option>
                  <option value="newest">Mới áp dụng nhất</option>
                  <option value="user">Người dùng (A-Z)</option>
                </select>
              </div>

              {(Boolean(restrictionSearch || restrictionStatusFilter !== "ACTIVE" || restrictionSortBy !== "end_date_asc")) && (
                <button
                  type="button"
                  className="btn-link"
                  onClick={() => {
                    setRestrictionSearch("");
                    setRestrictionStatusFilter("ACTIVE");
                    setRestrictionSortBy("end_date_asc");
                    setRestrictionPage(1);
                  }}
                  style={{ fontSize: "12px", color: "#2563eb", fontWeight: 600, padding: "4px 8px", cursor: "pointer", background: "none", border: "none" }}
                >
                  Xóa bộ lọc
                </button>
              )}
            </div>
          </div>

          <div className="table-responsive-wrapper">
            <table className="admin-custom-table">
              <thead>
                <tr>
                  <th>Người dùng bị hạn chế</th>
                  <th>Hình thức hạn chế</th>
                  <th>Lý do vi phạm</th>
                  <th>Ngày bắt đầu</th>
                  <th>Ngày kết thúc</th>
                  <th style={{ width: "140px" }}>Thời hạn còn lại</th>
                  <th style={{ width: "135px", whiteSpace: "nowrap" }}>Trạng thái</th>
                  <th style={{ width: "90px", textAlign: "right" }}>Thao tác</th>
                </tr>
              </thead>
              <tbody>
                {filteredRestrictions.length === 0 ? (
                  <tr>
                    <td colSpan={8} className="table-empty-row">
                      <ShieldCheckIcon size={36} className="text-green" />
                      <p>Không có người dùng nào đang trong danh sách bị hạn chế mượn phòng.</p>
                    </td>
                  </tr>
                ) : (
                  pagedRestrictions.map((r) => (
                    <tr key={r.id}>
                      <td>
                        <div className="user-info-cell">
                          <strong className="user-name">{r.userFullName}</strong>
                          <span className="user-sub">
                            {r.userCardCode} • {r.userEmail}
                          </span>
                          <span className="user-dept">{r.departmentName}</span>
                        </div>
                      </td>
                      <td>
                        <span className="restriction-type-badge">
                          <BanIcon size={13} /> {r.restrictionType}
                        </span>
                      </td>
                      <td>
                        <p className="restriction-reason-text">{r.reason}</p>
                      </td>
                      <td>
                        <span className="time-display">
                          {new Date(r.startAt).toLocaleDateString("vi-VN")}
                        </span>
                      </td>
                      <td>
                        <span className="time-display">
                          {r.endAt
                            ? new Date(r.endAt).toLocaleDateString("vi-VN")
                            : "Vô thời hạn"}
                        </span>
                      </td>
                      <td>
                        {r.isActive && r.remainingDays !== null ? (
                          <span className="remaining-days-pill highlight-red">
                            <ClockIcon size={12} /> Còn {r.remainingDays} ngày
                          </span>
                        ) : r.status === "Đã gỡ" ? (
                          <span className="remaining-days-pill text-muted">
                            Đã gỡ trước hạn
                          </span>
                        ) : (
                          <span className="remaining-days-pill text-muted">
                            Đã hết hạn
                          </span>
                        )}
                      </td>
                      <td>
                        <span
                          className={`admin-status-pill ${r.isActive
                            ? "pill-cancelled"
                            : r.status === "Đã gỡ"
                              ? "pill-approved"
                              : "pill-pending"
                            }`}
                        >
                          {r.isActive ? "Đang hiệu lực" : r.status}
                        </span>
                      </td>
                      <td onClick={(e) => e.stopPropagation()} style={{ textAlign: "right", whiteSpace: "nowrap" }}>
                        <div style={{ display: "inline-flex", alignItems: "center", justifyContent: "flex-end" }}>
                          <button
                            type="button"
                            className={`btn-table-more ${rowMenu?.key === `rest-${r.id}` ? "active" : ""}`}
                            title="Thao tác"
                            aria-label="Thao tác"
                            onClick={(evt) => toggleRowMenu(`rest-${r.id}`, evt.currentTarget)}
                          >
                            <DotsIcon size={17} />
                          </button>

                          {rowMenu?.key === `rest-${r.id}` &&
                            createPortal(
                              <div
                                ref={rowMenuRef}
                                className={`row-actions-menu ${rowMenu.openUp ? "open-up" : ""}`}
                                style={{ top: rowMenu.top, left: rowMenu.left }}
                                role="menu"
                                onClick={(evt) => evt.stopPropagation()}
                              >
                                {r.isActive && (
                                  <button
                                    type="button"
                                    role="menuitem"
                                    className="row-actions-menu-item accent-blue"
                                    onClick={() => {
                                      setRowMenu(null);
                                      setLiftTarget(r);
                                      setLiftReason("");
                                    }}
                                  >
                                    <ShieldCheckIcon size={14} />
                                    <span>Gỡ bỏ lệnh cấm sớm</span>
                                  </button>
                                )}

                                <button
                                  type="button"
                                  role="menuitem"
                                  className="row-actions-menu-item accent-indigo"
                                  onClick={() => {
                                    setRowMenu(null);
                                    navigator.clipboard.writeText(r.userCardCode);
                                    onNotify(`Đã sao chép MSSV / Mã thẻ ${r.userCardCode}!`, "info");
                                  }}
                                >
                                  <InfoIcon size={14} />
                                  <span>Sao chép MSSV / Mã thẻ</span>
                                </button>
                              </div>,
                              document.body
                            )}
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>

          <AdminPagination
            currentPage={restrictionPage}
            totalItems={filteredRestrictions.length}
            pageSize={restrictionPageSize}
            onPageChange={(p) => setRestrictionPage(p)}
            onPageSizeChange={(sz) => setRestrictionPageSize(sz)}
            itemLabel="lệnh hạn chế"
          />
        </div>
      )}

      {/* ── SUB-TAB: REMINDERS (RULE OF 3 WARNINGS) ────────────────────── */}
      {activeSubTab === "reminders" && (
        <div className="violations-content-card">
          {/* 4 Thẻ KPI giám sát nhắc nhở */}
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))",
              gap: "14px",
              marginBottom: "18px",
            }}
          >
            <div className="kpi-mini-card">
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                <span className="kpi-label">Tổng số lượt nhắc nhở</span>
                <span style={{ color: "#2563eb", background: "#eff6ff", padding: "4px 8px", borderRadius: "6px" }}>
                  <BellRingIcon size={15} />
                </span>
              </div>
              <strong className="kpi-value color-blue">{reminders.length}</strong>
              <span className="kpi-subtext">Đã ghi nhận trên hệ thống</span>
            </div>

            <div className="kpi-mini-card">
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                <span className="kpi-label">Mức 1 - 2 (Nhắc nhẹ &amp; Cảnh cáo)</span>
                <span style={{ color: "#d97706", background: "#fef3c7", padding: "4px 8px", borderRadius: "6px" }}>
                  <ClockIcon size={15} />
                </span>
              </div>
              <strong className="kpi-value color-amber">
                {
                  reminders.filter(
                    (r) => r.warningLevel <= 2 && !r.escalatedToViolation
                  ).length
                }
              </strong>
              <span className="kpi-subtext">Đang trong ngưỡng an toàn</span>
            </div>

            <div className="kpi-mini-card">
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                <span className="kpi-label">Mức 3 (Cảnh báo tối đa)</span>
                <span style={{ color: "#ea580c", background: "#ffedd5", padding: "4px 8px", borderRadius: "6px" }}>
                  <AlertTriangleIcon size={15} />
                </span>
              </div>
              <strong
                className="kpi-value"
                style={{ color: "#ea580c" }}
              >
                {
                  reminders.filter(
                    (r) => r.warningLevel === 3 && !r.escalatedToViolation
                  ).length
                }
              </strong>
              <span className="kpi-subtext">Chạm ngưỡng giới hạn</span>
            </div>

            <div className="kpi-mini-card">
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                <span className="kpi-label">Quá 3 lần (Đã lập biên bản)</span>
                <span style={{ color: "#dc2626", background: "#fee2e2", padding: "4px 8px", borderRadius: "6px" }}>
                  <BanIcon size={15} />
                </span>
              </div>
              <strong className="kpi-value color-red">
                {reminders.filter((r) => r.escalatedToViolation).length}
              </strong>
              <span className="kpi-subtext">
                Đã tự động xử phạt &amp; cấm mượn
              </span>
            </div>
          </div>

          {/* Filter Bar */}
          <div className="table-filter-bar">
            <div className="search-input-wrap">
              <SearchIcon size={16} className="search-icon" />
              <input
                type="text"
                placeholder="Tìm theo MSSV, tên sinh viên, phòng, lý do nhắc nhở, cán bộ..."
                value={reminderSearch}
                onChange={(e) => setReminderSearch(e.target.value)}
                className="search-input"
              />
              {reminderSearch && (
                <button
                  type="button"
                  className="search-clear-btn"
                  onClick={() => setReminderSearch("")}
                >
                  <XIcon size={14} />
                </button>
              )}
            </div>

            <div className="filters-group">
              <select
                value={reminderLevelFilter}
                onChange={(e) => setReminderLevelFilter(e.target.value)}
                className="filter-select"
              >
                <option value="ALL">Tất cả cấp độ cảnh báo</option>
                <option value="LEVEL_1_2">Mức 1 - 2 (Nhắc nhở nhẹ)</option>
                <option value="LEVEL_3">Mức 3 (Cảnh báo tối đa)</option>
                <option value="ESCALATED">Quá 3 lần (Đã lập biên bản)</option>
              </select>

              {(reminderSearch || reminderLevelFilter !== "ALL") && (
                <button
                  type="button"
                  onClick={() => {
                    setReminderSearch("");
                    setReminderLevelFilter("ALL");
                  }}
                  style={{
                    fontSize: "12px",
                    color: "#2563eb",
                    fontWeight: 600,
                    padding: "4px 8px",
                    cursor: "pointer",
                    background: "none",
                    border: "none",
                  }}
                >
                  Xóa bộ lọc
                </button>
              )}
            </div>
          </div>

          {/* Table */}
          <div className="table-responsive-wrapper">
            <table className="admin-custom-table">
              <thead>
                <tr>
                  <th style={{ width: "135px" }}>Thời gian</th>
                  <th>Người mượn</th>
                  <th>Phòng &amp; Phiên</th>
                  <th style={{ width: "140px", textAlign: "center" }}>
                    Cấp độ cảnh báo
                  </th>
                  <th>Lý do nhắc nhở &amp; Ghi chú</th>
                  <th style={{ width: "140px" }}>Cán bộ thực hiện</th>
                  <th style={{ width: "130px", textAlign: "center" }}>
                    Biên bản xử lý
                  </th>
                </tr>
              </thead>
              <tbody>
                {filteredReminders.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="table-empty-row">
                      <AlertTriangleIcon size={36} className="text-muted" />
                      <p>Không tìm thấy ghi nhận nhắc nhở nào phù hợp.</p>
                    </td>
                  </tr>
                ) : (
                  pagedReminders.map((r) => (
                    <tr key={r.id}>
                      <td style={{ fontSize: "12px", color: "#64748b" }}>
                        <div>
                          {formatTime24h(r.remindedAt)}
                        </div>
                        <div>
                          {formatDateVN(r.remindedAt)}
                        </div>
                      </td>
                      <td>
                        <div className="user-info-cell">
                          <strong className="user-name">
                            {r.userFullName}
                          </strong>
                          <span className="user-sub">
                            {r.userCardCode
                              ? `MSSV: ${r.userCardCode}`
                              : r.userName}
                          </span>
                        </div>
                      </td>
                      <td>
                        <span className="code-pill font-mono">{r.roomCode}</span>
                        <div
                          style={{
                            fontSize: "11px",
                            color: "#64748b",
                            marginTop: "2px",
                          }}
                        >
                          Phiên #{r.sessionId}
                        </div>
                      </td>
                      <td style={{ textAlign: "center" }}>
                        {r.escalatedToViolation ? (
                          <span className="reminder-tag-badge reminder-tag-violation">
                            <BanIcon size={12} className="inline-block" style={{ marginRight: "3px" }} /> Quá 3 lần (Đã lập biên bản)
                          </span>
                        ) : r.warningLevel === 3 ? (
                          <span className="reminder-tag-badge reminder-tag-max">
                            <FlameIcon size={12} className="inline-block" style={{ marginRight: "3px" }} /> Cảnh báo tối đa (3/3)
                          </span>
                        ) : r.warningLevel === 2 ? (
                          <span className="reminder-tag-badge reminder-tag-warn">
                            <AlertTriangleIcon size={12} className="inline-block" style={{ marginRight: "3px" }} /> Nhắc nhở (2/3)
                          </span>
                        ) : (
                          <span className="reminder-tag-badge reminder-tag-light">
                            <MegaphoneIcon size={12} className="inline-block" style={{ marginRight: "3px" }} /> Nhắc nhở (1/3)
                          </span>
                        )}
                      </td>
                      <td>
                        <div
                          style={{
                            fontWeight: 600,
                            color: "#1e293b",
                            fontSize: "13px",
                          }}
                        >
                          {r.reason}
                        </div>
                        {r.note && (
                          <div
                            style={{
                              fontSize: "12px",
                              color: "#64748b",
                              fontStyle: "italic",
                              marginTop: "3px",
                            }}
                          >
                            "{r.note}"
                          </div>
                        )}
                      </td>
                      <td style={{ fontSize: "12.5px", color: "#334155" }}>
                        {r.remindedByStaff}
                      </td>
                      <td style={{ textAlign: "center" }}>
                        {r.violationCode ? (
                          <span
                            className="code-pill font-mono"
                            style={{
                              backgroundColor: "#fee2e2",
                              color: "#b91c1c",
                              borderColor: "#fca5a5",
                              cursor: "pointer",
                            }}
                            onClick={() => {
                              setActiveSubTab("records");
                              setSearchTerm(r.violationCode || "");
                            }}
                            title="Bấm để xem biên bản vi phạm này"
                          >
                            #{r.violationCode}
                          </span>
                        ) : (
                          <span
                            className="text-muted"
                            style={{ fontSize: "11px" }}
                          >
                            —
                          </span>
                        )}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>

          <AdminPagination
            currentPage={reminderPage}
            totalItems={filteredReminders.length}
            pageSize={reminderPageSize}
            onPageChange={(p) => setReminderPage(p)}
            onPageSizeChange={(sz) => setReminderPageSize(sz)}
            itemLabel="lượt nhắc nhở"
          />
        </div>
      )}

      {/* ── SUB-TAB 3: VIOLATION TYPES ──────────────────────────────────── */}
      {activeSubTab === "types" && (
        <div className="violations-content-card">
          <div className="table-filter-bar">
            <div className="search-input-wrap">
              <SearchIcon size={16} className="search-icon" />
              <input
                type="text"
                placeholder="Tìm mã hoặc tên loại vi phạm..."
                value={typeSearchTerm}
                onChange={(e) => setTypeSearchTerm(e.target.value)}
                className="search-input"
              />
              {typeSearchTerm && (
                <button
                  type="button"
                  className="clear-search-btn"
                  onClick={() => setTypeSearchTerm("")}
                >
                  <XIcon size={14} />
                </button>
              )}
            </div>

            <div className="filter-select-group">
              <div className="filter-item">
                <span className="filter-label">Mức độ:</span>
                <select
                  value={typeSeverityFilter}
                  onChange={(e) => setTypeSeverityFilter(e.target.value)}
                  className="filter-select"
                >
                  <option value="ALL">Tất cả mức độ</option>
                  <option value="1">Mức 1 - Nhẹ</option>
                  <option value="2">Mức 2 - Vừa</option>
                  <option value="3">Mức 3 - Nghiêm trọng</option>
                  <option value="4">Mức 4 - Rất nghiêm trọng</option>
                </select>
              </div>

              {(Boolean(typeSearchTerm || typeSeverityFilter !== "ALL")) && (
                <button
                  type="button"
                  className="btn-link"
                  onClick={() => {
                    setTypeSearchTerm("");
                    setTypeSeverityFilter("ALL");
                    setTypePage(1);
                  }}
                  style={{ fontSize: "12px", color: "#2563eb", fontWeight: 600, padding: "4px 8px", cursor: "pointer", background: "none", border: "none" }}
                >
                  Xóa bộ lọc
                </button>
              )}
            </div>
          </div>

          <div className="table-responsive-wrapper">
            <table className="admin-custom-table">
              <thead>
                <tr>
                  <th style={{ width: "90px" }}>Mã loại</th>
                  <th>Tên loại vi phạm</th>
                  <th>Mô tả quy định</th>
                  <th style={{ width: "130px" }}>Mức độ mặc định</th>
                  <th>Hình phạt / Xử lý gợi ý</th>
                  <th style={{ width: "110px", textAlign: "center" }}>
                    Số lần vi phạm
                  </th>
                  <th style={{ width: "90px", textAlign: "right" }}>Thao tác</th>
                </tr>
              </thead>
              <tbody>
                {filteredTypes.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="table-empty-row">
                      <AlertTriangleIcon size={36} className="text-muted" />
                      <p>Không tìm thấy loại vi phạm nào phù hợp với bộ lọc.</p>
                    </td>
                  </tr>
                ) : (
                  pagedTypes.map((vt) => (
                    <tr
                      key={vt.id}
                      className="admin-clickable-row"
                      onClick={() => openEditTypeModal(vt)}
                      title="Bấm vào dòng để chỉnh sửa loại vi phạm này"
                    >
                      <td>
                        <span className="code-pill font-mono">{vt.code}</span>
                      </td>
                      <td>
                        <strong className="type-title">{vt.name}</strong>
                      </td>
                      <td>
                        <p className="type-desc">{vt.description || "—"}</p>
                      </td>
                      <td>
                        <span
                          className={`severity-badge ${getSeverityBadgeClass(
                            vt.severity
                          )}`}
                        >
                          {vt.severity === 1
                            ? "1 - Nhẹ"
                            : vt.severity === 2
                              ? "2 - Vừa"
                              : vt.severity === 3
                                ? "3 - Nghiêm trọng"
                                : "4 - Rất nghiêm trọng"}
                        </span>
                      </td>
                      <td>
                        <span className="penalty-text">
                          {vt.defaultPenalty || "Cảnh cáo"}
                        </span>
                      </td>
                      <td style={{ textAlign: "center" }}>
                        <span className="record-count-badge">{vt.recordCount}</span>
                      </td>
                      <td onClick={(e) => e.stopPropagation()} style={{ textAlign: "right", whiteSpace: "nowrap" }}>
                        <div style={{ display: "inline-flex", alignItems: "center", justifyContent: "flex-end" }}>
                          <button
                            type="button"
                            className={`btn-table-more ${rowMenu?.key === `type-${vt.id}` ? "active" : ""}`}
                            title="Thao tác"
                            aria-label="Thao tác"
                            onClick={(evt) => toggleRowMenu(`type-${vt.id}`, evt.currentTarget)}
                          >
                            <DotsIcon size={17} />
                          </button>

                          {rowMenu?.key === `type-${vt.id}` &&
                            createPortal(
                              <div
                                ref={rowMenuRef}
                                className={`row-actions-menu ${rowMenu.openUp ? "open-up" : ""}`}
                                style={{ top: rowMenu.top, left: rowMenu.left }}
                                role="menu"
                                onClick={(evt) => evt.stopPropagation()}
                              >
                                <button
                                  type="button"
                                  role="menuitem"
                                  className="row-actions-menu-item accent-blue"
                                  onClick={() => {
                                    setRowMenu(null);
                                    openEditTypeModal(vt);
                                  }}
                                >
                                  <PencilIcon size={14} />
                                  <span>Chỉnh sửa quy chế</span>
                                </button>

                                {isAdmin && (
                                  <button
                                    type="button"
                                    role="menuitem"
                                    className="row-actions-menu-item danger"
                                    onClick={() => {
                                      setRowMenu(null);
                                      handleDeleteType(vt);
                                    }}
                                  >
                                    <TrashIcon size={14} />
                                    <span>Xóa quy chế vi phạm</span>
                                  </button>
                                )}
                              </div>,
                              document.body
                            )}
                        </div>
                      </td>
                    </tr>
                  )))}
              </tbody>
            </table>
          </div>

          <AdminPagination
            currentPage={typePage}
            totalItems={filteredTypes.length}
            pageSize={typePageSize}
            onPageChange={(p) => setTypePage(p)}
            onPageSizeChange={(sz) => setTypePageSize(sz)}
            itemLabel="loại vi phạm"
          />
        </div>
      )}

      {/* ── SUB-TAB 5: PENALTIES & SANCTIONS MANAGEMENT ─────────────────── */}
      {activeSubTab === "penalties" && (
        <div className="violations-content-card">
          <div className="table-filter-bar">
            <div className="search-input-wrap">
              <SearchIcon size={16} className="search-icon" />
              <input
                type="text"
                placeholder="Tìm mã hoặc tên hình phạt, chế tài..."
                value={penaltySearchTerm}
                onChange={(e) => setPenaltySearchTerm(e.target.value)}
                className="search-input"
              />
              {penaltySearchTerm && (
                <button
                  type="button"
                  className="clear-search-btn"
                  onClick={() => setPenaltySearchTerm("")}
                >
                  <XIcon size={14} />
                </button>
              )}
            </div>

            <div className="filter-select-group">
              <div className="filter-item">
                <span className="filter-label">Mức độ:</span>
                <select
                  value={penaltySeverityFilter}
                  onChange={(e) => setPenaltySeverityFilter(e.target.value)}
                  className="filter-select"
                >
                  <option value="ALL">Tất cả mức độ</option>
                  <option value="1">Mức 1 - Nhẹ</option>
                  <option value="2">Mức 2 - Vừa</option>
                  <option value="3">Mức 3 - Nghiêm trọng</option>
                  <option value="4">Mức 4 - Rất nghiêm trọng</option>
                </select>
              </div>

              {(Boolean(penaltySearchTerm || penaltySeverityFilter !== "ALL")) && (
                <button
                  type="button"
                  className="btn-link"
                  onClick={() => {
                    setPenaltySearchTerm("");
                    setPenaltySeverityFilter("ALL");
                    setPenaltyPage(1);
                  }}
                  style={{ fontSize: "12px", color: "#2563eb", fontWeight: 600, padding: "4px 8px", cursor: "pointer", background: "none", border: "none" }}
                >
                  Xóa bộ lọc
                </button>
              )}

              <button
                type="button"
                onClick={handleResetPenalties}
                style={{
                  fontSize: "12px",
                  color: "#64748b",
                  background: "#f1f5f9",
                  border: "1px solid #cbd5e1",
                  borderRadius: "6px",
                  padding: "6px 10px",
                  cursor: "pointer",
                  fontWeight: 600,
                  marginLeft: "auto",
                }}
                title="Khôi phục danh mục về 11 hình phạt chuẩn của Thư viện"
              >
                Khôi phục chuẩn
              </button>
            </div>
          </div>

          <div className="table-responsive-wrapper">
            <table className="admin-custom-table">
              <thead>
                <tr>
                  <th style={{ width: "90px" }}>Mã HP</th>
                  <th>Tên hình phạt / Chế tài</th>
                  <th style={{ width: "140px" }}>Mức độ áp dụng</th>
                  <th style={{ width: "150px" }}>Thời hạn cấm mượn</th>
                  <th>Mô tả chi tiết &amp; Hướng dẫn thi hành</th>
                  <th style={{ width: "90px", textAlign: "right" }}>Thao tác</th>
                </tr>
              </thead>
              <tbody>
                {filteredPenalties.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="table-empty-row">
                      <AlertTriangleIcon size={36} className="text-muted" />
                      <p>Không tìm thấy hình phạt nào phù hợp với bộ lọc.</p>
                    </td>
                  </tr>
                ) : (
                  pagedPenalties.map((p) => (
                    <tr
                      key={p.id}
                      className="admin-clickable-row"
                      onClick={() => openEditPenaltyModal(p)}
                      title="Bấm vào dòng để chỉnh sửa hình phạt này"
                    >
                      <td>
                        <span className="code-pill font-mono">{p.code}</span>
                      </td>
                      <td>
                        <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                          <strong className="type-title">{p.name}</strong>
                          {p.isCustom && (
                            <span style={{ fontSize: "10.5px", background: "#fef3c7", color: "#92400e", padding: "1px 6px", borderRadius: "4px", fontWeight: 600 }}>
                              Tùy chỉnh
                            </span>
                          )}
                        </div>
                      </td>
                      <td>
                        <span className={`severity-badge ${getSeverityBadgeClass(p.severity)}`}>
                          {p.severity === 1
                            ? "1 - Nhẹ"
                            : p.severity === 2
                              ? "2 - Vừa"
                              : p.severity === 3
                                ? "3 - Nghiêm trọng"
                                : "4 - Rất nghiêm trọng"}
                        </span>
                      </td>
                      <td>
                        {p.defaultRestrictDays > 0 ? (
                          <span style={{ color: "#b91c1c", fontWeight: 700, fontSize: "12px", background: "#fee2e2", padding: "2px 8px", borderRadius: "4px", border: "1px solid #fca5a5", display: "inline-block" }}>
                            Cấm mượn {p.defaultRestrictDays} ngày
                          </span>
                        ) : (
                          <span style={{ color: "#64748b", fontSize: "12px" }}>
                            Không cấm mượn
                          </span>
                        )}
                      </td>
                      <td>
                        <p className="type-desc">{p.description || "—"}</p>
                      </td>
                      <td onClick={(e) => e.stopPropagation()} style={{ textAlign: "right", whiteSpace: "nowrap" }}>
                        <div style={{ display: "inline-flex", alignItems: "center", justifyContent: "flex-end" }}>
                          <button
                            type="button"
                            className={`btn-table-more ${rowMenu?.key === `pen-${p.id}` ? "active" : ""}`}
                            title="Thao tác"
                            aria-label="Thao tác"
                            onClick={(evt) => toggleRowMenu(`pen-${p.id}`, evt.currentTarget)}
                          >
                            <DotsIcon size={17} />
                          </button>

                          {rowMenu?.key === `pen-${p.id}` &&
                            createPortal(
                              <div
                                ref={rowMenuRef}
                                className={`row-actions-menu ${rowMenu.openUp ? "open-up" : ""}`}
                                style={{ top: rowMenu.top, left: rowMenu.left }}
                                role="menu"
                                onClick={(evt) => evt.stopPropagation()}
                              >
                                <button
                                  type="button"
                                  role="menuitem"
                                  className="row-actions-menu-item accent-blue"
                                  onClick={() => {
                                    setRowMenu(null);
                                    openEditPenaltyModal(p);
                                  }}
                                >
                                  <PencilIcon size={14} />
                                  <span>Chỉnh sửa hình phạt</span>
                                </button>

                                <button
                                  type="button"
                                  role="menuitem"
                                  className="row-actions-menu-item danger"
                                  onClick={() => {
                                    setRowMenu(null);
                                    handleDeletePenalty(p);
                                  }}
                                >
                                  <TrashIcon size={14} />
                                  <span>Xóa hình phạt</span>
                                </button>
                              </div>,
                              document.body
                            )}
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>

          <AdminPagination
            currentPage={penaltyPage}
            totalItems={filteredPenalties.length}
            pageSize={penaltyPageSize}
            onPageChange={(p) => setPenaltyPage(p)}
            onPageSizeChange={(sz) => setPenaltyPageSize(sz)}
            itemLabel="hình phạt"
          />
        </div>
      )}


      {/* ── MODAL 1: LẬP BIÊN BẢN VI PHẠM ───────────────────────────────── */}
      {showRecordModal && (
        <div className="admin-modal-overlay">
          <div className="admin-modal-card modal-lg">
            <div className="admin-modal-header">
              <div className="modal-title-with-icon">
                <div className="modal-header-icon-wrap icon-amber">
                  <AlertTriangleIcon size={20} />
                </div>
                <div>
                  <h3 className="admin-modal-title">Lập biên bản vi phạm</h3>
                  <p className="admin-modal-subtitle">
                    Ghi nhận sự việc, ấn định hình thức kỷ luật &amp; tự động áp
                    dụng lệnh cấm mượn phòng.
                  </p>
                </div>
              </div>
              <button
                type="button"
                className="admin-modal-close-btn"
                onClick={() => setShowRecordModal(false)}
              >
                <XIcon size={18} />
              </button>
            </div>

            <form onSubmit={handleRecordSubmit} className="admin-modal-form">
              <div className="modal-form-grid-2">
                {/* User Picker */}
                <div className="form-group-col-2">
                  <label className="admin-field-label required">
                    Người vi phạm (Sinh viên / Giảng viên)
                  </label>
                  <div className="user-picker-box">
                    <input
                      type="text"
                      placeholder="Gõ tên hoặc MSSV/mã cán bộ để tìm..."
                      value={formUserSearch}
                      onChange={(e) => setFormUserSearch(e.target.value)}
                      className="admin-input-text search-user-picker-input"
                    />
                    <div className="user-picker-results">
                      {filteredUsersForPicker.map((u) => (
                        <div
                          key={u.id}
                          className={`user-picker-item ${formUserId === u.id ? "selected" : ""
                            }`}
                          onClick={() => {
                            setFormUserId(u.id);
                            setFormUserSearch(
                              `${u.fullName} (${u.cardCode})`
                            );
                          }}
                        >
                          <span className="user-picker-name">
                            {u.fullName} • <strong>{u.cardCode}</strong>
                          </span>
                          <span className="user-picker-role">
                            {formatRole(u.role)} - {u.departmentName || u.email}
                          </span>
                          {formUserId === u.id && (
                            <CheckIcon size={14} className="selected-check" />
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                </div>

                {/* Violation Type */}
                <div className="form-group">
                  <label className="admin-field-label required">
                    Loại vi phạm
                  </label>
                  <select
                    value={formViolationTypeId}
                    onChange={(e) => handleTypeChange(Number(e.target.value))}
                    className="admin-input-text"
                    required
                  >
                    {violationTypes.map((t) => (
                      <option key={t.id} value={t.id}>
                        {t.code} - {t.name}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Severity */}
                <div className="form-group">
                  <label className="admin-field-label required">
                    Mức độ nghiêm trọng
                  </label>
                  <select
                    value={formSeverity}
                    onChange={(e) => {
                      const sev = Number(e.target.value);
                      setFormSeverity(sev);
                      if (sev >= 3) {
                        setFormStatus("Đang xử lý");
                      } else {
                        setFormStatus("Đã xử lý");
                      }
                    }}
                    className="admin-input-text"
                  >
                    <option value={1}>Mức 1 - Nhẹ (Nhắc nhở)</option>
                    <option value={2}>Mức 2 - Vừa (Cảnh cáo, phạt nhẹ)</option>
                    <option value={3}>
                      Mức 3 - Nghiêm trọng (Bồi thường, cấm mượn)
                    </option>
                    <option value={4}>
                      Mức 4 - Rất nghiêm trọng (Kỷ luật nặng)
                    </option>
                  </select>

                </div>

                {/* Incident Time */}
                <div className="form-group">
                  <label className="admin-field-label required">
                    Thời điểm xảy ra sự việc
                  </label>
                  <input
                    type="datetime-local"
                    value={formIncidentTime}
                    onChange={(e) => setFormIncidentTime(e.target.value)}
                    className="admin-input-text"
                    required
                  />
                </div>

                {/* Usage Session (optional) */}
                <div className="form-group">
                  <label className="admin-field-label">
                    Phiên sử dụng / Phòng liên quan (Đồng bộ người mượn)
                  </label>
                  {sessionsList.length > 0 ? (
                    <select
                      value={formUsageSessionId}
                      onChange={(e) => handleSessionChange(e.target.value)}
                      className="admin-input-text"
                    >
                      <option value="">-- Không gắn phiên / Vi phạm ngoài phòng --</option>
                      {sessionsList.map((s) => (
                        <option key={s.id} value={s.id}>
                          Phiên #{s.id} - {s.roomCode} ({s.roomName}) {s.userFullName ? `- ${s.userFullName}` : ""}
                        </option>
                      ))}
                    </select>
                  ) : (
                    <input
                      type="number"
                      placeholder="Nhập mã phiên sử dụng (VD: 5)"
                      value={formUsageSessionId}
                      onChange={(e) => handleSessionChange(e.target.value)}
                      className="admin-input-text"
                    />
                  )}
                </div>

                {/* Description */}
                <div className="form-group-col-2">
                  <label className="admin-field-label required">
                    Mô tả chi tiết hành vi vi phạm &amp; hiện trạng
                  </label>
                  <textarea
                    rows={3}
                    placeholder="Mô tả cụ thể hành vi vi phạm, tang vật/thiết bị bị hỏng hóc hoặc thời gian chậm trễ..."
                    value={formDescription}
                    onChange={(e) => setFormDescription(e.target.value)}
                    className="admin-textarea"
                    required
                  />
                </div>

                {/* Penalty Applied */}
                <div className="form-group">
                  <label className="admin-field-label required">
                    Hình thức xử lý / Hình phạt
                  </label>
                  <div
                    style={{
                      display: "flex",
                      flexWrap: "wrap",
                      gap: "6px",
                      marginBottom: "6px",
                    }}
                  >
                    {QUICK_PENALTY_PILLS.map((pill) => {
                      const isSelected = formPenaltyApplied === pill;
                      return (
                        <button
                          key={pill}
                          type="button"
                          style={{
                            fontSize: "11px",
                            padding: "2px 7px",
                            borderRadius: "5px",
                            border: isSelected ? "1px solid #0284c7" : "1px solid #cbd5e1",
                            backgroundColor: isSelected ? "#e0f2fe" : "#f8fafc",
                            color: isSelected ? "#0369a1" : "#475569",
                            cursor: "pointer",
                            fontWeight: isSelected ? 700 : 400,
                          }}
                          onClick={() => {
                            setFormPenaltyApplied(pill);
                            if (pill.includes("3 ngày")) setFormRestrictDays(3);
                            else if (pill.includes("7 ngày")) setFormRestrictDays(7);
                            else if (pill.includes("14 ngày")) setFormRestrictDays(14);
                            else if (pill.includes("30 ngày")) setFormRestrictDays(30);
                            else if (pill.includes("Nhắc nhở") || pill.includes("Vệ sinh")) setFormRestrictDays(0);
                          }}
                        >
                          {pill}
                        </button>
                      );
                    })}
                  </div>
                  <input
                    type="text"
                    placeholder="VD: Cảnh cáo, Bồi thường 350.000đ sửa micro..."
                    value={formPenaltyApplied}
                    onChange={(e) => setFormPenaltyApplied(e.target.value)}
                    className="admin-input-text"
                    required
                  />
                </div>

                {/* Restrict Days Options */}
                <div className="form-group-col-2 restriction-quick-picker-box">
                  <label className="admin-field-label">
                    Áp dụng lệnh Cấm mượn phòng (Khóa quyền đặt phòng)
                  </label>
                  <p className="field-hint">
                    Hệ thống sẽ tự động chặn không cho sinh viên/giảng viên này đặt
                    bất kỳ phòng nào trong thời gian bị phạt.
                  </p>
                  <div className="days-pills-row">
                    {[0, 3, 7, 14, 30, 90].map((d) => (
                      <button
                        key={d}
                        type="button"
                        className={`day-pill-btn ${formRestrictDays === d ? "active" : ""
                          }`}
                        onClick={() => setFormRestrictDays(d)}
                      >
                        {d === 0 ? "Không cấm" : `Cấm ${d} ngày`}
                      </button>
                    ))}
                  </div>
                </div>

                {/* MinIO File Attachments */}
                <div className="form-group-col-2 violation-attachment-upload-box">
                  <div className="attachment-upload-header">
                    <div>
                      <label className="admin-field-label">
                        Tệp đính kèm / Minh chứng vi phạm (Không bắt buộc - Tùy chọn)
                      </label>
                      <p className="field-hint">
                        (Tùy chọn) Hỗ trợ ảnh chụp hiện trường (.jpg, .png, .webp) và biên bản văn bản (.pdf, .docx, .xlsx). Không bắt buộc đính kèm tệp khi lập biên bản.
                      </p>
                    </div>
                    <div>
                      <button
                        type="button"
                        className="btn-select-attachment"
                        onClick={() => creationFileInputRef.current?.click()}
                      >
                        <PlusIcon size={14} /> Chọn tệp đính kèm
                      </button>
                      <input
                        ref={creationFileInputRef}
                        type="file"
                        multiple
                        accept=".jpg,.jpeg,.png,.webp,.gif,.pdf,.docx,.doc,.xls,.xlsx"
                        style={{ display: "none" }}
                        onChange={(e) => {
                          const files = Array.from(e.target.files || []);
                          if (files.length > 0) {
                            setCreationFiles((prev) => [...prev, ...files]);
                          }
                          if (creationFileInputRef.current) creationFileInputRef.current.value = "";
                        }}
                      />
                    </div>
                  </div>

                  {creationFiles.length > 0 && (
                    <div className="attachment-queued-list">
                      {creationFiles.map((file, idx) => (
                        <div key={`${file.name}-${idx}`} className="attachment-queued-chip">
                          <FileTextIcon size={14} />
                          <span className="file-name" title={file.name}>
                            {file.name} ({formatFileSize(file.size)})
                          </span>
                          <button
                            type="button"
                            className="btn-remove-queued-file"
                            onClick={() =>
                              setCreationFiles((prev) => prev.filter((_, i) => i !== idx))
                            }
                            title="Bỏ chọn tệp này"
                          >
                            <XIcon size={12} />
                          </button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>

              <div className="admin-modal-footer">
                <button
                  type="button"
                  className="btn-modal-cancel"
                  onClick={() => setShowRecordModal(false)}
                >
                  Hủy bỏ
                </button>
                <button
                  type="submit"
                  className="btn-modal-submit"
                  disabled={submittingRecord}
                >
                  {submittingRecord
                    ? "Đang ghi nhận..."
                    : "Lưu biên bản & Áp dụng phạt"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ── MODAL 2: CHI TIẾT & XỬ LÝ BIÊN BẢN ─────────────────────────── */}
      {selectedRecord && (
        <div className="admin-modal-overlay">
          <div className="admin-modal-card modal-md">
            <div className="admin-modal-header">
              <div className="modal-title-with-icon">
                <div className="modal-header-icon-wrap icon-blue">
                  <AlertTriangleIcon size={20} />
                </div>
                <div>
                  <h3 className="admin-modal-title">
                    Biên bản vi phạm #{selectedRecord.code}
                  </h3>
                  <p className="admin-modal-subtitle">
                    Cập nhật tiến độ giải quyết, ghi nhận nộp phạt hoặc bồi thường.
                  </p>
                </div>
              </div>
              <button
                type="button"
                className="admin-modal-close-btn"
                onClick={() => setSelectedRecord(null)}
              >
                <XIcon size={18} />
              </button>
            </div>

            <form onSubmit={handleUpdateRecordSubmit} className="admin-modal-form">
              {/* Record Summary Box */}
              <div className="record-summary-banner">
                <div className="summary-field">
                  <span className="label">Người vi phạm:</span>
                  <strong>{selectedRecord.userFullName}</strong> (
                  {selectedRecord.userCardCode})
                </div>
                <div className="summary-field">
                  <span className="label">Đơn vị / Khoa:</span>
                  <span>{selectedRecord.departmentName || "Thành viên HUIT"}</span>
                </div>
                <div className="summary-field">
                  <span className="label">Loại vi phạm:</span>
                  <strong>{selectedRecord.violationTypeName}</strong>
                </div>
                {selectedRecord.roomCode && (
                  <div className="summary-field">
                    <span className="label">Phòng liên quan:</span>
                    <span>
                      {selectedRecord.roomCode} - {selectedRecord.roomName}
                    </span>
                  </div>
                )}
                <div className="summary-field">
                  <span className="label">Thời điểm sự việc:</span>
                  <span>
                    {formatDateTime24h(selectedRecord.incidentTime)}
                  </span>
                </div>
              </div>

              <div className="form-group">
                <label className="admin-field-label">Mô tả vi phạm</label>
                <textarea
                  rows={2}
                  value={editDescription}
                  onChange={(e) => setEditDescription(e.target.value)}
                  className="admin-textarea"
                />
              </div>

              <div className="form-group">
                <label className="admin-field-label required">
                  Trạng thái xử lý
                </label>
                <select
                  value={editStatus}
                  onChange={(e) => setEditStatus(e.target.value)}
                  className="admin-input-text"
                  required
                >
                  <option value="Đang xử lý">Đang xử lý</option>
                  <option value="Chờ xử lý">Chờ xử lý</option>
                  <option value="Đã xử lý">Đã xử lý (Đã làm việc / cam kết)</option>
                  <option value="Đã nộp phạt">Đã nộp phạt / Khắc phục xong</option>
                  <option value="Hủy bỏ">Hủy bỏ biên bản</option>
                </select>
              </div>

              <div className="form-group">
                <label className="admin-field-label required">
                  Hình thức xử lý / Ghi chú bồi thường
                </label>
                <input
                  type="text"
                  value={editPenalty}
                  onChange={(e) => setEditPenalty(e.target.value)}
                  className="admin-input-text"
                  required
                />
              </div>

              <div className="form-group">
                <label className="admin-field-label">Mức độ nghiêm trọng</label>
                <select
                  value={editSeverity}
                  onChange={(e) => setEditSeverity(Number(e.target.value))}
                  className="admin-input-text"
                >
                  <option value={1}>Mức 1 - Nhẹ</option>
                  <option value={2}>Mức 2 - Vừa</option>
                  <option value={3}>Mức 3 - Nghiêm trọng</option>
                  <option value={4}>Mức 4 - Rất nghiêm trọng</option>
                </select>
              </div>

              {/* Attachments Section (MinIO Object Storage) */}
              <div className="violation-attachments-section">
                <div className="attachments-section-header">
                  <div>
                    <h4 className="attachments-section-title">
                      <FileTextIcon size={16} /> Tệp đính kèm & Minh chứng (MinIO)
                    </h4>
                    <p className="attachments-section-subtitle">
                      Ảnh hiện trường, biên bản ký nhận, tài liệu vi phạm (.png, .jpg, .docx, .pdf)
                    </p>
                  </div>
                  <div>
                    <input
                      ref={detailFileInputRef}
                      type="file"
                      accept=".jpg,.jpeg,.png,.webp,.gif,.pdf,.docx,.doc,.xls,.xlsx"
                      style={{ display: "none" }}
                      onChange={handleUploadDetailFile}
                    />
                    <button
                      type="button"
                      className="btn-upload-attachment"
                      disabled={uploadingAttachment}
                      onClick={() => detailFileInputRef.current?.click()}
                    >
                      <PlusIcon size={14} />
                      {uploadingAttachment ? "Đang tải lên MinIO..." : "Tải thêm tệp"}
                    </button>
                  </div>
                </div>

                {(!selectedRecord.attachments || selectedRecord.attachments.length === 0) ? (
                  <div className="attachment-empty-box">
                    <p>Chưa có tệp minh chứng hoặc ảnh vi phạm nào được tải lên.</p>
                  </div>
                ) : (
                  <div className="attachment-cards-grid">
                    {selectedRecord.attachments.map((att) => {
                      const isImg = isImageAttachment(att.originalFileName, att.contentType);
                      const isPdf = isPdfAttachment(att.originalFileName, att.contentType);
                      const viewHref = att.viewUrl || getAttachmentViewUrl(att.id);
                      const downloadHref = att.downloadUrl || getAttachmentDownloadUrl(att.id);

                      return (
                        <div key={att.id} className="attachment-card-item">
                          <div className="attachment-card-left">
                            {isImg ? (
                              <div
                                className="attachment-thumb-box"
                                onClick={() => handleViewAttachment(att)}
                                title="Bấm để xem ảnh phóng to"
                              >
                                <img
                                  src={viewHref}
                                  alt={att.originalFileName}
                                  className="attachment-thumb-img"
                                  loading="lazy"
                                />
                              </div>
                            ) : (
                              <div className={`attachment-icon-pill ${isPdf ? "pdf" : "doc"}`}>
                                <FileTextIcon size={16} />
                              </div>
                            )}
                            <div className="attachment-info">
                              <span
                                className="attachment-filename"
                                title={att.originalFileName}
                                onClick={() => handleViewAttachment(att)}
                                style={{ cursor: "pointer" }}
                              >
                                {att.originalFileName}
                              </span>
                              <span className="attachment-meta">
                                {formatFileSize(att.fileSize)} • {formatDateTime24h(att.createdAt)}
                              </span>
                            </div>
                          </div>
                          <div className="attachment-actions">
                            <button
                              type="button"
                              className="btn-view-att"
                              title="Xem trực tiếp (Ảnh / PDF)"
                              onClick={() => handleViewAttachment(att)}
                            >
                              <EyeIcon size={13} /> Xem
                            </button>
                            <a
                              href={downloadHref}
                              download={att.originalFileName}
                              className="btn-download-att"
                              title="Tải tệp về máy tính"
                            >
                              <DownloadIcon size={13} /> Tải
                            </a>
                            <button
                              type="button"
                              className="btn-delete-att"
                              title="Xóa tệp khỏi MinIO"
                              onClick={() => handleDeleteAttachment(att.id, att.originalFileName)}
                            >
                              <TrashIcon size={13} />
                            </button>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>

              <div className="admin-modal-footer">
                <button
                  type="button"
                  className="btn-modal-cancel"
                  onClick={() => setSelectedRecord(null)}
                >
                  Đóng
                </button>
                <button
                  type="submit"
                  className="btn-modal-submit"
                  disabled={updatingRecord}
                >
                  {updatingRecord ? "Đang lưu..." : "Cập nhật trạng thái xử lý"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ── MODAL 3: GỠ CẤM MƯỢN PHÒNG SỚM ──────────────────────────────── */}
      {liftTarget && (
        <div className="admin-modal-overlay">
          <div className="admin-modal-card modal-sm">
            <div className="admin-modal-header">
              <div className="modal-title-with-icon">
                <div className="modal-header-icon-wrap icon-green">
                  <ShieldCheckIcon size={20} />
                </div>
                <div>
                  <h3 className="admin-modal-title">Gỡ bỏ lệnh cấm trước hạn</h3>
                  <p className="admin-modal-subtitle">
                    Phục hồi quyền mượn phòng cho {liftTarget.userFullName}
                  </p>
                </div>
              </div>
              <button
                type="button"
                className="admin-modal-close-btn"
                onClick={() => setLiftTarget(null)}
              >
                <XIcon size={18} />
              </button>
            </div>

            <form
              onSubmit={handleLiftRestrictionSubmit}
              className="admin-modal-form"
            >
              <div className="lift-confirm-box">
                <p>
                  Bạn đang chuẩn bị mở lại quyền mượn phòng cho người dùng{" "}
                  <strong>{liftTarget.userFullName}</strong> ({liftTarget.userCardCode}).
                </p>
                <p className="text-muted small">
                  Lý do bị cấm ban đầu: {liftTarget.reason}
                </p>
              </div>

              <div className="form-group">
                <label className="admin-field-label required">
                  Lý do gỡ cấm sớm
                </label>
                <input
                  type="text"
                  placeholder="VD: Đã nộp tiền bồi thường thiết bị đầy đủ tại phòng tài vụ..."
                  value={liftReason}
                  onChange={(e) => setLiftReason(e.target.value)}
                  className="admin-input-text"
                  required
                />
              </div>

              <div className="admin-modal-footer">
                <button
                  type="button"
                  className="btn-modal-cancel"
                  onClick={() => setLiftTarget(null)}
                >
                  Hủy
                </button>
                <button
                  type="submit"
                  className="btn-modal-submit btn-lift-confirm"
                  disabled={submittingLift}
                >
                  {submittingLift ? "Đang xử lý..." : "Xác nhận gỡ cấm"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ── MODAL 4: TẠO LỆNH CẤM THỦ CÔNG ───────────────────────────────── */}
      {showManualRestrictionModal && (
        <div className="admin-modal-overlay">
          <div className="admin-modal-card modal-sm">
            <div className="admin-modal-header">
              <div className="modal-title-with-icon">
                <div className="modal-header-icon-wrap icon-rose">
                  <BanIcon size={20} />
                </div>
                <div>
                  <h3 className="admin-modal-title">Áp dụng lệnh cấm mượn phòng</h3>
                  <p className="admin-modal-subtitle">
                    Thiết lập thời hạn cấm mượn phòng thủ công đối với người dùng.
                  </p>
                </div>
              </div>
              <button
                type="button"
                className="admin-modal-close-btn"
                onClick={() => setShowManualRestrictionModal(false)}
              >
                <XIcon size={18} />
              </button>
            </div>

            <form
              onSubmit={handleManualRestrictionSubmit}
              className="admin-modal-form"
            >
              <div className="form-group">
                <label className="admin-field-label required">Chọn người dùng</label>
                <select
                  value={restrUserId}
                  onChange={(e) => setRestrUserId(Number(e.target.value))}
                  className="admin-input-text"
                  required
                >
                  <option value={0}>-- Chọn người dùng --</option>
                  {usersList.map((u) => (
                    <option key={u.id} value={u.id}>
                      {u.fullName} ({u.cardCode}) - {formatRole(u.role)}
                    </option>
                  ))}
                </select>
              </div>

              <div className="form-group">
                <label className="admin-field-label required">Lý do cấm</label>
                <input
                  type="text"
                  placeholder="Nhập lý do cấm mượn phòng..."
                  value={restrReason}
                  onChange={(e) => setRestrReason(e.target.value)}
                  className="admin-input-text"
                  required
                />
              </div>

              <div className="form-group">
                <label className="admin-field-label required">
                  Số ngày cấm (Thời hạn hiệu lực)
                </label>
                <input
                  type="number"
                  min={1}
                  max={365}
                  value={restrDays}
                  onChange={(e) => setRestrDays(Number(e.target.value))}
                  className="admin-input-text"
                  required
                />
              </div>

              <div className="admin-modal-footer">
                <button
                  type="button"
                  className="btn-modal-cancel"
                  onClick={() => setShowManualRestrictionModal(false)}
                >
                  Hủy
                </button>
                <button
                  type="submit"
                  className="btn-modal-submit"
                  disabled={submittingRestr}
                >
                  {submittingRestr ? "Đang áp dụng..." : "Kích hoạt lệnh cấm"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ── MODAL 5: THÊM / SỬA LOẠI VI PHẠM ────────────────────────────── */}
      {showTypeModal && (
        <div className="admin-modal-overlay">
          <div className="admin-modal-card modal-sm">
            <div className="admin-modal-header">
              <div className="modal-title-with-icon">
                <div className="modal-header-icon-wrap icon-blue">
                  <TagIcon size={20} />
                </div>
                <div>
                  <h3 className="admin-modal-title">
                    {editingTypeId ? "Sửa loại vi phạm" : "Thêm loại vi phạm mới"}
                  </h3>
                  <p className="admin-modal-subtitle">
                    Định nghĩa quy định xử phạt trong hệ thống mượn phòng.
                  </p>
                </div>
              </div>
              <button
                type="button"
                className="admin-modal-close-btn"
                onClick={() => setShowTypeModal(false)}
              >
                <XIcon size={18} />
              </button>
            </div>

            <form onSubmit={handleTypeSubmit} className="admin-modal-form">
              <div className="form-group">
                <label className="admin-field-label required">
                  Mã loại vi phạm
                </label>
                <input
                  type="text"
                  placeholder="VD: VT07"
                  value={typeFormCode}
                  onChange={(e) => setTypeFormCode(e.target.value)}
                  className="admin-input-text"
                  disabled={editingTypeId !== null}
                  required
                />
              </div>

              <div className="form-group">
                <label className="admin-field-label required">
                  Tên loại vi phạm
                </label>
                <input
                  type="text"
                  placeholder="VD: Để quên đồ dùng cá nhân trong phòng"
                  value={typeFormName}
                  onChange={(e) => setTypeFormName(e.target.value)}
                  className="admin-input-text"
                  required
                />
              </div>

              <div className="form-group">
                <label className="admin-field-label">Mô tả nội dung quy định</label>
                <textarea
                  rows={2}
                  placeholder="Chi tiết hành vi..."
                  value={typeFormDesc}
                  onChange={(e) => setTypeFormDesc(e.target.value)}
                  className="admin-textarea"
                />
              </div>

              <div className="form-group">
                <label className="admin-field-label required">
                  Mức độ nghiêm trọng mặc định
                </label>
                <select
                  value={typeFormSeverity}
                  onChange={(e) => {
                    const newSev = Number(e.target.value);
                    setTypeFormSeverity(newSev);
                    const allDefaults = SUGGESTED_PENALTIES.flatMap((g) => g.items);
                    if (!typeFormPenalty || allDefaults.includes(typeFormPenalty)) {
                      if (newSev === 1) setTypeFormPenalty("Nhắc nhở / Cảnh cáo lần đầu");
                      else if (newSev === 2) setTypeFormPenalty("Cảnh cáo & Cấm mượn phòng 3 ngày");
                      else if (newSev === 3) setTypeFormPenalty("Cấm mượn phòng 14 ngày & Bồi thường chi phí sửa chữa");
                      else if (newSev === 4) setTypeFormPenalty("Cấm mượn phòng 30 ngày & Trừ điểm rèn luyện");
                    }
                  }}
                  className="admin-input-text"
                >
                  <option value={1}>Mức 1 - Nhẹ</option>
                  <option value={2}>Mức 2 - Vừa</option>
                  <option value={3}>Mức 3 - Nghiêm trọng</option>
                  <option value={4}>Mức 4 - Rất nghiêm trọng</option>
                </select>
              </div>

              <div className="form-group">
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "4px" }}>
                  <label className="admin-field-label required" style={{ margin: 0 }}>
                    Hình phạt / Xử lý gợi ý ({selectedPenaltyIds.length} đã chọn)
                  </label>
                  <div style={{ display: "flex", gap: "8px" }}>
                    <button
                      type="button"
                      style={{ fontSize: "11.5px", color: "#0284c7", background: "none", border: "none", cursor: "pointer", fontWeight: 600, padding: 0 }}
                      onClick={() => {
                        const sevPenalties = penalties.filter((p) => p.severity === typeFormSeverity);
                        const nextIds = Array.from(new Set([...selectedPenaltyIds, ...sevPenalties.map((p) => p.id)]));
                        setSelectedPenaltyIds(nextIds);
                        const sel = penalties.filter((p) => nextIds.includes(p.id));
                        setTypeFormPenalty(sel.map((p) => p.name).join(" & "));
                      }}
                    >
                      + Chọn theo Mức {typeFormSeverity}
                    </button>
                    {selectedPenaltyIds.length > 0 && (
                      <button
                        type="button"
                        style={{ fontSize: "11.5px", color: "#ef4444", background: "none", border: "none", cursor: "pointer", fontWeight: 600, padding: 0 }}
                        onClick={() => {
                          setSelectedPenaltyIds([]);
                          setTypeFormPenalty("");
                        }}
                      >
                        Bỏ chọn tất cả
                      </button>
                    )}
                  </div>
                </div>

                <p className="field-hint" style={{ marginBottom: "8px", fontSize: "12px", color: "#64748b" }}>
                  Bạn có thể tích chọn <strong>1 hoặc nhiều hình phạt</strong> từ danh mục bên dưới, hoặc tự nhập chỉnh sửa chi tiết:
                </p>

                {/* Penalties Picker Box */}
                <div className="penalties-picker-wrapper">
                  {/* Toolbar: Filter by severity & search */}
                  <div className="penalties-picker-toolbar">
                    <div className="penalties-filter-chips">
                      <button
                        type="button"
                        className={`penalty-chip-btn ${typeModalPenaltyFilter === "ALL" ? "active" : ""}`}
                        onClick={() => setTypeModalPenaltyFilter("ALL")}
                      >
                        Tất cả ({penalties.length})
                      </button>
                      <button
                        type="button"
                        className={`penalty-chip-btn ${typeModalPenaltyFilter === "1" ? "active" : ""}`}
                        onClick={() => setTypeModalPenaltyFilter("1")}
                      >
                        Mức 1
                      </button>
                      <button
                        type="button"
                        className={`penalty-chip-btn ${typeModalPenaltyFilter === "2" ? "active" : ""}`}
                        onClick={() => setTypeModalPenaltyFilter("2")}
                      >
                        Mức 2
                      </button>
                      <button
                        type="button"
                        className={`penalty-chip-btn ${typeModalPenaltyFilter === "3" ? "active" : ""}`}
                        onClick={() => setTypeModalPenaltyFilter("3")}
                      >
                        Mức 3
                      </button>
                      <button
                        type="button"
                        className={`penalty-chip-btn ${typeModalPenaltyFilter === "4" ? "active" : ""}`}
                        onClick={() => setTypeModalPenaltyFilter("4")}
                      >
                        Mức 4
                      </button>
                    </div>

                    <input
                      type="text"
                      placeholder="Tìm hình phạt..."
                      value={typeModalPenaltySearch}
                      onChange={(e) => setTypeModalPenaltySearch(e.target.value)}
                      style={{ fontSize: "11.5px", padding: "3px 8px", borderRadius: "4px", border: "1px solid #cbd5e1", maxWidth: "150px" }}
                    />
                  </div>

                  {/* Scrollable list of selectable penalties */}
                  <div className="penalties-picker-list">
                    {penalties
                      .filter((p) => {
                        const matchFilter = typeModalPenaltyFilter === "ALL" || String(p.severity) === typeModalPenaltyFilter;
                        const matchSearch =
                          !typeModalPenaltySearch ||
                          p.name.toLowerCase().includes(typeModalPenaltySearch.toLowerCase()) ||
                          p.code.toLowerCase().includes(typeModalPenaltySearch.toLowerCase());
                        return matchFilter && matchSearch;
                      })
                      .map((p) => {
                        const isSelected = selectedPenaltyIds.includes(p.id);
                        return (
                          <div
                            key={p.id}
                            className={`penalty-select-item ${isSelected ? "selected" : ""}`}
                            onClick={() => togglePenaltySelection(p)}
                          >
                            <input
                              type="checkbox"
                              checked={isSelected}
                              onChange={() => { }}
                              className="penalty-select-checkbox"
                            />
                            <div className="penalty-select-info">
                              <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                                <span className="code-pill font-mono" style={{ fontSize: "11px", padding: "1px 5px" }}>{p.code}</span>
                                <span className="penalty-select-name">{p.name}</span>
                              </div>
                              <div className="penalty-select-meta">
                                <span className={`severity-badge ${getSeverityBadgeClass(p.severity)}`} style={{ fontSize: "10.5px", padding: "1px 6px" }}>
                                  Mức {p.severity}
                                </span>
                                {p.defaultRestrictDays > 0 && (
                                  <span className="penalty-meta-restrict">
                                    Cấm mượn {p.defaultRestrictDays} ngày
                                  </span>
                                )}
                                {p.isCustom && (
                                  <span className="penalty-meta-custom">Tùy chỉnh</span>
                                )}
                              </div>
                            </div>
                          </div>
                        );
                      })}
                  </div>
                </div>

                {/* Combined text input */}
                <div style={{ marginTop: "8px" }}>
                  <label style={{ fontSize: "12px", fontWeight: 600, color: "#475569", display: "block", marginBottom: "4px" }}>
                    Nội dung hình phạt tổng hợp (có thể tự do chỉnh sửa hoặc bổ sung chi tiết):
                  </label>
                  <input
                    type="text"
                    placeholder="Nhập hoặc chỉnh sửa chi tiết hình thức xử lý / hình phạt gợi ý..."
                    value={typeFormPenalty}
                    onChange={(e) => setTypeFormPenalty(e.target.value)}
                    className="admin-input-text"
                    required
                  />
                </div>
              </div>

              <div className="admin-modal-footer">
                <button
                  type="button"
                  className="btn-modal-cancel"
                  onClick={() => setShowTypeModal(false)}
                >
                  Hủy
                </button>
                <button
                  type="submit"
                  className="btn-modal-submit"
                  disabled={submittingType}
                >
                  {submittingType ? "Đang lưu..." : "Lưu loại vi phạm"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ── MODAL 6: THÊM / SỬA HÌNH PHẠT & CHẾ TÀI ───────────────────────── */}
      {showPenaltyModal && (
        <div className="admin-modal-overlay">
          <div className="admin-modal-card modal-sm">
            <div className="admin-modal-header">
              <div className="modal-title-with-icon">
                <div className="modal-header-icon-wrap icon-amber">
                  <ScaleIcon size={20} />
                </div>
                <div>
                  <h3 className="admin-modal-title">
                    {editingPenaltyId ? "Chỉnh sửa hình phạt & chế tài" : "Thêm hình phạt & chế tài mới"}
                  </h3>
                  <p className="admin-modal-subtitle">
                    Định nghĩa chế tài và biện pháp xử lý vi phạm trong thư viện.
                  </p>
                </div>
              </div>
              <button
                type="button"
                className="admin-modal-close-btn"
                onClick={() => setShowPenaltyModal(false)}
              >
                <XIcon size={18} />
              </button>
            </div>

            <form onSubmit={handlePenaltySubmit} className="admin-modal-form">
              <div className="form-group">
                <label className="admin-field-label required">
                  Mã hình phạt
                </label>
                <input
                  type="text"
                  placeholder="VD: HP12"
                  value={penaltyFormCode}
                  onChange={(e) => setPenaltyFormCode(e.target.value)}
                  className="admin-input-text"
                  required
                />
              </div>

              <div className="form-group">
                <label className="admin-field-label required">
                  Tên hình phạt / Biện pháp xử lý
                </label>
                <input
                  type="text"
                  placeholder="VD: Cảnh cáo & Tạm giữ thẻ 3 ngày"
                  value={penaltyFormName}
                  onChange={(e) => setPenaltyFormName(e.target.value)}
                  className="admin-input-text"
                  required
                />
              </div>

              <div className="form-group">
                <label className="admin-field-label required">
                  Mức độ vi phạm áp dụng gợi ý
                </label>
                <select
                  value={penaltyFormSeverity}
                  onChange={(e) => setPenaltyFormSeverity(Number(e.target.value))}
                  className="admin-input-text"
                >
                  <option value={1}>Mức 1 - Nhẹ</option>
                  <option value={2}>Mức 2 - Vừa</option>
                  <option value={3}>Mức 3 - Nghiêm trọng</option>
                  <option value={4}>Mức 4 - Rất nghiêm trọng</option>
                </select>
              </div>

              <div className="form-group">
                <label className="admin-field-label required">
                  Số ngày cấm mượn phòng mặc định
                </label>
                <input
                  type="number"
                  min={0}
                  max={365}
                  value={penaltyFormRestrictDays}
                  onChange={(e) => setPenaltyFormRestrictDays(Number(e.target.value))}
                  className="admin-input-text"
                  required
                />
                <p className="field-hint" style={{ fontSize: "11.5px", color: "#64748b", marginTop: "3px" }}>
                  Nhập 0 nếu hình phạt không kèm lệnh cấm mượn phòng (VD: Nhắc nhở, Vệ sinh phòng).
                </p>
              </div>

              <div className="form-group">
                <label className="admin-field-label">Mô tả &amp; Hướng dẫn thi hành</label>
                <textarea
                  rows={2}
                  placeholder="Chi tiết cách áp dụng, quy trình thu nộp phạt hoặc báo cáo..."
                  value={penaltyFormDesc}
                  onChange={(e) => setPenaltyFormDesc(e.target.value)}
                  className="admin-textarea"
                />
              </div>

              <div className="admin-modal-footer">
                <button
                  type="button"
                  className="btn-modal-cancel"
                  onClick={() => setShowPenaltyModal(false)}
                >
                  Hủy
                </button>
                <button
                  type="submit"
                  className="btn-modal-submit"
                  disabled={submittingPenalty}
                >
                  {submittingPenalty ? "Đang lưu..." : editingPenaltyId ? "Lưu thay đổi" : "Thêm hình phạt"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ── Preview Attachment Modal (Lightbox) ──────────────── */}
      {previewAttachment && (
        <div
          className="admin-modal-overlay preview-attachment-overlay"
          onClick={() => setPreviewAttachment(null)}
        >
          <div
            className="preview-attachment-dialog"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="preview-dialog-header">
              <div className="preview-header-info">
                <FileTextIcon size={18} className="preview-header-icon" />
                <div>
                  <h4 className="preview-filename" title={previewAttachment.originalFileName}>
                    {previewAttachment.originalFileName}
                  </h4>
                  <span className="preview-filemeta">
                    {formatFileSize(previewAttachment.fileSize)} • Đăng tải: {formatDateTime24h(previewAttachment.createdAt)}
                  </span>
                </div>
              </div>
              <div className="preview-header-actions">
                <a
                  href={previewAttachment.viewUrl || getAttachmentViewUrl(previewAttachment.id)}
                  target="_blank"
                  rel="noreferrer"
                  className="btn-preview-action"
                  title="Mở trong tab trình duyệt mới"
                >
                  <ExternalLinkIcon size={14} /> Mở tab mới
                </a>
                <a
                  href={previewAttachment.downloadUrl || getAttachmentDownloadUrl(previewAttachment.id)}
                  download={previewAttachment.originalFileName}
                  className="btn-preview-action btn-preview-download"
                  title="Tải tệp về máy tính"
                >
                  <DownloadIcon size={14} /> Tải xuống
                </a>
                <button
                  type="button"
                  className="btn-preview-close"
                  onClick={() => setPreviewAttachment(null)}
                  title="Đóng xem trước"
                >
                  <XIcon size={18} />
                </button>
              </div>
            </div>

            <div className="preview-dialog-body">
              {isImageAttachment(previewAttachment.originalFileName, previewAttachment.contentType) ? (
                <div className="preview-image-container">
                  {!previewImageFailed ? (
                    <img
                      src={previewAttachment.viewUrl || getAttachmentViewUrl(previewAttachment.id)}
                      alt={previewAttachment.originalFileName}
                      className="preview-full-image"
                      onError={() => setPreviewImageFailed(true)}
                    />
                  ) : (
                    <div className="preview-generic-box">
                      <FileTextIcon size={48} className="text-muted" />
                      <p className="preview-generic-name">{previewAttachment.originalFileName}</p>
                      <p className="preview-generic-hint">
                        Không thể hiển thị bản xem trước ảnh. Vui lòng nhấn nút bên dưới để tải tệp về máy tính hoặc mở trong tab mới.
                      </p>
                      <a
                        href={previewAttachment.downloadUrl || getAttachmentDownloadUrl(previewAttachment.id)}
                        download={previewAttachment.originalFileName}
                        className="btn-primary-download"
                      >
                        <DownloadIcon size={16} /> Tải tệp về máy
                      </a>
                    </div>
                  )}
                </div>
              ) : isPdfAttachment(previewAttachment.originalFileName, previewAttachment.contentType) ? (
                <iframe
                  src={previewAttachment.viewUrl || getAttachmentViewUrl(previewAttachment.id)}
                  title={previewAttachment.originalFileName}
                  className="preview-pdf-iframe"
                />
              ) : (
                <div className="preview-generic-box">
                  <FileTextIcon size={48} className="text-muted" />
                  <p className="preview-generic-name">{previewAttachment.originalFileName}</p>
                  <p className="preview-generic-hint">
                    Tệp tài liệu văn bản không hỗ trợ xem trực tiếp trên trình duyệt. Vui lòng tải về máy để mở.
                  </p>
                  <a
                    href={previewAttachment.downloadUrl || getAttachmentDownloadUrl(previewAttachment.id)}
                    download={previewAttachment.originalFileName}
                    className="btn-primary-download"
                  >
                    <DownloadIcon size={16} /> Tải tệp về máy
                  </a>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
