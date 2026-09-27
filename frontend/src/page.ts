import { getStartParam } from "./max";

/**
 * Определяет, с какой вкладки открыть мини-апп — по ?page=... в ссылке или,
 * если приложение открыто изнутри MAX, по start_param бота. Так бот может
 * прислать житителю/диспетчеру прямую ссылку на нужный раздел, а не всегда
 * открывать его с первой вкладки.
 */
export function resolveInitialTab<T extends string>(validTabs: readonly T[], fallback: T): T {
  const fromUrl = new URLSearchParams(window.location.search).get("page");
  const candidate = fromUrl ?? getStartParam();
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
