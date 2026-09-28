import { loadCategories, type ResolvedCategories } from "../../backend/categories";
import { backendRequest } from "../../backend/request";
import type { BackendAppeal, BackendMe, BackendNotification } from "../../backend/types";
import type { Appeal, Comment, DispatcherMe, HouseInfo, Notification } from "../../types";
import type { DispatcherApi } from "./types";

let categoriesPromise: Promise<ResolvedCategories> | null = null;
const categories = () => (categoriesPromise ??= loadCategories("/dispatcher"));

// GET /dispatcher/houses не существует — единственная ручка, которая отдаёт
// ПОЛНЫЙ список домов диспетчера (включая дома без единого обращения),
// это статистика по необработанным обращениям: она перечисляет все дома
// диспетчера с house_id и адресом, даже с нулями. Используем её как список
// домов и на каждый дом отдельно спрашиваем число подъездов.
let housesPromise: Promise<HouseInfo[]> | null = null;
async function loadHouses(): Promise<HouseInfo[]> {
  const stats = await backendRequest<{ house_id: number; address: string }[]>("/dispatcher/appeals/stats");
  return Promise.all(
    stats.map(async (s) => {
      const entrances = await backendRequest<number[]>(`/dispatcher/houses/${s.house_id}/entrances`);
      const info: HouseInfo = { number: String(s.house_id), entrances: entrances.length, address: s.address };
      return info;
    }),
  );
}
const houses = () => (housesPromise ??= loadHouses());

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
    // Диспетчер лайки не ставит — поле нигде не используется на этой стороне.
    likedByMe: false,
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
    reason: info?.reasonTitle ?? "",
    comment: n.body,
    from: n.starts_at,
    to: n.ends_at,
    // У диспетчера бэкенд тоже не хранит «прочитано» — только видимость на клиенте.
    unread: false,
  };
}

export const httpApi: DispatcherApi = {
  getMe: async () => {
    const [m, hs] = await Promise.all([backendRequest<BackendMe>("/me"), houses()]);
    const me: DispatcherMe = { id: String(m.id), fullName: m.full_name, houseNumbers: hs.map((h) => h.number) };
    return me;
  },

  getHouses: () => houses(),
  getCategories: async () => (await categories()).categories,

  listAppeals: async (houseNumber) => {
    const hs = await houses();
    const houseIds = houseNumber === "all" ? hs.map((h) => h.number) : [houseNumber];
    const raw = await backendRequest<{ items: BackendAppeal[] }>("/dispatcher/appeals", {
      query: { house_id: houseIds, page_size: 100 },
    });
    return raw.items.map(adaptAppeal).sort((a, b) => b.likes - a.likes || b.createdAt.localeCompare(a.createdAt));
  },

  createPlannedWork: async (input) => {
    const cats = await categories();
    const isFreeText = cats.categories.find((c) => c.code === input.categoryCode)?.freeText;
    await backendRequest("/dispatcher/notifications", {
      method: "POST",
      body: JSON.stringify({
        house_id: Number(input.houseNumber),
        scope: input.entrance === 0 ? "house" : "entrance",
        entrance_number: input.entrance === 0 ? undefined : input.entrance,
        problem_type_id: cats.problemTypeId(input.categoryCode),
        reason_id: isFreeText ? undefined : cats.reasonId(input.categoryCode, input.workType),
        title: isFreeText ? input.workType : undefined,
        body: input.comment || input.workType,
        starts_at: input.from,
        ends_at: input.to,
      }),
    });
  },

  listNotifications: async (houseNumber) => {
    const hs = await houses();
    const houseIds = houseNumber === "all" ? hs.map((h) => h.number) : [houseNumber];
    const raw = await backendRequest<BackendNotification[]>("/dispatcher/notifications", { query: { house_id: houseIds } });
    return Promise.all(raw.map(adaptNotification));
  },

  // Бэкенд не хранит «прочитано» уведомление или нет — своих отметок у диспетчера
  // на этой стороне тоже не завели (см. итоговое сообщение с оговорками).
  getUnreadNotificationsCount: () => Promise.resolve(0),
  markNotificationsRead: () => Promise.resolve(),

  changeStatus: async (id, { files, ...fields }) => {
    void files; // фото при завершении бэкенд принимает только как готовый URL, не как файл — грузить некуда
    const updated = await backendRequest<BackendAppeal>(`/dispatcher/appeals/${id}/status`, {
      method: "POST",
      body: JSON.stringify({ status: fields.status, comment: fields.comment }),
    });
    const detail = await backendRequest<BackendAppeal>(`/dispatcher/appeals/${id}`);
    return adaptAppeal({ ...detail, ...updated });
  },

  // Свободных комментариев вне смены статуса на бэкенде нет — методы оставлены
  // заглушками ради совместимости интерфейса, UI их в реальном режиме не вызывает.
  addComment: async (id) => adaptAppeal(await backendRequest<BackendAppeal>(`/dispatcher/appeals/${id}`)),
  editComment: async (id) => adaptAppeal(await backendRequest<BackendAppeal>(`/dispatcher/appeals/${id}`)),
  deleteComment: async (id) => adaptAppeal(await backendRequest<BackendAppeal>(`/dispatcher/appeals/${id}`)),
};
