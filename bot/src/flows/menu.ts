import { api, type Auth } from "@/api";
import { clearFlow, getSession, setData, setFlow, setStep, type AppContext } from "@/context";
import { buildHouseSelectKeyboard, houseSelectText, HOUSES_PAGE_SIZE } from "@/flows/house";
import { MENU_TEXT, mainMenuKeyboard } from "@/menu";

function authFor(ctx: AppContext): Auth {
    return { maxUserId: String(ctx.user!.user_id) };
}

export const menuFlow = {
    onMessageCallback: async (ctx: AppContext) => {
        if (!ctx.user || !ctx.callback) return false;

        const payload = ctx.callback.payload;
        const known = [
            "menu:add_house",
            "menu:import_houses",
            "menu:add_dispatcher",
            "menu:import_dispatchers",
            "menu:import_residents",
            "menu:show",
        ];
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

        if (payload === "menu:import_dispatchers") {
            setFlow(ctx.user.user_id, "dispatcher");
            setStep(ctx.user.user_id, "dispatcher/import_csv");
            await ctx.answerOnCallback({
                message: {
                    text: 'Пришлите CSV-файл с диспетчерами. Обязательные колонки — "full_name", "phone".',
                },
            });
            return true;
        }

        if (payload === "menu:import_residents") {
            const houses = await api.houses.list(authFor(ctx));
            if (houses.length === 0) {
                await ctx.answerOnCallback({ message: { text: "Сначала добавьте хотя бы один дом." } });
                return true;
            }

            setFlow(ctx.user.user_id, "house");
            setStep(ctx.user.user_id, "house/import_residents_select");
            setData(ctx.user.user_id, { residentsHouses: houses });

            const totalPages = Math.max(1, Math.ceil(houses.length / HOUSES_PAGE_SIZE));
            await ctx.answerOnCallback({
                message: {
                    text: houseSelectText(0, totalPages),
                    attachments: [buildHouseSelectKeyboard(houses, 0)],
                },
            });
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
