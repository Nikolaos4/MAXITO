import { Keyboard } from "@maxhub/max-bot-api";

export const PAGE_SIZE = 8;

type Button = ReturnType<typeof Keyboard.button.callback>;

export const pageCount = (total: number) => Math.max(1, Math.ceil(total / PAGE_SIZE));

export const clampPage = (page: number, total: number) => Math.min(Math.max(page, 0), pageCount(total) - 1);

export function pagedKeyboard<T>(
    items: T[],
    page: number,
    opts: {
        label: (item: T) => string;
        itemPayload: (item: T, page: number) => string;
        pagePayload: (page: number) => string;
        footer?: Button[][];
    },
) {
    const current = clampPage(page, items.length);
    const total = pageCount(items.length);

    const rows: Button[][] = items
        .slice(current * PAGE_SIZE, (current + 1) * PAGE_SIZE)
        .map((item) => [Keyboard.button.callback(opts.label(item), opts.itemPayload(item, current))]);

    const nav: Button[] = [];
    if (current > 0) nav.push(Keyboard.button.callback("« Назад", opts.pagePayload(current - 1)));
    if (current < total - 1) nav.push(Keyboard.button.callback("Далее »", opts.pagePayload(current + 1)));
    if (nav.length > 0) rows.push(nav);

    rows.push(...(opts.footer ?? []), [Keyboard.button.callback("Отмена", "flow:cancel")]);

    return Keyboard.inlineKeyboard(rows);
}
