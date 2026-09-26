import { useState } from "react";
import { api } from "../api";
import { Chip } from "../components/Chip";
import { DateField } from "../components/DateField";
import { UserIcon } from "../components/Icons";
import { PageHead } from "../components/PageHead";
import { TimeField } from "../components/TimeField";
import { Select } from "../components/Select";
import { CATEGORIES, OTHER_REASON } from "../data/categories";
import { getStartParam } from "../max";
import { checkFiles, MEDIA_HINT } from "../media";
import type { Category, Me } from "../types";

const pad = (n: number) => String(n).padStart(2, "0");
const todayIso = () => {
  const d = new Date();
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
};

/** Если бот уже передал категорию (?category=lift или start_param), выбор пропускаем. */
export function resolveCategory(): Category | null {
  const fromUrl = new URLSearchParams(window.location.search).get("category");
  const fromMax = getStartParam();
  return CATEGORIES.find((c) => c.code === (fromUrl ?? fromMax)) ?? null;
}

function AppealForm({ category, me, onBack, onDone }: {
  category: Category; me: Me; onBack: () => void; onDone: () => void;
}) {
  const [entrance, setEntrance] = useState("");
  const [date, setDate] = useState("");
  const [time, setTime] = useState("");
  const [reason, setReason] = useState("");
  const [customReason, setCustomReason] = useState("");
  const [comment, setComment] = useState("");
  const [tried, setTried] = useState(false);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState("");
  const [files, setFiles] = useState<File[]>([]);
  const [warnings, setWarnings] = useState<string[]>([]);

  const reasonOptions = [...category.reasons, OTHER_REASON];
  const errors = { entrance: !entrance, date: !date, time: !time, reason: category.freeText ? !customReason.trim() : !reason };
  const invalid = Object.values(errors).some(Boolean);
  const show = (k: keyof typeof errors) => tried && errors[k];

  async function addFiles(list: FileList | null) {
    if (!list) return;
    const { accepted, warnings } = await checkFiles(files, Array.from(list));
    setFiles((prev) => [...prev, ...accepted]);
    setWarnings(warnings);
  }

  async function submit() {
    setTried(true);
    if (invalid || sending) return;
    setSending(true);
    setError("");
    try {
      await api.createAppeal({
        categoryCode: category.code,
        reason: category.freeText ? customReason.trim() : reason,
        comment: comment.trim(),
        entrance: Number(entrance),
        from: new Date(`${date}T${time}`).toISOString(),
        files,
      });
      onDone();
    } catch {
      setError("Не удалось отправить обращение. Попробуйте ещё раз.");
      setSending(false);
    }
  }

  return (
    <>
      <PageHead title="Обращение" onBack={onBack} />
      <h2 className="page-subtitle">{category.title}</h2>

      <div className="card form">
        <span className="author-chip"><UserIcon width={20} height={20} />{me.fullName}</span>

        <p className="form__label">Место обнаружения:</p>
        <Select className="form__half" value={entrance} placeholder="Подъезд" error={show("entrance")}
          onChange={setEntrance}
          options={[
            { value: "0", label: "Весь дом" },
            ...Array.from({ length: me.entrances }, (_, i) => ({ value: String(i + 1), label: `Подъезд ${i + 1}` })),
          ]} />

        <p className="form__label">Время обнаружения:</p>
        <div className="form__row">
          <DateField className="form__grow" value={date} max={todayIso()} placeholder="Дата" error={show("date")} onChange={setDate} />
          <TimeField className="form__grow" value={time} placeholder="Время" error={show("time")} onChange={setTime} />
        </div>

        <p className="form__label">Причина обращения:</p>
        {category.freeText ? (
          <>
            <input className={`field field--input${show("reason") ? " is-error" : ""}`} placeholder="Укажите причину"
              value={customReason} maxLength={100} onChange={(e) => setCustomReason(e.target.value)} />
            {show("reason") && <p className="form__error">Укажите причину</p>}
          </>
        ) : (
          <>
            <Select value={reason} placeholder="Причина" error={show("reason")}
              options={reasonOptions.map((r) => ({ value: r, label: r }))} onChange={setReason} />
            {show("reason") && <p className="form__error">Выберите причину</p>}
          </>
        )}

        <p className="form__label">Комментарий</p>
        <textarea className="field field--textarea" placeholder="Введите текст" value={comment}
          maxLength={1000} onChange={(e) => setComment(e.target.value)} />

        <p className="form__label">Фото или видео подтверждение</p>
        <p className="form__hint">{MEDIA_HINT}</p>
        <div className="attach">
          {files.map((f, i) => (
            <Chip key={f.name + i} onRemove={() => { setWarnings([]); setFiles(files.filter((_, j) => j !== i)); }}>{f.name}</Chip>
          ))}
          <label className="chip chip--add" aria-label="Добавить файл">
            +
            <input type="file" accept="image/*,video/*" multiple onChange={(e) => { void addFiles(e.target.files); e.target.value = ""; }} />
          </label>
        </div>
        {warnings.length > 0 && (
          <div className="form__warning" role="alert">{warnings.map((w) => <p key={w}>{w}</p>)}</div>
        )}

        {error && <p className="form__error">{error}</p>}

        <div className="form__footer">
          <button className="btn" onClick={submit} disabled={sending}>{sending ? "Отправка…" : "Отправить"}</button>
        </div>
      </div>
    </>
  );
}

/** Шаг 1: выбор общей проблемы. */
function CategoryPicker({ onPick }: { onPick: (c: Category) => void }) {
  return (
    <>
      <PageHead title="Обращение" />
      <h2 className="page-subtitle">С чем проблема?</h2>
      <div className="categories">
        {CATEGORIES.map((c) => (
          <button key={c.code} className="card category" onClick={() => onPick(c)}>{c.title}</button>
        ))}
      </div>
    </>
  );
}

export function CreateAppeal({ me, category, onPick, onBack, onCreated }: {
  me: Me; category: Category | null; onPick: (c: Category) => void; onBack: () => void; onCreated: () => void;
}) {
  return category
    ? <AppealForm key={category.code} category={category} me={me} onBack={onBack} onDone={onCreated} />
    : <CategoryPicker onPick={onPick} />;
}
