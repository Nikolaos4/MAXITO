import { loadCategories, type ResolvedCategories } from "../../backend/categories";
import { adaptHouseInfo } from "../../backend/houseInfo";
import { backendRequest, uploadFile } from "../../backend/request";
import type { BackendAppeal, BackendAttachment, BackendCompany, BackendEmergencyService, BackendHouse, BackendMe, BackendNotification } from "../../backend/types";
import type { Appeal, Attachment, Comment, DispatcherMe, HouseInfo, Notification } from "../../types";
import type { DispatcherApi } from "./types";

function adaptAttachment(a: BackendAttachment): Attachment {
  return { name: a.url.split("/").pop() || "Фото", kind: "image", url: a.url };
}

// Диспетчер темы/причины использует только для плановых работ (PlannedWork.tsx) —
// поэтому сразу просим причины, разрешённые для уведомления (не любая причина
// темы годится для планового анонса, см. loadCategories в backend/categories.ts).
let categoriesPromise: Promise<ResolvedCategories> | null = null;
const categories = () => (categoriesPromise ??= loadCategories("/dispatcher", { forNotification: true }));

// Реквизиты УК и аварийные службы одни на всю систему, не на дом — спрашиваем
// один раз за сессию и подмешиваем в карточку любого из домов диспетчера.
let referencePromise: Promise<{ company: BackendCompany; emergencyServices: BackendEmergencyService[] }> | null = null;
const reference = () =>
  (referencePromise ??= Promise.all([
    backendRequest<BackendCompany>("/dispatcher/company"),
    backendRequest<BackendEmergencyService[]>("/dispatcher/emergency-services"),
  ]).then(([company, emergencyServices]) => ({ company, emergencyServices })));

let housesPromise: Promise<HouseInfo[]> | null = null;
async function loadHouses(): Promise<HouseInfo[]> {
  const [list, ref] = await Promise.all([backendRequest<BackendHouse[]>("/dispatcher/houses"), reference()]);
  return list.map((h) => adaptHouseInfo(h, ref.company, ref.emergencyServices));
}
const houses = () => (housesPromise ??= loadHouses());

function adaptComment(h: NonNullable<BackendAppeal["history"]>[number]): Comment | null {
  if (!h.comment) return null;
  return {
    id: h.id, authorId: String(h.changed_by), authorName: h.changed_by_user?.full_name ?? "",
    text: h.comment, createdAt: h.created_at, photoUrl: h.photo_url,
  };
}

function adaptAppeal(a: BackendAppeal): Appeal {
  return {
    id: a.id,
    createdAt: a.created_at,
    status: a.status,
    houseNumber: String(a.house_id),
    categoryCode: a.problem_type?.code ?? "",
    categoryTitle: a.problem_type?.title ?? "",
    reason: a.reason?.title ?? "",
    comment: a.description,
    entrance: a.entrance_number ?? 0,
    authorId: String(a.author_id),
    authorName: a.author?.full_name ?? "",
    likes: a.likes_count ?? 0,
    // Диспетчер лайки не ставит — поле нигде не используется на этой стороне.
    likedByMe: false,
    // Только в ответе на GET одного обращения (см. api/http.ts у жителя).
    attachments: (a.attachments ?? []).map(adaptAttachment),
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
    categoryTitle: info?.categoryTitle ?? "",
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
        // Всегда шлём выбранный в форме вид работ как заголовок уведомления —
        // иначе для обычных тем (не «Другое») бэкенд сам подставляет вместо
        // него название темы (см. CreateNotification в dispatcher_service.go),
        // и то, что реально выбрал диспетчер, нигде не сохраняется и не видно
        // ни диспетчеру, ни жителю в карточке уведомления.
        title: input.workType,
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
    // Бэкенд принимает фото подтверждения только при переходе в "completed" —
    // на любом другом статусе непустой photo_url 400-нется (см. ChangeStatus
    // в dispatcher_service.go), поэтому грузим файл и шлём поле только тогда.
    // И это ровно одна ссылка (photo_url), не массив, в отличие от обращения
    // жителя (photo_urls) — на форме тут в принципе не выбрать больше 1 файла.
    const photoUrl = fields.status === "completed" && files[0] ? await uploadFile(files[0]) : undefined;
    // POST .../status отдаёт саму запись смены статуса (AppealStatusChange —
    // id, from_status, to_status, ...), а не обновлённое обращение. Раньше
    // её ошибочно подмешивали в detail через {...detail, ...updated} — id
    // записи истории перезаписывал id обращения, из-за чего Feed.tsx не мог
    // найти строку по id и карточка не обновлялась без перезагрузки страницы.
    // Ответ POST нам не нужен — просто дожидаемся его и перечитываем свежую
    // карточку целиком.
    await backendRequest(`/dispatcher/appeals/${id}/status`, {
      method: "POST",
      body: JSON.stringify({ status: fields.status, comment: fields.comment, photo_url: photoUrl }),
    });
    const detail = await backendRequest<BackendAppeal>(`/dispatcher/appeals/${id}`);
    return adaptAppeal(detail);
  },

  // Свободных комментариев вне смены статуса на бэкенде нет — методы оставлены
  // заглушками ради совместимости интерфейса, UI их в реальном режиме не вызывает.
  addComment: async (id) => adaptAppeal(await backendRequest<BackendAppeal>(`/dispatcher/appeals/${id}`)),
  editComment: async (id) => adaptAppeal(await backendRequest<BackendAppeal>(`/dispatcher/appeals/${id}`)),
  deleteComment: async (id) => adaptAppeal(await backendRequest<BackendAppeal>(`/dispatcher/appeals/${id}`)),
};
