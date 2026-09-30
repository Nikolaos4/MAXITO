import type { ApiRole } from "@/api";
import type { AppContext } from "@/context";
import { residentMenuKeyboard } from "@/flows/resident-menu";
import { DISPATCHER_MENU_TEXT, MENU_TEXT, RESIDENT_MENU_TEXT, buildDispatcherMenuKeyboard, buildMainMenuKeyboard } from "@/menu";

// Единая точка показа меню под роль — используется и обычным входом
// (flows/authorization.ts), и демо-входом/переключением роли (flows/demo.ts).
export async function sendRoleMenu(ctx: AppContext, role: ApiRole) {
    if (role === "representative") {
        await ctx.reply(MENU_TEXT, { attachments: [await buildMainMenuKeyboard(ctx)] });
    } else if (role === "dispatcher") {
        await ctx.reply(DISPATCHER_MENU_TEXT, { attachments: [await buildDispatcherMenuKeyboard(ctx)] });
    } else {
        await ctx.reply(RESIDENT_MENU_TEXT, { attachments: [await residentMenuKeyboard(ctx)] });
    }
}
