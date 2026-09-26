import { Dropdown } from "./Dropdown";
import { ClockIcon } from "./Icons";

const pad = (n: number) => String(n).padStart(2, "0");
const ITEM_H = 36;

interface Props {
  /** HH:MM */
  value: string;
  onChange: (v: string) => void;
  placeholder: string;
  error?: boolean;
  className?: string;
}

function Column({ count, selected, onPick }: { count: number; selected: number; onPick: (n: number) => void }) {
  return (
    <div className="timepicker__col" ref={(el) => { if (el && selected >= 0) el.scrollTop = selected * ITEM_H - ITEM_H * 2; }}>
      {Array.from({ length: count }, (_, n) => (
        <button key={n} type="button" className={n === selected ? "is-selected" : ""} onClick={() => onPick(n)}>{pad(n)}</button>
      ))}
    </div>
  );
}

export function TimeField({ value, onChange, placeholder, error, className }: Props) {
  const [h, m] = value ? value.split(":").map(Number) : [-1, -1];
  return (
    <Dropdown label={value || placeholder} filled={!!value} error={error} className={className} align="right"
      icon={<ClockIcon className="field__icon" width={16} height={16} />}>
      {(close) => (
        <div className="timepicker">
          <div className="timepicker__cols">
            <Column count={24} selected={h} onPick={(n) => onChange(`${pad(n)}:${pad(Math.max(m, 0))}`)} />
            <Column count={60} selected={m} onPick={(n) => onChange(`${pad(Math.max(h, 0))}:${pad(n)}`)} />
          </div>
          <button type="button" className="btn btn--small timepicker__done" disabled={!value} onClick={close}>Готово</button>
        </div>
      )}
    </Dropdown>
  );
}
