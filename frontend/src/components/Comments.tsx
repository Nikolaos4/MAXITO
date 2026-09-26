import { useState } from "react";
import { formatDate, formatTime } from "../format";
import type { Appeal, Comment } from "../types";
import { HeartIcon, UserIcon } from "./Icons";

export const COMMENTED_HINT = "Вы уже оставили комментарий";

export function LikeButton({ appeal, readOnly, onLike }: { appeal: Appeal; readOnly?: boolean; onLike: () => void }) {
  return (
    <button className={`like${appeal.likedByMe ? " is-on" : ""}`} aria-label="Нравится" aria-pressed={appeal.likedByMe}
      disabled={readOnly} onClick={onLike}>
      <HeartIcon width={24} height={24} filled={appeal.likedByMe} />
      <span>{appeal.likes}</span>
    </button>
  );
}

/** Комментарий: свой можно изменить или удалить. */
export function CommentItem({ comment, mine, onEdit, onDelete }: {
  comment: Comment; mine: boolean; onEdit: (text: string) => Promise<void>; onDelete: () => Promise<void>;
}) {
  const [menu, setMenu] = useState(false);
  const [editing, setEditing] = useState(false);
  const [text, setText] = useState(comment.text);
  const [busy, setBusy] = useState(false);

  async function save() {
    const t = text.trim();
    if (!t || busy) return;
    setBusy(true);
    try { await onEdit(t); setEditing(false); } finally { setBusy(false); }
  }

  return (
    <div className="comment">
      {mine && !editing && (
        <div className="comment__menu">
          <button aria-label="Действия" onClick={() => setMenu(!menu)}>•••</button>
          {menu && (
            <div className="menu">
              <button onClick={() => { setMenu(false); setText(comment.text); setEditing(true); }}>Изменить</button>
              <button className="danger" onClick={() => { setMenu(false); void onDelete(); }}>Удалить</button>
            </div>
          )}
        </div>
      )}
      {editing ? (
        <form className="comment-form" onSubmit={(e) => { e.preventDefault(); void save(); }}>
          <input className="field field--input" value={text} maxLength={500} autoFocus onChange={(e) => setText(e.target.value)} />
          <button className="btn btn--small" disabled={!text.trim() || busy}>OK</button>
          <button type="button" className="link" onClick={() => setEditing(false)}>Отмена</button>
        </form>
      ) : (
        <p>{comment.text}</p>
      )}
      <div className="comment__meta">
        <span><UserIcon width={14} height={14} />{comment.authorName}</span>
        <span>{formatDate(comment.createdAt)}&nbsp;&nbsp;{formatTime(comment.createdAt)}</span>
      </div>
    </div>
  );
}

/** Поле нового комментария; неактивно, если житель уже комментировал. */
export function CommentForm({ hasMine, onSubmit }: { hasMine: boolean; onSubmit: (text: string) => Promise<void> }) {
  const [text, setText] = useState("");
  const [sending, setSending] = useState(false);
  const hint = hasMine ? COMMENTED_HINT : undefined;

  async function send() {
    const t = text.trim();
    if (!t || sending) return;
    setSending(true);
    try { await onSubmit(t); setText(""); } finally { setSending(false); }
  }

  return (
    <form className="comment-form" onSubmit={(e) => { e.preventDefault(); void send(); }}>
      <input className="field field--input" placeholder={hasMine ? COMMENTED_HINT : "Написать комментарий"}
        value={text} maxLength={500} disabled={hasMine} title={hint} onChange={(e) => setText(e.target.value)} />
      <span className="hint" title={hint}>
        <button className="btn btn--small" disabled={hasMine || !text.trim() || sending}>Отправить</button>
      </span>
    </form>
  );
}
