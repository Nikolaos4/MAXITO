import { FetchError } from "ofetch";
import { api, type Auth } from "@/api";
import { clearFlow, getSession, setData, setFlow, setStep, type AppContext } from "@/context";
import { backToMenuKeyboard, cancelKeyboard } from "@/menu";

function authFor(ctx: AppContext): Auth {
    return { maxUserId: String(ctx.user!.user_id) };
}

const skip = (text: string) => (text === "-" ? "" : text);

function formatCompany(company: {
    full_name?: string;
    short_name?: string;
    dispatcher_phone?: string;
    contact_phone?: string;
    email?: string;
    website?: string;
}): string {
    if (!company.full_name) return "Реквизиты УК ещё не заполнены.";

    return [
        `Название: ${company.full_name}`,
        company.short_name && `Короткое название: ${company.short_name}`,
        company.dispatcher_phone && `Телефон аварийно-диспетчерской службы: ${company.dispatcher_phone}`,
        company.contact_phone && `Контактный телефон: ${company.contact_phone}`,
        company.email && `Email: ${company.email}`,
        company.website && `Сайт: ${company.website}`,
    ]
        .filter(Boolean)
        .join("\n");
}

export async function startCompanyEdit(ctx: AppContext) {
    if (!ctx.user) return;
    const userId = ctx.user.user_id;

    const current = await api.representative.company.get(authFor(ctx)).catch(() => ({}));

    setFlow(userId, "company");
    setStep(userId, "company/full_name");
    setData(userId, {});

    await ctx.answerOnCallback({
        message: {
            text: `${formatCompany(current)}\n\nВведите полное название управляющей компании.`,
            attachments: [cancelKeyboard],
        },
    });
}

async function handleFullName(ctx: AppContext, text: string) {
    if (!ctx.user) return;
    setData(ctx.user.user_id, { fullName: text });
    setStep(ctx.user.user_id, "company/short_name");
    await ctx.reply('Короткое название (или "-", чтобы пропустить).', { attachments: [cancelKeyboard] });
}

async function handleShortName(ctx: AppContext, text: string) {
    if (!ctx.user) return;
    setData(ctx.user.user_id, { shortName: skip(text) });
    setStep(ctx.user.user_id, "company/dispatcher_phone");
    await ctx.reply('Телефон аварийно-диспетчерской службы (или "-").', { attachments: [cancelKeyboard] });
}

async function handleDispatcherPhone(ctx: AppContext, text: string) {
    if (!ctx.user) return;
    setData(ctx.user.user_id, { dispatcherPhone: skip(text) });
    setStep(ctx.user.user_id, "company/contact_phone");
    await ctx.reply('Контактный телефон УК (или "-").', { attachments: [cancelKeyboard] });
}

async function handleContactPhone(ctx: AppContext, text: string) {
    if (!ctx.user) return;
    setData(ctx.user.user_id, { contactPhone: skip(text) });
    setStep(ctx.user.user_id, "company/email");
    await ctx.reply('Email (или "-").', { attachments: [cancelKeyboard] });
}

async function handleEmail(ctx: AppContext, text: string) {
    if (!ctx.user) return;
    setData(ctx.user.user_id, { email: skip(text) });
    setStep(ctx.user.user_id, "company/website");
    await ctx.reply('Сайт (или "-").', { attachments: [cancelKeyboard] });
}

async function handleWebsite(ctx: AppContext, text: string) {
    if (!ctx.user) return;
    const userId = ctx.user.user_id;
    const { fullName, shortName, dispatcherPhone, contactPhone, email } = getSession(userId).data as {
        fullName: string;
        shortName: string;
        dispatcherPhone: string;
        contactPhone: string;
        email: string;
    };

    try {
        await api.representative.company.update(authFor(ctx), {
            full_name: fullName,
            short_name: shortName,
            dispatcher_phone: dispatcherPhone,
            contact_phone: contactPhone,
            email,
            website: skip(text),
        });
        clearFlow(userId);
        await ctx.reply("Реквизиты УК сохранены.", { attachments: [backToMenuKeyboard] });
    } catch (err) {
        const status = err instanceof FetchError ? err.statusCode : undefined;
        if (status === 400) {
            await ctx.reply("Не удалось сохранить: проверьте введённые данные.");
        } else {
            await ctx.reply("Не удалось сохранить реквизиты, попробуйте позже.");
        }
    }
}

export const companyFlow = {
    onMessageCreated: async (ctx: AppContext) => {
        if (!ctx.user) return false;

        const session = getSession(ctx.user.user_id);
        if (session.flow !== "company") return false;

        const text = ctx.message?.body.text?.trim() ?? "";
        if (!text) return true;

        switch (session.step) {
            case "company/full_name":
                await handleFullName(ctx, text);
                return true;
            case "company/short_name":
                await handleShortName(ctx, text);
                return true;
            case "company/dispatcher_phone":
                await handleDispatcherPhone(ctx, text);
                return true;
            case "company/contact_phone":
                await handleContactPhone(ctx, text);
                return true;
            case "company/email":
                await handleEmail(ctx, text);
                return true;
            case "company/website":
                await handleWebsite(ctx, text);
                return true;
            default:
                return false;
        }
    },
};
