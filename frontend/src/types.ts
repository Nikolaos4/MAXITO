export type AppealStatus = "accepted" | "in_progress" | "need_info" | "completed" | "rejected";

export type Feed = "house" | "entrance" | "mine";

export interface Category {
  code: string;
  title: string;
  reasons: string[];
  /** «Другое»: вместо списка причин житель сам вписывает проблему */
  freeText?: boolean;
}

export interface Attachment {
  name: string;
  kind: "image" | "video";
  url: string;
}

export interface Comment {
  id: number;
  authorId: string;
  authorName: string;
  text: string;
  createdAt: string;
}

export interface Appeal {
  id: number;
  createdAt: string;
  status: AppealStatus;
  categoryCode: string;
  reason: string;
  comment: string;
  /** 0 — весь дом */
  entrance: number;
  authorId: string;
  authorName: string;
  likes: number;
  likedByMe: boolean;
  comments: Comment[];
  /** Фото и видео, приложенные к обращению — видны всем жителям дома */
  attachments: Attachment[];
}

export interface CreateAppealInput {
  categoryCode: string;
  reason: string;
  comment: string;
  entrance: number;
  /** Начало периода, ISO */
  from: string;
  /** Фото и видео подтверждения */
  files: File[];
}

export interface Me {
  id: string;
  fullName: string;
  houseNumber: string;
  entrance: number;
  entrances: number;
}
