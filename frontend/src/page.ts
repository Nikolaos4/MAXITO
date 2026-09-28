import { getStartParam } from "./max";

export type StartRole = "resident" | "dispatcher";

/**
 * Бот кодирует в start_param диплинка роль, вкладку и опционально доп. данные
 * одной строкой — "resident:feed" / "resident:create:elevator" — так фронт
 * может выбрать нужное приложение сразу, без похода в бэк за ролью (см.
 * Root.tsx). Третий сегмент режем целиком через indexOf, а не split(":"),
 * чтобы сам код темы (или что угодно ещё) мог включать двоеточие.
 */
export function parseStartPayload(): { role?: StartRole; tab?: string; extra?: string } {
  const raw = getStartParam();
  if (!raw) return {};

  const roleSep = raw.indexOf(":");
  if (roleSep === -1) return {};
  const role = raw.slice(0, roleSep);
  const rest = raw.slice(roleSep + 1);

  const extraSep = rest.indexOf(":");
  const tab = extraSep === -1 ? rest : rest.slice(0, extraSep);
  const extra = extraSep === -1 ? undefined : rest.slice(extraSep + 1);

  return {
    role: role === "resident" || role === "dispatcher" ? role : undefined,
    tab,
    extra,
  };
}

/**
 * Определяет, с какой вкладки открыть мини-апп — по вкладке из start_param
 * бота (если приложение открыто изнутри MAX) или по ?page=... в ссылке. Так
 * бот может прислать житителю/диспетчеру прямую ссылку на нужный раздел, а
 * не всегда открывать его с первой вкладки.
 *
 * start_param в приоритете: он приходит из подписанного диплинка конкретно
 * для этого запуска, а ?page=... в адресной строке — это то, что записал
 * syncTabToUrl при предыдущем открытии (или зашито в базовый URL мини-аппа
 * при регистрации в MAX) — без приоритета start_param диплинк на другую
 * вкладку молча перебивался бы этим старым/статическим значением, и
 * приложение всегда открывалось бы на одной и той же вкладке.
 */
export function resolveInitialTab<T extends string>(validTabs: readonly T[], fallback: T, startTab?: string): T {
  const fromUrl = new URLSearchParams(window.location.search).get("page");
  const candidate = startTab ?? fromUrl;
  return (validTabs as readonly string[]).includes(candidate ?? "") ? (candidate as T) : fallback;
}

/**
 * Держит ?page=... в адресной строке в актуальном состоянии при переключении вкладок
 * внутри уже открытого приложения — без этого адрес меняется только при переходе по ссылке.
 */
export function syncTabToUrl(tab: string) {
  const url = new URL(window.location.href);
  url.searchParams.set("page", tab);
  window.history.replaceState(null, "", url);
}
