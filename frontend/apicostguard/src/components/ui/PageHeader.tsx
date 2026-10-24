import type { ReactNode } from "react";

interface PageHeaderProps {
  index: string;
  label: string;
  title: ReactNode;
  description: ReactNode;
  actions?: ReactNode;
}

export function PageHeader({ index, label, title, description, actions }: PageHeaderProps) {
  return (
    <header className="page-head">
      <div className="page-head-copy">
        <div className="eyebrow">
          <span className="dot" aria-hidden="true" />
          {index} / {label}
        </div>
        <h1 className="page-title">{title}</h1>
        <p className="page-description">{description}</p>
      </div>
      {actions ? <div className="page-actions">{actions}</div> : null}
    </header>
  );
}
