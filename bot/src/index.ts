import "dotenv/config.js";

import { Bot } from "@maxhub/max-bot-api";
import { initCommands } from "@/commands";
import { env } from "@/env";
import { getSession, type AppContext } from "@/context";
import { initFlows } from "@/flows";
import { askForPhone, tryRestoreRole } from "@/flows/authorization";
import { startNotifyServer } from "@/notify";

const bot = new Bot<AppContext>(env.BOT_TOKEN);

bot.use(async (ctx: AppContext, next) => {
    console.log(`Received update type ${ctx.updateType} from user ${JSON.stringify(ctx.user)}`);
    return next();
});

bot.use(async (ctx: AppContext, next) => {
    if (!ctx.user || ctx.updateType === "bot_started") return next();

    const session = getSession(ctx.user.user_id);
    // Пока роль ещё не установлена, не мешаем ни обычной авторизации
    // (флоу "authorization"), ни демо-входу по кодовому слову (флоу "demo") —
    // у обоих на середине пути role всё ещё undefined.
    if (session.role === undefined && session.flow !== "authorization" && session.flow !== "demo") {
        if (await tryRestoreRole(ctx)) return next();
        return askForPhone(ctx);
    }

    return next();
});

initCommands(bot);
initFlows(bot);

startNotifyServer(bot);
bot.start();
