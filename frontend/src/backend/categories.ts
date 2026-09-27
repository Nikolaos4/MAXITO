import { backendRequest } from "./request";
import type { BackendProblemType, BackendReason } from "./types";
import type { Category } from "../types";

export interface ResolvedCategories {
  categories: Category[];
  /** numeric problem_type_id по коду категории (нужен для отправки формы) */
  problemTypeId: (categoryCode: string) => number | undefined;
  /** numeric reason_id по коду категории + тексту причины, как он показан в Select */
  reasonId: (categoryCode: string, reasonTitle: string) => number | undefined;
  /** Обратная карта: reason_id → тема/причина (нужна для отображения уведомлений — там нет problem_type_id вообще) */
  byReasonId: (reasonId: number) => { categoryCode: string; categoryTitle: string; reasonTitle: string } | undefined;
}

/**
 * Темы и причины реальный бэкенд отдаёт по id, а не строковыми кодами —
 * список причин на тему приходит отдельным запросом. Собираем всё это в
 * ту же форму Category, которой уже пользуется UI (CreateAppeal/PlannedWork),
 * плюс лукапы id → они нужны только в момент отправки формы.
 */
export async function loadCategories(prefix: "/resident" | "/dispatcher"): Promise<ResolvedCategories> {
  const types = await backendRequest<BackendProblemType[]>(`${prefix}/problem-types`);

  const withReasons = await Promise.all(
    types.map(async (t) => ({
      type: t,
      reasons: await backendRequest<BackendReason[]>(`${prefix}/problem-types/${t.id}/reasons`),
    })),
  );

  const problemTypeIds = new Map<string, number>();
  const reasonIds = new Map<string, number>();
  const byReasonId = new Map<number, { categoryCode: string; categoryTitle: string; reasonTitle: string }>();
  const categories: Category[] = [];

  for (const { type, reasons } of withReasons) {
    problemTypeIds.set(type.code, type.id);
    const normal = reasons.filter((r) => !r.is_other);
    const otherReason = reasons.find((r) => r.is_other);

    reasons.forEach((r) => byReasonId.set(r.id, { categoryCode: type.code, categoryTitle: type.title, reasonTitle: r.title }));
    normal.forEach((r) => reasonIds.set(`${type.code}\u0000${r.title}`, r.id));
    // Тема "Другое" — свободный текст, отдельная причина не выбирается.
    // У обычной темы "Другое" — рядовой пункт списка причин (как все остальные).
    if (type.code === "other") {
      categories.push({ code: type.code, title: type.title, reasons: [], freeText: true });
    } else {
      if (otherReason) reasonIds.set(`${type.code}\u0000${otherReason.title}`, otherReason.id);
      categories.push({
        code: type.code,
        title: type.title,
        reasons: [...normal.map((r) => r.title), ...(otherReason ? [otherReason.title] : [])],
      });
    }
  }

  return {
    categories,
    problemTypeId: (code) => problemTypeIds.get(code),
    reasonId: (code, title) => reasonIds.get(`${code}\u0000${title}`),
    byReasonId: (id) => byReasonId.get(id),
  };
}
