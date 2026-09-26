import { getInitData, getMaxUser } from "../max";
import type { Api } from "./types";

const BASE = import.meta.env.VITE_API_BASE_URL ?? "/api/v1";

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const isForm = init?.body instanceof FormData;
  const user = getMaxUser();
  const res = await fetch(BASE + path, {
    ...init,
    headers: {
      // для FormData браузер сам ставит boundary
      ...(isForm ? {} : { "Content-Type": "application/json" }),
      // Как в боте: житель определяется по MAX user id
      "X-Max-User-Id": user?.id ?? "",
      "X-Max-Init-Data": getInitData(),
      ...init?.headers,
    },
  });
  if (!res.ok) throw new Error(`${res.status} ${res.statusText}`);
  return res.json() as Promise<T>;
}

// Эндпоинты жителя на бэкенде ещё не реализованы — пути ниже это контракт,
// под который бэкенд нужно доработать (или поправить здесь).
export const httpApi: Api = {
  getMe: () => request("/resident/me"),
  listAppeals: (feed) => request(`/resident/appeals?feed=${feed}`),
  createAppeal: ({ files, ...fields }) => {
    const form = new FormData();
    form.append("data", JSON.stringify(fields));
    files.forEach((f) => form.append("files", f));
    return request("/resident/appeals", { method: "POST", body: form });
  },
  toggleLike: (id) => request(`/resident/appeals/${id}/like`, { method: "POST" }),
  addComment: (id, text) =>
    request(`/resident/appeals/${id}/comments`, { method: "POST", body: JSON.stringify({ text }) }),
  editComment: (id, commentId, text) =>
    request(`/resident/appeals/${id}/comments/${commentId}`, { method: "PUT", body: JSON.stringify({ text }) }),
  deleteComment: (id, commentId) =>
    request(`/resident/appeals/${id}/comments/${commentId}`, { method: "DELETE" }),
};
