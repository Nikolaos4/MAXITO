import type { AppContext } from "@/context";
import { getSession } from "@/context";
import { residentMenuKeyboard } from "@/flows/resident-menu";
import { DISPATCHER_MENU_TEXT, MENU_TEXT, RESIDENT_MENU_TEXT, buildDispatcherMenuKeyboard, mainMenuKeyboard } from "@/menu";

export async function menuCommand(ctx: AppContext) {
    if (!ctx.user) return;

    const session = getSession(ctx.user.user_id);

    if (session.role === "representative") {
        return ctx.reply(MENU_TEXT, { attachments: [mainMenuKeyboard] });
    }
    if (session.role === "dispatcher") {
        return ctx.reply(DISPATCHER_MENU_TEXT, { attachments: [await buildDispatcherMenuKeyboard(ctx)] });
    }
    if (session.role === "resident") {
        return ctx.reply(RESIDENT_MENU_TEXT, { attachments: [await residentMenuKeyboard(ctx)] });
    }

    await ctx.reply("Авторизуйтесь, чтобы увидеть меню.");
}
