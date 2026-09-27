import { useEffect } from "react";
import { CloseIcon, UserIcon } from "../../components/Icons";
import { MediaGallery } from "../../components/MediaGallery";
import { StatusBadge } from "../../components/StatusBadge";
import { categoryByCode } from "../../data/categories";
import { isTerminalStatus } from "../../data/status";
import { formatDate, formatTime } from "../../format";
import type { Appeal, ChangeStatusInput } from "../../types";
import { CommentForm, CommentItem } from "./Comments";
import { LikeCount } from "./LikeCount";
import { StatusChangeForm } from "./StatusChangeForm";

// Свободные комментарии (вне смены статуса), а с ними правка/удаление своих —
// бэкенд поддерживает только комментарий как часть смены статуса (история,
// неизменяемая задним числом). В реальном режиме показываем эту историю
// только для чтения.
const SUPPORTS_FREE_COMMENTS = import.meta.env.VITE_USE_MOCK !== "false";

interface Props {
  appeal: Appeal;
  dispatcherId: string;
  readOnly?: boolean;
  onClose: () => void;
  onComment: (text: string) => Promise<void>;
  onEditComment: (commentId: number, text: string) => Promise<void>;
  onDeleteComment: (commentId: number) => Promise<void>;
  onChangeStatus: (input: ChangeStatusInput) => Promise<void>;
}

/** Полная карточка обращения для диспетчера: смена статуса и неограниченные комментарии. */
export function DispatcherAppealModal({ appeal, dispatcherId, readOnly, onClose, onComment, onEditComment, onDeleteComment, onChangeStatus }: Props) {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
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

  return (
    <div className="modal" role="dialog" aria-modal onClick={onClose}>
      <div className="modal__sheet card" onClick={(e) => e.stopPropagation()}>
        <button className="modal__close" aria-label="Закрыть" onClick={onClose}><CloseIcon width={24} height={24} /></button>

        <header className="appeal__meta">
          <span>{formatDate(appeal.createdAt)}&nbsp;&nbsp;{formatTime(appeal.createdAt)}</span>
          <StatusBadge status={appeal.status} />
        </header>

        <p className="appeal__house">Дом №{appeal.houseNumber}{appeal.entrance > 0 && ` · подъезд ${appeal.entrance}`}</p>
        <h3 className="appeal__title">{categoryByCode(appeal.categoryCode).title}</h3>
        <div className="appeal__subtitle"><span className="appeal__reason">{appeal.reason}</span></div>
        {appeal.comment && <p className="appeal__text">{appeal.comment}</p>}
        {appeal.attachments.length > 0 && <MediaGallery items={appeal.attachments} />}

        <div className="appeal__footer">
          <span className="appeal__author"><UserIcon width={20} height={20} />{appeal.authorName}</span>
          <span className="appeal__actions"><LikeCount appeal={appeal} /></span>
        </div>

        {!readOnly && !isTerminalStatus(appeal.status) && <StatusChangeForm current={appeal.status} onSubmit={onChangeStatus} />}

        <h4 className="modal__subtitle">Комментарии ({appeal.comments.length})</h4>
        {appeal.comments.length === 0 && <p className="muted">Комментариев пока нет</p>}
        {appeal.comments.map((c) => (
          <CommentItem key={c.id} comment={c} mine={SUPPORTS_FREE_COMMENTS && !readOnly && c.authorId === dispatcherId}
            onEdit={(t) => onEditComment(c.id, t)} onDelete={() => onDeleteComment(c.id)} />
        ))}
        {SUPPORTS_FREE_COMMENTS && !readOnly && <CommentForm onSubmit={onComment} />}
      </div>
    </div>
  );
}
