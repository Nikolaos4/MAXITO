import { BellIcon, InfoIcon, ListIcon, PlusCircleIcon } from "../../components/Icons";

export type Tab = "create" | "feed" | "notifications" | "info";

const TABS = [
  { id: "create", label: "Плановые работы", Icon: PlusCircleIcon },
  { id: "feed", label: "Обращения", Icon: ListIcon },
  { id: "notifications", label: "Уведомления", Icon: BellIcon },
  { id: "info", label: "Информация", Icon: InfoIcon },
] as const;

export function TabBar({ tab, onChange, hasUnread }: { tab: Tab; onChange: (t: Tab) => void; hasUnread?: boolean }) {
  return (
    <nav className="tabbar">
      {TABS.map(({ id, label, Icon }) => (
        <button key={id} className={`tabbar__btn${tab === id ? " is-active" : ""}`} aria-label={label}
          aria-current={tab === id} onClick={() => onChange(id)}>
          <Icon width={38} height={38} />
          {id === "notifications" && hasUnread && <span className="tabbar__dot" aria-hidden />}
        </button>
      ))}
    </nav>
  );
}
