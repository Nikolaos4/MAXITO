import type { AppContext } from "@/context";

export function helpCommand(ctx: AppContext) {
    if (!ctx.user) return;

    return ctx.reply("test!");
}
