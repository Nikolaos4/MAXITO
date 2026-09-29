import { ofetch } from "ofetch";
import { env } from "@/env";

export type ApiRole = "representative" | "dispatcher" | "resident";

export type Auth = { maxUserId: string };

type ApiUser = {
    id: number;
    phone: string;
    full_name: string;
    role: ApiRole;
    max_user_id?: string | null;
    is_active: boolean;
    created_at: string;
    updated_at: string;
};

type ApiHouse = {
    id: number;
    address: string;
    number: string;
    entrances_count: number;
    floors_count?: number | null;
    construction_year?: number | null;
    chat_invite_link?: string | null;
    created_at: string;
    updated_at: string;
};

type ApiResident = {
    id: number;
    user_id: number;
    house_id: number;
    entrance_number?: number | null;
    apartment: string;
    created_at: string;
    updated_at: string;
    user?: ApiUser;
};

type ApiCompany = {
    full_name?: string;
    short_name?: string;
    dispatcher_phone?: string;
    contact_phone?: string;
    email?: string;
    website?: string;
    updated_at?: string;
};

type ApiEmergencyService = {
    id: number;
    name: string;
    phone: string;
    created_at: string;
};

type ApiDispatcherHouse = {
    id: number;
    dispatcher_id: number;
    house_id: number;
    assigned_by: number;
    assigned_at: string;
    dispatcher?: ApiUser;
    house?: ApiHouse;
};

export type ImportRowResult = {
    row: number;
    status: "created" | "skipped" | "error";
    message?: string;
    id?: number;
};

export type ImportReport = {
    total_rows: number;
    created: number;
    skipped: number;
    failed: number;
    rows: ImportRowResult[];
};

const baseURL = `${env.API_BASE_URL}/api/v1`;
const internalHeaders = { "X-Internal-Key": env.INTERNAL_API_KEY };

// Бот — доверенная сторона: общий INTERNAL_API_KEY + id пользователя MAX, без JWT.
function request<T>(path: string, auth: Auth, opts?: Parameters<typeof ofetch<T>>[1]) {
    return ofetch<T>(path, {
        baseURL,
        ...opts,
        headers: { ...internalHeaders, "X-Max-User-Id": auth.maxUserId, ...opts?.headers },
    });
}

// Привязка аккаунта MAX к пользователю по телефону (после «поделиться контактом»).
function bind(maxUserId: string, phone: string) {
    return ofetch("/internal/bind", {
        baseURL,
        method: "POST",
        headers: internalHeaders,
        body: { phone, max_user_id: maxUserId },
    });
}

function csvFormData(file: { data: Buffer; filename: string }) {
    const form = new FormData();
    form.append("file", new Blob([new Uint8Array(file.data)]), file.filename);
    return form;
}

export type ApiMe = {
    id: number;
    phone: string;
    full_name: string;
    role: ApiRole;
    is_active: boolean;
    resident?: { house_id: number; apartment: string; entrance_number?: number | null };
    dispatcher?: { houses_count: number };
};

type ApiProblemType = {
    id: number;
    code: string;
    title: string;
    is_critical: boolean;
    created_at: string;
};

type ApiReason = {
    id: number;
    problem_type_id: number;
    code: string;
    title: string;
    is_other: boolean;
};

export type ApiAppealStatus = "accepted" | "in_progress" | "completed" | "rejected";

type ApiAppealStatusChange = {
    id: number;
    appeal_id: number;
    from_status: ApiAppealStatus;
    to_status: ApiAppealStatus;
    comment: string;
    photo_url: string | null;
    changed_by: number;
    changed_by_user?: { id: number; full_name: string } | null;
    created_at: string;
};

type ApiAppeal = {
    id: number;
    house_id: number;
    author_id: number;
    problem_type_id: number;
    reason_id: number;
    entrance_number?: number | null;
    description: string;
    importance: string;
    status: ApiAppealStatus;
    wants_recalculation: boolean;
    created_at: string;
    updated_at: string;
    house?: ApiHouse | null;
    author?: ApiUser | null;
    problem_type?: ApiProblemType | null;
    reason?: ApiReason | null;
    // likes_count есть у list/top (обе роли) и у одиночной карточки, но
    // отсутствует в ответе на создание обращения (бэк отдаёт голую модель);
    // history есть только у одиночной карточки (GET .../appeals/:id).
    likes_count?: number;
    history?: ApiAppealStatusChange[];
};

