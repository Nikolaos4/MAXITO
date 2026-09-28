import { formatDate, formatShortDate, formatTime } from "../format";
import type { Notification } from "../types";

/** Карточка уведомления о плановых работах: общая для жителя и диспетчера. */
export function NotificationCard({ n, location }: { n: Notification; location?: string }) {
  return (
    <article className="card notification">
      <header className="appeal__meta">
        <span>{formatDate(n.createdAt)}&nbsp;&nbsp;{formatTime(n.createdAt)}</span>
        <span className="notification__badge">
          {n.unread && <span className="notification__dot" aria-hidden />}
          Уведомление
        </span>
      </header>

      {location && <p className="appeal__house">{location}</p>}
      <h3 className="appeal__title">{n.categoryTitle}</h3>
      <p className="appeal__reason">{n.workType}</p>
      <p className="notification__period">С {formatShortDate(n.from)} по {formatShortDate(n.to)}</p>
      {n.comment && <p className="appeal__text">{n.comment}</p>}
    </article>
  );
}
