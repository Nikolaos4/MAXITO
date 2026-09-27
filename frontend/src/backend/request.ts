import { getMaxUser } from "../max";
import type { BackendErrorBody } from "./types";

const BASE = import.meta.env.VITE_API_BASE_URL ?? "/api/v1";
// Только для разработки/теста вне MAX, где взять телефон неоткуда иначе —
// см. .env.example. Внутри MAX бот уже привязал max_user_id заранее.
const DEV_PHONE = import.meta.env.VITE_DEV_PHONE as string | undefined;

export class BackendError extends Error {
  constructor(public status: number, message: string, public existingAppealId?: number) {
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

export async function backendRequest<T>(
  path: string,
  init?: RequestInit & { query?: Record<string, string | number | (string | number)[] | undefined> },
): Promise<T> {
  const { query, ...rest } = init ?? {};
  const user = getMaxUser();
  const res = await fetch(BASE + path + buildQuery(query), {
    ...rest,
    headers: {
      "Content-Type": "application/json",
      "X-Max-User-Id": user?.id ?? "",
      ...(DEV_PHONE ? { "X-Max-User-Phone": DEV_PHONE } : {}),
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
    throw new BackendError(res.status, err.error ?? res.statusText, err.existing_appeal_id);
  }
  return body as T;
}
