import { FetchError } from "ofetch";
import { api, type ApiRole } from "@/api";
import { clearFlow, getSession, setData, setFlow, setIsDemo, setRole, setStep, type AppContext } from "@/context";
import { sendRoleMenu } from "@/flows/role-menu";
import { DEMO_ROLE_PICK_TEXT, DEMO_START_TEXT, cancelKeyboard, demoRolePickKeyboard } from "@/menu";

function isApiRole(value: string): value is ApiRole {
    return value === "representative" || value === "dispatcher" || value === "resident";
}

function roleLabel(role: ApiRole) {
    return role === "representative" ? "представитель управляющей компании" : role === "dispatcher" ? "диспетчер" : "житель";
}

function demoErrorMessage(err: unknown): string {
    const status = err instanceof FetchError ? err.statusCode : undefined;
    switch (status) {
        case 401:
            return "Неверное кодовое слово. Попробуйте снова или нажмите «Отмена».";
        case 503:
            return "Демо-режим сейчас отключён.";
        case 409:
            return "Этот номер телефона уже занят, введите другой.";
        case 400:
            return "Проверьте введённые данные (номер телефона) и попробуйте снова.";
        default:
            return "Не удалось выполнить запрос, попробуйте позже.";
    }
}

async function handleCodeWord(ctx: AppContext, text: string) {
    if (!ctx.user) return;

    try {
        await api.demoVerifyCode(text);
    } catch (err) {
        await ctx.reply(demoErrorMessage(err), { attachments: [cancelKeyboard] });
        return;
    }

    setData(ctx.user.user_id, { demoCodeWord: text });
    setStep(ctx.user.user_id, "demo/awaiting_role");
    await ctx.reply(DEMO_ROLE_PICK_TEXT, { attachments: [demoRolePickKeyboard("demo_register_role")] });
}

async function handleFullName(ctx: AppContext, text: string) {
    if (!ctx.user) return;

    setData(ctx.user.user_id, { demoFullName: text });
    setStep(ctx.user.user_id, "demo/phone");
    await ctx.reply("Введите номер телефона (без проверки в базе — подойдёт любой в формате +7...).", {
        attachments: [cancelKeyboard],
    });
}

async function handlePhone(ctx: AppContext, text: string) {
    if (!ctx.user) return;

    const session = getSession(ctx.user.user_id);
    const codeWord = session.data.demoCodeWord as string;
    const role = session.data.demoRole as ApiRole;
    const fullName = session.data.demoFullName as string;

    let user;
    try {
        user = await api.demoRegister(codeWord, role, fullName, text, String(ctx.user.user_id));
    } catch (err) {
        await ctx.reply(demoErrorMessage(err), { attachments: [cancelKeyboard] });
        return;
    }

    setRole(ctx.user.user_id, user.role);
    setIsDemo(ctx.user.user_id, true);
    clearFlow(ctx.user.user_id);

    await ctx.reply(`Готово! Демо-доступ выдан, роль: ${roleLabel(user.role)}.`);
    await sendRoleMenu(ctx, user.role);
}

async function handleSwitchRole(ctx: AppContext, role: ApiRole) {
    if (!ctx.user) return;

    try {
        const user = await api.demoSwitchRole(String(ctx.user.user_id), role);
        setRole(ctx.user.user_id, user.role);
        clearFlow(ctx.user.user_id);
        await ctx.reply(`Роль изменена: ${roleLabel(user.role)}.`);
        await sendRoleMenu(ctx, user.role);
    } catch (err) {
        await ctx.reply(demoErrorMessage(err));
    }
}

export const demoFlow = {
    onMessageCallback: async (ctx: AppContext) => {
        if (!ctx.user || !ctx.callback) return false;

        const payload = ctx.callback.payload;
        if (!payload) return false;

        if (payload === "demo:start") {
            setFlow(ctx.user.user_id, "demo");
            setStep(ctx.user.user_id, "demo/code_word");
            await ctx.answerOnCallback({ message: { text: DEMO_START_TEXT, attachments: [cancelKeyboard] } });
            return true;
        }

        if (payload.startsWith("demo_register_role:")) {
            const role = payload.slice("demo_register_role:".length);
            if (!isApiRole(role)) return false;

            setData(ctx.user.user_id, { demoRole: role });
            setStep(ctx.user.user_id, "demo/full_name");
            await ctx.answerOnCallback({ message: { text: "Введите ФИО.", attachments: [cancelKeyboard] } });
            return true;
        }

        if (payload === "demo:switch_role") {
            await ctx.answerOnCallback({
                message: { text: DEMO_ROLE_PICK_TEXT, attachments: [demoRolePickKeyboard("demo_switch")] },
            });
            return true;
        }

        if (payload.startsWith("demo_switch:")) {
            const role = payload.slice("demo_switch:".length);
            if (!isApiRole(role)) return false;

            await handleSwitchRole(ctx, role);
            return true;
        }

        return false;
    },

    onMessageCreated: async (ctx: AppContext) => {
        if (!ctx.user) return false;

        const session = getSession(ctx.user.user_id);
        if (session.flow !== "demo") return false;

        if (session.step === "demo/awaiting_role") {
            await ctx.reply("Пожалуйста, выберите роль на кнопках выше.");
            return true;
        }

        const text = ctx.message?.body.text?.trim() ?? "";
        if (!text) return true;

        if (session.step === "demo/code_word") {
            await handleCodeWord(ctx, text);
            return true;
        }
        if (session.step === "demo/full_name") {
            await handleFullName(ctx, text);
            return true;
        }
        if (session.step === "demo/phone") {
            await handlePhone(ctx, text);
            return true;
        }
        return false;
    },
};
