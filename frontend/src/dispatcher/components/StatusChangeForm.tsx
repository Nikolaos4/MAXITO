import { useState } from "react";
import { Chip } from "../../components/Chip";
import { STATUS_LABEL } from "../../data/categories";
import { STATUS_TRANSITIONS } from "../../data/status";
import { checkPhotos } from "../../media";
import type { AppealStatus, ChangeStatusInput } from "../../types";

/** Смена статуса: только разрешённые графом переходы, обязательный комментарий, фото — только при завершении. */
export function StatusChangeForm({ current, onSubmit }: {
  current: AppealStatus; onSubmit: (input: ChangeStatusInput) => Promise<void>;
}) {
  const options = STATUS_TRANSITIONS[current];
  const [status, setStatus] = useState<AppealStatus | null>(options.length === 1 ? options[0] : null);
  const [comment, setComment] = useState("");
  const [files, setFiles] = useState<File[]>([]);
  const [warnings, setWarnings] = useState<string[]>([]);
  const [tried, setTried] = useState(false);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState("");

  if (options.length === 0) return null;

  const invalid = !status || !comment.trim();

  // Бэкенд принимает фото завершения ровно одной ссылкой (photo_url), не
  // массивом — поэтому maxCount=1, второй выбранный файл checkPhotos отклонит.
  async function addFiles(list: FileList | null) {
    if (!list) return;
    const { accepted, warnings } = checkPhotos(files, Array.from(list), 1);
    setFiles((prev) => [...prev, ...accepted]);
    setWarnings(warnings);
  }

  async function submit() {
    setTried(true);
    if (invalid || sending || !status) return;
    setSending(true);
    setError("");
    try {
      await onSubmit({ status, comment: comment.trim(), files });
      setComment("");
      setFiles([]);
      setStatus(options.length === 1 ? options[0] : null);
      setTried(false);
    } catch {
      setError("Не удалось изменить статус. Попробуйте ещё раз.");
    } finally {
      setSending(false);
    }
  }

  return (
    <div className="status-change">
      <p className="form__label">Изменить статус на:</p>
      <div className="chips">
        {options.map((s) => (
          <button key={s} type="button" className={`status-option status status--${s}${status === s ? " is-selected" : ""}`}
            onClick={() => setStatus(s)}>{STATUS_LABEL[s]}</button>
        ))}
      </div>

      <textarea className={`field field--textarea status-change__comment${tried && !comment.trim() ? " is-error" : ""}`}
        placeholder="Комментарий к изменению статуса (обязательно)" value={comment}
        maxLength={1000} onChange={(e) => setComment(e.target.value)} />
      {tried && !comment.trim() && <p className="form__error">Оставьте комментарий к изменению статуса</p>}

      {status === "completed" && (
        <>
          <p className="form__hint">Можно приложить фото выполненных работ (необязательно, только одно)</p>
          <div className="attach">
            {files.map((f, i) => (
              <Chip key={f.name + i} onRemove={() => { setWarnings([]); setFiles(files.filter((_, j) => j !== i)); }}>{f.name}</Chip>
            ))}
            {files.length === 0 && (
              <label className="chip chip--add" aria-label="Добавить фото">
                +
                <input type="file" accept="image/jpeg,image/png,image/webp,image/gif" onChange={(e) => { void addFiles(e.target.files); e.target.value = ""; }} />
              </label>
            )}
          </div>
          {warnings.length > 0 && <div className="form__warning" role="alert">{warnings.map((w) => <p key={w}>{w}</p>)}</div>}
        </>
      )}

      {error && <p className="form__error">{error}</p>}

      <button className="btn" onClick={submit} disabled={sending}>{sending ? "Сохранение…" : "Изменить статус"}</button>
    </div>
  );
}
