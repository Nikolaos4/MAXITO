import { getMaxUser } from "../max";
import { countUnread, delay, findAppeal, houseByNumber, markNotificationsRead, nextId, notificationView, refresh, save, sortNotifications, store, toAttachment } from "../store";
import type { HouseInfo, Me } from "../types";
import type { Api } from "./types";

const me = (): Me => {
  const u = getMaxUser();
  // Данные жителя приходят из MAX; дом/подъезд — из профиля жителя на бэкенде (здесь демо).
  return { id: u?.id ?? "me", fullName: u?.fullName ?? "Иванов Иван Иванович", houseNumber: "3", entrance: 2, entrances: 4 };
};

export const mockApi: Api = {
  getMe: () => delay(me()),
  getHouseInfo: (): Promise<HouseInfo> => delay(houseByNumber(me().houseNumber)),

  listAppeals: (feed) => {
    refresh();
    const m = me();
    const list = store.appeals.filter((a) => {
      if (a.houseNumber !== m.houseNumber) return false;
      if (feed === "house") return true;
      if (feed === "entrance") return a.entrance === m.entrance || a.entrance === 0;
      return a.authorId === m.id;
    });
    return delay([...list].sort((a, b) => b.createdAt.localeCompare(a.createdAt) || b.id - a.id));
  },

  createAppeal: async (input) => {
    refresh();
    const m = me();
    const attachments = await Promise.all(input.files.map(toAttachment));
    const appeal = {
      id: nextId(), createdAt: new Date().toISOString(), status: "accepted" as const, houseNumber: m.houseNumber,
      categoryCode: input.categoryCode, reason: input.reason, comment: input.comment,
      entrance: input.entrance, authorId: m.id, authorName: m.fullName, likes: 0, likedByMe: false, attachments, comments: [],
    };
    store.appeals.unshift(appeal);
    save();
    return delay(appeal);
  },

  toggleLike: (id) => {
    const a = findAppeal(id);
    if (a.authorId === me().id) throw new Error("Нельзя лайкать своё обращение");
    a.likedByMe = !a.likedByMe;
    a.likes += a.likedByMe ? 1 : -1;
    save();
    return delay({ ...a });
  },

  listNotifications: (feed) => {
    refresh();
    const m = me();
    const list = store.notifications.filter((n) => {
      if (n.houseNumber !== m.houseNumber) return false;
      return feed === "house" ? true : n.entrance === m.entrance || n.entrance === 0;
    });
    return delay(sortNotifications(list.map((n) => notificationView(n, m.id))));
  },

  getUnreadNotificationsCount: () => {
    refresh();
    const m = me();
    // Считаем по всем уведомлениям дома — так же, как показывает вкладка «Дом»
    const list = store.notifications.filter((n) => n.houseNumber === m.houseNumber);
    return delay(countUnread(list, m.id));
  },

  markNotificationsRead: (ids) => {
    markNotificationsRead(ids, me().id);
    return delay(undefined);
  },
};
