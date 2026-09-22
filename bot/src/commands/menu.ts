import type { AppContext } from "@/context";
import { getSession } from "@/context";
import { MENU_TEXT, mainMenuKeyboard } from "@/menu";

export async function menuCommand(ctx: AppContext) {
    if (!ctx.user) return;

    const session = getSession(ctx.user.user_id);
    if (session.role !== "representative") {
        return ctx.reply("Меню представителя доступно только представителю управляющей компании.");
    }

    await ctx.reply(MENU_TEXT, { attachments: [mainMenuKeyboard] });
}
