import { getSession, type AppContext } from "@/context";
import type { Bot } from "@maxhub/max-bot-api";

type FlowRouter = {
    onBotStarted?: (ctx: AppContext) => void | Promise<void>;
    onMessageCreated?: (ctx: AppContext) => boolean | Promise<boolean>;
    onMessageCallback?: (ctx: AppContext) => boolean | Promise<boolean>;
};

const flows: FlowRouter[] = [];

export function initFlows(bot: Bot<AppContext>) {
    bot.on("bot_started", async (ctx: AppContext) => {
        for (const flow of flows) {
            await flow.onBotStarted?.(ctx);
        }
    });

    bot.on("message_created", async (ctx: AppContext, next) => {
        const userId = ctx.user?.user_id;
        const session = userId ? getSession(userId) : null;
        const text = ctx.message?.body.text?.trim() ?? "";

        for (const flow of flows) {
            if (!flow.onMessageCreated?.(ctx)) return;
        }

        return next();
    });

    bot.on("message_callback", async (ctx, next) => {
        for (const flow of flows) {
            if (await flow.onMessageCallback?.(ctx)) {
                return;
            }
        }
        return next();
    });
}
