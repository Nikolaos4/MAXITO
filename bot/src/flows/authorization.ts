import { Keyboard } from "@maxhub/max-bot-api";
import { FetchError } from "ofetch";
import { api, type Auth } from "@/api";
import { clearFlow, getSession, setFlow, setIsDemo, setRole, setStep, type AppContext } from "@/context";
import { sendRoleMenu } from "@/flows/role-menu";

export async function askForPhone(ctx: AppContext) {
    if (!ctx.user) return;

    setFlow(ctx.user.user_id, "authorization");
    setStep(ctx.user.user_id, "authorization/phone");

    await ctx.reply("Чтобы начать работу, поделитесь номером телефона — по нему мы найдём вашу учётную запись.", {
        attachments: [
            Keyboard.inlineKeyboard([
                [Keyboard.button.requestContact("Отправить номер телефона")],
                [Keyboard.button.callback("Ввести кодовое слово", "demo:start")],
            ]),
        ],
    });
}

export async function tryRestoreRole(ctx: AppContext): Promise<boolean> {
    if (!ctx.user) return false;

    try {
        const me = await api.me({ maxUserId: String(ctx.user.user_id) });
        setRole(ctx.user.user_id, me.role);
        setIsDemo(ctx.user.user_id, me.is_demo);
        return true;
    } catch {
        return false;
    }
}

async function tryBind(ctx: AppContext, phone: string) {
    if (!ctx.user) return;

    const auth: Auth = { maxUserId: String(ctx.user.user_id) };

    try {
        await api.bind(auth.maxUserId, phone);
        const me = await api.me(auth);
        setRole(ctx.user.user_id, me.role);
        setIsDemo(ctx.user.user_id, me.is_demo);
        clearFlow(ctx.user.user_id);

        const roleLabel = me.role === "representative" ? "представитель управляющей компании" : me.role === "dispatcher" ? "диспетчер" : "житель";
        await ctx.reply(`Готово! Вы авторизованы как ${roleLabel}.`);
        await sendRoleMenu(ctx, me.role);
    } catch (err) {
        const status = err instanceof FetchError ? err.statusCode : undefined;

        if (status === 404) {
            await ctx.reply(
                "Такой номер телефона не найден в системе. Обратитесь к представителю вашей УК, чтобы вас добавили.",
            );
        } else if (status === 403) {
            await ctx.reply("Ваша учётная запись отключена. Обратитесь к представителю вашей УК.");
        } else if (status === 409) {
            await ctx.reply("Этот номер или аккаунт MAX уже привязан к другому пользователю. Обратитесь в поддержку.");
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
