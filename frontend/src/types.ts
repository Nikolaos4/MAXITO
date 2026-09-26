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
  /** Номер дома — обращения разных домов видит только диспетчер */
  houseNumber: string;
  categoryCode: string;
  reason: string;
  comment: string;
  /** 0 — весь дом */
  entrance: number;
  authorId: string;
  authorName: string;
  likes: number;
  likedByMe: boolean;
  /** Фото и видео, приложенные к обращению — видны всем жителям дома */
  attachments: Attachment[];
  /** Комментарии диспетчера; жителям не показываются */
  comments: Comment[];
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

export interface Tariff {
  title: string;
  price: string;
}

export interface EmergencyService {
  title: string;
  phone: string;
}

export interface HouseInfo {
  /** Номер дома, как в Appeal.houseNumber и в списках диспетчера */
  number: string;
  address: string;
  floors: number;
  entrances: number;
  builtYear: number;
  /** Сколько жителей дома зарегистрировано в системе */
  residentsCount: number;
  company: {
    fullName: string;
    shortName: string;
    dispatcherPhone: string;
    contactPhone: string;
    email: string;
    site: string;
  };
  tariffs: Tariff[];
  emergencyServices: EmergencyService[];
}

export interface DispatcherMe {
  id: string;
  fullName: string;
  /** Дома, закреплённые за диспетчером */
  houseNumbers: string[];
}

export interface PlannedWorkInput {
  /** Общая тема, выбранная на первом шаге (тот же список, что у жителя) */
  categoryCode: string;
  houseNumber: string;
  /** 0 — весь дом, необязательно указывать конкретный подъезд */
  entrance: number;
  workType: string;
  comment: string;
  /** ISO */
  from: string;
  /** ISO */
  to: string;
}

export interface ChangeStatusInput {
  status: AppealStatus;
  /** Обязательный комментарий диспетчера к смене статуса */
  comment: string;
  /** Фото — только когда статус меняют на «Выполнено» */
  files: File[];
}
