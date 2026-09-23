import { ofetch } from "ofetch";
import type { FileAttachment } from "@maxhub/max-bot-api/types";
import type { ImportReport } from "@/api";
import type { AppContext } from "@/context";

export function findCsvAttachment(ctx: AppContext): FileAttachment | undefined {
    return ctx.message?.body.attachments?.find((a): a is FileAttachment => a.type === "file");
}

export async function downloadFile(url: string): Promise<Buffer> {
    return Buffer.from(await ofetch(url, { responseType: "arrayBuffer" }));
}

export function formatImportReport(report: ImportReport): string {
    const lines = [
        `Обработано строк: ${report.total_rows}. Создано: ${report.created}, пропущено: ${report.skipped}, ошибок: ${report.failed}.`,
    ];

    const errors = report.rows.filter((r) => r.status === "error");
    if (errors.length > 0) {
        lines.push(...errors.slice(0, 10).map((r) => `— строка ${r.row}: ${r.message}`));
        if (errors.length > 10) lines.push(`...и ещё ${errors.length - 10} ошибок.`);
    }

    return lines.join("\n");
}
