import type { AppContext } from "@/context";
import type { Bot } from "@maxhub/max-bot-api";
import { helpCommand } from "./help";

export function initCommands(bot: Bot<AppContext>) {
    bot.command("help", helpCommand);
}
