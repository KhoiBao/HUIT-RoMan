import React, { useState, useEffect } from "react";
import {
  createFeedbackApi,
  fetchFeedbackByBookingApi,
  type FeedbackItem,
} from "../lib/feedback";

interface FeedbackModalProps {
  isOpen: boolean;
  bookingId?: number;
  roomName?: string;
  onClose: () => void;
  onSuccess?: (feedback: FeedbackItem) => void;
}

const RATING_LABELS: Record<number, string> = {
  1: "1 sao — Rất không hài lòng",
  2: "2 sao — Chưa hài lòng",
  3: "3 sao — Bình thường / Tạm ổn",
  4: "4 sao — Hài lòng",
  5: "5 sao — Rất hài lòng / Tuyệt vời",
};

export const FeedbackModal: React.FC<FeedbackModalProps> = ({
  isOpen,
  bookingId,
  roomName,
  onClose,
  onSuccess,
}) => {
  const [rating, setRating] = useState<number>(5);
  const [hoverRating, setHoverRating] = useState<number>(0);
  const [comment, setComment] = useState<string>("");
  const [loading, setLoading] = useState<boolean>(false);
  const [submitting, setSubmitting] = useState<boolean>(false);
  const [existingFeedback, setExistingFeedback] = useState<FeedbackItem | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  useEffect(() => {
    if (!isOpen || !bookingId) return;

    let active = true;
    setLoading(true);
    setErrorMsg(null);
    setSuccessMsg(null);

    fetchFeedbackByBookingApi(bookingId)
      .then((fb) => {
        if (!active) return;
        if (fb) {
          setExistingFeedback(fb);
          setRating(fb.rating);
          setComment(fb.comment);
        } else {
          setExistingFeedback(null);
          setRating(5);
          setComment("");
        }
      })
      .catch(() => {
        if (active) {
          setExistingFeedback(null);
        }
      })
      .finally(() => {
        if (active) setLoading(false);
      });

    return () => {
      active = false;
    };
  }, [isOpen, bookingId]);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!bookingId) return;

    setSubmitting(true);
    setErrorMsg(null);
    setSuccessMsg(null);

    try {
      const saved = await createFeedbackApi({
        bookingId,
        rating,
        comment: comment.trim(),
      });
      setExistingFeedback(saved);
      setSuccessMsg("Gửi đánh giá thành công! Cảm ơn ý kiến đóng góp của bạn.");
      onSuccess?.(saved);
      setTimeout(() => {
        onClose();
      }, 1200);
    } catch (err: unknown) {
      const message =
        err && typeof err === "object" && "response" in err
          ? (err as { response?: { data?: { message?: string } } }).response?.data?.message
          : "Có lỗi xảy ra khi gửi đánh giá. Vui lòng thử lại.";
      setErrorMsg(message || "Có lỗi xảy ra khi gửi đánh giá.");
    } finally {
      setSubmitting(false);
    }
  };

  const activeRating = hoverRating > 0 ? hoverRating : rating;

  return (
    <div className="roman-modal-backdrop" onClick={onClose} role="dialog" aria-modal="true">
      <div
        className="roman-modal-content feedback-modal-container"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="feedback-modal-header">
          <div>
            <h3 className="feedback-modal-title">
              {existingFeedback ? "Cập nhật đánh giá phòng" : "Đánh giá trải nghiệm sử dụng phòng"}
            </h3>
            <p className="feedback-modal-subtitle">
              Đơn đặt #{bookingId} {roomName ? `• ${roomName}` : ""}
            </p>
          </div>
          <button
            type="button"
            className="feedback-modal-close-btn"
            onClick={onClose}
            aria-label="Đóng"
          >
            &times;
          </button>
        </div>

        {loading ? (
          <div className="feedback-modal-loading">
            <span className="feedback-spinner" /> Đang tải thông tin...
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="feedback-modal-body">
            {errorMsg && <div className="feedback-alert error">{errorMsg}</div>}
            {successMsg && <div className="feedback-alert success">{successMsg}</div>}

            {/* Stars rating */}
            <div className="feedback-rating-section">
              <label className="feedback-field-label">Bạn thấy phòng thế nào?</label>
              <div
                className="feedback-stars-row"
                onMouseLeave={() => setHoverRating(0)}
              >
                {[1, 2, 3, 4, 5].map((star) => (
                  <button
                    key={star}
                    type="button"
                    className={`feedback-star-btn ${star <= activeRating ? "active" : ""}`}
                    onMouseEnter={() => setHoverRating(star)}
                    onClick={() => setRating(star)}
                    title={`${star} sao`}
                  >
                    ★
                  </button>
                ))}
              </div>
              <span className="feedback-rating-desc">
                {RATING_LABELS[activeRating] || `${activeRating} sao`}
              </span>
            </div>

            {/* Comment */}
            <div className="feedback-comment-section">
              <label htmlFor="feedback-comment-input" className="feedback-field-label">
                Nhận xét chi tiết (thiết bị, vệ sinh, không gian, kết nối...):
              </label>
              <textarea
                id="feedback-comment-input"
                className="feedback-textarea"
                rows={4}
                maxLength={500}
                placeholder="Chia sẻ nhận xét giúp thư viện cải thiện dịch vụ tốt hơn..."
                value={comment}
                onChange={(e) => setComment(e.target.value)}
              />
              <div className="feedback-char-count">{comment.length}/500 ký tự</div>
            </div>

            <div className="feedback-modal-actions">
              <button
                type="button"
                className="roman-btn roman-btn-secondary"
                onClick={onClose}
                disabled={submitting}
              >
                Hủy
              </button>
              <button
                type="submit"
                className="roman-btn roman-btn-primary"
                disabled={submitting}
              >
                {submitting ? "Đang gửi..." : existingFeedback ? "Lưu thay đổi" : "Gửi đánh giá"}
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
};

