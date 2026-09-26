import { Keyboard } from "@maxhub/max-bot-api";
import { FetchError } from "ofetch";
import { api, type Auth } from "@/api";
import { clearFlow, getSession, setFlow, setRole, setStep, type AppContext } from "@/context";
import { DISPATCHER_MENU_TEXT, MENU_TEXT, dispatcherMenuKeyboard, mainMenuKeyboard } from "@/menu";

export async function askForPhone(ctx: AppContext) {
    if (!ctx.user) return;

    setFlow(ctx.user.user_id, "authorization");
    setStep(ctx.user.user_id, "authorization/phone");

    await ctx.reply("Чтобы начать работу, поделитесь номером телефона — по нему мы найдём вашу учётную запись.", {
        attachments: [Keyboard.inlineKeyboard([[Keyboard.button.requestContact("Отправить номер телефона")]])],
    });
}

export async function tryRestoreRole(ctx: AppContext): Promise<boolean> {
    if (!ctx.user) return false;

    try {
        const me = await api.me({ maxUserId: String(ctx.user.user_id) });
        setRole(ctx.user.user_id, me.role);
        return true;
    } catch {
        return false;
    }
}

async function tryBind(ctx: AppContext, phone: string) {
    if (!ctx.user) return;

    const auth: Auth = { maxUserId: String(ctx.user.user_id), phone };

    try {
        const me = await api.me(auth);
        setRole(ctx.user.user_id, me.role);
        clearFlow(ctx.user.user_id);

        if (me.role === "representative") {
            await ctx.reply("Готово! Вы авторизованы как представитель управляющей компании.");
            await ctx.reply(MENU_TEXT, { attachments: [mainMenuKeyboard] });
        } else if (me.role === "dispatcher") {
            await ctx.reply("Готово! Вы авторизованы как диспетчер.");
            await ctx.reply(DISPATCHER_MENU_TEXT, { attachments: [dispatcherMenuKeyboard] });
        } else {
            // ponytail: функционал жителя в боте пока не реализован.
            await ctx.reply("Номер найден, но для вашей роли функционал бота пока в разработке.");
        }
    } catch (err) {
        const status = err instanceof FetchError ? err.statusCode : undefined;

        if (status === 401) {
            await ctx.reply(
                "Такой номер телефона не найден в системе. Обратитесь к представителю вашей УК, чтобы вас добавили.",
            );
        } else if (status === 409) {
            await ctx.reply("Этот номер уже привязан к другому аккаунту MAX. Обратитесь в поддержку.");
        } else {
            await ctx.reply("Не удалось выполнить авторизацию, попробуйте ещё раз позже.");
        }
    }
}

export const authorizationFlow = {
    onBotStarted: askForPhone,

    onMessageCreated: async (ctx: AppContext) => {
        if (!ctx.user) return false;

        const session = getSession(ctx.user.user_id);
        if (session.step !== "authorization/phone") return false;

        const phone = ctx.contactInfo?.tel;
        if (!phone) {
            await ctx.reply("Пожалуйста, воспользуйтесь кнопкой ниже, чтобы отправить номер телефона.");
            return true;
        }

        await tryBind(ctx, phone);
        return true;
    },
};
