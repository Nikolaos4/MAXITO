import { useEffect, useState } from "react";
import { api } from "../api";
import { Accordion, KeyValueRow } from "../../components/Accordion";
import { DoorIcon, StatBuildingIcon, UserIcon } from "../../components/Icons";
import { PageHead } from "../../components/PageHead";
import { Select } from "../../components/Select";
import type { HouseInfo } from "../../types";

/** Информация о доме диспетчера: выбор дома + число зарегистрированных жильцов. */
export function Info() {
  const [houses, setHouses] = useState<HouseInfo[] | null>(null);
  const [houseNumber, setHouseNumber] = useState("");
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    api.getHouses().then((list) => { setHouses(list); if (list[0]) setHouseNumber(list[0].number); }).catch(() => setFailed(true));
  }, []);

  const info = houses?.find((h) => h.number === houseNumber);

  return (
    <>
      <PageHead title="Информация" />

      {failed && <p className="empty">Не удалось загрузить информацию о домах</p>}
      {!failed && !houses && <p className="empty">Загрузка…</p>}

      {houses && (
        <>
          <p className="form__label house-select__label">Выбран дом</p>
          <Select className="house-select" value={houseNumber} placeholder="Дом" onChange={setHouseNumber}
            options={houses.map((h) => ({ value: h.number, label: `Дом №${h.number}` }))} />
        </>
      )}

      {info && (
        <>
          <Accordion title="О доме" defaultOpen>
            {info.address && <p className="info__label">Адрес:</p>}
            {info.address && <p>{info.address}</p>}
            <div className="info__stats">
              {info.floors !== undefined && (
                <div>
                  <span className="info__stat-label">Этажность</span>
                  <span className="info__stat-value"><StatBuildingIcon width={28} height={28} />{info.floors}</span>
                </div>
              )}
              <div>
                <span className="info__stat-label">Подъезды</span>
                <span className="info__stat-value"><DoorIcon width={28} height={28} />{info.entrances}</span>
              </div>
              {info.builtYear !== undefined && (
                <div>
                  <span className="info__stat-label">Построен</span>
                  <span className="info__stat-value">{info.builtYear}</span>
                </div>
              )}
              {info.residentsCount !== undefined && (
                <div>
                  <span className="info__stat-label">Жильцы</span>
                  <span className="info__stat-value"><UserIcon width={28} height={28} />{info.residentsCount}</span>
                </div>
              )}
            </div>
            {info.chatInviteLink !== undefined && (
              <>
                <p className="info__label">Общий чат дома</p>
                {info.chatInviteLink ? (
                  <p><a href={info.chatInviteLink} target="_blank" rel="noreferrer">{info.chatInviteLink}</a></p>
                ) : (
                  <p className="muted">Диспетчер ещё не завёл ссылку</p>
                )}
              </>
            )}
          </Accordion>

          {info.company && (
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
          )}

          {info.tariffs && (
            <Accordion title="Тарифы">
              {info.tariffs.map((t) => <KeyValueRow key={t.title} label={t.title} value={t.price} />)}
            </Accordion>
          )}

          {info.emergencyServices && (
            <Accordion title="Аварийные службы">
              {info.emergencyServices.map((s) => <KeyValueRow key={s.title} label={s.title} value={s.phone} />)}
            </Accordion>
          )}
        </>
      )}
    </>
  );
}
