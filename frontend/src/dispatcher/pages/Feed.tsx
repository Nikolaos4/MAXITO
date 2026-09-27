import { useCallback, useEffect, useState } from "react";
import { api } from "../api";
import { ArchiveIcon } from "../../components/Icons";
import { PageHead } from "../../components/PageHead";
import { isTerminalStatus } from "../../data/status";
import type { Appeal, DispatcherMe, HouseInfo } from "../../types";
import { DispatcherAppealCard } from "../components/DispatcherAppealCard";
import { HouseFilter } from "../components/HouseFilter";
import { isUnseenReply } from "../replySeen";

/** Обращения жителей по всем домам диспетчера, топ по лайкам сверху. */
export function Feed() {
  const [me, setMe] = useState<DispatcherMe | null>(null);
  const [houses, setHouses] = useState<HouseInfo[] | null>(null);
  const [houseNumber, setHouseNumber] = useState("all");
  const [appeals, setAppeals] = useState<Appeal[] | null>(null);
  const [failed, setFailed] = useState(false);
  const [archive, setArchive] = useState(false);

  useEffect(() => {
    api.getMe().then(setMe).catch(() => setFailed(true));
    api.getHouses().then(setHouses).catch(() => setFailed(true));
  }, []);

  const load = useCallback(() => {
    setAppeals(null);
    setFailed(false);
    api.listAppeals(houseNumber).then(setAppeals).catch(() => setFailed(true));
  }, [houseNumber]);

  useEffect(load, [load]);

  const replace = (updated: Appeal) =>
    setAppeals((list) => list?.map((a) => (a.id === updated.id ? updated : a)) ?? null);

  // Архив — решённые и отклонённые обращения (по ним больше нечего делать); остальные — текущие
  const visible = appeals?.filter((a) => isTerminalStatus(a.status) === archive);
  // Обращения с непросмотренным ответом жителя (после "Дополнить") — всегда сверху, дальше по лайкам.
  const sorted = me
    ? [...(visible ?? [])].sort((a, b) => Number(isUnseenReply(b, me.id)) - Number(isUnseenReply(a, me.id)) || b.likes - a.likes)
    : visible;

  return (
    <>
      <PageHead title={archive ? "Архив обращений" : "Обращения"} onBack={archive ? () => setArchive(false) : undefined} />

      <div className="feed-toolbar">
        {houses && <HouseFilter houses={houses} value={houseNumber} onChange={setHouseNumber} />}
        <button className={`feed-tabs__archive${archive ? " is-active" : ""}`} aria-label="Архив обращений"
          aria-pressed={archive} onClick={() => setArchive(!archive)}>
          <ArchiveIcon width={28} height={28} />
        </button>
      </div>

      {failed && (
        <p className="empty">Не удалось загрузить обращения. <button className="link" onClick={load}>Повторить</button></p>
      )}
      {!failed && (appeals === null || !me) && <p className="empty">Загрузка…</p>}
      {visible?.length === 0 && <p className="empty">{archive ? "В архиве пока пусто" : "Обращений пока нет"}</p>}

      {me && sorted?.map((a) => (
        <DispatcherAppealCard key={a.id} appeal={a} dispatcherId={me.id} readOnly={archive}
          onComment={(text) => api.addComment(a.id, text).then(replace)}
          onEditComment={(cid, text) => api.editComment(a.id, cid, text).then(replace)}
          onDeleteComment={(cid) => api.deleteComment(a.id, cid).then(replace)}
          onChangeStatus={(input) => api.changeStatus(a.id, input).then(replace)} />
      ))}
    </>
  );
}
