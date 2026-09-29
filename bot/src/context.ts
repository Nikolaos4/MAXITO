import { Context } from "@maxhub/max-bot-api";
import type { User } from "@maxhub/max-bot-api/types";
import type { ApiRole } from "@/api";

type FlowName = "authorization" | "house" | "house_edit" | "dispatcher" | "assignment" | "company" | "emergency";

type Step =
    | "authorization/phone"
    | "house/import_csv"
    | "house/import_residents_select"
    | "house/import_residents_csv"
    | "house_edit/select"
    | "house_edit/address"
    | "house_edit/number"
    | "house_edit/floors_count"
    | "house_edit/construction_year"
    | "house_edit/chat_link"
    | "dispatcher/full_name"
    | "dispatcher/phone"
    | "dispatcher/import_csv"
    | "assignment/dispatcher_select"
    | "assignment/houses_select"
    | "company/full_name"
    | "company/short_name"
    | "company/dispatcher_phone"
    | "company/contact_phone"
    | "company/email"
    | "company/website"
    | "emergency/import_csv";

export type Role = ApiRole;

type AppUser = User & {
    role: Role | null | undefined;
};

export class AppContext extends Context {
    override get user(): AppUser | undefined {
        const user = super.user;
        if (!user) return undefined;

        const session = getSession(user.user_id);
        return { ...user, role: session.role };
    }
}

interface Session {
    flow: FlowName | null;
    step: Step | null;
    data: Record<string, unknown>;
    role: Role | undefined | null;
    token: string;
}

const sessions = new Map<number, Session>();

export function getSession(userId: number): Session {
    return sessions.get(userId) ?? { flow: null, step: null, data: {}, role: undefined, token: "" };
}

export function setSession(userId: number, s: Session) {
    sessions.set(userId, s);
}

export function setStep(userId: number, step: Step) {
    const s = getSession(userId);
    sessions.set(userId, { ...s, step });
}

export function setFlow(userId: number, flow: FlowName) {
    const s = getSession(userId);
    sessions.set(userId, { ...s, flow });
}

export function setRole(userId: number, role: Role) {
    const s = getSession(userId);
    sessions.set(userId, { ...s, role });
}

export function setToken(userId: number, token: string) {
    const s = getSession(userId);
    sessions.set(userId, { ...s, token });
}

export function clearFlow(userId: number) {
    const s = getSession(userId);
    sessions.set(userId, { ...s, flow: null, step: null, data: {} });
}

export function setData(userId: number, data: Record<string, unknown>) {
    const s = getSession(userId);
    sessions.set(userId, { ...s, data: { ...s.data, ...data } });
}
