import { Keyboard } from "@maxhub/max-bot-api";

export const MENU_TEXT = "Главное меню представителя. Выберите действие:";

export const mainMenuKeyboard = Keyboard.inlineKeyboard([
    [Keyboard.button.callback("Добавить дом", "menu:add_house")],
    [Keyboard.button.callback("Загрузить дома из CSV", "menu:import_houses")],
    [Keyboard.button.callback("Добавить диспетчера", "menu:add_dispatcher")],
    [Keyboard.button.callback("Загрузить диспетчеров из CSV", "menu:import_dispatchers")],
    [Keyboard.button.callback("Загрузить жителей из CSV", "menu:import_residents")],
]);

export const backToMenuKeyboard = Keyboard.inlineKeyboard([[Keyboard.button.callback("В главное меню", "menu:show")]]);

export const cancelKeyboard = Keyboard.inlineKeyboard([[Keyboard.button.callback("Отмена", "flow:cancel")]]);

// ponytail: веб-приложений ещё нет, ссылки-заглушки — заменить на реальные, когда появятся.
const DISPATCHER_APPEALS_URL = "https://example.com/dispatcher/appeals";
const DISPATCHER_NOTIFICATIONS_URL = "https://example.com/dispatcher/notifications";

export const DISPATCHER_MENU_TEXT = "Меню диспетчера. Выберите действие:";

export const dispatcherMenuKeyboard = Keyboard.inlineKeyboard([
    [Keyboard.button.link("Обращения", DISPATCHER_APPEALS_URL)],
    [Keyboard.button.callback("Горячие обращения", "dispatcher_menu:top_appeals")],
    [Keyboard.button.callback("Статистика по домам", "dispatcher_menu:stats")],
    [Keyboard.button.link("Уведомления", DISPATCHER_NOTIFICATIONS_URL)],
]);

export const backToDispatcherMenuKeyboard = Keyboard.inlineKeyboard([
    [Keyboard.button.callback("В меню", "dispatcher_menu:show")],
]);

export const RESIDENT_MENU_TEXT = "Главное меню жителя. Выберите действие:";

// ponytail: мини-приложения ещё не готовы — ссылки-заглушки, заменить на
// реальные, когда появятся.
const RESIDENT_APPEAL_FORM_URL = "https://example.com/resident/appeal";
const RESIDENT_APPEALS_URL = "https://example.com/resident/appeals";
const RESIDENT_NOTIFICATIONS_URL = "https://example.com/resident/notifications";

export const residentMenuKeyboard = Keyboard.inlineKeyboard([
    [Keyboard.button.callback("Сообщить о проблеме", "resident_menu:report")],
    [Keyboard.button.link("Все обращения", RESIDENT_APPEALS_URL)],
    [Keyboard.button.callback("Перейти в чат дома", "resident_menu:chat_link")],
    [Keyboard.button.link("Уведомления", RESIDENT_NOTIFICATIONS_URL)],
]);

export const backToResidentMenuKeyboard = Keyboard.inlineKeyboard([
    [Keyboard.button.callback("В меню", "resident_menu:show")],
]);

export const RESIDENT_PROBLEM_TYPE_TEXT = "Выберите тип проблемы:";

export function buildResidentProblemTypeKeyboard(problemTypes: { code: string; title: string }[]) {
    return Keyboard.inlineKeyboard([
        ...problemTypes.map((pt) => [Keyboard.button.link(pt.title, `${RESIDENT_APPEAL_FORM_URL}?type=${pt.code}`)]),
        [Keyboard.button.callback("В меню", "resident_menu:show")],
    ]);
}
