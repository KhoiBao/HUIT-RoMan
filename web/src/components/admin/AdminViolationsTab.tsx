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
} from "../Icon";
import { useConfirm } from "../../context/ConfirmContext";
import { useAuth } from "../../auth/AuthContext";

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

export default function AdminViolationsTab({
  onNotify,
  initialSessionForViolation,
  onClearInitialSession,
}: Props) {
  const { user } = useAuth();
  const isAdmin = user?.role === "Admin" || user?.role === "quan-tri" || user?.role === "Quản trị viên";
  const { confirm } = useConfirm();
  // Navigation Sub-tabs: 'records' | 'restrictions' | 'types'
  const [activeSubTab, setActiveSubTab] = useState<
    "records" | "restrictions" | "types"
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

  // Filters for Records
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedTypeFilter, setSelectedTypeFilter] = useState<string>("ALL");
  const [selectedSeverityFilter, setSelectedSeverityFilter] =
    useState<string>("ALL");
  const [selectedStatusFilter, setSelectedStatusFilter] =
    useState<string>("ALL");

  // Filters for Restrictions
  const [restrictionSearch, setRestrictionSearch] = useState("");
  const [restrictionStatusFilter, setRestrictionStatusFilter] =
    useState<string>("ACTIVE");

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

  // Filtered Violations list
  const filteredViolations = useMemo(() => {
    return violations.filter((v) => {
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
  }, [
    violations,
    selectedTypeFilter,
    selectedSeverityFilter,
    selectedStatusFilter,
    searchTerm,
  ]);

  // Filtered Restrictions list
  const filteredRestrictions = useMemo(() => {
    return restrictions.filter((r) => {
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
  }, [restrictions, restrictionStatusFilter, restrictionSearch]);

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
      alert("Vui lòng chọn người vi phạm!");
      return;
    }
    if (!formViolationTypeId) {
      alert("Vui lòng chọn loại vi phạm!");
      return;
    }
    if (!formDescription.trim()) {
      alert("Vui lòng nhập mô tả chi tiết sự việc vi phạm!");
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
      alert("Vui lòng chọn người dùng cần áp dụng hạn chế!");
      return;
    }
    if (!restrReason.trim()) {
      alert("Vui lòng nhập lý do cấm mượn phòng!");
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
      alert("Vui lòng nhập tên loại vi phạm!");
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
          alert("Vui lòng nhập mã loại vi phạm (VD: VT07)!");
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
    setTypeFormPenalty("");
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
        return "status-badge-pending";
      case "Đã xử lý":
        return "status-badge-approved";
      case "Đã nộp phạt":
        return "status-badge-completed";
      case "Hủy bỏ":
        return "status-badge-cancelled";
      default:
        return "status-badge-default";
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
            </div>
          </div>

          {/* Table */}
          <div className="table-responsive-wrapper">
            <table className="admin-custom-table has-actions">
              <thead>
                <tr>
                  <th style={{ width: "120px" }}>Mã biên bản</th>
                  <th>Người vi phạm</th>
                  <th>Loại vi phạm</th>
                  <th>Thời điểm vi phạm</th>
                  <th style={{ width: "130px" }}>Mức độ</th>
                  <th>Hình thức xử lý / Phạt</th>
                  <th style={{ width: "120px" }}>Trạng thái</th>
                  <th style={{ width: "140px", textAlign: "right" }}>Thao tác</th>
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
                  filteredViolations.map((v) => (
                    <tr key={v.id}>
                      <td>
                        <span className="code-pill">{v.code}</span>
                        {v.roomCode && (
                          <span className="room-ref-badge" title="Phòng liên quan">
                            <DoorIcon size={12} /> {v.roomCode}
                          </span>
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
                          className={`status-pill ${getStatusBadgeClass(
                            v.status
                          )}`}
                        >
                          {v.status}
                        </span>
                      </td>
                      <td style={{ textAlign: "right" }}>
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
                  <th style={{ width: "120px" }}>Trạng thái</th>
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
                  filteredRestrictions.map((r) => (
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
                          className={`status-pill ${
                            r.isActive
                              ? "status-badge-cancelled"
                              : r.status === "Đã gỡ"
                              ? "status-badge-approved"
                              : "status-badge-default"
                          }`}
                        >
                          {r.isActive ? "Đang hiệu lực" : r.status}
                        </span>
                      </td>
                      <td style={{ textAlign: "right" }}>
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
        </div>
      )}

      {/* ── SUB-TAB 3: VIOLATION TYPES ──────────────────────────────────── */}
      {activeSubTab === "types" && (
        <div className="violations-content-card">
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
                {violationTypes.map((vt) => (
                  <tr key={vt.id}>
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
                    <td style={{ textAlign: "right" }}>
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
                ))}
              </tbody>
            </table>
          </div>
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
                  onChange={(e) => setTypeFormSeverity(Number(e.target.value))}
                  className="admin-input-text"
                >
                  <option value={1}>Mức 1 - Nhẹ</option>
                  <option value={2}>Mức 2 - Vừa</option>
                  <option value={3}>Mức 3 - Nghiêm trọng</option>
                  <option value={4}>Mức 4 - Rất nghiêm trọng</option>
                </select>
              </div>

              <div className="form-group">
                <label className="admin-field-label">
                  Hình thức xử phạt mặc định gợi ý
                </label>
                <input
                  type="text"
                  placeholder="VD: Cảnh cáo lần đầu / Cấm mượn 3 ngày"
                  value={typeFormPenalty}
                  onChange={(e) => setTypeFormPenalty(e.target.value)}
                  className="admin-input-text"
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
