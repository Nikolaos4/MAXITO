import { FetchError } from "ofetch";
import { api, type Auth } from "@/api";
import { clearFlow, getSession, setData, setStep, type AppContext } from "@/context";
import { downloadFile, findCsvAttachment, formatImportReport, sendCsvTemplate } from "@/csv-import";
import { csvTemplates } from "@/csv-templates";
import { backToMenuKeyboard, cancelKeyboard } from "@/menu";
import { PAGE_SIZE, pagedKeyboard } from "@/paged";

function authFor(ctx: AppContext): Auth {
    return { maxUserId: String(ctx.user!.user_id) };
}

export const HOUSES_PAGE_SIZE = PAGE_SIZE;

type HouseOption = { id: number; address: string; number?: string };

export const houseLabel = (h: HouseOption) => `${h.address}${h.number ? ", " + h.number : ""}`;

export function houseSelectText(page: number, totalPages: number): string {
    return totalPages > 1
        ? `Выберите дом, для которого загружаете жителей (стр. ${page + 1}/${totalPages}):`
        : "Выберите дом, для которого загружаете жителей:";
}

export function buildHouseSelectKeyboard(houses: HouseOption[], page: number) {
    return pagedKeyboard(houses, page, {
        label: houseLabel,
        itemPayload: (h) => `house_residents_import:${h.id}`,
        pagePayload: (p) => `house_residents_page:${p}`,
    });
}

async function handleImportCsv(ctx: AppContext) {
    if (!ctx.user) return;

    const file = findCsvAttachment(ctx);
    if (!file) {
        await ctx.reply("Нужен файл в формате CSV, прикрепите его к сообщению.");
        return;
    }

    try {
        const data = await downloadFile(file.payload.url);
        const report = await api.representative.houses.importCsv(authFor(ctx), { data, filename: file.filename });
        clearFlow(ctx.user.user_id);
        await ctx.reply(formatImportReport(report), { attachments: [backToMenuKeyboard] });
    } catch (err) {
        const status = err instanceof FetchError ? err.statusCode : undefined;
        if (status === 400) {
            await ctx.reply(
                'Не удалось разобрать файл: проверьте формат и колонки "address", "entrances_count" (необязательные — "floors_count", "construction_year").',
            );
        } else {
            await ctx.reply("Не удалось загрузить дома, попробуйте позже.");
        }
    }
}

async function handleImportResidentsCsv(ctx: AppContext) {
    if (!ctx.user) return;

    const file = findCsvAttachment(ctx);
    if (!file) {
        await ctx.reply("Нужен файл в формате CSV, прикрепите его к сообщению.");
        return;
    }

    const session = getSession(ctx.user.user_id);
    const houseId = session.data.residentsHouseId as number;

    try {
        const data = await downloadFile(file.payload.url);
        const report = await api.representative.residents.importCsv(authFor(ctx), houseId, {
            data,
            filename: file.filename,
        });
        clearFlow(ctx.user.user_id);
        await ctx.reply(formatImportReport(report), { attachments: [backToMenuKeyboard] });
    } catch (err) {
        const status = err instanceof FetchError ? err.statusCode : undefined;
        if (status === 400) {
            await ctx.reply('Не удалось разобрать файл: проверьте формат и колонки "full_name", "phone".');
        } else {
            await ctx.reply("Не удалось загрузить жителей, попробуйте позже.");
        }
    }
}

export const houseFlow = {
    onMessageCallback: async (ctx: AppContext) => {
        if (!ctx.user || !ctx.callback) return false;

        const session = getSession(ctx.user.user_id);
        if (session.flow !== "house" || session.step !== "house/import_residents_select") return false;

        const payload = ctx.callback.payload ?? "";
        const houses = (session.data.residentsHouses ?? []) as HouseOption[];

        if (payload.startsWith("house_residents_page:")) {
            const page = Number(payload.slice("house_residents_page:".length));
            const totalPages = Math.max(1, Math.ceil(houses.length / HOUSES_PAGE_SIZE));
            await ctx.answerOnCallback({
                message: {
                    text: houseSelectText(page, totalPages),
                    attachments: [buildHouseSelectKeyboard(houses, page)],
                },
            });
            return true;
        }

        if (!payload.startsWith("house_residents_import:")) return false;

        const houseId = Number(payload.slice("house_residents_import:".length));
        setData(ctx.user.user_id, { residentsHouseId: houseId });
        setStep(ctx.user.user_id, "house/import_residents_csv");
        await ctx.answerOnCallback({
            message: {
                text: 'Пришлите CSV-файл с жителями. Обязательные колонки — "full_name", "phone", "apartment", необязательная — "entrance_number".',
                attachments: [cancelKeyboard],
            },
        });
        await sendCsvTemplate(ctx, csvTemplates.residents);
        return true;
    },

    onMessageCreated: async (ctx: AppContext) => {
        if (!ctx.user) return false;

        const session = getSession(ctx.user.user_id);
        if (session.flow !== "house") return false;

        if (session.step === "house/import_csv") {
            await handleImportCsv(ctx);
            return true;
        }
        if (session.step === "house/import_residents_csv") {
            await handleImportResidentsCsv(ctx);
            return true;
        }

        return false;
    },
};
