import { useEffect, useState } from "react";
import { App as ResidentApp } from "./App";
import { App as DispatcherApp } from "./dispatcher/App";
import { backendRequest } from "./backend/request";
import type { BackendMe } from "./backend/types";
import { parseStartPayload, type StartRole } from "./page";

// В моках нет бэка, значит и /me спросить не у кого — единственный источник
// роли там это start_param, а без него просто показываем житель по умолчанию.
const isMock = import.meta.env.VITE_USE_MOCK !== "false";

export function Root() {
  const { role: startRole, tab } = parseStartPayload();
  const [role, setRole] = useState<StartRole | null>(startRole ?? null);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    if (role) return;

    if (isMock) {
      setRole("resident");
      return;
    }

    backendRequest<BackendMe>("/me")
      .then((me) => setRole(me.role === "dispatcher" ? "dispatcher" : "resident"))
      .catch(() => setFailed(true));
    // Разовое определение роли при монтировании — role меняться сам по себе не должен.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  if (failed) {
    return (
      <main className="screen">
        <p className="empty">Не удалось определить роль. Откройте приложение из бота MAX.</p>
      </main>
    );
  }
  if (!role) return <main className="screen"><p className="empty">Загрузка…</p></main>;

  return role === "dispatcher" ? <DispatcherApp initialTab={tab} /> : <ResidentApp initialTab={tab} />;
}
