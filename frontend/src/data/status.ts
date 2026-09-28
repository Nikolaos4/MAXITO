import type { AppealStatus } from "../types";

/**
 * Граф переходов статуса обращения.
 * accepted → in_progress, rejected
 * in_progress → completed, rejected
 * completed / rejected — конечные
 */
export const STATUS_TRANSITIONS: Record<AppealStatus, AppealStatus[]> = {
  accepted: ["in_progress", "rejected"],
  in_progress: ["completed", "rejected"],
  completed: [],
  rejected: [],
};

export const isTerminalStatus = (status: AppealStatus) => STATUS_TRANSITIONS[status].length === 0;
