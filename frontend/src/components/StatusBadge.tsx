import { STATUS_LABEL } from "../data/categories";
import type { AppealStatus } from "../types";

export const StatusBadge = ({ status }: { status: AppealStatus }) => (
  <span className={`status status--${status}`}>{STATUS_LABEL[status]}</span>
);
