/**
 * Общее демо-хранилище для мини-аппа жителя и мини-аппа диспетчера.
 * Открытые в разных вкладках браузера сессии не делят JS-память между собой,
 * поэтому обе роли читают и пишут один и тот же ключ localStorage, как будто
 * это общий бэкенд. Реальный бэкенд должен заменить этот файл целиком.
 */
import { categoryByCode } from "./data/categories";
import type { Appeal, Attachment, Comment, HouseInfo, Notification, PlannedWorkInput } from "./types";

const KEY = "maxito:mock:v10";
export const delay = <T>(v: T) => new Promise<T>((r) => setTimeout(() => r(v), 150));

export const DISPATCHER = { id: "dispatcher-1", fullName: "Иванова Ольга Сергеевна", houseNumbers: ["3", "5", "8"] };

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

// Демо-житель, от лица которого работает мини-апп вне MAX (см. me() в api/mock.ts) —
// у него намеренно есть и свежее обращение в работе, и уже закрытое в архиве,
// чтобы сразу было видно обе ветки сценария.
const ME = { id: "me", fullName: "Иванов Иван Иванович" };

const seed = (): Appeal[] => (
  [
  // Дом №3
  {
    id: 1, createdAt: "2026-09-27T08:20:00", status: "in_progress", houseNumber: "3", categoryCode: "lift",
    reason: "Не работает / стоит", comment: "Лифт не работает уже третий день, приходится подниматься пешком на тринадцатый этаж.", entrance: 2,
    authorId: ME.id, authorName: ME.fullName, likes: 6, likedByMe: false, attachments: [],
    comments: [dispatcherComment(1001, "Уточните, пожалуйста, номер кабины (в подъезде их два) и когда именно лифт перестал работать — заявку направим в лифтовую компанию.", "2026-09-27T10:05:00")],
  },
  {
    id: 2, createdAt: "2026-09-20T09:15:00", status: "completed", houseNumber: "3", categoryCode: "water",
    reason: "Слабый напор", comment: "На верхних этажах второй день очень слабый напор холодной воды.", entrance: 2,
    authorId: ME.id, authorName: ME.fullName, likes: 4, likedByMe: false, attachments: [],
    comments: [
      dispatcherComment(1002, "Направили заявку в водоканал, ожидаем мастера для проверки давления в стояке.", "2026-09-20T11:30:00"),
      dispatcherComment(1003, "Давление в стояке восстановлено, напор в норме. Если проблема повторится — сообщите.", "2026-09-21T16:45:00"),
    ],
  },
  {
    id: 3, createdAt: "2026-09-25T19:00:00", status: "accepted", houseNumber: "3", categoryCode: "yard",
    reason: "Не убран мусор / переполнены контейнеры", comment: "Мусорные контейнеры во дворе переполнены уже несколько дней, мусор разбросан вокруг площадки.", entrance: 0,
    authorId: "resident-32", authorName: "Смирнова Ольга Викторовна", likes: 14, likedByMe: false, attachments: [], comments: [],
  },
  {
    id: 4, createdAt: "2026-09-24T14:40:00", status: "in_progress", houseNumber: "3", categoryCode: "entrance",
    reason: "Сломан домофон / дверь / доводчик", comment: "Домофон в третьем подъезде не реагирует ни на код, ни на звонок с телефона, дверь приходится придерживать вручную.", entrance: 3,
    authorId: "resident-14", authorName: "Кузнецова Мария Сергеевна", likes: 8, likedByMe: false, attachments: [],
    comments: [dispatcherComment(1004, "Заявка передана обслуживающей организации, мастер приедет в течение двух рабочих дней.", "2026-09-24T17:20:00")],
  },
  {
    id: 5, createdAt: "2026-09-18T21:10:00", status: "rejected", houseNumber: "3", categoryCode: "electricity",
    reason: "Мигает свет", comment: "Несколько дней подряд по вечерам в квартире слегка мигает свет.", entrance: 4,
    authorId: "resident-51", authorName: "Ковалёв Дмитрий Сергеевич", likes: 2, likedByMe: false, attachments: [],
    comments: [dispatcherComment(1005, "Скачков напряжения по дому не зафиксировано, проверка электрощита нарушений не выявила. Если мигание повторится — уточните, пожалуйста, точное время, чтобы сверить с показаниями счётчика.", "2026-09-19T13:00:00")],
  },

  // Дом №5
  {
    id: 6, createdAt: "2026-09-26T07:50:00", status: "accepted", houseNumber: "5", categoryCode: "heating",
    reason: "Холодные батареи", comment: "Батареи еле тёплые второй день, в квартире стало заметно холоднее.", entrance: 1,
    authorId: "resident-52", authorName: "Петров Алексей Николаевич", likes: 19, likedByMe: false, attachments: [], comments: [],
  },
  {
    id: 7, createdAt: "2026-09-22T12:00:00", status: "in_progress", houseNumber: "5", categoryCode: "water",
    reason: "Протечка (стояк, трубы в подъезде)", comment: "На третьем этаже второго подъезда протекает стояк, на стене и потолке видны мокрые пятна.", entrance: 2,
    authorId: "resident-53", authorName: "Новикова Анна Павловна", likes: 27, likedByMe: false, attachments: [],
    comments: [
      dispatcherComment(1006, "Уточните, пожалуйста, рядом с какой квартирой находится протечка — по стояку нужно понять точное место аварии.", "2026-09-22T13:15:00"),
      { id: 1007, authorId: "resident-53", authorName: "Новикова Анна Павловна", text: "Протечка у стояка рядом с квартирой 34, третий этаж, второй подъезд.", createdAt: "2026-09-22T14:02:00" },
    ],
  },
  {
    id: 8, createdAt: "2026-09-19T08:30:00", status: "completed", houseNumber: "5", categoryCode: "yard",
    reason: "Не чистят снег / наледь", comment: "Во дворе не убирают наледь у подъездов, очень скользко, уже было несколько падений.", entrance: 0,
    authorId: "resident-54", authorName: "Соколова Екатерина Игоревна", likes: 22, likedByMe: false, attachments: [],
    comments: [dispatcherComment(1008, "Двор обработан противогололёдным реагентом, наледь у подъездов убрана.", "2026-09-19T12:00:00")],
  },
  {
    id: 9, createdAt: "2026-09-21T17:25:00", status: "in_progress", houseNumber: "5", categoryCode: "lift",
    reason: "Долго едет / плохо закрываются двери", comment: "Лифт стал заметно медленнее ехать между этажами, а двери закрываются не с первого раза.", entrance: 3,
    authorId: "resident-51", authorName: "Ковалёв Дмитрий Сергеевич", likes: 5, likedByMe: false, attachments: [],
    comments: [dispatcherComment(1009, "Заявка передана в лифтовую компанию, диагностику назначили в течение трёх рабочих дней.", "2026-09-21T18:40:00")],
  },

  // Дом №8
  {
    id: 10, createdAt: "2026-09-27T09:05:00", status: "in_progress", houseNumber: "8", categoryCode: "electricity",
    reason: "Нет света в квартире / подъезде / доме", comment: "С самого утра нет света во всём подъезде, лифт тоже не работает.", entrance: 5,
    authorId: "resident-14", authorName: "Кузнецова Мария Сергеевна", likes: 11, likedByMe: false, attachments: [],
    comments: [dispatcherComment(1010, "Проверяем: подтвердите, пожалуйста, весь ли подъезд без света или только отдельные квартиры — это поможет понять, авария на вводе или локальная проблема.", "2026-09-27T09:40:00")],
  },
  {
    id: 11, createdAt: "2026-09-17T13:50:00", status: "completed", houseNumber: "8", categoryCode: "yard",
    reason: "Сломаны детские / спортивные площадки", comment: "На детской площадке сломана качеля, торчит арматура — опасно для детей.", entrance: 0,
    authorId: "resident-53", authorName: "Новикова Анна Павловна", likes: 31, likedByMe: false, attachments: [],
    comments: [dispatcherComment(1011, "Качеля демонтирована, заказана новая секция, установка запланирована на этой неделе.", "2026-09-17T16:30:00")],
  },
  {
    id: 12, createdAt: "2026-09-26T06:40:00", status: "accepted", houseNumber: "8", categoryCode: "water",
    reason: "Нет горячей воды", comment: "Второй день нет горячей воды во всей квартире, из крана идёт только холодная.", entrance: 6,
    authorId: "resident-54", authorName: "Соколова Екатерина Игоревна", likes: 16, likedByMe: false, attachments: [], comments: [],
  },
  {
    id: 13, createdAt: "2026-09-16T10:10:00", status: "completed", houseNumber: "8", categoryCode: "entrance",
    reason: "Грязно / не убирают", comment: "В подъезде давно не убирались, на лестничных площадках пыль и мусор.", entrance: 0,
    authorId: "resident-52", authorName: "Петров Алексей Николаевич", likes: 6, likedByMe: false, attachments: [],
    comments: [dispatcherComment(1012, "Проведена внеплановая уборка всех этажей подъезда, соблюдение графика клининга взято на контроль.", "2026-09-16T14:00:00")],
  },
  ] as Omit<Appeal, "categoryTitle">[]
).map((a) => ({ ...a, categoryTitle: categoryByCode(a.categoryCode).title }));

