import { formatDate, formatTime } from "../../format";
import { MediaGallery } from "../../components/MediaGallery";
import { StatusBadge } from "../../components/StatusBadge";
import { UserIcon } from "../../components/Icons";
import type { Appeal, ChangeStatusInput } from "../../types";
import { DispatcherAppealModal } from "./DispatcherAppealModal";
import { LikeCount } from "./LikeCount";
import { isUnseenReply, markReplySeen } from "../replySeen";

interface Props {
  appeal: Appeal;
  dispatcherId: string;
  /** Архив: обращение завершено, менять статус и комментировать уже нельзя */
  readOnly?: boolean;
  /** Открыта ли модалка этой карточки — состояние держит список, чтобы одновременно была открыта только одна */
  open: boolean;
  onOpen: () => void;
  onCloseModal: () => void;
  onComment: (text: string) => Promise<void>;
  onEditComment: (commentId: number, text: string) => Promise<void>;
  onDeleteComment: (commentId: number) => Promise<void>;
  onChangeStatus: (input: ChangeStatusInput) => Promise<void>;
}

export function DispatcherAppealCard({ appeal, dispatcherId, readOnly, open, onOpen, onCloseModal, ...rest }: Props) {
  const isNewReply = isUnseenReply(appeal, dispatcherId);

  function openModal() {
    const last = appeal.comments[appeal.comments.length - 1];
    if (last && last.authorId === appeal.authorId) markReplySeen(dispatcherId, appeal.id, last.id);
    onOpen();
  }

  return (
    <article className={`card appeal${readOnly ? " appeal--readonly" : ""}`}>
      <header className="appeal__meta">
        <span>{formatDate(appeal.createdAt)}&nbsp;&nbsp;{formatTime(appeal.createdAt)}</span>
        <span className="appeal__meta-right">
          {isNewReply && <span className="appeal__new-badge">Ответ жителя</span>}
          <StatusBadge status={appeal.status} />
        </span>
      </header>

      <p className="appeal__house">Дом №{appeal.houseNumber}{appeal.entrance > 0 && ` · подъезд ${appeal.entrance}`}</p>
      <h3 className="appeal__title">{appeal.categoryTitle}</h3>

      <div className="appeal__subtitle">
        <span className="appeal__reason">{appeal.reason}</span>
      </div>

      {appeal.comment && <p className="appeal__text is-clamped">{appeal.comment}</p>}
      {appeal.attachments.length > 0 && <MediaGallery items={appeal.attachments} />}

      <footer className="appeal__footer">
        <span className="appeal__author"><UserIcon width={20} height={20} />{appeal.authorName}</span>
        <span className="appeal__actions">
          <LikeCount appeal={appeal} />
        </span>
      </footer>

      <button className="link" onClick={openModal}>Подробнее</button>

      {open && (
        <DispatcherAppealModal appeal={appeal} dispatcherId={dispatcherId} readOnly={readOnly}
          onClose={onCloseModal} {...rest} />
      )}
    </article>
  );
}
