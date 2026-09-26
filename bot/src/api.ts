import { ofetch } from "ofetch";
import { env } from "@/env";

export type ApiRole = "representative" | "dispatcher" | "resident";

export type Auth = { maxUserId: string; phone?: string };

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

function authHeaders(auth: Auth): Record<string, string> {
    const headers: Record<string, string> = { "X-Max-User-Id": auth.maxUserId };
    if (auth.phone) headers["X-Max-User-Phone"] = auth.phone;
    return headers;
}

function request<T>(path: string, auth: Auth, opts?: Parameters<typeof ofetch<T>>[1]) {
    return ofetch<T>(path, {
        baseURL: `${env.API_BASE_URL}/api/v1`,
        ...opts,
        headers: { ...authHeaders(auth), ...opts?.headers },
    });
}

function csvFormData(file: { data: Buffer; filename: string }) {
    const form = new FormData();
    form.append("file", new Blob([new Uint8Array(file.data)]), file.filename);
    return form;
}

type ApiProblemType = {
    id: number;
    code: string;
    title: string;
    is_critical: boolean;
    created_at: string;
};

export const api = {
    dispatcherReference: {
        // ponytail: используется и как дешёвый пинг для определения роли при авторизации
        problemTypes: (auth: Auth) => request<ApiProblemType[]>("/dispatcher/problem-types", auth),
    },

    houses: {
        create: (auth: Auth, body: { address: string; number?: string }) =>
            request<ApiHouse>("/representative/houses", auth, { method: "POST", body }),

        list: (auth: Auth) => request<ApiHouse[]>("/representative/houses", auth),

        listUnassigned: (auth: Auth) => request<ApiHouse[]>("/representative/houses/unassigned", auth),

        importCsv: (auth: Auth, file: { data: Buffer; filename: string }) =>
            request<ImportReport>("/representative/houses/csv", auth, { method: "POST", body: csvFormData(file) }),
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
};
