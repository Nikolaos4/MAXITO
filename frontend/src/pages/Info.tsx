import { useEffect, useState } from "react";
import { api } from "../api";
import { Accordion, KeyValueRow } from "../components/Accordion";
import { DoorIcon, StatBuildingIcon } from "../components/Icons";
import { PageHead } from "../components/PageHead";
import type { HouseInfo, Me } from "../types";

/** Раздел «Информация и контакты»: дом, УК, тарифы, аварийные службы — раскрываются по нажатию. */
export function Info({ me }: { me: Me }) {
  const [info, setInfo] = useState<HouseInfo | null>(null);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    api.getHouseInfo().then(setInfo).catch(() => setFailed(true));
  }, []);

  return (
    <>
      <PageHead title="Информация" />

      {failed && <p className="empty">Не удалось загрузить информацию о доме</p>}
      {!failed && !info && <p className="empty">Загрузка…</p>}

      {info && (
        <>
          <Accordion title="О доме" defaultOpen>
            <p className="info__label">Адрес:</p>
            <p>{info.address}</p>
            <div className="info__stats">
              <div>
                <span className="info__stat-label">Этажность</span>
                <span className="info__stat-value"><StatBuildingIcon width={28} height={28} />{info.floors}</span>
              </div>
              <div>
                <span className="info__stat-label">Подъезды</span>
                <span className="info__stat-value"><DoorIcon width={28} height={28} />{info.entrances}</span>
              </div>
              <div>
                <span className="info__stat-label">Построен</span>
                <span className="info__stat-value">{info.builtYear}</span>
              </div>
            </div>
          </Accordion>

          <Accordion title="Управляющая организация">
            <p className="info__label">Фирменное наименование</p>
            <p>{info.company.fullName}</p>
            <p className="info__label">Сокращённое наименование</p>
            <p>{info.company.shortName}</p>
            <p className="info__label">Диспетчерская</p>
            <p><a href={`tel:${info.company.dispatcherPhone}`}>{info.company.dispatcherPhone}</a></p>
            <p className="info__label">Контактный телефон</p>
            <p><a href={`tel:${info.company.contactPhone}`}>{info.company.contactPhone}</a></p>
            <p className="info__label">Адрес электронной почты</p>
            <p><a href={`mailto:${info.company.email}`}>{info.company.email}</a></p>
            <p className="info__label">Сайт организации</p>
            <p><a href={info.company.site} target="_blank" rel="noreferrer">{info.company.site}</a></p>
          </Accordion>

          <Accordion title="Тарифы">
            {info.tariffs.map((t) => <KeyValueRow key={t.title} label={t.title} value={t.price} />)}
          </Accordion>

          <Accordion title="Аварийные службы">
            {info.emergencyServices.map((s) => <KeyValueRow key={s.title} label={s.title} value={s.phone} />)}
          </Accordion>
        </>
      )}
    </>
  );
}
