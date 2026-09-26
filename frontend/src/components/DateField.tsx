import { useState } from "react";
import { Dropdown } from "./Dropdown";
import { CalendarIcon } from "./Icons";

const MONTHS = ["Январь", "Февраль", "Март", "Апрель", "Май", "Июнь", "Июль", "Август", "Сентябрь", "Октябрь", "Ноябрь", "Декабрь"];
const WEEKDAYS = ["Пн", "Вт", "Ср", "Чт", "Пт", "Сб", "Вс"];

const pad = (n: number) => String(n).padStart(2, "0");
const iso = (y: number, m: number, d: number) => `${y}-${pad(m + 1)}-${pad(d)}`;

interface Props {
  /** YYYY-MM-DD */
  value: string;
  onChange: (v: string) => void;
  /** Последний доступный день, YYYY-MM-DD */
  max: string;
  placeholder: string;
  error?: boolean;
  className?: string;
}

function Calendar({ value, max, onPick }: { value: string; max: string; onPick: (v: string) => void }) {
  const base = value ? new Date(value) : new Date();
  const [year, setYear] = useState(base.getFullYear());
  const [month, setMonth] = useState(base.getMonth());

  const offset = (new Date(year, month, 1).getDay() + 6) % 7; // неделя с понедельника
  const days = new Date(year, month + 1, 0).getDate();
  const [maxY, maxM] = max.split("-").map(Number);
  const canNext = year < maxY || (year === maxY && month + 1 < maxM);

  const shift = (delta: number) => {
    const d = new Date(year, month + delta, 1);
    setYear(d.getFullYear());
    setMonth(d.getMonth());
  };

  return (
    <div className="calendar">
      <div className="calendar__head">
        <button type="button" aria-label="Предыдущий месяц" onClick={() => shift(-1)}>‹</button>
        <span>{MONTHS[month]} {year}</span>
        <button type="button" aria-label="Следующий месяц" disabled={!canNext} onClick={() => shift(1)}>›</button>
      </div>
      <div className="calendar__grid">
        {WEEKDAYS.map((w) => <span key={w} className="calendar__wd">{w}</span>)}
        {Array.from({ length: offset }, (_, i) => <span key={`e${i}`} />)}
        {Array.from({ length: days }, (_, i) => {
          const v = iso(year, month, i + 1);
          return (
            <button key={v} type="button" disabled={v > max} className={v === value ? "is-selected" : v === max ? "is-today" : ""}
              onClick={() => onPick(v)}>{i + 1}</button>
          );
        })}
      </div>
    </div>
  );
}

export function DateField({ value, onChange, max, placeholder, error, className }: Props) {
  const [y, m, d] = value.split("-");
  return (
    <Dropdown label={value ? `${d}.${m}.${y}` : placeholder} filled={!!value} error={error} className={className}
      icon={<CalendarIcon className="field__icon" width={16} height={16} />}>
      {(close) => <Calendar value={value} max={max} onPick={(v) => { onChange(v); close(); }} />}
    </Dropdown>
  );
}
