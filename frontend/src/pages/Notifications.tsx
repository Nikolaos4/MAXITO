import { useCallback, useEffect, useState } from "react";
import { api } from "../api";
import { NotificationCard } from "../components/NotificationCard";
import { DoorIcon, HomeIcon } from "../components/Icons";
import { PageHead } from "../components/PageHead";
import type { Notification, NotificationFeed } from "../types";

const FEEDS = [
  { id: "house", label: "Дом", Icon: HomeIcon },
  { id: "entrance", label: "Подъезд", Icon: DoorIcon },
] as const;

/** Уведомления о плановых работах — те же, что публикует диспетчер. */
export function Notifications({ onRead }: { onRead?: () => void }) {
  const [feed, setFeed] = useState<NotificationFeed>("house");
  const [items, setItems] = useState<Notification[] | null>(null);
  const [failed, setFailed] = useState(false);

  const load = useCallback(() => {
    setItems(null);
    setFailed(false);
    api.listNotifications(feed).then((list) => {
      setItems(list);
      const unreadIds = list.filter((n) => n.unread).map((n) => n.id);
      if (unreadIds.length) api.markNotificationsRead(unreadIds).then(onRead);
    }).catch(() => setFailed(true));
  }, [feed]);

  useEffect(load, [load]);

  return (
    <>
      <PageHead title="Уведомления" />

      <div className="feed-tabs" role="tablist">
        {FEEDS.map(({ id, label, Icon }) => (
          <button key={id} role="tab" aria-selected={feed === id} className={feed === id ? "is-active" : ""}
            onClick={() => setFeed(id)}>
            {label}<Icon width={22} height={22} />
          </button>
        ))}
      </div>

      {failed && (
        <p className="empty">Не удалось загрузить уведомления. <button className="link" onClick={load}>Повторить</button></p>
      )}
      {!failed && items === null && <p className="empty">Загрузка…</p>}
      {items?.length === 0 && <p className="empty">Уведомлений пока нет</p>}

      {items?.map((n) => <NotificationCard key={n.id} n={n} />)}
    </>
  );
}
