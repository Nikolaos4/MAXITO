import { useCallback, useEffect, useState } from "react";
import { api } from "../api";
import { NotificationCard } from "../../components/NotificationCard";
import { PageHead } from "../../components/PageHead";
import type { HouseInfo, Notification } from "../../types";
import { HouseFilter } from "../components/HouseFilter";

/** Уведомления о плановых работах по домам диспетчера: фильтр по дому. */
export function Notifications({ onRead }: { onRead?: () => void }) {
  const [houses, setHouses] = useState<HouseInfo[] | null>(null);
  const [houseNumber, setHouseNumber] = useState("all");
  const [items, setItems] = useState<Notification[] | null>(null);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    api.getHouses().then(setHouses).catch(() => setFailed(true));
  }, []);

  const load = useCallback(() => {
    setItems(null);
    setFailed(false);
    api.listNotifications(houseNumber).then((list) => {
      setItems(list);
      const unreadIds = list.filter((n) => n.unread).map((n) => n.id);
      if (unreadIds.length) api.markNotificationsRead(unreadIds).then(onRead);
    }).catch(() => setFailed(true));
  }, [houseNumber, onRead]);

  useEffect(load, [load]);

  return (
    <>
      <PageHead title="Уведомления" />

      {houses && (
        <div className="notification-filters">
          <HouseFilter houses={houses} value={houseNumber} onChange={setHouseNumber} />
        </div>
      )}

      {failed && (
        <p className="empty">Не удалось загрузить уведомления. <button className="link" onClick={load}>Повторить</button></p>
      )}
      {!failed && items === null && <p className="empty">Загрузка…</p>}
      {items?.length === 0 && <p className="empty">Уведомлений пока нет</p>}

      {items?.map((n) => (
        <NotificationCard key={n.id} n={n}
          location={`Дом №${n.houseNumber}${n.entrance > 0 ? ` · подъезд ${n.entrance}` : ""}`} />
      ))}
    </>
  );
}
