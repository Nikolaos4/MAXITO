import type { Appeal, CreateAppealInput, Feed, HouseInfo, Me, Notification, NotificationFeed } from "../types";

export interface Api {
  getMe(): Promise<Me>;
  getHouseInfo(): Promise<HouseInfo>;
  listAppeals(feed: Feed): Promise<Appeal[]>;
  createAppeal(input: CreateAppealInput): Promise<Appeal>;
  /** Возвращает обновлённое обращение */
  toggleLike(appealId: number): Promise<Appeal>;
  listNotifications(feed: NotificationFeed): Promise<Notification[]>;
  getUnreadNotificationsCount(): Promise<number>;
  markNotificationsRead(ids: number[]): Promise<void>;
}
