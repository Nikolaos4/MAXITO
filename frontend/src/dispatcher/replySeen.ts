import type { Appeal } from "../types";

/**
 * «Диспетчер уже видел последний ответ жителя по этому обращению» — бэкенд
 * такого не хранит (как и прочитанные уведомления, см. localFlags.ts), поэтому
 * держим локально в этом браузере: appealId -> id последнего просмотренного
 * комментария. Как только пришёл новый комментарий с более свежим id — карточка
 * снова считается непросмотренной.
 */
const KEY = (dispatcherId: string) => `maxito:dispatcher-seen-reply:${dispatcherId}`;

function loadMap(dispatcherId: string): Record<number, number> {
  try {
    const raw = localStorage.getItem(KEY(dispatcherId));
    return raw ? (JSON.parse(raw) as Record<number, number>) : {};
  } catch {
    return {};
  }
}

function saveMap(dispatcherId: string, map: Record<number, number>) {
  try { localStorage.setItem(KEY(dispatcherId), JSON.stringify(map)); } catch { /* ignore */ }
}

export function markReplySeen(dispatcherId: string, appealId: number, lastCommentId: number) {
  const map = loadMap(dispatcherId);
  map[appealId] = lastCommentId;
  saveMap(dispatcherId, map);
}

/** Обращение "горит" как новое, если последний комментарий оставил сам житель (а не диспетчер) и диспетчер его ещё не открывал. */
export function isUnseenReply(appeal: Appeal, dispatcherId: string): boolean {
  const last = appeal.comments[appeal.comments.length - 1];
  if (!last || last.authorId !== appeal.authorId) return false;
  return loadMap(dispatcherId)[appeal.id] !== last.id;
}
