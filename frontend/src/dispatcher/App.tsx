import { useCallback, useState } from "react";
import { Toast } from "../components/Toast";
import { Feed } from "./pages/Feed";
import { Info } from "./pages/Info";
import { PlannedWork } from "./pages/PlannedWork";
import { TabBar, type Tab } from "./components/TabBar";

export function App() {
  const [tab, setTab] = useState<Tab>("create");
  const [toast, setToast] = useState("");
  const hideToast = useCallback(() => setToast(""), []);

  return (
    <>
      {toast && <Toast message={toast} onHide={hideToast} />}
      <main className="screen">
        {tab === "create" && <PlannedWork onCreated={() => setToast("Плановые работы опубликованы")} />}
        {tab === "feed" && <Feed />}
        {tab === "info" && <Info />}
      </main>
      <TabBar tab={tab} onChange={setTab} />
    </>
  );
}
