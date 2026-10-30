import { useEffect, useState } from "react";
import { ClockIcon, RefreshCwIcon, AlertTriangleIcon } from "../Icon";
import {
  WEEKDAY_LABELS,
  WEEK_DISPLAY_ORDER,
  fetchLibraryWorkingHours,
  updateLibraryWorkingHours,
  type WorkingHourDay,
} from "../../lib/workingHours";

interface Props {
  onNotify: (msg: string, type?: "success" | "warning" | "info") => void;
}

export default function AdminWorkingHoursTab({ onNotify }: Props) {
  const [days, setDays] = useState<WorkingHourDay[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const load = async () => {
    try {
      setLoading(true);
      const data = await fetchLibraryWorkingHours();
      setDays(data);
    } catch {
      onNotify("Không thể tải giờ phục vụ của Thư viện.", "warning");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void load();
  }, []);

  const patchDay = (dayOfWeek: number, patch: Partial<WorkingHourDay>) => {
    setDays((prev) =>
      prev.map((day) =>
        day.dayOfWeek === dayOfWeek ? { ...day, ...patch } : day
      )
    );
  };

  const handleSave = async () => {
    try {
      setSaving(true);
      await updateLibraryWorkingHours(days);
      onNotify("Cập nhật giờ phục vụ Thư viện thành công.", "success");
    } catch (err: unknown) {
      const message =
        (err as { response?: { data?: { message?: string } } })?.response?.data
          ?.message || "Không thể lưu giờ phục vụ.";
      onNotify(message, "warning");
    } finally {
      setSaving(false);
    }
  };

  const orderedDays = WEEK_DISPLAY_ORDER.map((dayOfWeek) =>
    days.find((day) => day.dayOfWeek === dayOfWeek)
  ).filter((day): day is WorkingHourDay => Boolean(day));

  return (
    <div className="admin-subtab-container">
      <div className="admin-subtab-header">
        <div>
          <h2 className="admin-subtab-title">
            <ClockIcon size={24} className="icon-blue-glow" /> Giờ phục vụ Thư viện
          </h2>
          <p className="admin-subtab-subtitle">
            Áp dụng cho mọi lượt đặt phòng thuộc Thư viện. Phòng học chính quy vẫn
            đặt theo tiết học cố định.
          </p>
        </div>

        <div className="flex-gap-10">
          <button
            type="button"
            className="admin-btn-refresh"
            onClick={() => void load()}
            disabled={loading || saving}
          >
            <RefreshCwIcon size={14} />
            <span>{loading ? "Đang tải..." : "Làm mới"}</span>
          </button>
          <button
            type="button"
            className="btn-toolbar-primary"
            onClick={() => void handleSave()}
            disabled={loading || saving || orderedDays.length !== 7}
          >
            {saving ? "Đang lưu..." : "Lưu cấu hình"}
          </button>
        </div>
      </div>

      {loading ? (
        <div className="admin-loading-state">
          <div className="spinner-dots" />
          <p>Đang tải giờ phục vụ...</p>
        </div>
      ) : orderedDays.length !== 7 ? (
        <div className="admin-empty-state">
          <AlertTriangleIcon size={36} className="text-muted" />
          <p className="empty-title">Chưa có cấu hình giờ phục vụ</p>
        </div>
      ) : (
        <div className="admin-table-responsive">
          <table className="admin-data-table">
            <thead>
              <tr>
                <th>Ngày</th>
                <th>Trạng thái</th>
                <th>Giờ mở cửa</th>
                <th>Giờ đóng cửa</th>
              </tr>
            </thead>
            <tbody>
              {orderedDays.map((day) => (
                <tr key={day.dayOfWeek}>
                  <td>
                    <strong>{WEEKDAY_LABELS[day.dayOfWeek]}</strong>
                  </td>
                  <td>
                    <label className="checkbox-item-row">
                      <input
                        type="checkbox"
                        checked={day.isClosed}
                        onChange={(e) =>
                          patchDay(day.dayOfWeek, { isClosed: e.target.checked })
                        }
                      />
                      Nghỉ
                    </label>
                  </td>
                  <td>
                    <input
                      type="time"
                      className="admin-input"
                      value={day.openTime}
                      disabled={day.isClosed}
                      onChange={(e) =>
                        patchDay(day.dayOfWeek, { openTime: e.target.value })
                      }
                    />
                  </td>
                  <td>
                    <input
                      type="time"
                      className="admin-input"
                      value={day.closeTime}
                      disabled={day.isClosed}
                      onChange={(e) =>
                        patchDay(day.dayOfWeek, { closeTime: e.target.value })
                      }
                    />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
