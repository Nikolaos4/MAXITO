/**
 * Общее демо-хранилище для мини-аппа жителя и мини-аппа диспетчера.
 * Открытые в разных вкладках браузера сессии не делят JS-память между собой,
 * поэтому обе роли читают и пишут один и тот же ключ localStorage, как будто
 * это общий бэкенд. Реальный бэкенд должен заменить этот файл целиком.
 */
import type { Appeal, Attachment, Comment, HouseInfo, Notification, PlannedWorkInput } from "./types";

const KEY = "maxito:mock:v9";
export const delay = <T>(v: T) => new Promise<T>((r) => setTimeout(() => r(v), 150));

export const DISPATCHER = { id: "dispatcher-1", fullName: "Иванова Ольга Сергеевна", houseNumbers: ["3", "5", "8"] };

const demoText =
  "Уже три дня работает лифт!! Перед этим лифт издавал странные звуки. Я живу на 13 этаже. Подниматься по лестнице пешком невозможно.";

// Демо-данные домов. Реальные адрес, УК, тарифы, телефоны и число жильцов придут с бэкенда.
const company = {
  fullName: 'ОБЩЕСТВО С ОГРАНИЧЕННОЙ ОТВЕТСТВЕННОСТЬЮ «УПРАВЛЯЮЩАЯ КОМПАНИЯ «ЖИЛФОНД»',
  shortName: 'ООО «УК «ЖИЛФОНД»',
  dispatcherPhone: "+7 (495) 539-53-53",
  contactPhone: "+7 (499) 372-37-73",
  email: "zhilfond@mail.ru",
  site: "http://reformagkh.ru",
};
const tariffs = [
  { title: "Тепловая энергия", price: "3862 руб." },
  { title: "Холодное водоснабжение", price: "3862 руб." },
  { title: "Горячее водоснабжение", price: "3862 руб." },
  { title: "Капитальный ремонт", price: "3862 руб." },
  { title: "Содержание жилых помещений", price: "3862 руб." },
];
const emergencyServices = [
  { title: "МОЭК", phone: "+7 (495) 587-77-88" },
  { title: "Мосводоканал", phone: "+7 (499) 763-34-34" },
  { title: "Мосводосток", phone: "+7 (495) 657-87-03" },
];

export const HOUSES: HouseInfo[] = [
  {
    number: "3",
    address: "город Москва, внутригородская территория муниципальный округ Восточное Измайлово, 11-я Парковая улица, дом 36",
    floors: 12, entrances: 4, builtYear: 1986, residentsCount: 128,
    company, tariffs, emergencyServices,
  },
  {
    number: "5",
    address: "город Москва, внутригородская территория муниципальный округ Восточное Измайлово, 11-я Парковая улица, дом 40",
    floors: 9, entrances: 3, builtYear: 1979, residentsCount: 84,
    company, tariffs, emergencyServices,
  },
  {
    number: "8",
    address: "город Москва, внутригородская территория муниципальный округ Восточное Измайлово, 11-я Парковая улица, дом 44",
    floors: 17, entrances: 6, builtYear: 2005, residentsCount: 210,
    company, tariffs, emergencyServices,
  },
];

export const houseByNumber = (n: string) => HOUSES.find((h) => h.number === n) ?? HOUSES[0];

const dispatcherComment = (id: number, text: string, createdAt: string): Comment => ({
  id, authorId: DISPATCHER.id, authorName: DISPATCHER.fullName, text, createdAt,
});

