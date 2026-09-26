import { useEffect } from "react";
import { categoryByCode } from "../data/categories";
import { formatDate, formatTime } from "../format";
import type { Appeal } from "../types";
import { CommentForm, CommentItem, LikeButton } from "./Comments";
import { CloseIcon, UserIcon } from "./Icons";
import { MediaGallery } from "./MediaGallery";
import { StatusBadge } from "./StatusBadge";

export interface AppealHandlers {
  onLike: () => void;
  onComment: (text: string) => Promise<void>;
  onEditComment: (commentId: number, text: string) => Promise<void>;
  onDeleteComment: (commentId: number) => Promise<void>;
}

interface Props extends AppealHandlers {
  appeal: Appeal;
  meId: string;
  readOnly?: boolean;
  onClose: () => void;
}

/** Полное описание обращения, все комментарии; здесь тоже можно лайкать и комментировать. */
export function AppealModal({ appeal, meId, readOnly, onClose, onLike, onComment, onEditComment, onDeleteComment }: Props) {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      // Esc в открытом просмотре фото закрывает только его
      if (e.key === "Escape" && !document.querySelector(".lightbox")) onClose();
    };
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    window.addEventListener("keydown", onKey);
    return () => {
      document.body.style.overflow = prev;
      window.removeEventListener("keydown", onKey);
    };
  }, [onClose]);

  const hasMine = appeal.comments.some((c) => c.authorId === meId);

  return (
    <div className="modal" role="dialog" aria-modal onClick={onClose}>
      <div className="modal__sheet card" onClick={(e) => e.stopPropagation()}>
        <button className="modal__close" aria-label="Закрыть" onClick={onClose}><CloseIcon width={24} height={24} /></button>

        <header className="appeal__meta">
          <span>{formatDate(appeal.createdAt)}&nbsp;&nbsp;{formatTime(appeal.createdAt)}</span>
          <StatusBadge status={appeal.status} />
        </header>

        <h3 className="appeal__title">{categoryByCode(appeal.categoryCode).title}</h3>
        <div className="appeal__subtitle"><span className="appeal__reason">{appeal.reason}</span></div>
        {appeal.comment && <p className="appeal__text">{appeal.comment}</p>}
        {appeal.attachments.length > 0 && <MediaGallery items={appeal.attachments} />}

        <div className="appeal__footer">
          <span className="appeal__author"><UserIcon width={20} height={20} />{appeal.authorName}</span>
          <span className="appeal__actions"><LikeButton appeal={appeal} readOnly={readOnly} onLike={onLike} /></span>
        </div>

        <h4 className="modal__subtitle">Комментарии ({appeal.comments.length})</h4>
        {appeal.comments.length === 0 && <p className="muted">Комментариев пока нет</p>}
        {appeal.comments.map((c) => (
          <CommentItem key={c.id} comment={c} mine={!readOnly && c.authorId === meId}
            onEdit={(t) => onEditComment(c.id, t)} onDelete={() => onDeleteComment(c.id)} />
        ))}
        {!readOnly && <CommentForm hasMine={hasMine} onSubmit={onComment} />}
      </div>
    </div>
  );
}
