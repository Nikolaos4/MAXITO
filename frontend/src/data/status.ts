import type { AppealStatus } from "../types";

/**
 * Граф переходов статуса обращения.
 * accepted → in_progress, rejected
 * in_progress → need_info, completed, rejected
 * need_info → in_progress
 * completed / rejected — конечные
 */
export const STATUS_TRANSITIONS: Record<AppealStatus, AppealStatus[]> = {
  accepted: ["in_progress", "rejected"],
  in_progress: ["need_info", "completed", "rejected"],
  need_info: ["in_progress"],
  completed: [],
  rejected: [],
};

export const isTerminalStatus = (status: AppealStatus) => STATUS_TRANSITIONS[status].length === 0;