type ApiHouseAppealStats = {
    house_id: number;
    address: string;
    accepted: number;
    in_progress: number;
    total: number;
};

type ApiPaginated<T> = {
    total: number;
    page: number;
    page_size: number;
    items: T[];
};

type ApiAppealListQuery = {
    house_id?: number[];
    status?: string[];
    entrance_number?: number[];
    problem_type_id?: number[];
    page?: number;
    page_size?: number;
};

type ApiNotificationScope = "house" | "entrance";
type ApiNotificationStatus = "active" | "expired" | "revoked";

type ApiNotification = {
    id: number;
    house_id: number;
    author_id: number;
    reason_id: number;
    scope_type: ApiNotificationScope;
    entrance_number?: number | null;
    title: string;
    body: string;
    starts_at: string;
    ends_at: string;
    revoked_at?: string | null;
    created_at: string;
    house?: ApiHouse | null;
    author?: ApiUser | null;
    reason?: ApiReason | null;
};

export const api = {
    bind,

    me: (auth: Auth) => request<ApiMe>("/me", auth),

    representative: {
        houses: {
            list: (auth: Auth) => request<ApiHouse[]>("/representative/houses", auth),

            listUnassigned: (auth: Auth) => request<ApiHouse[]>("/representative/houses/unassigned", auth),

            importCsv: (auth: Auth, file: { data: Buffer; filename: string }) =>
                request<ImportReport>("/representative/houses/csv", auth, {
                    method: "POST",
                    body: csvFormData(file),
                }),

            update: (
                auth: Auth,
                houseId: number,
                body: { address?: string; number?: string; floors_count?: number; construction_year?: number },
            ) => request<ApiHouse>(`/representative/houses/${houseId}`, auth, { method: "PUT", body }),

            setChatLink: (auth: Auth, houseId: number, chatInviteLink: string) =>
                request<void>(`/representative/houses/${houseId}/chat-link`, auth, {
                    method: "PUT",
                    body: { chat_invite_link: chatInviteLink },
                }),
        },

        company: {
            get: (auth: Auth) => request<ApiCompany>("/representative/company", auth),

            update: (
                auth: Auth,
                body: {
                    full_name: string;
                    short_name?: string;
                    dispatcher_phone?: string;
                    contact_phone?: string;
                    email?: string;
                    website?: string;
                },
            ) => request<ApiCompany>("/representative/company", auth, { method: "PUT", body }),
        },

        emergencyServices: {
            list: (auth: Auth) => request<ApiEmergencyService[]>("/representative/emergency-services", auth),

            importCsv: (auth: Auth, file: { data: Buffer; filename: string }) =>
                request<ImportReport>("/representative/emergency-services/csv", auth, {
                    method: "POST",
                    body: csvFormData(file),
                }),
        },

        residents: {
            listByHouse: (auth: Auth, houseId: number) =>
                request<ApiResident[]>(`/representative/houses/${houseId}/residents`, auth),

            importCsv: (auth: Auth, houseId: number, file: { data: Buffer; filename: string }) =>
                request<ImportReport>(`/representative/houses/${houseId}/residents/csv`, auth, {
                    method: "POST",
                    body: csvFormData(file),
                }),
        },

        dispatchers: {
            create: (auth: Auth, body: { full_name: string; phone: string }) =>
                request<ApiUser>("/representative/dispatchers", auth, { method: "POST", body }),

            list: (auth: Auth) => request<ApiUser[]>("/representative/dispatchers", auth),

            importCsv: (auth: Auth, file: { data: Buffer; filename: string }) =>
                request<ImportReport>("/representative/dispatchers/csv", auth, {
                    method: "POST",
                    body: csvFormData(file),
                }),
        },

        assignments: {
            listAll: (auth: Auth) => request<ApiDispatcherHouse[]>("/representative/assignments", auth),

            listByDispatcher: (auth: Auth, dispatcherId: number) =>
                request<ApiHouse[]>(`/representative/dispatchers/${dispatcherId}/houses`, auth),

            assignHouses: (auth: Auth, dispatcherId: number, houseIds: number[]) =>
                request<ImportReport>(`/representative/dispatchers/${dispatcherId}/houses`, auth, {
                    method: "POST",
                    body: { house_ids: houseIds },
                }),

            unassignHouse: (auth: Auth, dispatcherId: number, houseId: number) =>
                request<void>(`/representative/dispatchers/${dispatcherId}/houses/${houseId}`, auth, {
                    method: "DELETE",
                }),
        },
    },

    dispatcher: {
        houses: {
            list: (auth: Auth) => request<ApiHouse[]>("/dispatcher/houses", auth),

            get: (auth: Auth, houseId: number) => request<ApiHouse>(`/dispatcher/houses/${houseId}`, auth),
        },

        company: {
            get: (auth: Auth) => request<ApiCompany>("/dispatcher/company", auth),
        },

        emergencyServices: {
            list: (auth: Auth) => request<ApiEmergencyService[]>("/dispatcher/emergency-services", auth),
        },

        reference: {
            problemTypes: (auth: Auth) => request<ApiProblemType[]>("/dispatcher/problem-types", auth),

            reasons: (auth: Auth, problemTypeId: number) =>
                request<ApiReason[]>(`/dispatcher/problem-types/${problemTypeId}/reasons`, auth),
        },

        appeals: {
            list: (auth: Auth, query: ApiAppealListQuery = {}) =>
                request<ApiPaginated<ApiAppeal>>("/dispatcher/appeals", auth, { query }),

            top: (auth: Auth, limit?: number) =>
                request<ApiAppeal[]>("/dispatcher/appeals/top", auth, { query: { limit } }),

            stats: (auth: Auth) => request<ApiHouseAppealStats[]>("/dispatcher/appeals/stats", auth),

            get: (auth: Auth, id: number) => request<ApiAppeal>(`/dispatcher/appeals/${id}`, auth),

            setStatus: (
                auth: Auth,
                id: number,
                body: { status: ApiAppealStatus; comment: string; photo_url?: string },
            ) => request<ApiAppealStatusChange>(`/dispatcher/appeals/${id}/status`, auth, { method: "POST", body }),
        },

        notifications: {
            list: (auth: Auth, query: { house_id?: number[]; status?: ApiNotificationStatus } = {}) =>
                request<ApiNotification[]>("/dispatcher/notifications", auth, { query }),

            create: (
                auth: Auth,
                body: {
                    house_id: number;
                    scope: ApiNotificationScope;
                    entrance_number?: number;
                    problem_type_id: number;
                    reason_id?: number;
                    title?: string;
                    body: string;
                    starts_at: string;
                    ends_at: string;
                },
            ) => request<ApiNotification>("/dispatcher/notifications", auth, { method: "POST", body }),

            revoke: (auth: Auth, id: number) =>
                request<void>(`/dispatcher/notifications/${id}/revoke`, auth, { method: "POST" }),
        },
    },

    resident: {
        company: {
            get: (auth: Auth) => request<ApiCompany>("/resident/company", auth),
        },

        emergencyServices: {
            list: (auth: Auth) => request<ApiEmergencyService[]>("/resident/emergency-services", auth),
        },

        reference: {
            problemTypes: (auth: Auth) => request<ApiProblemType[]>("/resident/problem-types", auth),

            reasons: (auth: Auth, problemTypeId: number) =>
                request<ApiReason[]>(`/resident/problem-types/${problemTypeId}/reasons`, auth),
        },

        appeals: {
            create: (
                auth: Auth,
                body: {
                    problem_type_id: number;
                    reason_id?: number;
                    entrance_number?: number;
                    description: string;
                    importance?: string;
                    wants_recalculation?: boolean;
                    discovered_at?: string;
                },
            ) => request<ApiAppeal>("/resident/appeals", auth, { method: "POST", body }),

            list: (
                auth: Auth,
                query: {
                    mine?: boolean;
                    status?: string[];
                    entrance_number?: number[];
                    problem_type_id?: number[];
                    page?: number;
                    page_size?: number;
                } = {},
            ) => request<ApiPaginated<ApiAppeal>>("/resident/appeals", auth, { query }),

            get: (auth: Auth, id: number) => request<ApiAppeal>(`/resident/appeals/${id}`, auth),

            like: (auth: Auth, id: number) => request<void>(`/resident/appeals/${id}/like`, auth, { method: "POST" }),

            unlike: (auth: Auth, id: number) =>
                request<void>(`/resident/appeals/${id}/like`, auth, { method: "DELETE" }),
        },

        notifications: {
            list: (auth: Auth) => request<ApiNotification[]>("/resident/notifications", auth),

            get: (auth: Auth, id: number) => request<ApiNotification>(`/resident/notifications/${id}`, auth),
        },

        house: {
            chatLink: (auth: Auth) => request<{ chat_invite_link: string | null }>("/resident/house/chat-link", auth),
        },
    },
};
