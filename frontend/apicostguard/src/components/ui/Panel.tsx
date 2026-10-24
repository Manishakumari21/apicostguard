import type { HTMLAttributes, ReactNode } from "react";

interface PanelProps extends HTMLAttributes<HTMLElement> {
  children: ReactNode;
  as?: "section" | "div" | "article" | "aside";
  feature?: boolean;
  glow?: boolean;
  flat?: boolean;
}

export function Panel({ children, className, as = "section", feature, glow, flat, ...props }: PanelProps) {
  const Tag = as;
  return (
    <Tag
      className={[
        "panel",
        feature ? "panel--feature" : "",
        glow ? "panel--glow" : "",
        flat ? "panel--flat" : "",
        className,
      ]
        .filter(Boolean)
        .join(" ")}
      {...props}
    >
      {children}
    </Tag>
  );
}

interface PanelHeaderProps {
  kicker?: string;
  title: ReactNode;
  subtitle?: ReactNode;
  actions?: ReactNode;
  bordered?: boolean;
}

export function PanelHeader({ kicker, title, subtitle, actions, bordered }: PanelHeaderProps) {
  return (
    <div className={`panel-head${bordered ? " panel-head--bordered" : ""}`}>
      <div className="panel-title-group">
        {kicker ? <div className="panel-kicker">{kicker}</div> : null}
        <h2 className="panel-title">{title}</h2>
        {subtitle ? <p className="panel-sub">{subtitle}</p> : null}
      </div>
      {actions ? <div className="panel-actions">{actions}</div> : null}
    </div>
  );
}
