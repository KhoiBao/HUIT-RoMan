import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
} from "react";
import {
  AlertTriangleIcon,
  BanIcon,
  CheckCircleIcon,
  InfoIcon,
  XIcon,
} from "../components/Icon";

export interface ConfirmDetailItem {
  label: string;
  value: string;
  badge?: string;
}

export interface ConfirmOptions {
  title: string;
  message: string;
  subMessage?: string;
  itemDetails?: ConfirmDetailItem[];
  type?: "danger" | "warning" | "info" | "success";
  confirmText?: string;
  cancelText?: string;
  isAlert?: boolean;
}

export type AlertOptions = string | Omit<ConfirmOptions, "isAlert" | "cancelText">;

export interface ConfirmContextType {
  confirm: (options: ConfirmOptions) => Promise<boolean>;
  alert: (optionsOrMessage: AlertOptions) => Promise<void>;
}

const ConfirmContext = createContext<ConfirmContextType | undefined>(undefined);

interface InternalDialogState extends ConfirmOptions {
  isOpen: boolean;
  resolve: (value: boolean) => void;
}

export const ConfirmProvider: React.FC<{ children: React.ReactNode }> = ({
  children,
}) => {
  const [dialog, setDialog] = useState<InternalDialogState | null>(null);

  const confirm = useCallback((options: ConfirmOptions): Promise<boolean> => {
    return new Promise<boolean>((resolve) => {
      setDialog({
        ...options,
        isOpen: true,
        resolve,
      });
    });
  }, []);

  const alert = useCallback(
    (optionsOrMessage: AlertOptions): Promise<void> => {
      const options: Omit<ConfirmOptions, "isAlert" | "cancelText"> =
        typeof optionsOrMessage === "string"
          ? {
              title: "Thông báo",
              message: optionsOrMessage,
              type: "warning",
            }
          : optionsOrMessage;

      return new Promise<void>((resolve) => {
        setDialog({
          ...options,
          isAlert: true,
          confirmText: options.confirmText || "Đã hiểu",
          isOpen: true,
          resolve: () => resolve(),
        });
      });
    },
    []
  );

  const handleClose = useCallback(
    (confirmed: boolean) => {
      if (dialog) {
        dialog.resolve(confirmed);
        setDialog(null);
      }
    },
    [dialog]
  );

  // Close on Escape key
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape" && dialog?.isOpen) {
        handleClose(false);
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [dialog, handleClose]);

  const dialogType = dialog?.type || "warning";

  return (
    <ConfirmContext.Provider value={{ confirm, alert }}>
      {children}

      {dialog?.isOpen && (
        <div
          className="confirm-modal-overlay"
          onClick={() => handleClose(false)}
          role="dialog"
          aria-modal="true"
        >
          <div
            className={`confirm-modal-box type-${dialogType}`}
            onClick={(e) => e.stopPropagation()}
          >
            <button
              type="button"
              className="confirm-close-btn"
              onClick={() => handleClose(false)}
              aria-label="Đóng"
            >
              <XIcon size={18} />
            </button>

            <div className="confirm-modal-header">
              <div className={`confirm-icon-badge ${dialogType}`}>
                {dialogType === "danger" ? (
                  <BanIcon size={24} />
                ) : dialogType === "warning" ? (
                  <AlertTriangleIcon size={24} />
                ) : dialogType === "info" ? (
                  <InfoIcon size={24} />
                ) : (
                  <CheckCircleIcon size={24} />
                )}
              </div>
              <div className="confirm-header-text">
                <h3 className="confirm-modal-title">{dialog.title}</h3>
              </div>
            </div>

            <div className="confirm-modal-body">
              <p className="confirm-modal-message">{dialog.message}</p>

              {dialog.itemDetails && dialog.itemDetails.length > 0 && (
                <div className="confirm-item-details">
                  {dialog.itemDetails.map((item, idx) => (
                    <div key={idx} className="confirm-detail-row">
                      <span className="confirm-detail-label">
                        {item.label}:
                      </span>
                      <span className="confirm-detail-value">
                        {item.value}
                        {item.badge && (
                          <span className="confirm-detail-badge">
                            {item.badge}
                          </span>
                        )}
                      </span>
                    </div>
                  ))}
                </div>
              )}

              {dialog.subMessage && (
                <div className={`confirm-sub-note note-${dialogType}`}>
                  <AlertTriangleIcon size={16} />
                  <span>{dialog.subMessage}</span>
                </div>
              )}
            </div>

            <div className="confirm-modal-actions">
              {!dialog.isAlert && (
                <button
                  type="button"
                  className="confirm-btn-cancel"
                  onClick={() => handleClose(false)}
                >
                  {dialog.cancelText || "Hủy bỏ"}
                </button>
              )}
              <button
                type="button"
                className={`confirm-btn-submit submit-${dialogType}`}
                onClick={() => handleClose(true)}
                autoFocus
              >
                {dialog.confirmText ||
                  (dialog.isAlert ? "Đã hiểu" : "Xác nhận")}
              </button>
            </div>
          </div>
        </div>
      )}
    </ConfirmContext.Provider>
  );
};

export const useConfirm = () => {
  const context = useContext(ConfirmContext);
  if (!context) {
    throw new Error("useConfirm must be used within a ConfirmProvider");
  }
  return context;
};
