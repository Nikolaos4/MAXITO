import { Bot } from "@maxhub/max-bot-api";
import { initCommands } from "@/commands";

import "dotenv/config.js";
import { env } from "@/env";
import { getSession, type AppContext } from "@/context";
import { initFlows } from "@/flows";
import { askForPhone } from "@/flows/authorization";

const bot = new Bot<AppContext>(env.BOT_TOKEN);

bot.use(async (ctx: AppContext, next) => {
    console.log(`Received update type ${ctx.updateType} from user ${JSON.stringify(ctx.user)}`);
    return next();
});

bot.use(async (ctx: AppContext, next) => {
    if (!ctx.user || ctx.updateType === "bot_started") return next();

    const session = getSession(ctx.user.user_id);
    if (session.role === undefined && session.step !== "authorization/phone") {
        return askForPhone(ctx);
    }

    return next();
});

initCommands(bot);
initFlows(bot);

bot.start();
