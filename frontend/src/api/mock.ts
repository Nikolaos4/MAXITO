import { getMaxUser } from "../max";
import type { Appeal, Attachment, Me } from "../types";
import type { Api } from "./types";

const KEY = "maxito:mock:v6";
const delay = <T>(v: T) => new Promise<T>((r) => setTimeout(() => r(v), 150));

const demoText =
  "Уже три дня работает лифт!! Перед этим лифт издавал странные звуки. Я живу на 13 этаже. Подниматься по лестнице пешком невозможно.";

const seed = (): Appeal[] => [
  {
    id: 1, createdAt: "2026-09-29T12:48:00", status: "rejected", categoryCode: "lift",
    reason: "Не работает", comment: demoText, entrance: 2,
    authorId: "demo-1", authorName: "Иванов Иван Иванович", likes: 135, likedByMe: false, attachments: [],
    comments: [
      { id: 1, authorId: "demo-5", authorName: "Петрова Елена Петровна", text: "Согласен! Три дня это уже перебор.", createdAt: "2026-09-29T12:48:00" },
      { id: 2, authorId: "demo-6", authorName: "Петрова Елена Петровна", text: "Согласен! Три дня это уже перебор.", createdAt: "2026-09-29T12:50:00" },
    ],
  },
  {
    id: 2, createdAt: "2026-09-29T12:48:00", status: "accepted", categoryCode: "lift",
    reason: "Шумы", comment: demoText, entrance: 1,
    authorId: "demo-2", authorName: "Иванов Иван Иванович", likes: 135, likedByMe: false, attachments: [],
    comments: [{ id: 3, authorId: "demo-5", authorName: "Петрова Елена Петровна", text: "Согласен! Три дня это уже перебор.", createdAt: "2026-09-29T12:48:00" }],
  },
  {
    id: 3, createdAt: "2026-09-27T09:10:00", status: "in_progress", categoryCode: "water",
    reason: "Слабый напор", comment: "Второй день слабый напор воды, на верхних этажах вода почти не идёт.", entrance: 2,
    authorId: "demo-3", authorName: "Сидоров Пётр Алексеевич", likes: 12, likedByMe: false, comments: [], attachments: [],
  },
  {
    id: 4, createdAt: "2026-09-26T18:30:00", status: "completed", categoryCode: "yard",
    reason: "Не вывезен мусор", comment: "Контейнеры переполнены, мусор лежит рядом.", entrance: 3,
    authorId: "demo-4", authorName: "Кузнецова Мария Сергеевна", likes: 7, likedByMe: false, comments: [], attachments: [],
  },
];

interface Store { appeals: Appeal[]; nextId: number }

function load(): Store {
  try {
    const raw = localStorage.getItem(KEY);
    if (raw) return JSON.parse(raw) as Store;
  } catch { /* localStorage недоступен — работаем в памяти */ }
  return { appeals: seed(), nextId: 100 };
}

let store = load();
// Blob-ссылки на видео живут только в текущей сессии, поэтому в localStorage их не пишем.
// Настоящий бэкенд отдаёт постоянные url.
const save = () => {
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

async function toAttachment(f: File): Promise<Attachment> {
  return f.type.startsWith("video/")
    ? { name: f.name, kind: "video", url: URL.createObjectURL(f) }
    : { name: f.name, kind: "image", url: await downscale(f) };
}

const me = (): Me => {
  const u = getMaxUser();
  // Данные жителя приходят из MAX; дом/подъезд — из профиля жителя на бэкенде (здесь демо).
  return { id: u?.id ?? "me", fullName: u?.fullName ?? "Иванов Иван Иванович", houseNumber: "3", entrance: 2, entrances: 4 };
};

const find = (id: number) => {
  const a = store.appeals.find((x) => x.id === id);
  if (!a) throw new Error("Обращение не найдено");
  return a;
};

export const mockApi: Api = {
  getMe: () => delay(me()),

  listAppeals: (feed) => {
    const m = me();
    const list = store.appeals.filter((a) =>
      feed === "house" ? true : feed === "entrance" ? a.entrance === m.entrance || a.entrance === 0 : a.authorId === m.id,
    );
    return delay([...list].sort((a, b) => b.createdAt.localeCompare(a.createdAt) || b.id - a.id));
  },

  createAppeal: async (input) => {
    const m = me();
    const attachments = await Promise.all(input.files.map(toAttachment));
    const appeal: Appeal = {
      id: store.nextId++, createdAt: new Date().toISOString(), status: "accepted",
      categoryCode: input.categoryCode, reason: input.reason, comment: input.comment,
      entrance: input.entrance, authorId: m.id, authorName: m.fullName, likes: 0, likedByMe: false, comments: [], attachments,
    };
    store.appeals.unshift(appeal);
    save();
    return delay(appeal);
  },

  toggleLike: (id) => {
    const a = find(id);
    a.likedByMe = !a.likedByMe;
    a.likes += a.likedByMe ? 1 : -1;
    save();
    return delay({ ...a });
  },

  addComment: (id, text) => {
    const a = find(id);
    const m = me();
    if (a.comments.some((c) => c.authorId === m.id)) throw new Error("Вы уже оставили комментарий");
    a.comments.push({ id: store.nextId++, authorId: m.id, authorName: m.fullName, text, createdAt: new Date().toISOString() });
    save();
    return delay({ ...a });
  },

  editComment: (id, commentId, text) => {
    const a = find(id);
    const c = a.comments.find((x) => x.id === commentId && x.authorId === me().id);
    if (!c) throw new Error("Комментарий не найден");
    c.text = text;
    save();
    return delay({ ...a });
  },

  deleteComment: (id, commentId) => {
    const a = find(id);
    a.comments = a.comments.filter((x) => !(x.id === commentId && x.authorId === me().id));
    save();
    return delay({ ...a });
  },
};
