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

export const residentMenuKeyboard = Keyboard.inlineKeyboard([
    [Keyboard.button.callback("Сообщить о проблеме", "resident_menu:report")],
]);

// ponytail: мини-приложение с формой обращения ещё не готово — ссылка-заглушка,
// заменить на реальную, когда появится. Тип проблемы передаётся параметром,
// чтобы форма могла сразу его подставить.
const RESIDENT_APPEAL_FORM_URL = "https://example.com/resident/appeal";

export const RESIDENT_PROBLEM_TYPES = [
    { code: "elevator", title: "Не работает лифт" },
    { code: "yard", title: "Не убран двор / подъезд" },
    { code: "electricity", title: "Отключено электричество" },
    { code: "pipe", title: "Прорвало трубу / затопление" },
    { code: "heating", title: "Проблемы с отоплением" },
    { code: "water", title: "Проблемы с водой" },
    { code: "other", title: "Другое" },
] as const;

export const RESIDENT_PROBLEM_TYPE_TEXT = "Выберите тип проблемы:";

export const residentProblemTypeKeyboard = Keyboard.inlineKeyboard([
    ...RESIDENT_PROBLEM_TYPES.map((pt) => [
        Keyboard.button.link(pt.title, `${RESIDENT_APPEAL_FORM_URL}?type=${pt.code}`),
    ]),
    [Keyboard.button.callback("В меню", "resident_menu:show")],
]);
