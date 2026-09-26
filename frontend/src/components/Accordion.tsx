import { useState, type ReactNode } from "react";
import { ChevronIcon } from "./Icons";

/** Карточка, которая изначально показывает только заголовок и раскрывается по нажатию. */
export function Accordion({ title, defaultOpen = false, children }: {
  title: string; defaultOpen?: boolean; children: ReactNode;
}) {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <div className="card accordion">
      <button type="button" className="accordion__head" aria-expanded={open} onClick={() => setOpen(!open)}>
        <h3>{title}</h3>
        <ChevronIcon className={`accordion__chevron${open ? " is-open" : ""}`} width={22} height={22} />
      </button>
      {open && <div className="accordion__body">{children}</div>}
    </div>
  );
}

/** Строка «подпись — значение» с разделителем, как в тарифах и аварийных службах. */
export function KeyValueRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="kv-row">
      <span>{label}</span>
      <span>{value}</span>
    </div>
  );
}
