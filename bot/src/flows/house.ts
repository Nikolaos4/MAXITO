import { Keyboard } from "@maxhub/max-bot-api";
import { FetchError } from "ofetch";
import { api, type Auth } from "@/api";
import { clearFlow, getSession, setData, setStep, type AppContext } from "@/context";
import { downloadFile, findCsvAttachment, formatImportReport } from "@/csv-import";
import { backToMenuKeyboard } from "@/menu";

function authFor(ctx: AppContext): Auth {
    return { maxUserId: String(ctx.user!.user_id) };
}

export const HOUSES_PAGE_SIZE = 8;

type HouseOption = { id: number; address: string; number?: string };

export function houseSelectText(page: number, totalPages: number): string {
    return totalPages > 1
        ? `Выберите дом, для которого загружаете жителей (стр. ${page + 1}/${totalPages}):`
        : "Выберите дом, для которого загружаете жителей:";
}

export function buildHouseSelectKeyboard(houses: HouseOption[], page: number) {
    const totalPages = Math.max(1, Math.ceil(houses.length / HOUSES_PAGE_SIZE));
    const clamped = Math.min(Math.max(page, 0), totalPages - 1);
    const pageHouses = houses.slice(clamped * HOUSES_PAGE_SIZE, (clamped + 1) * HOUSES_PAGE_SIZE);

    const rows = pageHouses.map((h) => [
        Keyboard.button.callback(`${h.address}${h.number ? ", " + h.number : ""}`, `house_residents_import:${h.id}`),
    ]);

    const nav = [];
    if (clamped > 0) nav.push(Keyboard.button.callback("« Назад", `house_residents_page:${clamped - 1}`));
    if (clamped < totalPages - 1) nav.push(Keyboard.button.callback("Далее »", `house_residents_page:${clamped + 1}`));
    if (nav.length > 0) rows.push(nav);

    return Keyboard.inlineKeyboard(rows);
}

async function handleAddress(ctx: AppContext, text: string) {
    if (!ctx.user) return;

    setData(ctx.user.user_id, { address: text });
    setStep(ctx.user.user_id, "house/number");
    await ctx.reply('Есть ли у дома отдельный номер корпуса/строения? Если нет — отправьте "-".');
}

async function handleNumber(ctx: AppContext, text: string) {
    if (!ctx.user) return;

    const session = getSession(ctx.user.user_id);
    const address = session.data.address as string;
    const number = text === "-" ? "" : text;

    try {
        const house = await api.houses.create(authFor(ctx), { address, number });
        clearFlow(ctx.user.user_id);
        await ctx.reply(`Дом добавлен: ${house.address}${house.number ? ", " + house.number : ""} (id ${house.id}).`, {
            attachments: [backToMenuKeyboard],
        });
    } catch (err) {
        const status = err instanceof FetchError ? err.statusCode : undefined;
        if (status === 400) {
            await ctx.reply("Не удалось добавить дом: проверьте корректность адреса.");
        } else {
            await ctx.reply("Не удалось добавить дом, попробуйте позже.");
        }
    }
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
        const report = await api.houses.importCsv(authFor(ctx), { data, filename: file.filename });
        clearFlow(ctx.user.user_id);
        await ctx.reply(formatImportReport(report), { attachments: [backToMenuKeyboard] });
    } catch (err) {
        const status = err instanceof FetchError ? err.statusCode : undefined;
        if (status === 400) {
            await ctx.reply('Не удалось разобрать файл: проверьте формат и колонку "address".');
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
        const report = await api.residents.importCsv(authFor(ctx), houseId, { data, filename: file.filename });
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
                message: { text: houseSelectText(page, totalPages), attachments: [buildHouseSelectKeyboard(houses, page)] },
            });
            return true;
        }

        if (!payload.startsWith("house_residents_import:")) return false;

        const houseId = Number(payload.slice("house_residents_import:".length));
        setData(ctx.user.user_id, { residentsHouseId: houseId });
        setStep(ctx.user.user_id, "house/import_residents_csv");
        await ctx.answerOnCallback({
            message: { text: 'Пришлите CSV-файл с жителями. Обязательные колонки — "full_name", "phone".' },
        });
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

        const text = ctx.message?.body.text?.trim() ?? "";
        if (!text) return true;

        if (session.step === "house/address") {
            await handleAddress(ctx, text);
            return true;
        }
        if (session.step === "house/number") {
            await handleNumber(ctx, text);
            return true;
        }
        return false;
    },
};
