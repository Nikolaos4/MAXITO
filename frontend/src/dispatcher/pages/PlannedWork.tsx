import { useEffect, useState } from "react";
import { api } from "../api";
import { DateField } from "../../components/DateField";
import { PageHead } from "../../components/PageHead";
import { Select } from "../../components/Select";
import { TimeField } from "../../components/TimeField";
import { CATEGORIES } from "../../data/categories";
import { PLANNED_WORK_TYPES } from "../../data/plannedWork";
import type { Category, HouseInfo } from "../../types";

const pad = (n: number) => String(n).padStart(2, "0");
/** Разумный верхний предел для календаря сроков проведения работ */
const maxIso = () => {
  const d = new Date();
  d.setFullYear(d.getFullYear() + 1);
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
};

/** Шаг 1: общая тема плановых работ — тот же список, что видит житель. */
function CategoryPicker({ onPick }: { onPick: (c: Category) => void }) {
  return (
    <>
      <PageHead title="Плановые работы" />
      <div className="categories">
        {CATEGORIES.map((c) => (
          <button key={c.code} className="card category" onClick={() => onPick(c)}>{c.title}</button>
        ))}
      </div>
    </>
  );
}

/** Шаг 2: форма плановых работ. */
function PlannedWorkForm({ category, onBack, onCreated }: {
  category: Category; onBack: () => void; onCreated: () => void;
}) {
  const [houses, setHouses] = useState<HouseInfo[] | null>(null);
  const [failed, setFailed] = useState(false);

  const [houseNumber, setHouseNumber] = useState("");
  const [entrance, setEntrance] = useState("0");
  const [fromDate, setFromDate] = useState("");
  const [fromTime, setFromTime] = useState("");
  const [toDate, setToDate] = useState("");
  const [toTime, setToTime] = useState("");
  const [workType, setWorkType] = useState("");
  const [customType, setCustomType] = useState("");
  const [comment, setComment] = useState("");
  const [tried, setTried] = useState(false);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    api.getHouses().then((list) => { setHouses(list); if (list[0]) setHouseNumber(list[0].number); }).catch(() => setFailed(true));
  }, []);

  const isOther = workType === "Другое";
  const datesFilled = !!fromDate && !!fromTime && !!toDate && !!toTime;
  const order = datesFilled && `${toDate}T${toTime}` < `${fromDate}T${fromTime}`;
  const errors = {
    house: !houseNumber, fromDate: !fromDate, fromTime: !fromTime, toDate: !toDate, toTime: !toTime,
    workType: isOther ? !customType.trim() : !workType,
    order,
  };
  const invalid = Object.values(errors).some(Boolean);
  const show = (k: keyof typeof errors) => tried && errors[k];
  const house = houses?.find((h) => h.number === houseNumber);

  async function submit() {
    setTried(true);
    if (invalid || sending) return;
    setSending(true);
    setError("");
    try {
      await api.createPlannedWork({
        categoryCode: category.code,
        houseNumber,
        entrance: Number(entrance),
        workType: isOther ? customType.trim() : workType,
        comment: comment.trim(),
        from: new Date(`${fromDate}T${fromTime}`).toISOString(),
        to: new Date(`${toDate}T${toTime}`).toISOString(),
      });
      setEntrance("0"); setFromDate(""); setFromTime(""); setToDate(""); setToTime("");
      setWorkType(""); setCustomType(""); setComment(""); setTried(false);
      onCreated();
    } catch {
      setError("Не удалось опубликовать плановые работы. Попробуйте ещё раз.");
    } finally {
      setSending(false);
    }
  }

  if (failed) return <><PageHead title="Плановые работы" onBack={onBack} /><p className="empty">Не удалось загрузить список домов</p></>;
  if (!houses) return <><PageHead title="Плановые работы" onBack={onBack} /><p className="empty">Загрузка…</p></>;

  return (
    <>
      <PageHead title="Плановые работы" onBack={onBack} />
      <h2 className="page-subtitle">{category.title}</h2>

      <div className="card form">
        <p className="form__label">Место проведения:</p>
        <div className="form__row">
          <Select className="form__half" value={houseNumber} placeholder="Дом" error={show("house")}
            onChange={(v) => { setHouseNumber(v); setEntrance("0"); }}
            options={houses.map((h) => ({ value: h.number, label: `Дом №${h.number}` }))} />
          <Select className="form__half" value={entrance} placeholder="Подъезд"
            onChange={setEntrance}
            options={[
              { value: "0", label: "Весь дом" },
              ...Array.from({ length: house?.entrances ?? 0 }, (_, i) => ({ value: String(i + 1), label: `Подъезд ${i + 1}` })),
            ]} />
        </div>

        <p className="form__label">Сроки проведения:</p>
        <div className="form__row">
          <span className="form__label">с</span>
          <DateField className="form__grow" value={fromDate} max={maxIso()} placeholder="Дата" error={show("fromDate")}
            onChange={(v) => { setFromDate(v); if (toDate && toDate < v) { setToDate(""); setToTime(""); } }} />
          <TimeField className="form__grow" value={fromTime} placeholder="Время" error={show("fromTime")} onChange={setFromTime} />
        </div>
        <div className="form__row">
          <span className="form__label">по</span>
          <DateField className="form__grow" value={toDate} max={maxIso()} min={fromDate || undefined}
            error={show("toDate") || show("order")} placeholder="Дата" onChange={setToDate} />
          <TimeField className="form__grow" value={toTime} placeholder="Время" error={show("toTime") || show("order")} onChange={setToTime} />
        </div>
        {show("order") && <p className="form__error">Срок «по» не может быть раньше срока «с»</p>}

        <p className="form__label">Плановые работы:</p>
        {isOther ? (
          <>
            <input className={`field field--input${show("workType") ? " is-error" : ""}`} placeholder="Укажите вид работ"
              value={customType} maxLength={100} onChange={(e) => setCustomType(e.target.value)} />
            {show("workType") && <p className="form__error">Укажите вид работ</p>}
          </>
        ) : (
          <>
            <Select value={workType} placeholder="Вид работ" error={show("workType")}
              options={PLANNED_WORK_TYPES.map((t) => ({ value: t, label: t }))} onChange={setWorkType} />
            {show("workType") && <p className="form__error">Выберите вид работ</p>}
          </>
        )}

        <p className="form__label">Комментарий</p>
        <textarea className="field field--textarea" placeholder="Введите текст" value={comment}
          maxLength={1000} onChange={(e) => setComment(e.target.value)} />

        {error && <p className="form__error">{error}</p>}

        <div className="form__footer">
          <button className="btn" onClick={submit} disabled={sending}>{sending ? "Публикация…" : "Опубликовать"}</button>
        </div>
      </div>
    </>
  );
}

export function PlannedWork({ onCreated }: { onCreated: () => void }) {
  const [category, setCategory] = useState<Category | null>(null);
  return category
    ? <PlannedWorkForm key={category.code} category={category} onBack={() => setCategory(null)} onCreated={onCreated} />
    : <CategoryPicker onPick={setCategory} />;
}
