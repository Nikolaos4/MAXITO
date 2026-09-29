import { api, type Auth } from "@/api";
import { clearFlow, getSession, setData, setFlow, setStep, type AppContext } from "@/context";
import { sendCsvTemplate } from "@/csv-import";
import { csvTemplates } from "@/csv-templates";
import { startDispatcherSelect } from "@/flows/assignment";
import { startCompanyEdit } from "@/flows/company";
import { formatHousesList } from "@/flows/dispatcher-menu";
import { showEmergencyServices, startEmergencyImport } from "@/flows/emergency";
import { buildHouseSelectKeyboard, houseSelectText, HOUSES_PAGE_SIZE } from "@/flows/house";
import { startHouseEdit } from "@/flows/house-edit";
import {
    DISPATCHER_MENU_TEXT,
    MENU_TEXT,
    backToMenuKeyboard,
    buildDispatcherMenuKeyboard,
    cancelKeyboard,
    mainMenuKeyboard,
} from "@/menu";

function authFor(ctx: AppContext): Auth {
    return { maxUserId: String(ctx.user!.user_id) };
}

export const menuFlow = {
    onMessageCallback: async (ctx: AppContext) => {
        if (!ctx.user || !ctx.callback) return false;

        const payload = ctx.callback.payload;

        if (payload === "flow:cancel") {
            clearFlow(ctx.user.user_id);
            const session = getSession(ctx.user.user_id);
            if (session.role === "representative") {
                await ctx.answerOnCallback({ message: { text: MENU_TEXT, attachments: [mainMenuKeyboard] } });
            } else if (session.role === "dispatcher") {
                await ctx.answerOnCallback({
                    message: { text: DISPATCHER_MENU_TEXT, attachments: [await buildDispatcherMenuKeyboard(ctx)] },
                });
            } else {
                await ctx.answerOnCallback({ message: { text: "Отменено." } });
            }
            return true;
        }

        const known = [
            "menu:import_houses",
            "menu:list_houses",
            "menu:edit_house",
            "menu:add_dispatcher",
            "menu:import_dispatchers",
            "menu:assign_houses",
            "menu:import_residents",
            "menu:edit_company",
            "menu:show_emergency",
            "menu:import_emergency",
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
                    text: 'Пришлите CSV-файл с домами. Обязательные колонки — "address", "entrances_count", необязательные — "number", "floors_count", "construction_year".',
                    attachments: [cancelKeyboard],
                },
            });
            await sendCsvTemplate(ctx, csvTemplates.houses);
            return true;
        }

        if (payload === "menu:list_houses") {
            const houses = await api.representative.houses.list(authFor(ctx));
            await ctx.answerOnCallback({
                message: { text: formatHousesList(houses), attachments: [backToMenuKeyboard] },
            });
            return true;
        }

        if (payload === "menu:edit_house") {
            await startHouseEdit(ctx);
            return true;
        }

        if (payload === "menu:add_dispatcher") {
            setFlow(ctx.user.user_id, "dispatcher");
            setStep(ctx.user.user_id, "dispatcher/full_name");
            await ctx.answerOnCallback({
                message: { text: "Введите ФИО диспетчера.", attachments: [cancelKeyboard] },
            });
            return true;
        }

        if (payload === "menu:import_dispatchers") {
            setFlow(ctx.user.user_id, "dispatcher");
            setStep(ctx.user.user_id, "dispatcher/import_csv");
            await ctx.answerOnCallback({
                message: {
                    text: 'Пришлите CSV-файл с диспетчерами. Обязательные колонки — "full_name", "phone".',
                    attachments: [cancelKeyboard],
                },
            });
            await sendCsvTemplate(ctx, csvTemplates.dispatchers);
            return true;
        }

        if (payload === "menu:assign_houses") {
            await startDispatcherSelect(ctx);
            return true;
        }

        if (payload === "menu:edit_company") {
            await startCompanyEdit(ctx);
            return true;
        }

        if (payload === "menu:show_emergency") {
            await showEmergencyServices(ctx);
            return true;
        }

        if (payload === "menu:import_emergency") {
            await startEmergencyImport(ctx);
            return true;
        }

        if (payload === "menu:import_residents") {
            const houses = await api.representative.houses.list(authFor(ctx));
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

        return false;
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
