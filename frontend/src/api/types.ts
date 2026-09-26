import type { Appeal, CreateAppealInput, Feed, HouseInfo, Me } from "../types";

export interface Api {
  getMe(): Promise<Me>;
  getHouseInfo(): Promise<HouseInfo>;
  listAppeals(feed: Feed): Promise<Appeal[]>;
  createAppeal(input: CreateAppealInput): Promise<Appeal>;
  /** Возвращает обновлённое обращение */
  toggleLike(appealId: number): Promise<Appeal>;
}
