import { api, type Auth } from "@/api";
import { getSession, type AppContext } from "@/context";
import {
    RESIDENT_MENU_TEXT,
    RESIDENT_PROBLEM_TYPE_TEXT,
    backToResidentMenuKeyboard,
    buildResidentMenuKeyboard,
    buildResidentProblemTypeKeyboard,
} from "@/menu";

function authFor(ctx: AppContext): Auth {
    return { maxUserId: String(ctx.user!.user_id) };
}

export async function residentMenuKeyboard(ctx: AppContext) {
    try {
        const { chat_invite_link } = await api.resident.house.chatLink(authFor(ctx));
        return buildResidentMenuKeyboard(chat_invite_link);
    } catch {
        return buildResidentMenuKeyboard(null);
    }
}

async function showProblemTypes(ctx: AppContext) {
    try {
        const problemTypes = await api.resident.reference.problemTypes(authFor(ctx));
        await ctx.answerOnCallback({
            message: {
                text: RESIDENT_PROBLEM_TYPE_TEXT,
                attachments: [buildResidentProblemTypeKeyboard(problemTypes)],
            },
        });
    } catch {
        await ctx.answerOnCallback({
            message: {
                text: "Не удалось загрузить список тем, попробуйте позже.",
                attachments: [backToResidentMenuKeyboard],
            },
        });
    }
}

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
                message: { text: RESIDENT_MENU_TEXT, attachments: [await residentMenuKeyboard(ctx)] },
            });
            return true;
        }

        await showProblemTypes(ctx);
        return true;
    },

    // Сообщение вне активного флоу — показываем меню жителя, а не молчим.
    onMessageCreated: async (ctx: AppContext) => {
        if (!ctx.user) return false;

        const session = getSession(ctx.user.user_id);
        if (session.flow || session.role !== "resident") return false;

        await ctx.reply(RESIDENT_MENU_TEXT, { attachments: [await residentMenuKeyboard(ctx)] });
        return true;
    },
};
