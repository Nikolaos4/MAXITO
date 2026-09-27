import { isTerminalStatus, STATUS_TRANSITIONS } from "../../data/status";
import {
  countUnread, createNotification, delay, DISPATCHER, findAppeal, HOUSES, markNotificationsRead,
  nextId, notificationView, refresh, save, sortNotifications, store, toAttachment,
} from "../../store";
import type { Appeal } from "../../types";
import type { DispatcherApi } from "./types";

const myHouses = () => HOUSES.filter((h) => DISPATCHER.houseNumbers.includes(h.number));

export const mockApi: DispatcherApi = {
  getMe: () => delay(DISPATCHER),
  getHouses: () => delay(myHouses()),

  listAppeals: (houseNumber) => {
    refresh();
    const list = store.appeals.filter((a) =>
      houseNumber === "all" ? DISPATCHER.houseNumbers.includes(a.houseNumber) : a.houseNumber === houseNumber,
    );
    return delay([...list].sort((a, b) => b.likes - a.likes || b.createdAt.localeCompare(a.createdAt) || b.id - a.id));
  },

  createPlannedWork: (input) => {
    // Плановые работы = уведомление: рассылается жителям дома и виден диспетчеру,
    // используется ботом и для автоблокировки необоснованных обращений на этот период.
    createNotification(input);
    return delay(undefined);
  },

  listNotifications: (houseNumber) => {
    refresh();
    const list = store.notifications.filter((n) =>
      houseNumber === "all" ? DISPATCHER.houseNumbers.includes(n.houseNumber) : n.houseNumber === houseNumber,
    );
    return delay(sortNotifications(list.map((n) => notificationView(n, DISPATCHER.id))));
  },

  getUnreadNotificationsCount: () => {
    refresh();
    const list = store.notifications.filter((n) => DISPATCHER.houseNumbers.includes(n.houseNumber));
    return delay(countUnread(list, DISPATCHER.id));
  },

  markNotificationsRead: (ids) => {
    markNotificationsRead(ids, DISPATCHER.id);
    return delay(undefined);
  },

  changeStatus: async (id, input) => {
    const a = findAppeal(id);
    if (isTerminalStatus(a.status)) throw new Error("Статус уже финальный");
    if (!STATUS_TRANSITIONS[a.status].includes(input.status)) throw new Error("Недопустимый переход статуса");
    const text = input.comment.trim();
    if (!text) throw new Error("Нужен комментарий к смене статуса");

    a.status = input.status;
    a.comments.push({ id: nextId(), authorId: DISPATCHER.id, authorName: DISPATCHER.fullName, text, createdAt: new Date().toISOString() });
    if (input.status === "completed" && input.files.length) {
      const attachments = await Promise.all(input.files.map(toAttachment));
      a.attachments = [...a.attachments, ...attachments];
    }
    save();
    return delay({ ...a });
  },

  addComment: (id, text) => {
    const a: Appeal = findAppeal(id);
    a.comments.push({ id: nextId(), authorId: DISPATCHER.id, authorName: DISPATCHER.fullName, text, createdAt: new Date().toISOString() });
    save();
    return delay({ ...a });
  },

  editComment: (id, commentId, text) => {
    const a = findAppeal(id);
    const c = a.comments.find((x) => x.id === commentId && x.authorId === DISPATCHER.id);
    if (!c) throw new Error("Комментарий не найден");
    c.text = text;
    save();
    return delay({ ...a });
  },

  deleteComment: (id, commentId) => {
    const a = findAppeal(id);
    a.comments = a.comments.filter((x) => !(x.id === commentId && x.authorId === DISPATCHER.id));
    save();
    return delay({ ...a });
  },
};
