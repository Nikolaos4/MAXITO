import { clearFlow, getSession, setFlow, setStep, type AppContext } from "@/context";
import { MENU_TEXT, mainMenuKeyboard } from "@/menu";

export const menuFlow = {
    onMessageCallback: async (ctx: AppContext) => {
        if (!ctx.user || !ctx.callback) return false;

        const payload = ctx.callback.payload;
        const known = ["menu:add_house", "menu:import_houses", "menu:add_dispatcher", "menu:show"];
        if (!payload || !known.includes(payload)) return false;

        const session = getSession(ctx.user.user_id);
        if (session.role !== "representative") {
            await ctx.answerOnCallback({
                message: { text: "Доступно только представителю управляющей компании." },
            });
            return true;
        }

        if (payload === "menu:show") {
            clearFlow(ctx.user.user_id);
            await ctx.answerOnCallback({ message: { text: MENU_TEXT, attachments: [mainMenuKeyboard] } });
            return true;
        }

        if (payload === "menu:import_houses") {
            setFlow(ctx.user.user_id, "house");
            setStep(ctx.user.user_id, "house/import_csv");
            await ctx.answerOnCallback({
                message: {
                    text: 'Пришлите CSV-файл с домами. Обязательная колонка — "address", необязательная — "number".',
                },
            });
            return true;
        }

        if (payload === "menu:add_dispatcher") {
            setFlow(ctx.user.user_id, "dispatcher");
            setStep(ctx.user.user_id, "dispatcher/full_name");
            await ctx.answerOnCallback({ message: { text: "Введите ФИО диспетчера." } });
            return true;
        }

        setFlow(ctx.user.user_id, "house");
        setStep(ctx.user.user_id, "house/address");

        await ctx.answerOnCallback({ message: { text: "Введите адрес дома, например: ул. Ленина, 25." } });
        return true;
    },

    // Сообщение вне активного шага какого-либо флоу — показываем меню, а не молчим.
    onMessageCreated: async (ctx: AppContext) => {
        if (!ctx.user) return false;

        const session = getSession(ctx.user.user_id);
        if (session.flow || session.role !== "representative") return false;

        await ctx.reply(MENU_TEXT, { attachments: [mainMenuKeyboard] });
        return true;
    },
};
