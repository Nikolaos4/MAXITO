import { api, type Auth, type ApiAppealStatus } from "@/api";
import { getSession, type AppContext } from "@/context";
import { formatCompany } from "@/flows/company";
import { formatEmergencyServices } from "@/flows/emergency";
import { DISPATCHER_MENU_TEXT, backToDispatcherMenuKeyboard, buildDispatcherMenuKeyboard } from "@/menu";

const STATUS_LABELS: Record<ApiAppealStatus, string> = {
    accepted: "Принято",
    in_progress: "В работе",
    completed: "Выполнено",
    rejected: "Отклонено",
};

function authFor(ctx: AppContext): Auth {
    return { maxUserId: String(ctx.user!.user_id) };
}

function formatAppealsList(appeals: Awaited<ReturnType<typeof api.dispatcher.appeals.top>>): string {
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
        const appeals = await api.dispatcher.appeals.top(authFor(ctx), 5);
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

function formatStatsList(stats: Awaited<ReturnType<typeof api.dispatcher.appeals.stats>>): string {
    if (stats.length === 0) return "За вами пока не закреплено ни одного дома.";

    return stats
        .map((s) => `${s.address} — всего: ${s.total} (принято: ${s.accepted}, в работе: ${s.in_progress})`)
        .join("\n");
}

export function formatHousesList(houses: Awaited<ReturnType<typeof api.dispatcher.houses.list>>): string {
    if (houses.length === 0) return "За вами пока не закреплено ни одного дома.";

    return houses
        .map((h, i) => {
            const lines = [
                `Дом ${i + 1}: ${h.address}${h.number ? ", " + h.number : ""}`,
                `Подъездов: ${h.entrances_count}`,
                h.floors_count != null && `Этажей: ${h.floors_count}`,
                h.construction_year != null && `Год постройки: ${h.construction_year}`,
            ].filter(Boolean);
            return lines.join("\n");
        })
        .join("\n\n");
}

async function showHouses(ctx: AppContext) {
    if (!ctx.user) return;

    try {
        const houses = await api.dispatcher.houses.list(authFor(ctx));
        await ctx.answerOnCallback({
            message: { text: formatHousesList(houses), attachments: [backToDispatcherMenuKeyboard] },
        });
    } catch {
        await ctx.answerOnCallback({
            message: {
                text: "Не удалось загрузить список домов, попробуйте позже.",
                attachments: [backToDispatcherMenuKeyboard],
            },
        });
    }
}

async function showStats(ctx: AppContext) {
    if (!ctx.user) return;

    try {
        const stats = await api.dispatcher.appeals.stats(authFor(ctx));
        await ctx.answerOnCallback({
            message: { text: formatStatsList(stats), attachments: [backToDispatcherMenuKeyboard] },
        });
    } catch {
        await ctx.answerOnCallback({
            message: {
                text: "Не удалось загрузить статистику, попробуйте позже.",
                attachments: [backToDispatcherMenuKeyboard],
            },
        });
    }
}

async function showInfo(ctx: AppContext) {
    if (!ctx.user) return;

    try {
        const auth = authFor(ctx);
        const [company, services] = await Promise.all([
            api.dispatcher.company.get(auth),
            api.dispatcher.emergencyServices.list(auth),
        ]);
        const text = `${formatCompany(company)}\n\nАварийные службы:\n${formatEmergencyServices(services)}`;
        await ctx.answerOnCallback({ message: { text, attachments: [backToDispatcherMenuKeyboard] } });
    } catch {
        await ctx.answerOnCallback({
            message: {
                text: "Не удалось загрузить информацию, попробуйте позже.",
                attachments: [backToDispatcherMenuKeyboard],
            },
        });
    }
}

export const dispatcherMenuFlow = {
    onMessageCallback: async (ctx: AppContext) => {
        if (!ctx.user || !ctx.callback) return false;

        const payload = ctx.callback.payload;
        const known = [
            "dispatcher_menu:top_appeals",
            "dispatcher_menu:stats",
            "dispatcher_menu:houses",
            "dispatcher_menu:info",
            "dispatcher_menu:show",
        ];
        if (!payload || !known.includes(payload)) return false;

        const session = getSession(ctx.user.user_id);
        if (session.role !== "dispatcher") {
            await ctx.answerOnCallback({ message: { text: "Доступно только диспетчеру." } });
            return true;
        }

        if (payload === "dispatcher_menu:show") {
            await ctx.answerOnCallback({
                message: { text: DISPATCHER_MENU_TEXT, attachments: [await buildDispatcherMenuKeyboard(ctx)] },
            });
            return true;
        }

        if (payload === "dispatcher_menu:stats") {
            await showStats(ctx);
            return true;
        }

        if (payload === "dispatcher_menu:houses") {
            await showHouses(ctx);
            return true;
        }

        if (payload === "dispatcher_menu:info") {
            await showInfo(ctx);
            return true;
        }

        await showTopAppeals(ctx);
        return true;
    },

    onMessageCreated: async (ctx: AppContext) => {
        if (!ctx.user) return false;

        const session = getSession(ctx.user.user_id);
        if (session.flow || session.role !== "dispatcher") return false;

        await ctx.reply(DISPATCHER_MENU_TEXT, { attachments: [await buildDispatcherMenuKeyboard(ctx)] });
        return true;
    },
};
