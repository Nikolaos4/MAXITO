import { httpApi } from "./http";
import { mockApi } from "./mock";

export const api = import.meta.env.VITE_USE_MOCK === "false" ? httpApi : mockApi;
