import { ensureAuthToken, getMaxUser } from "../max";
import type { BackendErrorBody, BackendNotification } from "./types";

const BASE = import.meta.env.VITE_API_BASE_URL ?? "/api/v1";
// Только для разработки/теста вне MAX, где взять телефон неоткуда иначе —
// см. .env.example. Внутри MAX бот уже привязал max_user_id заранее.
const DEV_PHONE = import.meta.env.VITE_DEV_PHONE as string | undefined;

export class BackendError extends Error {
  constructor(
    public status: number,
    message: string,
    public existingAppealId?: number,
    /** Машиночитаемый код ошибки (см. handlers/*) — например "blocked_by_notification" */
    public code?: string,
    /** Уведомление, из-за которого создание обращения заблокировано — только для code "blocked_by_notification" */
    public blockingNotification?: BackendNotification,
  ) {
    super(message);
  }
}

function buildQuery(params?: Record<string, string | number | (string | number)[] | undefined>) {
  if (!params) return "";
  const usp = new URLSearchParams();
  for (const [key, value] of Object.entries(params)) {
    if (value === undefined) continue;
    for (const v of Array.isArray(value) ? value : [value]) usp.append(key, String(v));
  }
  const qs = usp.toString();
  return qs ? `?${qs}` : "";
}

async function authHeaders(): Promise<Record<string, string>> {
  const token = await ensureAuthToken();
  const user = getMaxUser();
  return {
    // Внутри MAX initData уже обменяли на JWT (см. max.ts) — шлём его.
    // Вне MAX без JWT остаётся старая схема для отладки (см. ALLOW_DEV_HEADERS
    // на бэкенде): X-Max-User-Id + X-Max-User-Phone для первой привязки.
    ...(token ? { Authorization: `Bearer ${token}` } : { "X-Max-User-Id": user?.id ?? "" }),
    ...(DEV_PHONE ? { "X-Max-User-Phone": DEV_PHONE } : {}),
  };
}

export async function backendRequest<T>(
  path: string,
  init?: RequestInit & { query?: Record<string, string | number | (string | number)[] | undefined> },
): Promise<T> {
  const { query, ...rest } = init ?? {};
  const res = await fetch(BASE + path + buildQuery(query), {
    ...rest,
    headers: {
      "Content-Type": "application/json",
      ...(await authHeaders()),
      ...rest.headers,
    },
  });

  if (res.status === 204) return undefined as T;

  let body: unknown = null;
  const text = await res.text();
  if (text) {
    try { body = JSON.parse(text); } catch { /* не JSON — оставляем как есть */ }
  }

  if (!res.ok) {
    const err = (body ?? {}) as BackendErrorBody;
    throw new BackendError(res.status, err.error ?? res.statusText, err.existing_appeal_id, err.code, err.blocking_notification);
  }
  return body as T;
}

/**
 * POST /upload — общий эндпоинт загрузки файла для обеих ролей (см.
 * UploadHandler в backend/internal/handlers/common/upload.go). Поле формы —
 * ровно "file"; до 10 МБ, только jpg/jpeg/png/webp/gif (проверяется по
 * расширению, не по содержимому). Возвращает публичную ссылку, которую
 * дальше передают как есть в photo_url/photo_urls — сам бэкенд файлы через
 * эти эндпоинты не принимает.
 */
export async function uploadFile(file: File): Promise<string> {
  const form = new FormData();
  form.append("file", file);

  const res = await fetch(`${BASE}/upload`, {
    method: "POST",
    headers: await authHeaders(), // без Content-Type — fetch сам проставит multipart-границу
    body: form,
  });

  const text = await res.text();
  let body: unknown = null;
  if (text) {
    try { body = JSON.parse(text); } catch { /* не JSON — оставляем как есть */ }
  }

  if (!res.ok) {
    const err = (body ?? {}) as BackendErrorBody;
    throw new BackendError(res.status, err.error ?? res.statusText);
  }
  return (body as { url: string }).url;
}
