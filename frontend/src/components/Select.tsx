import { Dropdown } from "./Dropdown";

interface Props {
  value: string;
  placeholder: string;
  options: { value: string; label: string }[];
  onChange: (v: string) => void;
  error?: boolean;
  className?: string;
}

export function Select({ value, placeholder, options, onChange, error, className }: Props) {
  const current = options.find((o) => o.value === value);
  return (
    <Dropdown label={current?.label ?? placeholder} filled={!!current} error={error} className={className}>
      {(close) => (
        <ul className="listbox" role="listbox">
          {options.length === 0 && <li className="listbox__empty">Больше нет вариантов</li>}
          {options.map((o) => (
            <li key={o.value} role="option" aria-selected={o.value === value}>
              <button type="button" className={o.value === value ? "is-selected" : ""}
                onClick={() => { onChange(o.value); close(); }}>{o.label}</button>
            </li>
          ))}
        </ul>
      )}
    </Dropdown>
  );
}
