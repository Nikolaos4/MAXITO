import { useCallback, useEffect, useState } from "react";
import { api } from "./api";
import { TabBar, type Tab } from "./components/TabBar";
import { Toast } from "./components/Toast";
import { CreateAppeal, resolveCategory } from "./pages/CreateAppeal";
import { Feed } from "./pages/Feed";
import { Info } from "./pages/Info";
import type { Category, Me } from "./types";

export function App() {
  const [me, setMe] = useState<Me | null>(null);
  const [failed, setFailed] = useState(false);
  const [tab, setTab] = useState<Tab>("create");
  const [category, setCategory] = useState<Category | null>(resolveCategory);
  const [toast, setToast] = useState("");
  const [justCreated, setJustCreated] = useState(false);
  const hideToast = useCallback(() => setToast(""), []);

  useEffect(() => {
    api.getMe().then(setMe).catch(() => setFailed(true));
  }, []);

  function changeTab(next: Tab) {
    setJustCreated(false);
    // Повторное нажатие на «+» возвращает к выбору проблемы
    if (next === "create" && tab === "create") setCategory(null);
    setTab(next);
  }

  if (failed) return <main className="screen"><p className="empty">Не удалось загрузить профиль. Откройте приложение из бота MAX.</p></main>;
  if (!me) return <main className="screen"><p className="empty">Загрузка…</p></main>;

  return (
    <>
      {toast && <Toast message={toast} onHide={hideToast} />}
      <main className="screen">
        {tab === "create" && (
          <CreateAppeal me={me} category={category} onPick={setCategory} onBack={() => setCategory(null)}
            onCreated={() => { setCategory(null); setJustCreated(true); setToast("Обращение направлено"); setTab("feed"); }} />
        )}
        {tab === "feed" && <Feed me={me} initialFeed={justCreated ? "mine" : "house"} />}
        {tab === "info" && <Info me={me} />}
      </main>
      <TabBar tab={tab} onChange={changeTab} />
    </>
  );
}
