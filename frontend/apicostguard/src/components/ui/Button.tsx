import type { ButtonHTMLAttributes, ReactNode } from "react";
import { Icon, type IconName } from "./Icon";

type Variant = "primary" | "accent" | "secondary" | "ghost" | "danger";
type Size = "sm" | "md" | "lg";

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant;
  size?: Size;
  icon?: IconName;
  iconPosition?: "left" | "right";
  loading?: boolean;
  block?: boolean;
  children?: ReactNode;
}

function classes(variant: Variant, size: Size, block?: boolean): string {
  return [
    "btn",
    variant === "primary" ? "btn--primary" : "",
    variant === "accent" ? "btn--accent" : "",
    variant === "ghost" ? "btn--ghost" : "",
    variant === "danger" ? "btn--danger" : "",
    size === "sm" ? "btn--sm" : size === "lg" ? "btn--lg" : "",
    block ? "btn--block" : "",
  ]
    .filter(Boolean)
    .join(" ");
}

export function Button({
  variant = "secondary",
  size = "md",
  icon,
  iconPosition = "left",
  loading = false,
  block = false,
  children,
  className,
  disabled,
  type = "button",
  ...props
}: ButtonProps) {
  return (
    <button
      type={type}
      className={[classes(variant, size, block), className].filter(Boolean).join(" ")}
      disabled={disabled || loading}
      aria-busy={loading || undefined}
      {...props}
    >
      {loading ? <span className="spinner" aria-hidden="true" /> : null}
      {!loading && icon && iconPosition === "left" ? <Icon name={icon} /> : null}
      {children}
      {!loading && icon && iconPosition === "right" ? <Icon name={icon} /> : null}
    </button>
  );
}