const seed = (): Appeal[] => [
  {
    id: 1, createdAt: "2026-09-29T12:48:00", status: "rejected", houseNumber: "3", categoryCode: "lift",
    reason: "Не работает / стоит", comment: demoText, entrance: 2,
    authorId: "demo-1", authorName: "Иванов Иван Иванович", likes: 135, likedByMe: false, attachments: [],
    comments: [dispatcherComment(1001, "Авария вне зоны ответственности УК — лифт обслуживается сервисной компанией напрямую. Заявка передана им.", "2026-09-29T14:10:00")],
  },
  {
    id: 2, createdAt: "2026-09-29T12:48:00", status: "accepted", houseNumber: "3", categoryCode: "lift",
    reason: "Сильные рывки / посторонние звуки", comment: demoText, entrance: 1,
    authorId: "demo-2", authorName: "Иванов Иван Иванович", likes: 135, likedByMe: false, attachments: [], comments: [],
  },
  {
    id: 3, createdAt: "2026-09-27T09:10:00", status: "in_progress", houseNumber: "3", categoryCode: "water",
    reason: "Слабый напор", comment: "Второй день слабый напор воды, на верхних этажах вода почти не идёт.", entrance: 2,
    authorId: "demo-3", authorName: "Сидоров Пётр Алексеевич", likes: 12, likedByMe: false, attachments: [],
    comments: [dispatcherComment(1002, "Направили заявку в водоканал, ожидаем мастера.", "2026-09-27T11:00:00")],
  },
  {
    id: 4, createdAt: "2026-09-26T18:30:00", status: "completed", houseNumber: "3", categoryCode: "yard",
    reason: "Не убран мусор / переполнены контейнеры", comment: "Контейнеры переполнены, мусор лежит рядом.", entrance: 3,
    authorId: "demo-4", authorName: "Кузнецова Мария Сергеевна", likes: 7, likedByMe: false, attachments: [],
    comments: [dispatcherComment(1003, "Мусор вывезен, контейнерная площадка убрана.", "2026-09-26T20:00:00")],
  },
  {
    id: 5, createdAt: "2026-09-25T08:00:00", status: "accepted", houseNumber: "5", categoryCode: "heating",
    reason: "Холодные батареи", comment: "В квартире холодно, батареи еле тёплые второй день.", entrance: 1,
    authorId: "demo-5", authorName: "Петров Алексей Николаевич", likes: 21, likedByMe: false, attachments: [], comments: [],
  },
  {
    id: 6, createdAt: "2026-09-24T16:20:00", status: "in_progress", houseNumber: "5", categoryCode: "entrance",
    reason: "Сломан домофон / дверь / доводчик", comment: "Домофон не открывает дверь, приходится ждать соседей.", entrance: 2,
    authorId: "demo-6", authorName: "Смирнова Ольга Викторовна", likes: 9, likedByMe: false, attachments: [],
    comments: [dispatcherComment(1004, "Мастер записан на завтра.", "2026-09-24T18:00:00")],
  },
  {
    id: 7, createdAt: "2026-09-23T10:00:00", status: "need_info", houseNumber: "8", categoryCode: "electricity",
    reason: "Мигает свет", comment: "Свет периодически мигает в квартире и на этаже.", entrance: 0,
    authorId: "demo-7", authorName: "Ковалёв Дмитрий Сергеевич", likes: 3, likedByMe: false, attachments: [],
    comments: [dispatcherComment(1005, "Уточните, пожалуйста, номера квартир, где заметили мигание, и время суток.", "2026-09-23T12:30:00")],
  },
  {
    id: 8, createdAt: "2026-09-20T09:40:00", status: "completed", houseNumber: "8", categoryCode: "yard",
    reason: "Сломаны детские / спортивные площадки", comment: "Сломана качеля на детской площадке, торчит арматура.", entrance: 0,
    authorId: "demo-8", authorName: "Новикова Анна Павловна", likes: 18, likedByMe: false, attachments: [],
    comments: [dispatcherComment(1006, "Качеля демонтирована, заказана новая, установим на этой неделе.", "2026-09-20T15:00:00")],
  },
];

/** Внутреннее хранимое уведомление: readBy не отдаётся клиенту напрямую, из него считается Notification.unread. */
export interface StoredNotification extends Omit<Notification, "unread"> {
  /** Кто уже открывал вкладку «Уведомления» и видел это уведомление: id жителя (me().id) или диспетчера */
  readBy: string[];
}

const seedNotifications = (): StoredNotification[] => [
  {
    id: 1901, createdAt: "2026-09-18T12:48:00", houseNumber: "3", entrance: 0, categoryCode: "water",
    workType: "Отключение горячей воды", from: "2026-09-10T00:00:00", to: "2026-09-16T23:59:00",
    comment: "Уважаемые жители, в связи с проведением плановых ремонтных работ, в период с 10.09.26 по 16.09.26 в вашем доме будет отключено горячее водоснабжение. Приносим извинения за неудобства.",
    readBy: [DISPATCHER.id],
  },
];

export interface Store { appeals: Appeal[]; notifications: StoredNotification[]; nextId: number }

function load(): Store {
  try {
    const raw = localStorage.getItem(KEY);
    if (raw) {
      const s = JSON.parse(raw) as Store;
      if (!s.notifications) s.notifications = seedNotifications();
      return s;
    }
  } catch { /* localStorage недоступен — работаем в памяти */ }
  return { appeals: seed(), notifications: seedNotifications(), nextId: 2000 };
}

