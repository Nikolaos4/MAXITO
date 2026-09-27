import { getStartParam } from "./max";

export type StartRole = "resident" | "dispatcher";

/**
 * Бот кодирует в start_param диплинка и роль, и вкладку одной строкой —
 * "resident:feed" / "dispatcher:create" — так фронт может выбрать нужное
 * приложение сразу, без похода в бэк за ролью (см. Root.tsx).
 */
export function parseStartPayload(): { role?: StartRole; tab?: string } {
  const raw = getStartParam();
  if (!raw) return {};

  const [role, tab] = raw.split(":");
  return {
    role: role === "resident" || role === "dispatcher" ? role : undefined,
    tab,
  };
}

/**
 * Определяет, с какой вкладки открыть мини-апп — по ?page=... в ссылке или,
 * если приложение открыто изнутри MAX, по вкладке из start_param бота. Так
 * бот может прислать житителю/диспетчеру прямую ссылку на нужный раздел, а
 * не всегда открывать его с первой вкладки.
 */
export function resolveInitialTab<T extends string>(validTabs: readonly T[], fallback: T, startTab?: string): T {
  const fromUrl = new URLSearchParams(window.location.search).get("page");
  const candidate = fromUrl ?? startTab;
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
