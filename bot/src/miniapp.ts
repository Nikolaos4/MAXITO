import { Keyboard } from "@maxhub/max-bot-api";
import type { AppContext } from "@/context";

let cachedUsername: string | undefined;

async function botUsername(ctx: AppContext): Promise<string> {
    if (cachedUsername) return cachedUsername;

    const info = await ctx.api.getMyInfo();
    if (!info.username) {
        throw new Error("У бота не задан username — не собрать кнопку мини-приложения");
    }

    cachedUsername = info.username;
    return cachedUsername;
}

export type MiniAppRole = "resident" | "dispatcher";

// Кнопка запуска мини-приложения на нужной вкладке. Важно: именно
// Keyboard.button.openApp (type: "open_app"), а не button.link — обычная
// кнопка-ссылка открывает URL как внешнюю ссылку в браузере, без initData и
// start_param, поэтому фронт не мог понять, какую роль/вкладку открывать, и
// всегда падал в дефолт (форма создания обращения). payload идёт отдельным
// полем — MAX сам прокидывает его в initDataUnsafe.start_param при запуске
// мини-аппа именно этой кнопкой.
//
// MAX проверяет payload регуляркой и отклоняет отправку сообщения с
// ошибкой "proto.payload: Field 'payload' does not match required pattern"
// уже на ":" в "resident:feed" — двоеточие в разрешённый набор символов не
// входит. Кодируем role:tab[:extra] в base64url (алфавит только
// [A-Za-z0-9_-]) — фронт декодирует обратно в parseStartPayload (page.ts).
export async function miniAppButton(ctx: AppContext, text: string, role: MiniAppRole, tab: string, extra?: string) {
    const username = await botUsername(ctx);
    const raw = extra ? `${role}:${tab}:${extra}` : `${role}:${tab}`;
    const payload = Buffer.from(raw, "utf-8").toString("base64url");
    return Keyboard.button.openApp(text, `https://max.ru/${username}`, undefined, payload);
}
