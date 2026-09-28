/** Обёртка над MAX WebApp bridge (window.WebApp). Вне MAX работает без него. */
interface MaxUser {
  id: number;
  first_name?: string;
  last_name?: string;
}

interface MaxWebApp {
  ready?: () => void;
  initData?: string;
  initDataUnsafe?: { user?: MaxUser; start_param?: string };
}

const webApp = (): MaxWebApp | undefined => (window as unknown as { WebApp?: MaxWebApp }).WebApp;

const API_BASE = import.meta.env.VITE_API_BASE_URL ?? "/api/v1";

let authToken: string | null = null;
let authPromise: Promise<string | null> | null = null;

export const getAuthToken = () => authToken;

// Меняет подписанный MAX'ом initData на наш JWT — см. POST /auth/max на
// бэкенде (internal/handlers/common/auth.go). Без initData (открыто вне MAX,
// локальная разработка) вход не выполняется — backendRequest тогда падает
// обратно на X-Max-User-Id, если на бэкенде включён ALLOW_DEV_HEADERS.
async function loginWithMax(): Promise<string | null> {
  const initData = getInitData();
  if (!initData) return null;

  try {
    const res = await fetch(`${API_BASE}/auth/max`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ init_data: initData }),
    });
    if (!res.ok) {
      console.error("MAX auth failed:", res.status, await res.text().catch(() => ""));
      return null;
    }
    const data = (await res.json()) as { token: string };
    authToken = data.token;
    return authToken;
  } catch (e) {
    console.error("MAX auth failed:", e);
    return null;
  }
}

// Запускает обмен initData на JWT не более одного раза за сессию и отдаёт
// его результат всем, кто ждёт токен (в т.ч. параллельным запросам).
export function ensureAuthToken(): Promise<string | null> {
  return (authPromise ??= loginWithMax());
}

export function initMax() {
  webApp()?.ready?.();
  void ensureAuthToken();
}

export function getMaxUser(): { id: string; fullName: string } | null {
  const u = webApp()?.initDataUnsafe?.user;
  if (!u) return null;
  return { id: String(u.id), fullName: [u.last_name, u.first_name].filter(Boolean).join(" ") || "Житель" };
}

export const getInitData = () => webApp()?.initData ?? "";

export const getStartParam = () => webApp()?.initDataUnsafe?.start_param;
