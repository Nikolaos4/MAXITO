import type { AppContext } from "@/context";
import type { Bot } from "@maxhub/max-bot-api";
import { authorizationFlow } from "./authorization";
import { houseFlow } from "./house";
import { menuFlow } from "./menu";

type FlowRouter = {
    onBotStarted?: (ctx: AppContext) => void | Promise<void>;
    onMessageCreated?: (ctx: AppContext) => boolean | Promise<boolean>;
    onMessageCallback?: (ctx: AppContext) => boolean | Promise<boolean>;
};

const flows: FlowRouter[] = [authorizationFlow, menuFlow, houseFlow];

export function initFlows(bot: Bot<AppContext>) {
    bot.on("bot_started", async (ctx: AppContext) => {
        for (const flow of flows) {
            await flow.onBotStarted?.(ctx);
        }
    });

    bot.on("message_created", async (ctx: AppContext, next) => {
        for (const flow of flows) {
            if (await flow.onMessageCreated?.(ctx)) {
                return;
            }
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
