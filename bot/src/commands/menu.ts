import type { AppContext } from "@/context";
import { getSession } from "@/context";
import { DISPATCHER_MENU_TEXT, dispatcherMenuKeyboard, MENU_TEXT, mainMenuKeyboard } from "@/menu";

export async function menuCommand(ctx: AppContext) {
    if (!ctx.user) return;

    const session = getSession(ctx.user.user_id);

    if (session.role === "representative") {
        return ctx.reply(MENU_TEXT, { attachments: [mainMenuKeyboard] });
    }
    if (session.role === "dispatcher") {
        return ctx.reply(DISPATCHER_MENU_TEXT, { attachments: [dispatcherMenuKeyboard] });
    }

    await ctx.reply("Меню доступно только представителю управляющей компании или диспетчеру.");
}
