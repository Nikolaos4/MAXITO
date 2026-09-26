import type { AppealStatus, Category } from "../types";

export const CATEGORIES: Category[] = [
  {
    code: "lift",
    title: "Лифт",
    reasons: ["Шумы", "Механические повреждения", "Неполадки в управлении", "Не работает", "Застревает между этажами", "Не закрываются двери"],
  },
  {
    code: "water",
    title: "Вода",
    reasons: ["Нет воды", "Слабый напор", "Плохое качество воды", "Протечка", "Нет горячей воды"],
  },
  {
    code: "entrance",
    title: "Подъезд",
    reasons: ["Не убрано", "Не работает освещение", "Сломан домофон", "Повреждена дверь", "Неприятный запах"],
  },
  {
    code: "yard",
    title: "Двор",
    reasons: ["Не убран снег", "Не вывезен мусор", "Сломана площадка", "Не работает освещение", "Яма на дороге"],
  },
  {
    code: "heating",
    title: "Отопление",
    reasons: ["Холодные батареи", "Нет отопления", "Протечка батареи", "Шум в трубах"],
  },
  { code: "other", title: "Другое", reasons: [], freeText: true },
];

/** Пункт, который есть в списке причин любой категории */
export const OTHER_REASON = "Другое";

export const categoryByCode = (code: string): Category =>
  CATEGORIES.find((c) => c.code === code) ?? { code, title: code, reasons: [] };

export const STATUS_LABEL: Record<AppealStatus, string> = {
  accepted: "Принято",
  in_progress: "В работе",
  need_info: "Дополнить",
  completed: "Выполнено",
  rejected: "Отклонено",
};
