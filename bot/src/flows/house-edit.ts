import { FetchError } from "ofetch";
import { api, type Auth } from "@/api";
import { clearFlow, getSession, setData, setFlow, setStep, type AppContext } from "@/context";
import { houseLabel } from "@/flows/house";
import { backToMenuKeyboard, cancelKeyboard } from "@/menu";
import { pagedKeyboard } from "@/paged";

function authFor(ctx: AppContext): Auth {
    return { maxUserId: String(ctx.user!.user_id) };
}

type House = Awaited<ReturnType<typeof api.representative.houses.list>>[number];

function formatHouse(h: House): string {
    return [
        `Адрес: ${houseLabel(h)}`,
        h.floors_count != null && `Этажей: ${h.floors_count}`,
        h.construction_year != null && `Год постройки: ${h.construction_year}`,
        h.chat_invite_link && `Ссылка на чат: ${h.chat_invite_link}`,
    ]
        .filter(Boolean)
        .join("\n");
}

function selectKeyboard(houses: House[], page: number) {
    return pagedKeyboard(houses, page, {
        label: houseLabel,
        itemPayload: (h) => `house_edit_pick:${h.id}`,
        pagePayload: (p) => `house_edit_page:${p}`,
    });
}

export async function startHouseEdit(ctx: AppContext) {
    if (!ctx.user) return;
    const userId = ctx.user.user_id;

    const houses = await api.representative.houses.list(authFor(ctx));
    if (houses.length === 0) {
        await ctx.answerOnCallback({ message: { text: "Сначала добавьте хотя бы один дом." } });
        return;
    }

    setFlow(userId, "house_edit");
    setStep(userId, "house_edit/select");
    setData(userId, { houses });

    await ctx.answerOnCallback({
        message: { text: "Выберите дом для редактирования:", attachments: [selectKeyboard(houses, 0)] },
    });
}

const keep = (text: string) => (text === "-" ? undefined : text);

async function handlePick(ctx: AppContext, house: House) {
    if (!ctx.user) return;
    setData(ctx.user.user_id, { houseId: house.id });
    setStep(ctx.user.user_id, "house_edit/address");
    await ctx.answerOnCallback({
        message: {
            text: `${formatHouse(house)}\n\nНовый адрес (или "-", чтобы оставить как есть).`,
            attachments: [cancelKeyboard],
        },
    });
}

async function handleAddress(ctx: AppContext, text: string) {
    if (!ctx.user) return;
    setData(ctx.user.user_id, { address: keep(text) });
    setStep(ctx.user.user_id, "house_edit/number");
    await ctx.reply('Новый номер корпуса/строения (или "-", чтобы оставить как есть).', {
        attachments: [cancelKeyboard],
    });
}

async function handleNumber(ctx: AppContext, text: string) {
    if (!ctx.user) return;
    setData(ctx.user.user_id, { number: keep(text) });
    setStep(ctx.user.user_id, "house_edit/floors_count");
    await ctx.reply('Количество этажей (или "-", чтобы оставить как есть).', { attachments: [cancelKeyboard] });
}

async function handleFloorsCount(ctx: AppContext, text: string) {
    if (!ctx.user) return;

    if (text !== "-") {
        const n = Number(text);
        if (!Number.isInteger(n) || n < 1) {
            await ctx.reply('Введите целое число этажей (не меньше 1) или "-".');
            return;
        }
    }

    setData(ctx.user.user_id, { floorsCount: text === "-" ? undefined : Number(text) });
    setStep(ctx.user.user_id, "house_edit/construction_year");
    await ctx.reply('Год постройки (или "-", чтобы оставить как есть).', { attachments: [cancelKeyboard] });
}

async function handleConstructionYear(ctx: AppContext, text: string) {
    if (!ctx.user) return;
    const userId = ctx.user.user_id;

    let constructionYear: number | undefined;
    if (text !== "-") {
        const n = Number(text);
        if (!Number.isInteger(n) || n < 1000 || n > 3000) {
            await ctx.reply('Введите год постройки (например, 1985) или "-".');
            return;
        }
        constructionYear = n;
    }

    setData(userId, { constructionYear });
    setStep(userId, "house_edit/chat_link");
    await ctx.reply('Ссылка на чат дома (или "-", чтобы оставить как есть).', { attachments: [cancelKeyboard] });
}

async function handleChatLink(ctx: AppContext, text: string) {
    if (!ctx.user) return;
    const userId = ctx.user.user_id;

    const session = getSession(userId);
    const houseId = session.data.houseId as number;
    const { address, number, floorsCount, constructionYear } = session.data as {
        address?: string;
        number?: string;
        floorsCount?: number;
        constructionYear?: number;
    };

    const body: Parameters<typeof api.representative.houses.update>[2] = {};
    if (address !== undefined) body.address = address;
    if (number !== undefined) body.number = number;
    if (floorsCount !== undefined) body.floors_count = floorsCount;
    if (constructionYear !== undefined) body.construction_year = constructionYear;

    if (text !== "-") body.chat_invite_link = text;

    try {
        const house = await api.representative.houses.update(authFor(ctx), houseId, body);

        clearFlow(userId);
        await ctx.reply(`Дом обновлён.\n${formatHouse(house)}`, { attachments: [backToMenuKeyboard] });
    } catch (err) {
        const status = err instanceof FetchError ? err.statusCode : undefined;
        if (status === 400) {
            await ctx.reply("Не удалось сохранить: проверьте введённые данные.");
        } else {
            await ctx.reply("Не удалось сохранить изменения, попробуйте позже.");
        }
    }
}

export const houseEditFlow = {
    onMessageCallback: async (ctx: AppContext) => {
        if (!ctx.user || !ctx.callback) return false;

        const session = getSession(ctx.user.user_id);
        if (session.flow !== "house_edit" || session.step !== "house_edit/select") return false;

        const payload = ctx.callback.payload ?? "";
        const houses = (session.data.houses ?? []) as House[];

        if (payload.startsWith("house_edit_page:")) {
            const page = Number(payload.slice("house_edit_page:".length));
            await ctx.answerOnCallback({
                message: { text: "Выберите дом для редактирования:", attachments: [selectKeyboard(houses, page)] },
            });
            return true;
        }

        if (!payload.startsWith("house_edit_pick:")) return false;

        const houseId = Number(payload.slice("house_edit_pick:".length));
        const house = houses.find((h) => h.id === houseId);
        if (!house) return false;

        await handlePick(ctx, house);
        return true;
    },

    onMessageCreated: async (ctx: AppContext) => {
        if (!ctx.user) return false;

        const session = getSession(ctx.user.user_id);
        if (session.flow !== "house_edit") return false;

        const text = ctx.message?.body.text?.trim() ?? "";
        if (!text) return true;

        switch (session.step) {
            case "house_edit/address":
                await handleAddress(ctx, text);
                return true;
            case "house_edit/number":
                await handleNumber(ctx, text);
                return true;
            case "house_edit/floors_count":
                await handleFloorsCount(ctx, text);
                return true;
            case "house_edit/construction_year":
                await handleConstructionYear(ctx, text);
                return true;
            case "house_edit/chat_link":
                await handleChatLink(ctx, text);
                return true;
            default:
                return false;
        }
    },
};
