import { getSession, type AppContext } from "@/context";
import {
    RESIDENT_MENU_TEXT,
    RESIDENT_PROBLEM_TYPE_TEXT,
    residentMenuKeyboard,
    residentProblemTypeKeyboard,
} from "@/menu";

export const residentMenuFlow = {
    onMessageCallback: async (ctx: AppContext) => {
        if (!ctx.user || !ctx.callback) return false;

        const payload = ctx.callback.payload;
        const known = ["resident_menu:report", "resident_menu:show"];
        if (!payload || !known.includes(payload)) return false;

        const session = getSession(ctx.user.user_id);
        if (session.role !== "resident") {
            await ctx.answerOnCallback({ message: { text: "Доступно только жителю." } });
            return true;
        }

        if (payload === "resident_menu:show") {
            await ctx.answerOnCallback({
                message: { text: RESIDENT_MENU_TEXT, attachments: [residentMenuKeyboard] },
            });
            return true;
        }

        await ctx.answerOnCallback({
            message: { text: RESIDENT_PROBLEM_TYPE_TEXT, attachments: [residentProblemTypeKeyboard] },
        });
        return true;
    },

    // Сообщение вне активного флоу — показываем меню жителя, а не молчим.
    onMessageCreated: async (ctx: AppContext) => {
        if (!ctx.user) return false;

        const session = getSession(ctx.user.user_id);
        if (session.flow || session.role !== "resident") return false;

        await ctx.reply(RESIDENT_MENU_TEXT, { attachments: [residentMenuKeyboard] });
        return true;
    },
};
