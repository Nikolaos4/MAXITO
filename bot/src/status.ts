import type { ApiAppealStatus } from "@/api";

export const STATUS_LABELS: Record<ApiAppealStatus, string> = {
    accepted: "Принято",
    in_progress: "В работе",
    completed: "Выполнено",
    rejected: "Отклонено",
};
