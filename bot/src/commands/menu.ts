import type { AppContext } from "@/context";
import { getSession } from "@/context";
import {
    DISPATCHER_MENU_TEXT,
    MENU_TEXT,
    RESIDENT_MENU_TEXT,
    dispatcherMenuKeyboard,
    mainMenuKeyboard,
    residentMenuKeyboard,
} from "@/menu";

export async function menuCommand(ctx: AppContext) {
    if (!ctx.user) return;

    const session = getSession(ctx.user.user_id);

    if (session.role === "representative") {
        return ctx.reply(MENU_TEXT, { attachments: [mainMenuKeyboard] });
    }
    if (session.role === "dispatcher") {
        return ctx.reply(DISPATCHER_MENU_TEXT, { attachments: [dispatcherMenuKeyboard] });
    }
    if (session.role === "resident") {
        return ctx.reply(RESIDENT_MENU_TEXT, { attachments: [residentMenuKeyboard] });
    }

    await ctx.reply("Авторизуйтесь, чтобы увидеть меню.");
}