export const store: Store = load();

/**
 * Житель и диспетчер — разные вкладки с независимой копией store в памяти.
 * Если не подтягивать localStorage перед каждой записью, поздняя запись одной вкладки
 * затирает своим устаревшим снимком то, что успела сохранить другая (например, диспетчер
 * создаёт уведомление и своей записью откатывает отметки «прочитано», которые житель
 * только что поставил в своей вкладке). Поэтому каждая мутация сначала подтягивает свежие
 * данные, и только потом применяет свои изменения поверх них.
 */
export function refresh() {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return;
    const s = JSON.parse(raw) as Store;
    store.appeals = s.appeals;
    store.notifications = s.notifications ?? seedNotifications();
    store.nextId = Math.max(store.nextId, s.nextId);
  } catch { /* localStorage недоступен — работаем с тем, что есть в памяти */ }
}

// Blob-ссылки на видео живут только в текущей сессии, поэтому в localStorage их не пишем.
// Настоящий бэкенд отдаёт постоянные url.
export const save = () => {
  const appeals = store.appeals.map((a) => ({
    ...a,
    attachments: a.attachments.map((x) => (x.kind === "video" ? { ...x, url: "" } : x)),
  }));
  try { localStorage.setItem(KEY, JSON.stringify({ ...store, appeals })); } catch { /* ignore */ }
};

/** Фото уменьшаем до превью, чтобы поместиться в localStorage. */
function downscale(file: File, maxSide = 800): Promise<string> {
  return new Promise((resolve, reject) => {
    const src = URL.createObjectURL(file);
    const img = new Image();
    img.onload = () => {
      const k = Math.min(1, maxSide / Math.max(img.width, img.height));
      const c = document.createElement("canvas");
      c.width = Math.round(img.width * k);
      c.height = Math.round(img.height * k);
      c.getContext("2d")!.drawImage(img, 0, 0, c.width, c.height);
      URL.revokeObjectURL(src);
      resolve(c.toDataURL("image/jpeg", 0.7));
    };
    img.onerror = () => { URL.revokeObjectURL(src); reject(new Error("bad image")); };
    img.src = src;
  });
}

export async function toAttachment(f: File): Promise<Attachment> {
  return f.type.startsWith("video/")
    ? { name: f.name, kind: "video", url: URL.createObjectURL(f) }
    : { name: f.name, kind: "image", url: await downscale(f) };
}

export const nextId = () => store.nextId++;

export function findAppeal(id: number): Appeal {
  refresh();
  const a = store.appeals.find((x) => x.id === id);
  if (!a) throw new Error("Обращение не найдено");
  return a;
}

/** Уведомление создаёт только диспетчер; сам автор сразу считается прочитавшим его. */
export function createNotification(input: PlannedWorkInput): StoredNotification {
  refresh();
  const n: StoredNotification = {
    id: nextId(), createdAt: new Date().toISOString(),
    houseNumber: input.houseNumber, entrance: input.entrance, categoryCode: input.categoryCode,
    workType: input.workType, comment: input.comment, from: input.from, to: input.to,
    readBy: [DISPATCHER.id],
  };
  store.notifications.unshift(n);
  save();
  return n;
}

/** Публичный вид уведомления для конкретного зрителя (без чужого readBy). */
export const notificationView = (n: StoredNotification, viewerId: string): Notification => {
  const { readBy, ...rest } = n;
  return { ...rest, unread: !readBy.includes(viewerId) };
};

/** Непрочитанные — сверху; внутри каждой группы — по ближайшей дате начала работ. Прочитанное уведомление
 *  перестаёт быть «закреплённым» и просто встаёт в общий порядок по дате начала. */
export const sortNotifications = (list: Notification[]): Notification[] =>
  [...list].sort((a, b) => Number(b.unread) - Number(a.unread) || a.from.localeCompare(b.from) || a.id - b.id);

export function markNotificationsRead(ids: number[], viewerId: string) {
  refresh();
  let changed = false;
  for (const n of store.notifications) {
    if (ids.includes(n.id) && !n.readBy.includes(viewerId)) {
      n.readBy.push(viewerId);
      changed = true;
    }
  }
  if (changed) save();
}

export const countUnread = (list: StoredNotification[], viewerId: string) =>
  list.filter((n) => !n.readBy.includes(viewerId)).length;
