import { useEffect } from "react";
import { categoryByCode } from "../data/categories";
import { formatDate, formatTime } from "../format";
import type { Appeal } from "../types";
import { LikeButton } from "./Comments";
import { CloseIcon, UserIcon } from "./Icons";
import { MediaGallery } from "./MediaGallery";
import { StatusBadge } from "./StatusBadge";

export interface AppealHandlers {
  onLike: () => void;
}

interface Props extends AppealHandlers {
  appeal: Appeal;
  readOnly?: boolean;
  onClose: () => void;
}

/** Полное описание обращения; здесь тоже можно лайкать. */
export function AppealModal({ appeal, readOnly, onClose, onLike }: Props) {
  useEffect(() => {
    // Esc в открытом просмотре фото закрывает только его
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

        <h3 className="appeal__title">{categoryByCode(appeal.categoryCode).title}</h3>
        <div className="appeal__subtitle"><span className="appeal__reason">{appeal.reason}</span></div>
        {appeal.comment && <p className="appeal__text">{appeal.comment}</p>}
        {appeal.attachments.length > 0 && <MediaGallery items={appeal.attachments} />}

        <div className="appeal__footer">
          <span className="appeal__author"><UserIcon width={20} height={20} />{appeal.authorName}</span>
          <span className="appeal__actions"><LikeButton appeal={appeal} readOnly={readOnly} onLike={onLike} /></span>
        </div>
      </div>
    </div>
  );
}
