import type { HouseInfo } from "../../types";

/** «Все дома» + переключатель между домами, закреплёнными за диспетчером. */
export function HouseFilter({ houses, value, onChange }: {
  houses: HouseInfo[]; value: string; onChange: (v: string) => void;
}) {
  return (
    <div className="house-filter" role="tablist">
      <button role="tab" aria-selected={value === "all"} className={value === "all" ? "is-active" : ""}
        onClick={() => onChange("all")}>Все дома</button>
      {houses.map((h) => (
        <button key={h.number} role="tab" aria-selected={value === h.number} className={value === h.number ? "is-active" : ""}
          onClick={() => onChange(h.number)}>Дом №{h.number}</button>
      ))}
    </div>
  );
}
