import { InfoIcon, ListIcon, PlusCircleIcon } from "./Icons";

export type Tab = "create" | "feed" | "info";

const TABS = [
  { id: "create", label: "Обращение", Icon: PlusCircleIcon },
  { id: "feed", label: "Проблемы дома", Icon: ListIcon },
  { id: "info", label: "Информация", Icon: InfoIcon },
] as const;

export function TabBar({ tab, onChange }: { tab: Tab; onChange: (t: Tab) => void }) {
  return (
    <nav className="tabbar">
      {TABS.map(({ id, label, Icon }) => (
        <button key={id} className={`tabbar__btn${tab === id ? " is-active" : ""}`} aria-label={label}
          aria-current={tab === id} onClick={() => onChange(id)}>
          <Icon width={38} height={38} />
        </button>
      ))}
    </nav>
  );
}
