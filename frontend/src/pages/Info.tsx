import { PageHead } from "../components/PageHead";
import type { Me } from "../types";

/** Заглушка раздела «Информация и контакты» — данные УК придут с бэкенда. */
export function Info({ me }: { me: Me }) {
  return (
    <>
      <PageHead title="Информация" />
      <div className="card info">
        <h3>Дом №{me.houseNumber}</h3>
        <p>Ваш подъезд: {me.entrance}</p>
        <p className="muted">Контакты управляющей компании и аварийно-диспетчерской службы появятся здесь позже.</p>
      </div>
    </>
  );
}
