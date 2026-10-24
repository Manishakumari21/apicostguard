import { useEffect, useId, useRef, type ReactNode } from "react";
import { Icon } from "./Icon";

interface DialogProps {
  open: boolean;
  onClose: () => void;
  title: ReactNode;
  subtitle?: ReactNode;
  children: ReactNode;
  footer?: ReactNode;
  variant?: "modal" | "drawer";
  size?: "sm" | "md" | "lg";
}

export function Dialog({
  open,
  onClose,
  title,
  subtitle,
  children,
  footer,
  variant = "modal",
  size = "md",
}: DialogProps) {
  const ref = useRef<HTMLDialogElement>(null);
  const titleId = useId();

  useEffect(() => {
    const dialog = ref.current;
    if (!dialog) return;
    if (open && !dialog.open) {
      dialog.showModal();
    } else if (!open && dialog.open) {
      dialog.close();
    }
  }, [open]);

  useEffect(() => {
    const dialog = ref.current;
    if (!dialog) return;
    const handleClose = () => {
      if (open) onClose();
    };
    dialog.addEventListener("close", handleClose);
    return () => dialog.removeEventListener("close", handleClose);
  }, [onClose, open]);

  return (
    <dialog
      ref={ref}
      className={variant === "drawer" ? "drawer" : `modal${size === "sm" ? " modal--sm" : size === "lg" ? " modal--lg" : ""}`}
      aria-labelledby={titleId}
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) onClose();
      }}
    >
      <div className={variant === "drawer" ? "drawer-head" : "dialog-head"}>
        <div>
          <h2 className="dialog-title" id={titleId}>
            {title}
          </h2>
          {subtitle ? <p className="dialog-sub">{subtitle}</p> : null}
        </div>
        <button type="button" className="icon-button" onClick={onClose} aria-label="Close dialog">
          <Icon name="close" />
        </button>
      </div>
      <div className={variant === "drawer" ? "drawer-body" : "dialog-body"}>{children}</div>
      {footer ? <div className="dialog-footer">{footer}</div> : null}
    </dialog>
  );
}
