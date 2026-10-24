import type { CSSProperties } from "react";
import { providerMeta } from "../../lib/providers";

export function ProviderGlyph({
  provider,
  size = "md",
  showRing = true,
}: {
  provider: string;
  size?: "xs" | "sm" | "md" | "lg";
  showRing?: boolean;
}) {
  const meta = providerMeta(provider);
  return (
    <span
      className={`provider-glyph provider-glyph--${size}${showRing ? "" : " provider-glyph--plain"}`}
      style={
        {
          "--pg-accent": meta.accent,
          "--pg-soft": meta.soft,
        } as CSSProperties
      }
      aria-hidden="true"
    >
      <span>{meta.initials}</span>
    </span>
  );
}

export function ProviderIdentity({
  provider,
  model,
  size = "sm",
}: {
  provider: string;
  model?: string;
  size?: "xs" | "sm" | "md";
}) {
  const meta = providerMeta(provider);
  return (
    <span className="provider-identity">
      <ProviderGlyph provider={provider} size={size} />
      <span className="provider-identity-copy">
        <span className="provider-identity-name">{meta.name}</span>
        {model ? <span className="provider-identity-model mono">{model}</span> : null}
      </span>
    </span>
  );
}
