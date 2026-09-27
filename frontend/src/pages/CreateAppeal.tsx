import { useEffect, useState } from "react";
import { api } from "../api";
import { Chip } from "../components/Chip";
import { DateField } from "../components/DateField";
import { AlertIcon, UserIcon } from "../components/Icons";
import { PageHead } from "../components/PageHead";
import { TimeField } from "../components/TimeField";
import { Select } from "../components/Select";
import { checkFiles, MEDIA_HINT } from "../media";
import { plural } from "../format";
import type { Appeal, Category, Me } from "../types";

const SHOWN_DUPLICATES = 2;
// Фото/видео сервер пока не принимает вообще — эту часть формы показываем
// только в демо-режиме, чтобы не обещать то, чего нет.
const SUPPORTS_ATTACHMENTS = import.meta.env.VITE_USE_MOCK !== "false";

/** Карточка «по вашей проблеме уже есть обращение»: список кратких описаний + переход к списку. */
function DuplicateNotice({ category, appeals, onView }: { category: Category; appeals: Appeal[]; onView: () => void }) {
  if (appeals.length === 0) return null;
  const shown = appeals.slice(0, SHOWN_DUPLICATES);
  const extra = appeals.length - shown.length;

  return (
    <div className="card duplicate-notice">
      <div className="duplicate-notice__head">
        <AlertIcon width={22} height={22} />
        <p>По вашей проблеме уже есть {plural(appeals.length, "обращение", "обращения", "обращений")}:</p>
      </div>
      <ul className="duplicate-notice__list">
        {shown.map((a) => <li key={a.id}>{category.title} — {a.reason}</li>)}
        {extra > 0 && <li className="duplicate-notice__more">+ ещё {extra}</li>}
      </ul>
      <button type="button" className="btn btn--small duplicate-notice__btn" onClick={onView}>Перейти</button>
    </div>
  );
}

const pad = (n: number) => String(n).padStart(2, "0");
const todayIso = () => {
  const d = new Date();
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
};

/**
 * Если бот уже передал код темы, выбор темы пропускаем. ?category=lift — при
 * переходе по обычной ссылке; startTab — третий сегмент start_param диплинка
 * ("resident:create:lift"), см. parseStartPayload() в page.ts.
 */
export function resolveCategoryCode(startTab?: string): string | null {
  return new URLSearchParams(window.location.search).get("category") ?? startTab ?? null;
}

function AppealForm({ category, me, onBack, onDone, onViewExisting }: {
  category: Category; me: Me; onBack: () => void; onDone: () => void; onViewExisting: () => void;
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
  // Обращения по этой же теме, уже созданные кем-то из дома (архив в расчёт не берём)
  const [existing, setExisting] = useState<Appeal[]>([]);

  useEffect(() => {
    api.listAppeals("house")
      .then((list) => setExisting(list.filter((a) => a.categoryCode === category.code && a.status !== "completed")))
      .catch(() => setExisting([]));
  }, [category.code]);

  const reasonOptions = category.reasons;
  const currentReason = category.freeText ? customReason.trim() : reason;
  const duplicate = !!currentReason && existing.some((a) => a.reason === currentReason);
  const errors = { entrance: !entrance, date: !date, time: !time, reason: category.freeText ? !customReason.trim() : !reason };
  const invalid = Object.values(errors).some(Boolean) || duplicate;
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

      <DuplicateNotice category={category} appeals={existing} onView={onViewExisting} />

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
        {duplicate && (
          <div className="form__error-row">
            <p className="form__error">Такое обращение уже создано</p>
            <button type="button" className="link" onClick={onViewExisting}>Перейти</button>
          </div>
        )}

        <p className="form__label">Комментарий</p>
        <textarea className="field field--textarea" placeholder="Введите текст" value={comment}
          maxLength={1000} onChange={(e) => setComment(e.target.value)} />

        {SUPPORTS_ATTACHMENTS && (
          <>
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
          </>
        )}

        {error && <p className="form__error">{error}</p>}

        <div className="form__footer">
          <button className="btn" onClick={submit} disabled={sending || duplicate}>{sending ? "Отправка…" : "Отправить"}</button>
        </div>
      </div>
    </>
  );
}

/** Шаг 1: выбор общей проблемы. Список тем/причин задаёт бэкенд — не хардкод. */
function CategoryPicker({ categories, onPick }: { categories: Category[]; onPick: (c: Category) => void }) {
  return (
    <>
      <PageHead title="Обращение" />
      <h2 className="page-subtitle">С чем проблема?</h2>
      <div className="categories">
        {categories.map((c) => (
          <button key={c.code} className="card category" onClick={() => onPick(c)}>{c.title}</button>
        ))}
      </div>
    </>
  );
}

export function CreateAppeal({ me, categoryCode, onPick, onBack, onCreated, onViewExisting }: {
  me: Me; categoryCode: string | null; onPick: (code: string) => void; onBack: () => void; onCreated: () => void;
  onViewExisting: () => void;
}) {
  const [categories, setCategories] = useState<Category[] | null>(null);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    api.getCategories().then(setCategories).catch(() => setFailed(true));
  }, []);

  if (failed) return <p className="empty">Не удалось загрузить список тем обращения</p>;
  if (!categories) return <p className="empty">Загрузка…</p>;

  const category = categories.find((c) => c.code === categoryCode) ?? null;

  return category
    ? <AppealForm key={category.code} category={category} me={me} onBack={onBack} onDone={onCreated} onViewExisting={onViewExisting} />
    : <CategoryPicker categories={categories} onPick={(c) => onPick(c.code)} />;
}
