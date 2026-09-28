import type { Appeal, Category, CreateAppealInput, Feed, HouseInfo, Me, Notification, NotificationFeed } from "../types";

export interface Api {
  getMe(): Promise<Me>;
  getHouseInfo(): Promise<HouseInfo>;
  /** Темы и причины обращения — список задаёт бэкенд, не хардкод на фронте */
  getCategories(): Promise<Category[]>;
  listAppeals(feed: Feed): Promise<Appeal[]>;
  createAppeal(input: CreateAppealInput): Promise<Appeal>;
  /** Возвращает обновлённое обращение. currentlyLiked — текущее Appeal.likedByMe, определяет лайк это или снятие лайка */
  toggleLike(appealId: number, currentlyLiked: boolean): Promise<Appeal>;
  listNotifications(feed: NotificationFeed): Promise<Notification[]>;
  getUnreadNotificationsCount(): Promise<number>;
  markNotificationsRead(ids: number[]): Promise<void>;
}
