import { api, type Auth } from "@/api";
import { getSession, type AppContext } from "@/context";
import { formatCompany } from "@/flows/company";
import { formatEmergencyServices } from "@/flows/emergency";
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
        return await buildResidentMenuKeyboard(ctx, chat_invite_link);
    } catch {
        return await buildResidentMenuKeyboard(ctx, null);
    }
}

async function showProblemTypes(ctx: AppContext) {
    try {
        const problemTypes = await api.resident.reference.problemTypes(authFor(ctx));
        await ctx.answerOnCallback({
            message: {
                text: RESIDENT_PROBLEM_TYPE_TEXT,
                attachments: [await buildResidentProblemTypeKeyboard(ctx, problemTypes)],
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

async function showEmergency(ctx: AppContext) {
    try {
        const services = await api.resident.emergencyServices.list(authFor(ctx));
        await ctx.answerOnCallback({
            message: {
                text: `Аварийные службы:
${formatEmergencyServices(services)}`,
                attachments: [backToResidentMenuKeyboard],
            },
        });
    } catch {
        await ctx.answerOnCallback({
            message: {
                text: "Не удалось загрузить телефоны, попробуйте позже.",
                attachments: [backToResidentMenuKeyboard],
            },
        });
    }
}

async function showInfo(ctx: AppContext) {
    if (!ctx.user) return;

    try {
        const auth = authFor(ctx);
        const [company, services] = await Promise.all([
            api.resident.company.get(auth),
            api.resident.emergencyServices.list(auth),
        ]);
        const text = `${formatCompany(company)}\n\nАварийные службы:\n${formatEmergencyServices(services)}`;
        await ctx.answerOnCallback({ message: { text, attachments: [backToResidentMenuKeyboard] } });
    } catch {
        await ctx.answerOnCallback({
            message: {
                text: "Не удалось загрузить информацию, попробуйте позже.",
                attachments: [backToResidentMenuKeyboard],
            },
        });
    }
}

export const residentMenuFlow = {
    onMessageCallback: async (ctx: AppContext) => {
        if (!ctx.user || !ctx.callback) return false;

        const payload = ctx.callback.payload;
        const known = ["resident_menu:report", "resident_menu:info", "resident_menu:show", "resident_menu:emergency"];
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

        if (payload === "resident_menu:emergency") {
            await showEmergency(ctx);
            return true;
        }

        if (payload === "resident_menu:info") {
            await showInfo(ctx);
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
