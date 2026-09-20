import { Context } from "@maxhub/max-bot-api";
import type { User } from "@maxhub/max-bot-api/types";

type FlowName = "registration";

type Step = "registration/phone";

type Role = "admin" | "manager" | "user";

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
}

const sessions = new Map<number, Session>();

export function getSession(userId: number): Session {
    return sessions.get(userId) ?? { flow: null, step: null, data: {}, role: undefined };
}
