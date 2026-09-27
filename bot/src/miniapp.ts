import type { AppContext } from "@/context";

let cachedUsername: string | undefined;

async function botUsername(ctx: AppContext): Promise<string> {
    if (cachedUsername) return cachedUsername;

    const info = await ctx.api.getMyInfo();
    if (!info.username) {
        throw new Error("У бота не задан username — диплинк startapp не собрать");
    }

    cachedUsername = info.username;
    return cachedUsername;
}

export type MiniAppRole = "resident" | "dispatcher";

export async function miniAppLink(ctx: AppContext, role: MiniAppRole, tab: string, extra?: string): Promise<string> {
    const username = await botUsername(ctx);
    const payload = extra ? `${role}:${tab}:${extra}` : `${role}:${tab}`;
    return `https://max.ru/${username}?startapp=${payload}`;
}
