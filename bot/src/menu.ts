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
