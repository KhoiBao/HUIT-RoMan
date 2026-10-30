import React, { useRef, useState, useEffect } from "react";
import {
  fetchApprovalHistoryApi,
  type ApprovalHistoryItem,
} from "../lib/booking";
import { ClipboardListIcon, UsersIcon } from "./Icon";

interface ApprovalHistoryModalProps {
  isOpen: boolean;
  bookingId?: number;
  activityName?: string;
  onClose: () => void;
}

function formatDateTime(isoString: string): string {
  try {
    const d = new Date(isoString);
    return d.toLocaleString("vi-VN", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  } catch {
    return isoString;
  }
}

function getStatusBadgeClass(statusName: string): string {
  switch (statusName) {
    case "Đã duyệt":
      return "status-approved";
    case "Từ chối":
      return "status-rejected";
    case "Duyệt một phần":
      return "status-partial";
    case "Đã hủy bởi quản trị":
      return "status-cancelled";
    default:
      return "status-default";
  }
}

export const ApprovalHistoryModal: React.FC<ApprovalHistoryModalProps> = ({
  isOpen,
  bookingId,
  activityName,
  onClose,
}) => {
  const [histories, setHistories] = useState<ApprovalHistoryItem[]>([]);
  const [loading, setLoading] = useState<boolean>(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const closeBtnRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (!isOpen) return;
    closeBtnRef.current?.focus();
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [isOpen, onClose]);

  useEffect(() => {
    if (!isOpen || !bookingId) return;

    let active = true;
    setLoading(true);
    setErrorMsg(null);

    fetchApprovalHistoryApi(bookingId)
      .then((items) => {
        if (!active) return;
        setHistories(items);
      })
      .catch((err: unknown) => {
        if (!active) return;
        const msg =
          err && typeof err === "object" && "response" in err
            ? (err as { response?: { data?: { message?: string } } }).response?.data?.message
            : "Không thể tải lịch sử duyệt.";
        setErrorMsg(msg || "Không thể tải lịch sử duyệt.");
      })
      .finally(() => {
        if (active) setLoading(false);
      });

    return () => {
      active = false;
    };
  }, [isOpen, bookingId]);

  if (!isOpen) return null;

  return (
    <div className="roman-modal-backdrop" onClick={onClose} role="presentation">
      <div
        className="roman-modal-content history-modal-container"
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
        aria-labelledby="approval-history-title"
      >
        <div className="history-modal-header">
          <div>
            <h3 className="history-modal-title" id="approval-history-title">
              Lịch sử duyệt đơn
            </h3>
            <p className="history-modal-subtitle">
              Đơn đặt #{bookingId} {activityName ? `• ${activityName}` : ""}
            </p>
          </div>
          <button
            type="button"
            className="history-modal-close-btn"
            onClick={onClose}
            aria-label="Đóng lịch sử duyệt"
            ref={closeBtnRef}
          >
            &times;
          </button>
        </div>

        <div className="history-modal-body">
          {loading && (
            <div className="history-modal-loading">
              <span className="history-spinner" /> Đang tải lịch sử duyệt...
            </div>
          )}

          {errorMsg && <div className="history-alert error">{errorMsg}</div>}

          {!loading && !errorMsg && histories.length === 0 && (
            <div className="history-empty-state">
              <div className="history-empty-icon" aria-hidden="true">
                <ClipboardListIcon size={26} />
              </div>
              <p>Chưa có lịch sử duyệt nào cho đơn đặt phòng này.</p>
              <small>Hệ thống tự động ghi nhận khi cán bộ quản trị hoặc nhân sự xử lý đơn.</small>
            </div>
          )}

          {!loading && histories.length > 0 && (
            <div className="history-timeline">
              {histories.map((h, idx) => (
                <div key={h.id || idx} className="history-timeline-item">
                  <div className="history-marker" />
                  <div className="history-card">
                    <div className="history-card-top">
                      <span className={`history-badge ${getStatusBadgeClass(h.statusName)}`}>
                        {h.statusName}
                      </span>
                      <time className="history-time" dateTime={h.decidedAt}>
                        {formatDateTime(h.decidedAt)}
                      </time>
                    </div>

                    <div className="history-actor">
                      <span className="history-actor-name">
                        <UsersIcon size={13} />{" "}
                        {h.actorName || h.employeeName || "Không xác định"}
                      </span>
                      {h.employeeCode && (
                        <span className="history-actor-code">({h.employeeCode})</span>
                      )}
                      {h.employeePosition && (
                        <span className="history-actor-pos">• {h.employeePosition}</span>
                      )}
                      {h.approvalMode === "AUTO" && (
                        <span className="history-actor-mode">Tự động</span>
                      )}
                    </div>

                    {h.comment && (
                      <div className="history-comment">
                        <span className="history-comment-label">Ghi chú:</span> {h.comment}
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="history-modal-footer">
          <button type="button" className="roman-btn roman-btn-secondary" onClick={onClose}>
            Đóng
          </button>
        </div>
      </div>
    </div>
  );
};

