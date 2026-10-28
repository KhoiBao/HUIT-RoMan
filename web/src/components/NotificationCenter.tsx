import { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  BellRingIcon,
  CheckCircleIcon,
  AlertTriangleIcon,
  ClockIcon,
  InfoIcon,
  CheckIcon,
  TrashIcon,
} from "./Icon";
import {
  fetchNotifications,
  fetchUnreadCount,
  markNotificationAsRead,
  markAllNotificationsAsRead,
  deleteNotification,
  formatRelativeTime,
  type NotificationItem,
} from "../lib/notifications";

export default function NotificationCenter() {
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);
  const [notifications, setNotifications] = useState<NotificationItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [activeTab, setActiveTab] = useState<"all" | "unread">("all");
  const popoverRef = useRef<HTMLDivElement>(null);

  // Lấy unread count định kỳ (30 giây/lần)
  useEffect(() => {
    let mounted = true;
    const checkCount = async () => {
      try {
        const count = await fetchUnreadCount();
        if (mounted) setUnreadCount(count);
      } catch {
        // Bỏ qua lỗi mạng nền
      }
    };

    checkCount();
    const timer = setInterval(checkCount, 30000);
    return () => {
      mounted = false;
      clearInterval(timer);
    };
  }, []);

  // Tải danh sách thông báo khi mở popover hoặc chuyển tab
  useEffect(() => {
    if (!open) return;
    let mounted = true;

    const loadData = async () => {
      setLoading(true);
      try {
        const isReadFilter = activeTab === "unread" ? false : undefined;
        const res = await fetchNotifications(1, 30, isReadFilter);
        if (mounted) {
          setNotifications(res.items || []);
          setUnreadCount(res.unreadCount);
        }
      } catch (err) {
        console.error("Lỗi khi tải thông báo:", err);
      } finally {
        if (mounted) setLoading(false);
      }
    };

    loadData();
    return () => {
      mounted = false;
    };
  }, [open, activeTab]);

  // Đóng khi click ngoài hoặc bấm Escape
  useEffect(() => {
    if (!open) return;

    const handleClickOutside = (e: MouseEvent) => {
      if (popoverRef.current && !popoverRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        setOpen(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    document.addEventListener("keydown", handleKeyDown);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [open]);

  // Đánh dấu đã đọc 1 thông báo
  const handleMarkAsRead = async (item: NotificationItem, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    if (item.isRead) return;

    try {
      await markNotificationAsRead(item.id);
      setNotifications((prev) =>
        prev.map((n) => (n.id === item.id ? { ...n, isRead: true } : n))
      );
      setUnreadCount((c) => Math.max(0, c - 1));
    } catch (err) {
      console.error("Lỗi đánh dấu đã đọc:", err);
    }
  };

  // Đánh dấu tất cả đã đọc
  const handleMarkAllAsRead = async () => {
    try {
      await markAllNotificationsAsRead();
      setNotifications((prev) => prev.map((n) => ({ ...n, isRead: true })));
      setUnreadCount(0);
    } catch (err) {
      console.error("Lỗi đánh dấu tất cả đã đọc:", err);
    }
  };

  // Xóa thông báo
  const handleDelete = async (id: number, e: React.MouseEvent) => {
    e.stopPropagation();
    try {
      await deleteNotification(id);
      const target = notifications.find((n) => n.id === id);
      if (target && !target.isRead) {
        setUnreadCount((c) => Math.max(0, c - 1));
      }
      setNotifications((prev) => prev.filter((n) => n.id !== id));
    } catch (err) {
      console.error("Lỗi xóa thông báo:", err);
    }
  };

  // Click vào thông báo
  const handleNotificationClick = async (item: NotificationItem) => {
    await handleMarkAsRead(item);
    setOpen(false);

    // Chuyển hướng tới trang đặt phòng cá nhân nếu là thông báo đơn đặt hoặc nhắc lịch
    if (item.type === 1 || item.type === 2 || item.type === 3) {
      navigate("/dat-phong?tab=my-bookings");
    }
  };

  // Chọn icon tương ứng theo loại thông báo
  const renderIcon = (type: number, title: string) => {
    const isRejectOrCancel =
      title.toLowerCase().includes("từ chối") ||
      title.toLowerCase().includes("hủy");

    if (type === 1) {
      if (isRejectOrCancel) {
        return (
          <span className="roman-notif-icon is-danger">
            <AlertTriangleIcon size={16} />
          </span>
        );
      }
      return (
        <span className="roman-notif-icon is-success">
          <CheckCircleIcon size={16} />
        </span>
      );
    }

    if (type === 2) {
      // Nhắc giờ nhận phòng
      return (
        <span className="roman-notif-icon is-info">
          <ClockIcon size={16} />
        </span>
      );
    }

    if (type === 3) {
      // Nhắc sắp hết giờ trả phòng
      return (
        <span className="roman-notif-icon is-warning">
          <AlertTriangleIcon size={16} />
        </span>
      );
    }

    if (type === 4) {
      // Vi phạm
      return (
        <span className="roman-notif-icon is-danger">
          <AlertTriangleIcon size={16} />
        </span>
      );
    }

    return (
      <span className="roman-notif-icon is-general">
        <InfoIcon size={16} />
      </span>
    );
  };

  return (
    <div className="roman-notif-wrapper" ref={popoverRef}>
      <button
        type="button"
        className={`roman-icon-btn roman-notif-trigger${open ? " is-active" : ""}`}
        onClick={() => setOpen((prev) => !prev)}
        title="Trung tâm thông báo"
        aria-label="Trung tâm thông báo"
        aria-expanded={open}
      >
        <BellRingIcon size={18} />
        {unreadCount > 0 && (
          <span className="roman-notif-badge">
            {unreadCount > 99 ? "99+" : unreadCount}
          </span>
        )}
      </button>

      {open && (
        <div className="roman-notif-popover">
          {/* Header */}
          <div className="roman-notif-header">
            <div className="roman-notif-title-row">
              <h3 className="roman-notif-title">
                Thông báo
                {unreadCount > 0 && (
                  <span className="roman-notif-unread-pill">
                    {unreadCount} mới
                  </span>
                )}
              </h3>
              {unreadCount > 0 && (
                <button
                  type="button"
                  className="roman-notif-readall-btn"
                  onClick={handleMarkAllAsRead}
                  title="Đánh dấu tất cả đã đọc"
                >
                  <CheckIcon size={14} />
                  Đã đọc tất cả
                </button>
              )}
            </div>

            {/* Filter Tabs */}
            <div className="roman-notif-tabs">
              <button
                type="button"
                className={`roman-notif-tab${activeTab === "all" ? " is-active" : ""}`}
                onClick={() => setActiveTab("all")}
              >
                Tất cả
              </button>
              <button
                type="button"
                className={`roman-notif-tab${activeTab === "unread" ? " is-active" : ""}`}
                onClick={() => setActiveTab("unread")}
              >
                Chưa đọc
                {unreadCount > 0 && ` (${unreadCount})`}
              </button>
            </div>
          </div>

          {/* List Content */}
          <div className="roman-notif-list">
            {loading ? (
              <div className="roman-notif-loading">
                <span className="roman-notif-spinner" />
                <p>Đang tải thông báo...</p>
              </div>
            ) : notifications.length === 0 ? (
              <div className="roman-notif-empty">
                <span className="roman-notif-empty-icon">
                  <BellRingIcon size={32} />
                </span>
                <p className="roman-notif-empty-text">
                  {activeTab === "unread"
                    ? "Bạn không có thông báo chưa đọc nào."
                    : "Chưa có thông báo nào."}
                </p>
              </div>
            ) : (
              notifications.map((item) => (
                <div
                  key={item.id}
                  className={`roman-notif-item${!item.isRead ? " is-unread" : ""}`}
                  onClick={() => handleNotificationClick(item)}
                  role="button"
                  tabIndex={0}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" || e.key === " ") {
                      handleNotificationClick(item);
                    }
                  }}
                >
                  {renderIcon(item.type, item.title)}

                  <div className="roman-notif-body">
                    <div className="roman-notif-item-top">
                      <span className="roman-notif-item-title">{item.title}</span>
                      {!item.isRead && <span className="roman-notif-dot" />}
                    </div>
                    <p className="roman-notif-item-content">{item.content}</p>
                    <span className="roman-notif-item-time">
                      {formatRelativeTime(item.sentAt || item.createdAt)}
                    </span>
                  </div>

                  <div className="roman-notif-item-actions">
                    {!item.isRead && (
                      <button
                        type="button"
                        className="roman-notif-action-btn"
                        onClick={(e) => handleMarkAsRead(item, e)}
                        title="Đánh dấu đã đọc"
                      >
                        <CheckIcon size={14} />
                      </button>
                    )}
                    <button
                      type="button"
                      className="roman-notif-action-btn is-delete"
                      onClick={(e) => handleDelete(item.id, e)}
                      title="Xóa thông báo"
                    >
                      <TrashIcon size={13} />
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>

          {/* Footer */}
          {notifications.length > 0 && (
            <div className="roman-notif-footer">
              <button
                type="button"
                className="roman-notif-view-bookings-link"
                onClick={() => {
                  setOpen(false);
                  navigate("/dat-phong?tab=my-bookings");
                }}
              >
                Xem danh sách phòng đã đăng ký →
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
