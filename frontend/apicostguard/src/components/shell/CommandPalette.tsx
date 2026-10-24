import { useEffect, useMemo, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { NAV_ITEMS } from "../../config/navigation";
import { Icon } from "../ui/Icon";

export function CommandPalette({ open, onClose }: { open: boolean; onClose: () => void }) {
  const dialogRef = useRef<HTMLDialogElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLDivElement>(null);
  const navigate = useNavigate();
  const [query, setQuery] = useState("");
  const [active, setActive] = useState(0);

  const results = useMemo(() => {
    const normalized = query.trim().toLowerCase();
    if (!normalized) return NAV_ITEMS;
    return NAV_ITEMS.filter((item) =>
      `${item.index} ${item.label} ${item.description} ${item.group}`.toLowerCase().includes(normalized)
    );
  }, [query]);

  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;
    if (open && !dialog.open) {
      setQuery("");
      setActive(0);
      dialog.showModal();
      window.setTimeout(() => inputRef.current?.focus(), 20);
    } else if (!open && dialog.open) {
      dialog.close();
    }
  }, [open]);

  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;
    const onDialogClose = () => {
      if (open) onClose();
    };
    dialog.addEventListener("close", onDialogClose);
    return () => dialog.removeEventListener("close", onDialogClose);
  }, [open, onClose]);

  useEffect(() => {
    setActive(0);
  }, [query]);

  useEffect(() => {
    const activeElement = listRef.current?.querySelector<HTMLElement>(`#palette-item-${active}`);
    activeElement?.scrollIntoView({ block: "nearest" });
  }, [active]);

  const go = (index: number) => {
    const item = results[index];
    if (!item) return;
    onClose();
    navigate(item.path);
  };

  return (
    <dialog
      ref={dialogRef}
      className="palette"
      aria-label="Command palette"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) onClose();
      }}
    >
      <div className="palette-search">
        <Icon name="search" />
        <input
          ref={inputRef}
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          placeholder="Search sections, tools, settings…"
          aria-label="Search sections"
          role="combobox"
          aria-expanded="true"
          aria-controls="palette-list"
          aria-activedescendant={results[active] ? `palette-item-${active}` : undefined}
          onKeyDown={(event) => {
            if (event.key === "ArrowDown") {
              event.preventDefault();
              setActive((current) => Math.min(results.length - 1, current + 1));
            } else if (event.key === "ArrowUp") {
              event.preventDefault();
              setActive((current) => Math.max(0, current - 1));
            } else if (event.key === "Home") {
              event.preventDefault();
              setActive(0);
            } else if (event.key === "End") {
              event.preventDefault();
              setActive(Math.max(0, results.length - 1));
            } else if (event.key === "Enter") {
              event.preventDefault();
              go(active);
            }
          }}
        />
        <kbd>ESC</kbd>
      </div>
      <div className="palette-list" id="palette-list" role="listbox" ref={listRef} aria-label="Sections">
        <div className="palette-group-label">Jump to</div>
        {results.length === 0 ? (
          <div className="palette-empty">No section matches “{query}”.</div>
        ) : (
          results.map((item, index) => (
            <button
              key={item.id}
              id={`palette-item-${index}`}
              type="button"
              role="option"
              aria-selected={index === active}
              className={`palette-item${index === active ? " is-active" : ""}`}
              onMouseEnter={() => setActive(index)}
              onClick={() => go(index)}
            >
              <span className="palette-icon">
                <Icon name={item.icon} />
              </span>
              <span className="palette-copy">
                <span className="palette-label">{item.label}</span>
                <span className="palette-sub">
                  {item.index} · {item.description}
                </span>
              </span>
              <Icon name="arrow-right" size={13} />
            </button>
          ))
        )}
      </div>
      <div className="palette-footer">
        <span>
          <kbd>↑</kbd>
          <kbd>↓</kbd> navigate
        </span>
        <span>
          <kbd>↵</kbd> open
        </span>
        <span>11 sections · local-first</span>
      </div>
    </dialog>
  );
}
