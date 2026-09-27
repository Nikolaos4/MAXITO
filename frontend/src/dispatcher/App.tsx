import { useCallback, useEffect, useState } from "react";
import { api } from "./api";
import { Toast } from "../components/Toast";
import { Feed } from "./pages/Feed";
import { Info } from "./pages/Info";
import { Notifications } from "./pages/Notifications";
import { PlannedWork } from "./pages/PlannedWork";
import { TabBar, type Tab } from "./components/TabBar";
import { resolveInitialTab, syncTabToUrl } from "../page";

const TABS = ["create", "feed", "notifications", "info"] as const;

export function App() {
  const [tab, setTab] = useState<Tab>(() => resolveInitialTab(TABS, "create"));
  const [toast, setToast] = useState("");
  const [hasUnread, setHasUnread] = useState(false);
  const hideToast = useCallback(() => setToast(""), []);
  const refreshUnread = useCallback(() => {
    api.getUnreadNotificationsCount().then((n) => setHasUnread(n > 0)).catch(() => {});
  }, []);

  useEffect(refreshUnread, [refreshUnread]);
  useEffect(() => syncTabToUrl(tab), [tab]);

  return (
    <>
      {toast && <Toast message={toast} onHide={hideToast} />}
      <main className="screen">
        {tab === "create" && <PlannedWork onCreated={() => { setToast("Плановые работы опубликованы"); refreshUnread(); }} />}
        {tab === "feed" && <Feed />}
        {tab === "notifications" && <Notifications onRead={refreshUnread} />}
        {tab === "info" && <Info />}
      </main>
      <TabBar tab={tab} onChange={setTab} hasUnread={hasUnread} />
    </>
  );
}
