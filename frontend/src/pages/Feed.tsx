import { useCallback, useEffect, useState } from "react";
import { api } from "../api";
import { AppealCard } from "../components/AppealCard";
import { PageHead } from "../components/PageHead";
import { ArchiveIcon, DoorIcon, HomeIcon, UserIcon } from "../components/Icons";
import type { Appeal, Feed as FeedKind, Me } from "../types";

const FEEDS = [
  { id: "house", label: "Дом", Icon: HomeIcon },
  { id: "entrance", label: "Подъезд", Icon: DoorIcon },
  { id: "mine", label: "Мои", Icon: UserIcon },
] as const;

export function Feed({ me, initialFeed = "house" }: { me: Me; initialFeed?: FeedKind }) {
  const [feed, setFeed] = useState<FeedKind>(initialFeed);
  const [appeals, setAppeals] = useState<Appeal[] | null>(null);
  const [failed, setFailed] = useState(false);
  const [archive, setArchive] = useState(false);

  const load = useCallback(() => {
    setAppeals(null);
    setFailed(false);
    api.listAppeals(feed).then(setAppeals).catch(() => setFailed(true));
  }, [feed]);

  useEffect(load, [load]);

  const replace = (updated: Appeal) =>
    setAppeals((list) => list?.map((a) => (a.id === updated.id ? updated : a)) ?? null);

  // Архив — выполненные обращения; остальные (включая отклонённые) — текущие
  const visible = appeals?.filter((a) => (a.status === "completed") === archive);

  return (
    <>
      <PageHead title={archive ? "Архив обращений" : `Проблемы дома №${me.houseNumber}`}
        onBack={archive ? () => setArchive(false) : undefined} />

      <div className="feed-tabs" role="tablist">
        {FEEDS.map(({ id, label, Icon }) => (
          <button key={id} role="tab" aria-selected={feed === id} className={feed === id ? "is-active" : ""}
            onClick={() => setFeed(id)}>
            {label}<Icon width={22} height={22} />
          </button>
        ))}
        <button className={`feed-tabs__archive${archive ? " is-active" : ""}`} aria-label="Архив обращений"
          aria-pressed={archive} onClick={() => setArchive(!archive)}>
          <ArchiveIcon width={28} height={28} />
        </button>
      </div>

      {failed && (
        <p className="empty">Не удалось загрузить обращения. <button className="link" onClick={load}>Повторить</button></p>
      )}
      {!failed && appeals === null && <p className="empty">Загрузка…</p>}
      {visible?.length === 0 && <p className="empty">{archive ? "В архиве пока пусто" : "Обращений пока нет"}</p>}

      {visible?.map((a) => (
        <AppealCard key={a.id} appeal={a} meId={me.id} readOnly={archive}
          onLike={() => api.toggleLike(a.id).then(replace)}
          onComment={(text) => api.addComment(a.id, text).then(replace)}
          onEditComment={(cid, text) => api.editComment(a.id, cid, text).then(replace)}
          onDeleteComment={(cid) => api.deleteComment(a.id, cid).then(replace)} />
      ))}
    </>
  );
}
