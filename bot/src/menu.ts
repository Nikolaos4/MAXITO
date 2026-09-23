import { Keyboard } from "@maxhub/max-bot-api";

export const MENU_TEXT = "Главное меню представителя. Выберите действие:";

export const mainMenuKeyboard = Keyboard.inlineKeyboard([
    [Keyboard.button.callback("Добавить дом", "menu:add_house")],
    [Keyboard.button.callback("Загрузить дома из CSV", "menu:import_houses")],
]);

export const backToMenuKeyboard = Keyboard.inlineKeyboard([[Keyboard.button.callback("В главное меню", "menu:show")]]);
