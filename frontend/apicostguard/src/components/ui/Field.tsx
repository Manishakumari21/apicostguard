import type { InputHTMLAttributes, ReactNode, SelectHTMLAttributes, TextareaHTMLAttributes } from "react";

interface FieldShellProps {
  label: string;
  htmlFor: string;
  hint?: ReactNode;
  error?: string | null;
  optional?: string;
  children: ReactNode;
}

export function FieldShell({ label, htmlFor, hint, error, optional, children }: FieldShellProps) {
  return (
    <div className="field">
      <label className="field-label" htmlFor={htmlFor}>
        <span>{label}</span>
        {optional ? <span className="optional">{optional}</span> : null}
      </label>
      {children}
      {error ? (
        <p className="field-error" id={`${htmlFor}-error`} role="alert">
          {error}
        </p>
      ) : hint ? (
        <p className="field-hint" id={`${htmlFor}-hint`}>
          {hint}
        </p>
      ) : null}
    </div>
  );
}

interface TextFieldProps extends InputHTMLAttributes<HTMLInputElement> {
  label: string;
  hint?: ReactNode;
  error?: string | null;
  optional?: string;
  leading?: ReactNode;
  trailing?: ReactNode;
}

export function TextField({
  label,
  hint,
  error,
  optional,
  leading,
  trailing,
  id,
  className,
  ...props
}: TextFieldProps) {
  const inputId = id ?? props.name ?? label.toLowerCase().replace(/\s+/g, "-");
  const input = (
    <input
      id={inputId}
      className={["input", className].filter(Boolean).join(" ")}
      aria-invalid={error ? true : undefined}
      aria-describedby={error ? `${inputId}-error` : hint ? `${inputId}-hint` : undefined}
      {...props}
    />
  );

  return (
    <FieldShell label={label} htmlFor={inputId} hint={hint} error={error} optional={optional}>
      {leading || trailing ? (
        <div className="input-row">
          {leading ? <span className="input-affix">{leading}</span> : null}
          {input}
          {trailing}
        </div>
      ) : (
        input
      )}
    </FieldShell>
  );
}

interface SelectFieldProps extends SelectHTMLAttributes<HTMLSelectElement> {
  label: string;
  hint?: ReactNode;
  error?: string | null;
  children: ReactNode;
}

export function SelectField({ label, hint, error, id, className, children, ...props }: SelectFieldProps) {
  const selectId = id ?? props.name ?? label.toLowerCase().replace(/\s+/g, "-");
  return (
    <FieldShell label={label} htmlFor={selectId} hint={hint} error={error}>
      <select
        id={selectId}
        className={["select", className].filter(Boolean).join(" ")}
        aria-invalid={error ? true : undefined}
        {...props}
      >
        {children}
      </select>
    </FieldShell>
  );
}

interface TextAreaFieldProps extends TextareaHTMLAttributes<HTMLTextAreaElement> {
  label: string;
  hint?: ReactNode;
  error?: string | null;
}

export function TextAreaField({ label, hint, error, id, className, ...props }: TextAreaFieldProps) {
  const fieldId = id ?? props.name ?? label.toLowerCase().replace(/\s+/g, "-");
  return (
    <FieldShell label={label} htmlFor={fieldId} hint={hint} error={error}>
      <textarea
        id={fieldId}
        className={["textarea", className].filter(Boolean).join(" ")}
        aria-invalid={error ? true : undefined}
        {...props}
      />
    </FieldShell>
  );
}
