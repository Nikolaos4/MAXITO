import { api, type Auth, type ApiAppealStatus } from "@/api";
import { getSession, type AppContext } from "@/context";
import { DISPATCHER_MENU_TEXT, backToDispatcherMenuKeyboard, dispatcherMenuKeyboard } from "@/menu";

const STATUS_LABELS: Record<ApiAppealStatus, string> = {
    accepted: "Принято",
    in_progress: "В работе",
    need_info: "Нужна доп. информация",
    completed: "Выполнено",
    rejected: "Отклонено",
};

function authFor(ctx: AppContext): Auth {
    return { maxUserId: String(ctx.user!.user_id) };
}

function formatAppealsList(appeals: Awaited<ReturnType<typeof api.appeals.top>>): string {
    if (appeals.length === 0) return "Активных обращений пока нет.";

    return appeals
        .map((a, i) => {
            const house = a.house
                ? `${a.house.address}${a.house.number ? ", " + a.house.number : ""}`
                : `дом #${a.house_id}`;
            const entrance = a.entrance_number ? `, подъезд ${a.entrance_number}` : "";
            const topic = a.problem_type?.title ?? "Другое";
            const status = STATUS_LABELS[a.status] ?? a.status;

            return `${i + 1}. [${topic}] ${house}${entrance} — ${status}\n${a.description}`;
        })
        .join("\n\n");
}

async function showTopAppeals(ctx: AppContext) {
    if (!ctx.user) return;

    try {
        const appeals = await api.appeals.top(authFor(ctx), 5);
        await ctx.answerOnCallback({
            message: { text: formatAppealsList(appeals), attachments: [backToDispatcherMenuKeyboard] },
        });
    } catch {
        await ctx.answerOnCallback({
            message: {
                text: "Не удалось загрузить обращения, попробуйте позже.",
                attachments: [backToDispatcherMenuKeyboard],
            },
        });
    }
}

export const dispatcherMenuFlow = {
    onMessageCallback: async (ctx: AppContext) => {
        if (!ctx.user || !ctx.callback) return false;

        const payload = ctx.callback.payload;
        const known = ["dispatcher_menu:top_appeals", "dispatcher_menu:show"];
        if (!payload || !known.includes(payload)) return false;

        const session = getSession(ctx.user.user_id);
        if (session.role !== "dispatcher") {
            await ctx.answerOnCallback({ message: { text: "Доступно только диспетчеру." } });
            return true;
        }

        if (payload === "dispatcher_menu:show") {
            await ctx.answerOnCallback({
                message: { text: DISPATCHER_MENU_TEXT, attachments: [dispatcherMenuKeyboard] },
            });
            return true;
        }

        await showTopAppeals(ctx);
        return true;
    },

    onMessageCreated: async (ctx: AppContext) => {
        if (!ctx.user) return false;

        const session = getSession(ctx.user.user_id);
        if (session.flow || session.role !== "dispatcher") return false;

        await ctx.reply(DISPATCHER_MENU_TEXT, { attachments: [dispatcherMenuKeyboard] });
        return true;
    },
};
