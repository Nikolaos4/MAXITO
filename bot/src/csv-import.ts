import { mkdtemp, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { ofetch } from "ofetch";
import type { FileAttachment } from "@maxhub/max-bot-api/types";
import type { ImportReport } from "@/api";
import type { CsvTemplate } from "@/csv-templates";
import type { AppContext } from "@/context";

export function findCsvAttachment(ctx: AppContext): FileAttachment | undefined {
    return ctx.message?.body.attachments?.find((a): a is FileAttachment => a.type === "file");
}

const UTF8_BOM = Buffer.from([0xef, 0xbb, 0xbf]);

export async function downloadFile(url: string): Promise<Buffer> {
    const data = Buffer.from(await ofetch(url, { responseType: "arrayBuffer" }));
    if (data.subarray(0, 3).equals(UTF8_BOM)) {
        return data.subarray(3);
    }
    return data;
}

export async function sendCsvTemplate(ctx: AppContext, template: CsvTemplate) {
    const dir = await mkdtemp(join(tmpdir(), "csv-template-"));
    const filePath = join(dir, template.fileName);

    try {
        const BOM = String.fromCharCode(0xfeff);
        await writeFile(filePath, BOM + template.content, "utf-8");
        const file = await ctx.api.uploadFile({ source: filePath });
        await ctx.reply("Пример заполнения:", { attachments: [file.toJson()] });
    } finally {
        await rm(dir, { recursive: true, force: true });
    }
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
