import { useState } from "react";
import { categoryByCode } from "../data/categories";
import { formatDate, formatTime } from "../format";
import type { Appeal } from "../types";

interface Props {
  appeal: Appeal;
  onReply: (text: string) => Promise<void>;
}

/** Диспетчер запросил доп. информацию по обращению — карточка со сроком ответа жителя. */
export function NeedInfoCard({ appeal, onReply }: Props) {
  const [text, setText] = useState("");
  const [sending, setSending] = useState(false);
  const [error, setError] = useState("");

  async function submit() {
    const t = text.trim();
    if (!t || sending) return;
    setSending(true);
    setError("");
    try {
      await onReply(t);
    } catch {
      setError("Не удалось отправить комментарий. Попробуйте ещё раз.");
      setSending(false);
    }
  }

  return (
    <article className="card notification notification--need-info">
      <header className="appeal__meta">
        <span>{formatDate(appeal.createdAt)}&nbsp;&nbsp;{formatTime(appeal.createdAt)}</span>
        <span className="notification__badge notification__badge--need-info">
          <span className="notification__dot" aria-hidden />
          Нужен ваш комментарий
        </span>
      </header>

      <h3 className="appeal__title">{categoryByCode(appeal.categoryCode).title}</h3>
      <p className="appeal__reason">{appeal.reason}</p>
      <p className="appeal__text">
        Диспетчер запросил дополнительную информацию по вашему обращению. Ответьте, чтобы продолжить его рассмотрение.
      </p>

      <textarea className="field field--textarea" placeholder="Ваш комментарий" value={text}
        maxLength={1000} onChange={(e) => setText(e.target.value)} />
      {error && <p className="form__error">{error}</p>}
      <button className="btn" onClick={submit} disabled={sending || !text.trim()}>
        {sending ? "Отправка…" : "Отправить"}
      </button>
    </article>
  );
}
