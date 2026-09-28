import { FetchError } from "ofetch";
import { api, type Auth } from "@/api";
import { clearFlow, getSession, setFlow, setStep, type AppContext } from "@/context";
import { downloadFile, findCsvAttachment, formatImportReport, sendCsvTemplate } from "@/csv-import";
import { csvTemplates } from "@/csv-templates";
import { backToMenuKeyboard, cancelKeyboard } from "@/menu";

function authFor(ctx: AppContext): Auth {
    return { maxUserId: String(ctx.user!.user_id) };
}

export async function startEmergencyImport(ctx: AppContext) {
    if (!ctx.user) return;

    setFlow(ctx.user.user_id, "emergency");
    setStep(ctx.user.user_id, "emergency/import_csv");
    await ctx.answerOnCallback({
        message: {
            text: 'Пришлите CSV-файл с аварийными службами. Обязательные колонки — "name", "phone".',
            attachments: [cancelKeyboard],
        },
    });
    await sendCsvTemplate(ctx, csvTemplates.emergencyServices);
}

export async function showEmergencyServices(ctx: AppContext) {
    if (!ctx.user) return;

    try {
        const services = await api.representative.emergencyServices.list(authFor(ctx));
        const text =
            services.length === 0
                ? "Аварийные службы ещё не добавлены."
                : services.map((s) => `${s.name}: ${s.phone}`).join("\n");
        await ctx.answerOnCallback({ message: { text, attachments: [backToMenuKeyboard] } });
    } catch {
        await ctx.answerOnCallback({
            message: { text: "Не удалось загрузить список, попробуйте позже.", attachments: [backToMenuKeyboard] },
        });
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
        const report = await api.representative.emergencyServices.importCsv(authFor(ctx), {
            data,
            filename: file.filename,
        });
        clearFlow(ctx.user.user_id);
        await ctx.reply(formatImportReport(report), { attachments: [backToMenuKeyboard] });
    } catch (err) {
        const status = err instanceof FetchError ? err.statusCode : undefined;
        if (status === 400) {
            await ctx.reply('Не удалось разобрать файл: проверьте формат и колонки "name", "phone".');
        } else {
            await ctx.reply("Не удалось загрузить аварийные службы, попробуйте позже.");
        }
    }
}

export const emergencyFlow = {
    onMessageCreated: async (ctx: AppContext) => {
        if (!ctx.user) return false;

        const session = getSession(ctx.user.user_id);
        if (session.flow !== "emergency" || session.step !== "emergency/import_csv") return false;

        await handleImportCsv(ctx);
        return true;
    },
};
