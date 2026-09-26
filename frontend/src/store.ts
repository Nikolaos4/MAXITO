/**
 * Общее демо-хранилище для мини-аппа жителя и мини-аппа диспетчера.
 * Оба приложения собираются отдельными бандлами (index.html / dispatcher.html),
 * поэтому делить данные в памяти между ними нельзя — вместо этого оба читают
 * и пишут один и тот же ключ localStorage, как будто это общий бэкенд.
 * Реальный бэкенд должен заменить этот файл целиком.
 */
import type { Appeal, Attachment, Comment, HouseInfo } from "./types";

const KEY = "maxito:mock:v8";
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

export interface Store { appeals: Appeal[]; nextId: number }

function load(): Store {
  try {
    const raw = localStorage.getItem(KEY);
    if (raw) return JSON.parse(raw) as Store;
  } catch { /* localStorage недоступен — работаем в памяти */ }
  return { appeals: seed(), nextId: 2000 };
}

export const store: Store = load();

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
  const a = store.appeals.find((x) => x.id === id);
  if (!a) throw new Error("Обращение не найдено");
  return a;
}
