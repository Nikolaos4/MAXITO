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

export function initMax() {
  webApp()?.ready?.();
}

export function getMaxUser(): { id: string; fullName: string } | null {
  const u = webApp()?.initDataUnsafe?.user;
  if (!u) return null;
  return { id: String(u.id), fullName: [u.last_name, u.first_name].filter(Boolean).join(" ") || "Житель" };
}

export const getInitData = () => webApp()?.initData ?? "";

export const getStartParam = () => webApp()?.initDataUnsafe?.start_param;
