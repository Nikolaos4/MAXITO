import type { Appeal, Category, CreateAppealInput, Feed, HouseInfo, Me, Notification, NotificationFeed } from "../types";

export interface Api {
  getMe(): Promise<Me>;
  getHouseInfo(): Promise<HouseInfo>;
  /** Темы и причины обращения — список задаёт бэкенд, не хардкод на фронте */
  getCategories(): Promise<Category[]>;
  listAppeals(feed: Feed): Promise<Appeal[]>;
  createAppeal(input: CreateAppealInput): Promise<Appeal>;
  /** Возвращает обновлённое обращение */
  toggleLike(appealId: number): Promise<Appeal>;
  /** Свои обращения, по которым диспетчер запросил доп. информацию и ждёт ответа */
  getNeedInfoAppeals(): Promise<Appeal[]>;
  /** Ответ жителя на запрос доп. информации — переводит обращение обратно «В работу» */
  replyNeedInfo(appealId: number, text: string): Promise<Appeal>;
  listNotifications(feed: NotificationFeed): Promise<Notification[]>;
  getUnreadNotificationsCount(): Promise<number>;
  markNotificationsRead(ids: number[]): Promise<void>;
}
