import { FetchError } from "ofetch";
import { api, type Auth } from "@/api";
import { clearFlow, getSession, setData, setStep, type AppContext } from "@/context";
import { downloadFile, findCsvAttachment, formatImportReport } from "@/csv-import";
import { backToMenuKeyboard } from "@/menu";

function authFor(ctx: AppContext): Auth {
    return { maxUserId: String(ctx.user!.user_id) };
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

export const houseFlow = {
    onMessageCreated: async (ctx: AppContext) => {
        if (!ctx.user) return false;

        const session = getSession(ctx.user.user_id);
        if (session.flow !== "house") return false;

        if (session.step === "house/import_csv") {
            await handleImportCsv(ctx);
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
