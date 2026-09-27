import type { Appeal, ChangeStatusInput, DispatcherMe, HouseInfo, Notification, PlannedWorkInput } from "../../types";

export interface DispatcherApi {
  getMe(): Promise<DispatcherMe>;
  /** Дома, закреплённые за диспетчером */
  getHouses(): Promise<HouseInfo[]>;
  /** houseNumber === "all" — обращения по всем домам диспетчера, отсортированы по лайкам */
  listAppeals(houseNumber: string): Promise<Appeal[]>;
  createPlannedWork(input: PlannedWorkInput): Promise<void>;
  /** houseNumber === "all" — уведомления по всем домам диспетчера */
  listNotifications(houseNumber: string): Promise<Notification[]>;
  getUnreadNotificationsCount(): Promise<number>;
  markNotificationsRead(ids: number[]): Promise<void>;
  /** Меняет статус и добавляет обязательный комментарий диспетчера; возвращает обновлённое обращение */
  changeStatus(appealId: number, input: ChangeStatusInput): Promise<Appeal>;
  addComment(appealId: number, text: string): Promise<Appeal>;
  editComment(appealId: number, commentId: number, text: string): Promise<Appeal>;
  deleteComment(appealId: number, commentId: number): Promise<Appeal>;
}
