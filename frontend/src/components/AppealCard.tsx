import { useState } from "react";
import { categoryByCode } from "../data/categories";
import { formatDate, formatTime } from "../format";
import type { Appeal } from "../types";
import { AppealModal, type AppealHandlers } from "./AppealModal";
import { COMMENTED_HINT, CommentItem, LikeButton } from "./Comments";
import { CommentIcon, UserIcon } from "./Icons";
import { MediaGallery } from "./MediaGallery";
import { StatusBadge } from "./StatusBadge";

interface Props extends AppealHandlers {
  appeal: Appeal;
  meId: string;
  /** Архивное обращение: без лайков и комментариев */
  readOnly?: boolean;
}

export function AppealCard({ appeal, meId, readOnly, ...handlers }: Props) {
  const [modal, setModal] = useState(false);

  const alreadyCommented = appeal.comments.some((c) => c.authorId === meId) && !readOnly;
  const hint = alreadyCommented ? COMMENTED_HINT : undefined;
  const first = appeal.comments[0];

  return (
    <article className={`card appeal${readOnly ? " appeal--readonly" : ""}`}>
      <header className="appeal__meta">
        <span>{formatDate(appeal.createdAt)}&nbsp;&nbsp;{formatTime(appeal.createdAt)}</span>
        <StatusBadge status={appeal.status} />
      </header>

      <h3 className="appeal__title">{categoryByCode(appeal.categoryCode).title}</h3>

      <div className="appeal__subtitle">
        <span className="appeal__reason">{appeal.reason}</span>
      </div>

      {appeal.comment && <p className="appeal__text is-clamped">{appeal.comment}</p>}
      {appeal.attachments.length > 0 && <MediaGallery items={appeal.attachments} />}

      <footer className="appeal__footer">
        <span className="appeal__author"><UserIcon width={20} height={20} />{appeal.authorName}</span>
        <span className="appeal__actions">
          <span className="hint" title={hint}>
            <button className="icon-btn" aria-label="Комментарии" disabled={alreadyCommented} onClick={() => setModal(true)}>
              <CommentIcon width={24} height={24} />
            </button>
          </span>
          <LikeButton appeal={appeal} readOnly={readOnly} onLike={handlers.onLike} />
        </span>
      </footer>

      {first && (
        <CommentItem comment={first} mine={!readOnly && first.authorId === meId}
          onEdit={(t) => handlers.onEditComment(first.id, t)} onDelete={() => handlers.onDeleteComment(first.id)} />
      )}

      <button className="link" onClick={() => setModal(true)}>Подробнее</button>

      {modal && <AppealModal appeal={appeal} meId={meId} readOnly={readOnly} onClose={() => setModal(false)} {...handlers} />}
    </article>
  );
}
