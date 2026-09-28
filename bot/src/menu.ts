import { Keyboard } from "@maxhub/max-bot-api";
import type { AppContext } from "@/context";
import { miniAppButton } from "@/miniapp";

export const MENU_TEXT = "Главное меню представителя. Выберите действие:";

export const mainMenuKeyboard = Keyboard.inlineKeyboard([
    [Keyboard.button.callback("Добавить дом", "menu:add_house")],
    [Keyboard.button.callback("Загрузить дома из CSV", "menu:import_houses")],
    [Keyboard.button.callback("Добавить диспетчера", "menu:add_dispatcher")],
    [Keyboard.button.callback("Загрузить диспетчеров из CSV", "menu:import_dispatchers")],
    [Keyboard.button.callback("Назначить дома диспетчерам", "menu:assign_houses")],
    [Keyboard.button.callback("Загрузить жителей из CSV", "menu:import_residents")],
    [Keyboard.button.callback("Реквизиты УК", "menu:edit_company")],
    [Keyboard.button.callback("Аварийные службы: список", "menu:show_emergency")],
    [Keyboard.button.callback("Загрузить аварийные службы из CSV", "menu:import_emergency")],
]);

export const backToMenuKeyboard = Keyboard.inlineKeyboard([[Keyboard.button.callback("В главное меню", "menu:show")]]);

export const cancelKeyboard = Keyboard.inlineKeyboard([[Keyboard.button.callback("Отмена", "flow:cancel")]]);

export const DISPATCHER_MENU_TEXT = "Меню диспетчера. Выберите действие:";

export async function buildDispatcherMenuKeyboard(ctx: AppContext) {
    const [appealsBtn, notificationsBtn] = await Promise.all([
        miniAppButton(ctx, "Обращения", "dispatcher", "feed"),
        miniAppButton(ctx, "Уведомления", "dispatcher", "notifications"),
    ]);

    return Keyboard.inlineKeyboard([
        [appealsBtn],
        [Keyboard.button.callback("Горячие обращения", "dispatcher_menu:top_appeals")],
        [Keyboard.button.callback("Статистика по домам", "dispatcher_menu:stats")],
        [Keyboard.button.callback("Мои дома", "dispatcher_menu:houses")],
        [notificationsBtn],
    ]);
}

export const backToDispatcherMenuKeyboard = Keyboard.inlineKeyboard([
    [Keyboard.button.callback("В меню", "dispatcher_menu:show")],
]);

export const RESIDENT_MENU_TEXT = "Главное меню жителя. Выберите действие:";

export async function buildResidentMenuKeyboard(ctx: AppContext, chatInviteLink?: string | null) {
    const [appealsBtn, notificationsBtn] = await Promise.all([
        miniAppButton(ctx, "Все обращения", "resident", "feed"),
        miniAppButton(ctx, "Объявления", "resident", "notifications"),
    ]);

    return Keyboard.inlineKeyboard([
        [Keyboard.button.callback("Сообщить о проблеме", "resident_menu:report")],
        [appealsBtn],
        // Ссылка на чат дома — обычная внешняя ссылка (не мини-апп), поэтому
        // тут button.link остаётся правильным выбором.
        ...(chatInviteLink ? [[Keyboard.button.link("Перейти в чат дома", chatInviteLink)]] : []),
        [notificationsBtn],
    ]);
}

export const backToResidentMenuKeyboard = Keyboard.inlineKeyboard([
    [Keyboard.button.callback("В меню", "resident_menu:show")],
]);

export const RESIDENT_PROBLEM_TYPE_TEXT = "Выберите тип проблемы:";

export async function buildResidentProblemTypeKeyboard(ctx: AppContext, problemTypes: { code: string; title: string }[]) {
    const rows = await Promise.all(
        problemTypes.map(async (pt) => [await miniAppButton(ctx, pt.title, "resident", "create", pt.code)]),
    );

    return Keyboard.inlineKeyboard([...rows, [Keyboard.button.callback("В меню", "resident_menu:show")]]);
}
