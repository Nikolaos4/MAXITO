import { FetchError } from "ofetch";
import { api, type Auth } from "@/api";
import { clearFlow, getSession, setData, setStep, type AppContext } from "@/context";
import { downloadFile, findCsvAttachment, formatImportReport } from "@/csv-import";
import { backToMenuKeyboard } from "@/menu";

function authFor(ctx: AppContext): Auth {
    return { maxUserId: String(ctx.user!.user_id) };
}

async function handleFullName(ctx: AppContext, text: string) {
    if (!ctx.user) return;

    setData(ctx.user.user_id, { fullName: text });
    setStep(ctx.user.user_id, "dispatcher/phone");
    await ctx.reply("Введите номер телефона диспетчера.");
}

async function handlePhone(ctx: AppContext, text: string) {
    if (!ctx.user) return;

    const session = getSession(ctx.user.user_id);
    const fullName = session.data.fullName as string;

    try {
        const dispatcher = await api.dispatchers.create(authFor(ctx), { full_name: fullName, phone: text });
        clearFlow(ctx.user.user_id);
        await ctx.reply(`Диспетчер добавлен: ${dispatcher.full_name}, ${dispatcher.phone} (id ${dispatcher.id}).`, {
            attachments: [backToMenuKeyboard],
        });
    } catch (err) {
        const status = err instanceof FetchError ? err.statusCode : undefined;
        if (status === 400) {
            await ctx.reply(
                "Не удалось добавить диспетчера: проверьте номер телефона (возможно, уже зарегистрирован).",
            );
        } else {
            await ctx.reply("Не удалось добавить диспетчера, попробуйте позже.");
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
        const report = await api.dispatchers.importCsv(authFor(ctx), { data, filename: file.filename });
        clearFlow(ctx.user.user_id);
        await ctx.reply(formatImportReport(report), { attachments: [backToMenuKeyboard] });
    } catch (err) {
        const status = err instanceof FetchError ? err.statusCode : undefined;
        if (status === 400) {
            await ctx.reply('Не удалось разобрать файл: проверьте формат и колонки "full_name"/"phone".');
        } else {
            await ctx.reply("Не удалось загрузить диспетчеров, попробуйте позже.");
        }
    }
}

export const dispatcherFlow = {
    onMessageCreated: async (ctx: AppContext) => {
        if (!ctx.user) return false;

        const session = getSession(ctx.user.user_id);
        if (session.flow !== "dispatcher") return false;

        if (session.step === "dispatcher/import_csv") {
            await handleImportCsv(ctx);
            return true;
        }

        const text = ctx.message?.body.text?.trim() ?? "";
        if (!text) return true;

        if (session.step === "dispatcher/full_name") {
            await handleFullName(ctx, text);
            return true;
        }
        if (session.step === "dispatcher/phone") {
            await handlePhone(ctx, text);
            return true;
        }
        return false;
    },
};
