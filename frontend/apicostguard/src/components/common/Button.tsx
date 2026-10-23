import { type ButtonHTMLAttributes, forwardRef } from "react";
import { cn } from "../../lib/cn";

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: "primary" | "secondary" | "ghost" | "danger";
  size?: "sm" | "md" | "lg";
}

const variants = {
  primary:
    "bg-accent text-canvas font-semibold shadow-[0_1px_2px_rgb(2_6_23/0.3),0_6px_18px_-8px_rgb(59_130_246/0.5)] hover:bg-accent/90 hover:shadow-[0_1px_2px_rgb(2_6_23/0.3),0_10px_24px_-10px_rgb(59_130_246/0.6)]",
  secondary:
    "bg-card text-ink border border-line hover:bg-line/60 hover:border-line",
  ghost: "bg-transparent text-muted hover:text-ink hover:bg-line/60",
  danger:
    "bg-danger/10 text-danger border border-danger/30 hover:bg-danger/20",
};

const sizes = {
  sm: "px-3 py-1.5 text-xs rounded-lg",
  md: "px-4 py-2 text-sm rounded-lg",
  lg: "px-6 py-3 text-base rounded-xl",
};

const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  ({ variant = "primary", size = "md", className = "", children, ...props }, ref) => {
    return (
      <button
        ref={ref}
        className={cn(
          "inline-flex items-center justify-center gap-2 transition-[transform,background-color,border-color,box-shadow,color] duration-150 ease-out cursor-pointer select-none",
          "active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed disabled:active:scale-100",
          "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent",
          variants[variant],
          sizes[size],
          className,
        )}
        {...props}
      >
        {children}
      </button>
    );
  }
);

Button.displayName = "Button";
export default Button;