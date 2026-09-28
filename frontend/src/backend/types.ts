/**
 * Сырые DTO реального бэкенда (Go/Gin), как они приходят в JSON.
 * Отдельно от внутренних типов фронта (../types.ts) — те подстроены под
 * готовый UI, эти — точное отражение контракта сервера. Преобразование
 * между ними — в adapters.ts.
 */

export type BackendRole = "representative" | "dispatcher" | "resident";
export type BackendAppealStatus = "accepted" | "in_progress" | "completed" | "rejected";
export type BackendScope = "house" | "entrance";

export interface BackendUser {
  id: number;
  phone: string;
  full_name: string;
  role: BackendRole;
  is_active: boolean;
}

export interface BackendResidentInfo {
  house_id: number;
  apartment: string;
  entrance_number?: number | null;
}

export interface BackendDispatcherInfo {
  houses_count: number;
}

export interface BackendMe {
  id: number;
  phone: string;
  full_name: string;
  role: BackendRole;
  is_active: boolean;
  resident?: BackendResidentInfo;
  dispatcher?: BackendDispatcherInfo;
}

export interface BackendHouse {
  id: number;
  address: string;
  number: string;
  entrances_count: number;
  chat_invite_link?: string | null;
}

export interface BackendReason {
  id: number;
  problem_type_id: number;
  code: string;
  title: string;
  is_other: boolean;
}

export interface BackendProblemType {
  id: number;
  code: string;
  title: string;
  is_critical: boolean;
  reasons?: BackendReason[];
}

export interface BackendAppealStatusChange {
  id: number;
  appeal_id: number;
  from_status: BackendAppealStatus;
  to_status: BackendAppealStatus;
  changed_by: number;
  comment?: string;
  photo_url?: string | null;
  created_at: string;
  changed_by_user?: BackendUser;
}

export interface BackendAppeal {
  id: number;
  house_id: number;
  author_id: number;
  problem_type_id: number;
  reason_id: number;
  entrance_number?: number | null;
  discovered_at?: string | null;
  description: string;
  importance: "normal" | "important";
  status: BackendAppealStatus;
  wants_recalculation: boolean;
  created_at: string;
  updated_at: string;
  house?: BackendHouse;
  author?: BackendUser;
  problem_type?: BackendProblemType;
  reason?: BackendReason;
  likes_count?: number;
  history?: BackendAppealStatusChange[];
}

export interface BackendNotification {
  id: number;
  house_id: number;
  author_id: number;
  reason_id: number;
  scope_type: BackendScope;
  entrance_number?: number | null;
  title: string;
  body: string;
  starts_at: string;
  ends_at: string;
  revoked_at?: string | null;
  created_at: string;
  house?: BackendHouse;
  author?: BackendUser;
  reason?: BackendReason;
}

export interface Paginated<T> {
  total: number;
  page: number;
  page_size: number;
  items: T[];
}

export interface BackendErrorBody {
  error?: string;
  code?: string;
  existing_appeal_id?: number;
  blocking_notification?: BackendNotification;
}
