import { useEffect, useRef } from "react";
import { SidebarContent } from "./Sidebar";

export function MobileNav({ open, onClose }: { open: boolean; onClose: () => void }) {
  const panelRef = useRef<HTMLElement>(null);
  const restoreFocus = useRef<HTMLElement | null>(null);

  useEffect(() => {
    if (!open) return;
    restoreFocus.current = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    const panel = panelRef.current;
    const first = panel?.querySelector<HTMLElement>("button, a, [tabindex]");
    first?.focus();
    document.body.style.overflow = "hidden";

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        event.preventDefault();
        onClose();
        return;
      }
      if (event.key !== "Tab" || !panel) return;
      const focusable = [...panel.querySelectorAll<HTMLElement>("a[href], button:not([disabled]), [tabindex]:not([tabindex='-1'])")].filter(
        (element) => element.offsetParent !== null
      );
      if (focusable.length === 0) return;
      const firstElement = focusable[0];
      const lastElement = focusable[focusable.length - 1];
      if (event.shiftKey && document.activeElement === firstElement) {
        event.preventDefault();
        lastElement.focus();
      } else if (!event.shiftKey && document.activeElement === lastElement) {
        event.preventDefault();
        firstElement.focus();
      }
    };

    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.removeEventListener("keydown", onKeyDown);
      document.body.style.overflow = "";
      restoreFocus.current?.focus();
    };
  }, [open, onClose]);

  if (!open) return null;

  return (
    <>
      <button type="button" className="mobile-backdrop" onClick={onClose} aria-label="Close navigation" tabIndex={-1} />
      <aside className="rail mobile-rail" ref={panelRef} role="dialog" aria-modal="true" aria-label="Navigation">
        <SidebarContent onNavigate={onClose} onClose={onClose} />
      </aside>
    </>
  );
}
