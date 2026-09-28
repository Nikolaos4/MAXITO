import { timingSafeEqual } from "node:crypto";
import { createServer, type IncomingMessage } from "node:http";
import type { Bot } from "@maxhub/max-bot-api";
import { z } from "zod";
import type { AppContext } from "@/context";
import { env } from "@/env";
import { STATUS_LABELS } from "@/status";

const notifyBodySchema = z.discriminatedUnion("type", [
    z.object({
        type: z.literal("appeal_created"),
        max_user_ids: z.array(z.string().min(1)).min(1),
        payload: z.object({
            appeal_id: z.number(),
            problem_type_title: z.string(),
            house_address: z.string(),
            entrance_number: z.number().nullable().optional(),
            description: z.string(),
        }),
    }),
    z.object({
        type: z.literal("appeal_status_changed"),
        max_user_ids: z.array(z.string().min(1)).min(1),
        payload: z.object({
            appeal_id: z.number(),
            problem_type_title: z.string(),
            house_address: z.string(),
            to_status: z.enum(["accepted", "in_progress", "completed", "rejected"]),
            comment: z.string().optional(),
        }),
    }),
    z.object({
        type: z.literal("notification_created"),
        max_user_ids: z.array(z.string().min(1)).min(1),
        payload: z.object({
            title: z.string(),
            body: z.string(),
            house_address: z.string(),
            starts_at: z.string(),
            ends_at: z.string(),
        }),
    }),
]);

type NotifyBody = z.infer<typeof notifyBodySchema>;

function formatDateTime(iso: string): string {
    return new Date(iso).toLocaleString("ru-RU", {
        day: "2-digit",
        month: "2-digit",
        year: "numeric",
        hour: "2-digit",
        minute: "2-digit",
    });
}

function buildText(body: NotifyBody): string {
    switch (body.type) {
        case "appeal_created": {
            const { problem_type_title, house_address, entrance_number, description } = body.payload;
            const entrance = entrance_number ? `, подъезд ${entrance_number}` : "";
            return `Новое обращение: ${problem_type_title} — ${house_address}${entrance}\n${description}`;
        }
        case "appeal_status_changed": {
            const { appeal_id, problem_type_title, house_address, to_status, comment } = body.payload;
            const label = STATUS_LABELS[to_status] ?? to_status;
            const commentLine = comment ? `\nКомментарий: ${comment}` : "";
            return `Обращение №${appeal_id} (${problem_type_title}, ${house_address}): статус изменён на «${label}».${commentLine}`;
        }
        case "notification_created": {
            const { title, house_address, body: text, starts_at, ends_at } = body.payload;
            return `${title}\n${house_address}\n${text}\nПериод: ${formatDateTime(starts_at)} — ${formatDateTime(ends_at)}`;
        }
    }
}

function keyMatches(header: string | string[] | undefined): boolean {
    if (typeof header !== "string") return false;
    const a = Buffer.from(header);
    const b = Buffer.from(env.INTERNAL_API_KEY);
    return a.length === b.length && timingSafeEqual(a, b);
}

function readBody(req: IncomingMessage): Promise<string> {
    return new Promise((resolve, reject) => {
        let data = "";
        req.on("data", (chunk) => (data += chunk));
        req.on("end", () => resolve(data));
        req.on("error", reject);
    });
}

export function startNotifyServer(bot: Bot<AppContext>) {
    const server = createServer(async (req, res) => {
        if (req.method !== "POST" || req.url !== "/notify") {
            res.writeHead(404).end();
            return;
        }
        if (!keyMatches(req.headers["x-internal-key"])) {
            res.writeHead(401).end();
            return;
        }

        let body: NotifyBody;
        try {
            body = notifyBodySchema.parse(JSON.parse(await readBody(req)));
        } catch (err) {
            res.writeHead(400, { "content-type": "application/json" });
            res.end(
                JSON.stringify({ error: "invalid body", details: err instanceof Error ? err.message : String(err) }),
            );
            return;
        }

        const text = buildText(body);
        let sent = 0;
        let failed = 0;
        for (const id of body.max_user_ids) {
            try {
                await bot.api.sendMessageToUser(Number(id), text);
                sent++;
            } catch (err) {
                failed++;
                console.error(`notify: failed to send to max_user_id=${id}:`, err);
            }
        }

        res.writeHead(200, { "content-type": "application/json" });
        res.end(JSON.stringify({ sent, failed }));
    });

    server.listen(env.NOTIFY_PORT, () => {
        console.log(`Notify server listening on port ${env.NOTIFY_PORT}`);
    });
}