/** Внутреннее хранимое уведомление: readBy не отдаётся клиенту напрямую, из него считается Notification.unread. */
export interface StoredNotification extends Omit<Notification, "unread"> {
  /** Кто уже открывал вкладку «Уведомления» и видел это уведомление: id жителя (me().id) или диспетчера */
  readBy: string[];
}

const seedNotifications = (): StoredNotification[] => (
  [
  {
    id: 1901, createdAt: "2026-09-26T10:00:00", houseNumber: "3", entrance: 0, categoryCode: "water",
    workType: "Опрессовка системы отопления", reason: "Опрессовка системы отопления", from: "2026-09-30T09:00:00", to: "2026-09-30T18:00:00",
    comment: "Уважаемые жители! 30 сентября с 9:00 до 18:00 будет проводиться опрессовка системы отопления. На это время возможны кратковременные отключения горячей воды и снижение давления. Просим заранее закрыть краны на приборах отопления, если они у вас установлены.",
    readBy: [DISPATCHER.id],
  },
  {
    id: 1902, createdAt: "2026-09-25T15:30:00", houseNumber: "5", entrance: 2, categoryCode: "lift",
    workType: "Плановое техническое обслуживание лифта", reason: "Плановое техническое обслуживание лифта", from: "2026-09-29T10:00:00", to: "2026-09-29T14:00:00",
    comment: "29 сентября со 10:00 до 14:00 лифт во втором подъезде будет остановлен для планового технического обслуживания. Просим заранее спланировать поездки и, при необходимости, пользоваться лестницей.",
    readBy: [DISPATCHER.id],
  },
  {
    id: 1903, createdAt: "2026-09-24T09:00:00", houseNumber: "8", entrance: 0, categoryCode: "electricity",
    workType: "Плановые работы на электросети", reason: "Плановые работы на электросети", from: "2026-09-28T11:00:00", to: "2026-09-28T15:00:00",
    comment: "28 сентября с 11:00 до 15:00 электросетевая компания проводит плановые работы на трансформаторной подстанции, обслуживающей дом. Возможно кратковременное отключение электроэнергии. Приносим извинения за неудобства.",
    readBy: [DISPATCHER.id],
  },
  {
    id: 1904, createdAt: "2026-09-15T11:20:00", houseNumber: "3", entrance: 0, categoryCode: "water",
    workType: "Отключение горячей воды на летнюю профилактику", reason: "Отключение горячей воды на летнюю профилактику", from: "2026-09-10T00:00:00", to: "2026-09-16T23:59:00",
    comment: "В связи с ежегодной гидравлической промывкой и опрессовкой сетей теплоснабжения в период с 10 по 16 сентября в доме будет отключено горячее водоснабжение. Приносим извинения за временные неудобства.",
    readBy: [DISPATCHER.id, ME.id],
  },
  ] as Omit<StoredNotification, "categoryTitle">[]
).map((n) => ({ ...n, categoryTitle: categoryByCode(n.categoryCode).title }));

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
    categoryTitle: categoryByCode(input.categoryCode).title,
    workType: input.workType, reason: input.workType, comment: input.comment, from: input.from, to: input.to,
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
