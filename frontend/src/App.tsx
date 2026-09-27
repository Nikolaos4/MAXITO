import { useCallback, useEffect, useState } from "react";
import { api } from "./api";
import { TabBar, type Tab } from "./components/TabBar";
import { Toast } from "./components/Toast";
import { CreateAppeal, resolveCategoryCode } from "./pages/CreateAppeal";
import { Feed } from "./pages/Feed";
import { Info } from "./pages/Info";
import { Notifications } from "./pages/Notifications";
import { resolveInitialTab, syncTabToUrl } from "./page";
import type { Me } from "./types";

const TABS = ["create", "feed", "notifications", "info"] as const;

export function App({ initialTab }: { initialTab?: string } = {}) {
  const [me, setMe] = useState<Me | null>(null);
  const [failed, setFailed] = useState(false);
  const [tab, setTab] = useState<Tab>(() => resolveInitialTab(TABS, "create", initialTab));
  const [categoryCode, setCategoryCode] = useState<string | null>(resolveCategoryCode);
  const [toast, setToast] = useState("");
  const [justCreated, setJustCreated] = useState(false);
  const [hasUnread, setHasUnread] = useState(false);
  const hideToast = useCallback(() => setToast(""), []);
  const refreshUnread = useCallback(() => {
    Promise.all([api.getUnreadNotificationsCount(), api.getNeedInfoAppeals()])
      .then(([n, needInfo]) => setHasUnread(n > 0 || needInfo.length > 0))
      .catch(() => {});
  }, []);

  useEffect(() => {
    api.getMe().then(setMe).catch(() => setFailed(true));
  }, []);

  useEffect(() => {
    if (me) refreshUnread();
  }, [me, refreshUnread]);

  useEffect(() => syncTabToUrl(tab), [tab]);

  function changeTab(next: Tab) {
    setJustCreated(false);
    // Повторное нажатие на «+» возвращает к выбору проблемы
    if (next === "create" && tab === "create") setCategoryCode(null);
    setTab(next);
  }

  if (failed) return <main className="screen"><p className="empty">Не удалось загрузить профиль. Откройте приложение из бота MAX.</p></main>;
  if (!me) return <main className="screen"><p className="empty">Загрузка…</p></main>;

  return (
    <>
      {toast && <Toast message={toast} onHide={hideToast} />}
      <main className="screen">
        {tab === "create" && (
          <CreateAppeal me={me} categoryCode={categoryCode} onPick={setCategoryCode} onBack={() => setCategoryCode(null)}
            onCreated={() => { setCategoryCode(null); setJustCreated(true); setToast("Обращение направлено"); setTab("feed"); }}
            onViewExisting={() => { setJustCreated(false); setTab("feed"); }} />
        )}
        {tab === "feed" && <Feed me={me} initialFeed={justCreated ? "mine" : "house"} />}
        {tab === "notifications" && <Notifications onRead={refreshUnread} />}
        {tab === "info" && <Info me={me} />}
      </main>
      <TabBar tab={tab} onChange={changeTab} hasUnread={hasUnread} />
    </>
  );
}
