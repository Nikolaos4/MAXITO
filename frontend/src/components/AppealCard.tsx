import { categoryByCode } from "../data/categories";
import { formatDate, formatTime } from "../format";
import type { Appeal } from "../types";
import { AppealModal, type AppealHandlers } from "./AppealModal";
import { LikeButton } from "./Comments";
import { UserIcon } from "./Icons";
import { MediaGallery } from "./MediaGallery";
import { StatusBadge } from "./StatusBadge";

interface Props extends AppealHandlers {
  appeal: Appeal;
  meId: string;
  /** Архивное обращение: без лайков */
  readOnly?: boolean;
  /** Открыта ли модалка этой карточки — состояние держит список, чтобы одновременно была открыта только одна */
  open: boolean;
  onOpen: () => void;
  onCloseModal: () => void;
}

export function AppealCard({ appeal, meId, readOnly, open, onOpen, onCloseModal, ...handlers }: Props) {
  const isOwn = appeal.authorId === meId;

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
          <LikeButton appeal={appeal} disabled={readOnly || isOwn}
            title={isOwn ? "Нельзя лайкать своё обращение" : undefined} onLike={handlers.onLike} />
        </span>
      </footer>

      <button className="link" onClick={onOpen}>Подробнее</button>

      {open && <AppealModal appeal={appeal} meId={meId} readOnly={readOnly} onClose={onCloseModal} {...handlers} />}
    </article>
  );
}
