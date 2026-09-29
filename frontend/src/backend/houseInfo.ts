import type { HouseInfo } from "../types";
import type { BackendCompany, BackendEmergencyService, BackendHouse } from "./types";

/**
 * Собирает HouseInfo из ответов реального бэкенда — общий код для жителя и
 * диспетчера (см. api/http.ts и dispatcher/api/http.ts), у них одинаковая
 * форма карточки дома, разница только в том, откуда берётся сам House и
 * что диспетчер может переключаться между несколькими домами.
 *
 * number — это house_id, а не BackendHouse.number (настоящий номер корпуса
 * бэкенд нигде не показывает жителю/диспетчеру отдельно от address) — так
 * уже было сделано в getMe()/listAppeals() и т.д., держим то же соглашение.
 */
export function adaptHouseInfo(
  house: BackendHouse,
  company: BackendCompany | undefined,
  emergencyServices: BackendEmergencyService[] | undefined,
  chatInviteLink?: string | null,
): HouseInfo {
  const hasCompany = !!company && !!(
    company.full_name || company.short_name || company.dispatcher_phone || company.contact_phone || company.email || company.website
  );

  return {
    number: String(house.id),
    entrances: house.entrances_count,
    address: house.address || undefined,
    floors: house.floors_count ?? undefined,
    builtYear: house.construction_year ?? undefined,
    // Своя ссылка (аргумент chatInviteLink) в приоритете — она приходит с
    // отдельной ручки .../chat-link, которая всегда явно отдаёт null, если
    // ссылки ещё нет; в house.chat_invite_link то же поле может просто
    // отсутствовать в JSON (omitempty на нулевом указателе).
    chatInviteLink: chatInviteLink !== undefined ? chatInviteLink : house.chat_invite_link,
    company: hasCompany
      ? {
          fullName: company!.full_name ?? "",
          shortName: company!.short_name ?? "",
          dispatcherPhone: company!.dispatcher_phone ?? "",
          contactPhone: company!.contact_phone ?? "",
          email: company!.email ?? "",
          site: company!.website ?? "",
        }
      : undefined,
    emergencyServices: emergencyServices?.length
      ? emergencyServices.map((s) => ({ title: s.name, phone: s.phone }))
      : undefined,
    // Тарифы и число жильцов бэкенд пока нигде не отдаёт — остаются undefined,
    // соответствующие блоки Info.tsx их и так не рисуют без данных.
  };
}
