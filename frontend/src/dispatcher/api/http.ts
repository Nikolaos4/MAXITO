import { getInitData, getMaxUser } from "../../max";
import type { DispatcherApi } from "./types";

const BASE = import.meta.env.VITE_API_BASE_URL ?? "/api/v1";

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const isForm = init?.body instanceof FormData;
  const user = getMaxUser();
  const res = await fetch(BASE + path, {
    ...init,
    headers: {
      ...(isForm ? {} : { "Content-Type": "application/json" }),
      "X-Max-User-Id": user?.id ?? "",
      "X-Max-Init-Data": getInitData(),
      ...init?.headers,
    },
  });
  if (!res.ok) throw new Error(`${res.status} ${res.statusText}`);
  return res.json() as Promise<T>;
}

// Эндпоинты диспетчера на бэкенде ещё не реализованы — пути ниже это контракт,
// под который бэкенд нужно доработать (или поправить здесь).
export const httpApi: DispatcherApi = {
  getMe: () => request("/dispatcher/me"),
  getHouses: () => request("/dispatcher/houses"),
  listAppeals: (houseNumber) => request(`/dispatcher/appeals?house=${houseNumber}`),
  createPlannedWork: (input) => request("/dispatcher/planned-works", { method: "POST", body: JSON.stringify(input) }),
  changeStatus: (id, { files, ...fields }) => {
    const form = new FormData();
    form.append("data", JSON.stringify(fields));
    files.forEach((f) => form.append("files", f));
    return request(`/dispatcher/appeals/${id}/status`, { method: "POST", body: form });
  },
  addComment: (id, text) =>
    request(`/dispatcher/appeals/${id}/comments`, { method: "POST", body: JSON.stringify({ text }) }),
  editComment: (id, commentId, text) =>
    request(`/dispatcher/appeals/${id}/comments/${commentId}`, { method: "PUT", body: JSON.stringify({ text }) }),
  deleteComment: (id, commentId) =>
    request(`/dispatcher/appeals/${id}/comments/${commentId}`, { method: "DELETE" }),
};
