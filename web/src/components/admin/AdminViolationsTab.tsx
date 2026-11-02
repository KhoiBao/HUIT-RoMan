import { useState, useEffect, useMemo, type FormEvent } from "react";
import {
  fetchViolations,
  fetchViolationTypes,
  fetchRestrictions,
  fetchViolationStats,
  recordViolation,
  updateViolation,
  deleteViolation,
  createViolationType,
  updateViolationType,
  deleteViolationType,
  liftRestriction,
  createRestriction,
  type ViolationRecordItem,
  type ViolationTypeItem,
  type UserRestrictionItem,
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
} from "../Icon";
import { getAllReminders, type SessionReminderItem } from "../../lib/reminders";
import { useConfirm } from "../../context/ConfirmContext";
import { useAuth } from "../../auth/AuthContext";
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

export default function AdminViolationsTab({
  onNotify,
  initialSessionForViolation,
  onClearInitialSession,
}: Props) {
  const { user } = useAuth();
  const isAdmin = user?.role === "Admin" || user?.role === "quan-tri" || user?.role === "Quản trị viên";
  const { confirm, alert } = useConfirm();
  // Navigation Sub-tabs: 'records' | 'restrictions' | 'reminders' | 'types'
  const [activeSubTab, setActiveSubTab] = useState<
    "records" | "restrictions" | "reminders" | "types"
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

  const refreshReminders = () => {
    setReminders(getAllReminders());
  };

  useEffect(() => {
    refreshReminders();
  }, []);

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
  const [formStatus, setFormStatus] = useState<string>("Chờ xử lý");
  const [submittingRecord, setSubmittingRecord] = useState(false);

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
      const [vList, tList, rList, sData] = await Promise.all([
        fetchViolations(),
        fetchViolationTypes(),
        fetchRestrictions(),
        fetchViolationStats(),
      ]);
      setViolations(vList);
      setViolationTypes(tList);
      setRestrictions(rList);
      setStats(sData);

      if (tList.length > 0 && formViolationTypeId === 0) {
        setFormViolationTypeId(tList[0].id);
        setFormSeverity(tList[0].severity);
        setFormPenaltyApplied(tList[0].defaultPenalty || "");
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
    loadUsers();
  }, []);

  // Handle incoming session if pre-selected from UsageSessions tab
  useEffect(() => {
    if (initialSessionForViolation) {
      setFormUserId(initialSessionForViolation.userId);
      setFormUsageSessionId(String(initialSessionForViolation.sessionId));
      setFormDescription(
        `Ghi nhận vi phạm tại phòng ${initialSessionForViolation.roomCode} (${initialSessionForViolation.roomName}) trong phiên sử dụng #${initialSessionForViolation.sessionId}.`
      );
      setShowRecordModal(true);
      if (onClearInitialSession) onClearInitialSession();
    }
  }, [initialSessionForViolation]);

  // When changing violation type in form, auto-suggest severity and penalty
  const handleTypeChange = (typeId: number) => {
    setFormViolationTypeId(typeId);
    const vt = violationTypes.find((t) => t.id === typeId);
    if (vt) {
      setFormSeverity(vt.severity);
      setFormPenaltyApplied(vt.defaultPenalty || "");
      if (vt.severity >= 3) {
        setFormRestrictDays(14);
      } else if (vt.severity === 2) {
        setFormRestrictDays(3);
      } else {
        setFormRestrictDays(0);
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
      if (
        selectedStatusFilter !== "ALL" &&
        v.status.toLowerCase() !== selectedStatusFilter.toLowerCase()
      )
        return false;
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
      await recordViolation({
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

      onNotify(
        `Ghi nhận biên bản vi phạm thành công! ${
          formRestrictDays > 0
            ? `Đã tự động áp dụng lệnh cấm mượn phòng ${formRestrictDays} ngày.`
            : ""
        }`,
        "success"
      );
      setShowRecordModal(false);
      resetRecordForm();
      loadAllData();
    } catch (err: any) {
      console.error("Failed to record violation:", err);
      onNotify(
        err.response?.data?.message || "Không thể lưu biên bản vi phạm.",
        "warning"
      );
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
    setFormStatus("Chờ xử lý");
    if (violationTypes.length > 0) {
      setFormViolationTypeId(violationTypes[0].id);
      setFormSeverity(violationTypes[0].severity);
      setFormPenaltyApplied(violationTypes[0].defaultPenalty || "");
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
    setTypeFormPenalty("Nhắc nhở / Cảnh cáo lần đầu");
    setShowTypeModal(true);
  };

  const openEditTypeModal = (vt: ViolationTypeItem) => {
    setEditingTypeId(vt.id);
    setTypeFormCode(vt.code);
    setTypeFormName(vt.name);
    setTypeFormDesc(vt.description || "");
    setTypeFormSeverity(vt.severity);
    setTypeFormPenalty(vt.defaultPenalty || "");
    setShowTypeModal(true);
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
      {/* ── 1. Top Hero Stat Cards ─────────────────────────────────────── */}
      <div className="admin-kpi-grid">
        <div className="kpi-card kpi-card-total">
          <div className="kpi-icon-wrap icon-blue">
            <AlertTriangleIcon size={24} />
          </div>
          <div className="kpi-info">
            <span className="kpi-label">Tổng biên bản vi phạm</span>
            <strong className="kpi-value">{stats.totalRecords}</strong>
            <span className="kpi-subtext">Đã ghi nhận toàn hệ thống</span>
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
            className={`subtab-btn ${
              activeSubTab === "records" ? "active" : ""
            }`}
            onClick={() => setActiveSubTab("records")}
          >
            <AlertTriangleIcon size={16} />
            <span>Danh sách Biên bản vi phạm</span>
            <span className="subtab-count">{violations.length}</span>
          </button>

          <button
            type="button"
            className={`subtab-btn ${
              activeSubTab === "restrictions" ? "active" : ""
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
            className={`subtab-btn ${
              activeSubTab === "reminders" ? "active" : ""
            }`}
            onClick={() => setActiveSubTab("reminders")}
          >
            <BellRingIcon size={16} />
            <span>Theo dõi Nhắc nhở (Quy tắc 3 lần)</span>
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
                  <option value="Chờ xử lý">Chờ xử lý</option>
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
                  <th style={{ width: "130px", textAlign: "right", whiteSpace: "nowrap" }}>Thao tác</th>
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
                        {(v.description.includes("VƯỢT QUÁ 3 LẦN NHẮC NHỞ") ||
                          v.description.includes("quá 3 lần nhắc nhở")) && (
                          <div style={{ marginTop: "4px" }}>
                            <span
                              className="reminder-escalated-pill"
                              title="Biên bản sinh tự động do quá 3 lần nhắc nhở"
                            >
                              <MegaphoneIcon size={12} className="inline-block" style={{ marginRight: "3px" }} /> Quá 3 lần nhắc
                            </span>
                          </div>
                        )}
                      </td>
                      <td>
                        <div className="user-info-cell">
                          <strong className="user-name">{v.userFullName}</strong>
                          <span className="user-sub">
                            {v.userCardCode} • {v.departmentName || v.userEmail}
                          </span>
                          {v.isRestricted && (
                            <span className="restricted-badge">
                              <BanIcon size={11} /> Cấm mượn{" "}
                              {v.restrictDays > 0 ? `(${v.restrictDays} ngày)` : ""}
                            </span>
                          )}
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
                          {new Date(v.incidentTime).toLocaleDateString("vi-VN", {
                            day: "2-digit",
                            month: "2-digit",
                            year: "numeric",
                          })}{" "}
                          •{" "}
                          {new Date(v.incidentTime).toLocaleTimeString("vi-VN", {
                            hour: "2-digit",
                            minute: "2-digit",
                          })}
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
                        <div className="table-actions-inline">
                          <button
                            type="button"
                            className="btn-table-action btn-action-view"
                            onClick={() => openDetailModal(v)}
                            title="Xem chi tiết & Cập nhật tiến độ xử lý"
                          >
                            Xử lý
                          </button>
                          {isAdmin && (
                            <button
                              type="button"
                              className="btn-table-action btn-action-delete"
                              onClick={() => handleDeleteViolation(v)}
                              title="Xóa biên bản này"
                              aria-label={`Xóa biên bản ${v.code}`}
                            >
                              <XIcon size={14} />
                            </button>
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
                  <th style={{ width: "130px", textAlign: "right" }}>Thao tác</th>
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
                          className={`admin-status-pill ${
                            r.isActive
                              ? "pill-cancelled"
                              : r.status === "Đã gỡ"
                              ? "pill-approved"
                              : "pill-pending"
                          }`}
                        >
                          {r.isActive ? "Đang hiệu lực" : r.status}
                        </span>
                      </td>
                      <td style={{ textAlign: "right", whiteSpace: "nowrap" }}>
                        {r.isActive && (
                          <button
                            type="button"
                            className="btn-table-action btn-action-lift"
                            onClick={() => {
                              setLiftTarget(r);
                              setLiftReason("");
                            }}
                            title="Gỡ bỏ lệnh cấm mượn phòng trước hạn cho người dùng này"
                          >
                            Gỡ cấm sớm
                          </button>
                        )}
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
              gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))",
              gap: "14px",
              marginBottom: "18px",
            }}
          >
            <div className="kpi-mini-card">
              <span className="kpi-label">Tổng số lượt nhắc nhở</span>
              <strong className="kpi-value color-blue">{reminders.length}</strong>
              <span className="kpi-subtext">Đã ghi nhận trên hệ thống</span>
            </div>

            <div className="kpi-mini-card">
              <span className="kpi-label">Mức 1 - 2 (Nhắc nhẹ &amp; Cảnh cáo)</span>
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
              <span className="kpi-label">Mức 3 (Cảnh báo tối đa 3/3)</span>
              <strong
                className="kpi-value color-amber"
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
              <span className="kpi-label">Quá 3 lần (Đã lập biên bản)</span>
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
                          {new Date(r.remindedAt).toLocaleTimeString("vi-VN", {
                            hour: "2-digit",
                            minute: "2-digit",
                          })}
                        </div>
                        <div>
                          {new Date(r.remindedAt).toLocaleDateString("vi-VN")}
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
                  <th style={{ width: "120px", textAlign: "right" }}>Thao tác</th>
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
                    <td onClick={(e) => e.stopPropagation()} style={{ textAlign: "right" }}>
                      <div className="table-actions-inline">
                        <button
                          type="button"
                          className="btn-table-action btn-action-edit"
                          onClick={() => openEditTypeModal(vt)}
                        >
                          Sửa
                        </button>
                        {isAdmin && (
                          <button
                            type="button"
                            className="btn-table-action btn-action-delete"
                            onClick={() => handleDeleteType(vt)}
                            title="Xóa quy chế vi phạm"
                          >
                            <XIcon size={14} />
                          </button>
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
                          className={`user-picker-item ${
                            formUserId === u.id ? "selected" : ""
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
                    onChange={(e) => setFormSeverity(Number(e.target.value))}
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
                    Mã phiên sử dụng liên quan (Tùy chọn)
                  </label>
                  <input
                    type="number"
                    placeholder="VD: 5"
                    value={formUsageSessionId}
                    onChange={(e) => setFormUsageSessionId(e.target.value)}
                    className="admin-input-text"
                  />
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

                {/* Initial Status */}
                <div className="form-group">
                  <label className="admin-field-label">Trạng thái xử lý ban đầu</label>
                  <select
                    value={formStatus}
                    onChange={(e) => setFormStatus(e.target.value)}
                    className="admin-input-text"
                  >
                    <option value="Chờ xử lý">Chờ xử lý (Chưa thi hành phạt)</option>
                    <option value="Đã xử lý">Đã xử lý (Đã nhắc nhở / cam kết)</option>
                    <option value="Đã nộp phạt">Đã nộp phạt / Đã bồi thường</option>
                  </select>
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
                        className={`day-pill-btn ${
                          formRestrictDays === d ? "active" : ""
                        }`}
                        onClick={() => setFormRestrictDays(d)}
                      >
                        {d === 0 ? "Không cấm" : `Cấm ${d} ngày`}
                      </button>
                    ))}
                  </div>
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
                    {new Date(selectedRecord.incidentTime).toLocaleString("vi-VN")}
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
                <label className="admin-field-label required">
                  Hình phạt / Xử lý gợi ý
                </label>
                <p className="field-hint" style={{ marginBottom: "6px", fontSize: "12px", color: "#64748b" }}>
                  Chọn từ danh mục hình phạt gợi ý chuẩn theo quy chế hoặc nhập chỉnh sửa chi tiết:
                </p>

                {/* Dropdown danh mục hình phạt gợi ý chuẩn */}
                <select
                  value={
                    SUGGESTED_PENALTIES.flatMap((g) => g.items).includes(typeFormPenalty)
                      ? typeFormPenalty
                      : typeFormPenalty ? "__CUSTOM__" : ""
                  }
                  onChange={(e) => {
                    const val = e.target.value;
                    if (val && val !== "__CUSTOM__") {
                      setTypeFormPenalty(val);
                    }
                  }}
                  className="admin-input-text"
                  style={{ marginBottom: "8px" }}
                >
                  <option value="">-- Chọn hình phạt gợi ý có sẵn --</option>
                  {SUGGESTED_PENALTIES.map((group) => (
                    <optgroup key={group.category} label={`── ${group.category} ──`}>
                      {group.items.map((item) => (
                        <option key={item} value={item}>
                          {item}
                        </option>
                      ))}
                    </optgroup>
                  ))}
                  <option value="__CUSTOM__">-- Nhập tùy chỉnh khác... --</option>
                </select>

                {/* Quick Chips bấm chọn nhanh */}
                <div
                  style={{
                    display: "flex",
                    flexWrap: "wrap",
                    gap: "6px",
                    marginBottom: "8px",
                  }}
                >
                  {QUICK_PENALTY_PILLS.map((pill) => {
                    const isSelected = typeFormPenalty === pill;
                    return (
                      <button
                        key={pill}
                        type="button"
                        style={{
                          fontSize: "11.5px",
                          padding: "3px 8px",
                          borderRadius: "6px",
                          border: isSelected ? "1px solid #0284c7" : "1px solid #cbd5e1",
                          backgroundColor: isSelected ? "#e0f2fe" : "#f8fafc",
                          color: isSelected ? "#0369a1" : "#475569",
                          cursor: "pointer",
                          fontWeight: isSelected ? 700 : 400,
                          transition: "all 0.15s ease",
                        }}
                        onClick={() => setTypeFormPenalty(pill)}
                      >
                        {pill}
                      </button>
                    );
                  })}
                </div>

                {/* Input text để chỉnh sửa hoặc nhập tự do */}
                <input
                  type="text"
                  placeholder="Nhập hoặc chỉnh sửa chi tiết hình thức xử lý / hình phạt gợi ý..."
                  value={typeFormPenalty}
                  onChange={(e) => setTypeFormPenalty(e.target.value)}
                  className="admin-input-text"
                  required
                />
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
    </div>
  );
}
