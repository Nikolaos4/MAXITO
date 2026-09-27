import { useEffect, useRef, useState, type ReactNode } from "react";
import { ChevronIcon } from "./Icons";

/** Закрывает выпадающее окно по клику снаружи и по Esc. */
function useDismiss(ref: React.RefObject<HTMLElement>, open: boolean, close: () => void) {
  useEffect(() => {
    if (!open) return;
    const onDown = (e: Event) => { if (!ref.current?.contains(e.target as Node)) close(); };
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") close(); };
    document.addEventListener("mousedown", onDown);
    document.addEventListener("touchstart", onDown);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onDown);
      document.removeEventListener("touchstart", onDown);
      document.removeEventListener("keydown", onKey);
    };
  }, [open, close, ref]);
}

interface Props {
  /** Текст на поле: значение или подсказка */
  label: string;
  filled: boolean;
  icon?: ReactNode;
  error?: boolean;
  className?: string;
  align?: "left" | "right";
  /** Содержимое окна; close закрывает его */
  children: (close: () => void) => ReactNode;
}

/** Поле в стиле мини-аппа + собственное выпадающее окно (вместо нативных select/date/time). */
export function Dropdown({ label, filled, icon, error, className = "", align = "left", children }: Props) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const close = () => setOpen(false);
  useDismiss(ref, open, close);

  return (
    <div ref={ref} className={`dropdown ${className}`}>
      <button type="button" className={`field field--button${error ? " is-error" : ""}${open ? " is-open" : ""}`}
        aria-haspopup="true" aria-expanded={open} onClick={() => setOpen(!open)}>
        <span className={filled ? "" : "is-empty"}>{label}</span>
        {icon ?? <ChevronIcon className={`field__icon${open ? " is-flipped" : ""}`} width={20} height={20} />}
      </button>
      {open && <div className={`popover popover--${align}`}>{children(close)}</div>}
    </div>
  );
}
