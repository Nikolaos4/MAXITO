import { useState } from "react";
import { Chip } from "../../components/Chip";
import { categoryByCode } from "../../data/categories";
import { formatDate, formatTime, plural } from "../../format";
import { MediaGallery } from "../../components/MediaGallery";
import { StatusBadge } from "../../components/StatusBadge";
import { UserIcon } from "../../components/Icons";
import type { Appeal, ChangeStatusInput } from "../../types";
import { DispatcherAppealModal } from "./DispatcherAppealModal";
import { LikeCount } from "./LikeCount";

interface Props {
  appeal: Appeal;
  dispatcherId: string;
  /** Архив: обращение завершено, менять статус и комментировать уже нельзя */
  readOnly?: boolean;
  onComment: (text: string) => Promise<void>;
  onEditComment: (commentId: number, text: string) => Promise<void>;
  onDeleteComment: (commentId: number) => Promise<void>;
  onChangeStatus: (input: ChangeStatusInput) => Promise<void>;
}

export function DispatcherAppealCard({ appeal, readOnly, ...rest }: Props) {
  const [modal, setModal] = useState(false);
  const extraComments = appeal.comments.length;

  return (
    <article className={`card appeal${readOnly ? " appeal--readonly" : ""}`}>
      <header className="appeal__meta">
        <span>{formatDate(appeal.createdAt)}&nbsp;&nbsp;{formatTime(appeal.createdAt)}</span>
        <StatusBadge status={appeal.status} />
      </header>

      <p className="appeal__house">Дом №{appeal.houseNumber}{appeal.entrance > 0 && ` · подъезд ${appeal.entrance}`}</p>
      <h3 className="appeal__title">{categoryByCode(appeal.categoryCode).title}</h3>

      <div className="appeal__subtitle">
        <span className="appeal__reason">{appeal.reason}</span>
      </div>

      {appeal.comment && <p className="appeal__text is-clamped">{appeal.comment}</p>}
      {appeal.attachments.length > 0 && <MediaGallery items={appeal.attachments} />}

      <footer className="appeal__footer">
        <span className="appeal__author"><UserIcon width={20} height={20} />{appeal.authorName}</span>
        <span className="appeal__actions">
          {extraComments > 0 && <Chip>{extraComments} {plural(extraComments, "комментарий", "комментария", "комментариев")}</Chip>}
          <LikeCount appeal={appeal} />
        </span>
      </footer>

      <button className="link" onClick={() => setModal(true)}>Подробнее</button>

      {modal && <DispatcherAppealModal appeal={appeal} readOnly={readOnly} onClose={() => setModal(false)} {...rest} />}
    </article>
  );
}
