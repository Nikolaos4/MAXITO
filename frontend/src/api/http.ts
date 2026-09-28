import { loadCategories, type ResolvedCategories } from "../backend/categories";
import { isMarked, mark, unmark } from "../backend/localFlags";
import { backendRequest, BackendError } from "../backend/request";
import type { BackendAppeal, BackendMe, BackendNotification } from "../backend/types";
import { getMaxUser } from "../max";
import type { Appeal, Comment, HouseInfo, Me, Notification } from "../types";
import type { Api } from "./types";

const userId = () => getMaxUser()?.id ?? "me";
const likedFlagKey = (uid: string) => `maxito:liked:${uid}`;
const seenNotifKey = (uid: string) => `maxito:seen-notif:${uid}`;

// Темы/причины запрашиваются один раз за сессию и переиспользуются —
// список не меняется, пока приложение открыто.
let categoriesPromise: Promise<ResolvedCategories> | null = null;
const categories = () => (categoriesPromise ??= loadCategories("/resident"));

function adaptComment(h: NonNullable<BackendAppeal["history"]>[number]): Comment | null {
  if (!h.comment) return null;
  return { id: h.id, authorId: String(h.changed_by), authorName: h.changed_by_user?.full_name ?? "", text: h.comment, createdAt: h.created_at };
}

function adaptAppeal(a: BackendAppeal): Appeal {
  return {
    id: a.id,
    createdAt: a.created_at,
    status: a.status,
    houseNumber: String(a.house_id),
    categoryCode: a.problem_type?.code ?? "",
    reason: a.reason?.title ?? "",
    comment: a.description,
    entrance: a.entrance_number ?? 0,
    authorId: String(a.author_id),
    authorName: a.author?.full_name ?? "",
    likes: a.likes_count ?? 0,
    likedByMe: isMarked(likedFlagKey(userId()), a.id),
    // Бэкенд не хранит фото/видео жителя и свободные комментарии диспетчера
    // отдельно от истории смены статуса — жителю их и не показывали.
    attachments: [],
    comments: (a.history ?? []).map(adaptComment).filter((c): c is Comment => c !== null),
  };
}

async function adaptNotification(n: BackendNotification): Promise<Notification> {
  const cats = await categories();
  const info = cats.byReasonId(n.reason_id);
  return {
    id: n.id,
    createdAt: n.created_at,
    houseNumber: String(n.house_id),
    entrance: n.scope_type === "entrance" ? (n.entrance_number ?? 0) : 0,
    categoryCode: info?.categoryCode ?? "",
    workType: n.title || info?.reasonTitle || info?.categoryTitle || "Уведомление",
    comment: n.body,
    from: n.starts_at,
    to: n.ends_at,
    unread: !isMarked(seenNotifKey(userId()), n.id),
  };
}

const meFromBackend = async (): Promise<{ me: Me; entrances: number[] }> => {
  const [m, entrances] = await Promise.all([
    backendRequest<BackendMe>("/me"),
    backendRequest<number[]>("/resident/house/entrances"),
  ]);
  return {
    // house.number бэкенд жителю не отдаёт (нет такой ручки) — используем house_id,
    // это не настоящий номер дома, а его идентификатор в базе.
    me: {
      id: String(m.id),
      fullName: m.full_name,
      houseNumber: String(m.resident?.house_id ?? ""),
      entrance: m.resident?.entrance_number ?? 0,
      entrances: entrances.length,
    },
    entrances,
  };
};

export const httpApi: Api = {
  getMe: async () => (await meFromBackend()).me,

  getHouseInfo: async () => {
    const [{ me }, link] = await Promise.all([
      meFromBackend(),
      backendRequest<{ chat_invite_link: string | null }>("/resident/house/chat-link"),
    ]);
    const info: HouseInfo = { number: me.houseNumber, entrances: me.entrances, chatInviteLink: link.chat_invite_link };
    return info;
  },

  getCategories: async () => (await categories()).categories,

  listAppeals: async (feed) => {
    const m = await httpApi.getMe();
    const raw = await backendRequest<{ items: BackendAppeal[] }>("/resident/appeals", {
      query: { mine: feed === "mine" ? "true" : undefined, page_size: 100 },
    });
    const list = raw.items.map(adaptAppeal);
    if (feed !== "entrance") return list;
    return list.filter((a) => a.entrance === m.entrance || a.entrance === 0);
  },

  createAppeal: async (input) => {
    const cats = await categories();
    const isFreeText = cats.categories.find((c) => c.code === input.categoryCode)?.freeText;
    const description = isFreeText ? [input.reason, input.comment].filter(Boolean).join("\n\n") : input.comment;

    const created = await backendRequest<BackendAppeal>("/resident/appeals", {
      method: "POST",
      body: JSON.stringify({
        problem_type_id: cats.problemTypeId(input.categoryCode),
        reason_id: isFreeText ? undefined : cats.reasonId(input.categoryCode, input.reason),
        entrance_number: input.entrance === 0 ? null : input.entrance,
        description,
        discovered_at: input.from || undefined,
      }),
    });
    // Ответ на создание не приходит с подгруженными house/author/problem_type/reason —
    // достраиваем карточку из того, что и так знаем на клиенте.
    const m = await httpApi.getMe();
    return adaptAppeal({
      ...created,
      house_id: created.house_id ?? Number(m.houseNumber),
      author: { id: Number(m.id), phone: "", full_name: m.fullName, role: "resident", is_active: true },
      problem_type: { id: cats.problemTypeId(input.categoryCode) ?? 0, code: input.categoryCode, title: "", is_critical: false },
      reason: { id: 0, problem_type_id: 0, code: "", title: isFreeText ? input.reason : input.reason, is_other: !!isFreeText },
    });
  },

  toggleLike: async (id) => {
    const uid = userId();
    const key = likedFlagKey(uid);
    if (isMarked(key, id)) {
      await backendRequest(`/resident/appeals/${id}/like`, { method: "DELETE" });
      unmark(key, id);
    } else {
      try {
        await backendRequest(`/resident/appeals/${id}/like`, { method: "POST" });
      } catch (e) {
        if (!(e instanceof BackendError)) throw e;
      }
      mark(key, [id]);
    }
    const detail = await backendRequest<BackendAppeal>(`/resident/appeals/${id}`);
    return adaptAppeal(detail);
  },

  listNotifications: async () => {
    const raw = await backendRequest<BackendNotification[]>("/resident/notifications");
    return Promise.all(raw.map(adaptNotification));
  },

  getUnreadNotificationsCount: async () => {
    const list = await httpApi.listNotifications("house");
    return list.filter((n) => n.unread).length;
  },

  markNotificationsRead: async (ids) => {
    mark(seenNotifKey(userId()), ids);
  },
};
