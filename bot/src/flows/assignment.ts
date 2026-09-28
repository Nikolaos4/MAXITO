import { Keyboard } from "@maxhub/max-bot-api";
import { api, type Auth } from "@/api";
import { clearFlow, getSession, setData, setFlow, setStep, type AppContext } from "@/context";
import { houseLabel } from "@/flows/house";
import { backToMenuKeyboard } from "@/menu";
import { pageCount, pagedKeyboard } from "@/paged";

type DispatcherOption = { id: number; full_name: string; phone: string };
type HouseOption = { id: number; address: string; number?: string };

function authFor(ctx: AppContext): Auth {
    return { maxUserId: String(ctx.user!.user_id) };
}

async function show(ctx: AppContext, text: string, keyboard: ReturnType<typeof Keyboard.inlineKeyboard>) {
    if (ctx.callback) await ctx.answerOnCallback({ message: { text, attachments: [keyboard] } });
    else await ctx.reply(text, { attachments: [keyboard] });
}

function withPage(text: string, page: number, total: number) {
    return total > 1 ? `${text} (стр. ${page + 1}/${total})` : text;
}

async function renderDispatchers(ctx: AppContext, page: number) {
    const dispatchers = getSession(ctx.user!.user_id).data.dispatchers as DispatcherOption[];
    await show(
        ctx,
        withPage("Выберите диспетчера:", page, pageCount(dispatchers.length)),
        pagedKeyboard(dispatchers, page, {
            label: (d) => `${d.full_name}, ${d.phone}`,
            itemPayload: (d) => `assign_disp:${d.id}`,
            pagePayload: (p) => `assign_disp_page:${p}`,
        }),
    );
}

async function renderHouses(ctx: AppContext, page: number) {
    const { dispatcher, houses, selected } = getSession(ctx.user!.user_id).data as {
        dispatcher: DispatcherOption;
        houses: HouseOption[];
        selected: number[];
    };
    await show(
        ctx,
        withPage(
            `Дома диспетчера ${dispatcher.full_name}. Нажмите на дом, чтобы назначить или снять его, затем «Готово»:`,
            page,
            pageCount(houses.length),
        ),
        pagedKeyboard(houses, page, {
            label: (h) => `${selected.includes(h.id) ? "✅" : "⬜"} ${houseLabel(h)}`,
            itemPayload: (h, p) => `assign_toggle:${h.id}:${p}`,
            pagePayload: (p) => `assign_page:${p}`,
            footer: [[Keyboard.button.callback("Готово", "assign_done")]],
        }),
    );
}

// Шаг «выбрать дома» для конкретного диспетчера. Вызывается и из меню, и сразу
// после добавления нового диспетчера — экран один и тот же.
export async function startHousesSelect(ctx: AppContext, dispatcher: DispatcherOption) {
    const userId = ctx.user!.user_id;
    const auth = authFor(ctx);

    const [houses, assigned] = await Promise.all([
        api.representative.houses.list(auth),
        api.representative.assignments.listByDispatcher(auth, dispatcher.id),
    ]);
    if (houses.length === 0) {
        clearFlow(userId);
        await show(ctx, "Сначала добавьте хотя бы один дом.", backToMenuKeyboard);
        return;
    }

    const original = assigned.map((h) => h.id);
    setFlow(userId, "assignment");
    setStep(userId, "assignment/houses_select");
    setData(userId, {
        dispatcher: { id: dispatcher.id, full_name: dispatcher.full_name, phone: dispatcher.phone },
        houses,
        original,
        selected: original,
    });
    await renderHouses(ctx, 0);
}

export async function startDispatcherSelect(ctx: AppContext) {
    const userId = ctx.user!.user_id;

    const list = await api.representative.dispatchers.list(authFor(ctx));
    const dispatchers = list.filter((d) => d.is_active).map(({ id, full_name, phone }) => ({ id, full_name, phone }));
    if (dispatchers.length === 0) {
        await show(ctx, "Сначала добавьте хотя бы одного диспетчера.", backToMenuKeyboard);
        return;
    }

    setFlow(userId, "assignment");
    setStep(userId, "assignment/dispatcher_select");
    setData(userId, { dispatchers });
    await renderDispatchers(ctx, 0);
}

async function applyChanges(ctx: AppContext) {
    const userId = ctx.user!.user_id;
    const { dispatcher, original, selected } = getSession(userId).data as {
        dispatcher: DispatcherOption;
        original: number[];
        selected: number[];
    };
    const toAdd = selected.filter((id) => !original.includes(id));
    const toRemove = original.filter((id) => !selected.includes(id));

    if (toAdd.length === 0 && toRemove.length === 0) {
        clearFlow(userId);
        await show(ctx, "Изменений нет.", backToMenuKeyboard);
        return;
    }

    const auth = authFor(ctx);
    const lines: string[] = [];
    try {
        if (toAdd.length > 0) {
            const report = await api.representative.assignments.assignHouses(auth, dispatcher.id, toAdd);
            lines.push(`Назначено домов: ${report.created}.`);
            for (const row of report.rows) {
                if (row.status !== "created" && row.message) lines.push(`• ${row.message}`);
            }
        }

        let removed = 0;
        for (const houseId of toRemove) {
            try {
                await api.representative.assignments.unassignHouse(auth, dispatcher.id, houseId);
                removed++;
            } catch {
                lines.push(`• Не удалось снять дом (id ${houseId}).`);
            }
        }
        if (toRemove.length > 0) lines.push(`Снято домов: ${removed}.`);
    } catch {
        // Флоу не сбрасываем: выбор сохранён, можно нажать «Готово» ещё раз.
        await ctx.reply("Не удалось сохранить изменения, попробуйте ещё раз позже.");
        return;
    }

    clearFlow(userId);
    await show(ctx, `Диспетчер ${dispatcher.full_name}.\n${lines.join("\n")}`, backToMenuKeyboard);
}

export const assignmentFlow = {
    onMessageCallback: async (ctx: AppContext) => {
        if (!ctx.user || !ctx.callback) return false;

        const userId = ctx.user.user_id;
        const session = getSession(userId);
        if (session.flow !== "assignment") return false;

        const [cmd, ...args] = (ctx.callback.payload ?? "").split(":");

        if (session.step === "assignment/dispatcher_select") {
            if (cmd === "assign_disp_page") {
                await renderDispatchers(ctx, Number(args[0]));
                return true;
            }
            if (cmd === "assign_disp") {
                const dispatchers = session.data.dispatchers as DispatcherOption[];
                const dispatcher = dispatchers.find((d) => d.id === Number(args[0]));
                if (dispatcher) await startHousesSelect(ctx, dispatcher);
                return true;
            }
        }

        if (session.step === "assignment/houses_select") {
            if (cmd === "assign_page") {
                await renderHouses(ctx, Number(args[0]));
                return true;
            }
            if (cmd === "assign_toggle") {
                const houseId = Number(args[0]);
                const selected = session.data.selected as number[];
                setData(userId, {
                    selected: selected.includes(houseId)
                        ? selected.filter((id) => id !== houseId)
                        : [...selected, houseId],
                });
                await renderHouses(ctx, Number(args[1]));
                return true;
            }
            if (cmd === "assign_done") {
                await applyChanges(ctx);
                return true;
            }
        }

        return false;
    },
};
