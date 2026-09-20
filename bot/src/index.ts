import { Bot } from "@maxhub/max-bot-api";
import { initCommands } from "@/commands";

import "dotenv/config.js";
import { env } from "@/env";
import type { AppContext } from "@/context";
import { initFlows } from "@/flows";

const bot = new Bot<AppContext>(env.BOT_TOKEN);

initCommands(bot);
initFlows(bot);

bot.start();
