import type { Appeal, CreateAppealInput, Feed, Me } from "../types";

export interface Api {
  getMe(): Promise<Me>;
  listAppeals(feed: Feed): Promise<Appeal[]>;
  createAppeal(input: CreateAppealInput): Promise<Appeal>;
  /** Возвращает обновлённое обращение */
  toggleLike(appealId: number): Promise<Appeal>;
  /** Один комментарий от жителя на обращение */
  /** Один комментарий от жителя на обращение */
  addComment(appealId: number, text: string): Promise<Appeal>;
  editComment(appealId: number, commentId: number, text: string): Promise<Appeal>;
  deleteComment(appealId: number, commentId: number): Promise<Appeal>;
}
