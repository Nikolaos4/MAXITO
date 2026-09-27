import { Keyboard } from "@maxhub/max-bot-api";
import type { AppContext } from "@/context";
import { miniAppLink } from "@/miniapp";

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

export const DISPATCHER_MENU_TEXT = "Меню диспетчера. Выберите действие:";

export async function buildDispatcherMenuKeyboard(ctx: AppContext) {
    const [appealsUrl, notificationsUrl] = await Promise.all([
        miniAppLink(ctx, "dispatcher", "feed"),
        miniAppLink(ctx, "dispatcher", "notifications"),
    ]);

    return Keyboard.inlineKeyboard([
        [Keyboard.button.link("Обращения", appealsUrl)],
        [Keyboard.button.callback("Горячие обращения", "dispatcher_menu:top_appeals")],
        [Keyboard.button.callback("Статистика по домам", "dispatcher_menu:stats")],
        [Keyboard.button.link("Уведомления", notificationsUrl)],
    ]);
}

export const backToDispatcherMenuKeyboard = Keyboard.inlineKeyboard([
    [Keyboard.button.callback("В меню", "dispatcher_menu:show")],
]);

export const RESIDENT_MENU_TEXT = "Главное меню жителя. Выберите действие:";

export async function buildResidentMenuKeyboard(ctx: AppContext, chatInviteLink?: string | null) {
    const [appealsUrl, notificationsUrl] = await Promise.all([
        miniAppLink(ctx, "resident", "feed"),
        miniAppLink(ctx, "resident", "notifications"),
    ]);

    return Keyboard.inlineKeyboard([
        [Keyboard.button.callback("Сообщить о проблеме", "resident_menu:report")],
        [Keyboard.button.link("Все обращения", appealsUrl)],
        ...(chatInviteLink ? [[Keyboard.button.link("Перейти в чат дома", chatInviteLink)]] : []),
        [Keyboard.button.link("Объявления", notificationsUrl)],
    ]);
}

export const backToResidentMenuKeyboard = Keyboard.inlineKeyboard([
    [Keyboard.button.callback("В меню", "resident_menu:show")],
]);

export const RESIDENT_PROBLEM_TYPE_TEXT = "Выберите тип проблемы:";

export async function buildResidentProblemTypeKeyboard(ctx: AppContext, problemTypes: { code: string; title: string }[]) {
    const rows = await Promise.all(
        problemTypes.map(async (pt) => [
            Keyboard.button.link(pt.title, await miniAppLink(ctx, "resident", "create", pt.code)),
        ]),
    );

    return Keyboard.inlineKeyboard([...rows, [Keyboard.button.callback("В меню", "resident_menu:show")]]);
}
