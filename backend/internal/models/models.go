package models

import (
	"time"

	"gorm.io/gorm"
)

// Role enum
type Role string

// Importance enum
type Importance string

// AppealStatus enum
type AppealStatus string

// NotificationScope enum
type NotificationScope string

const (
	RoleRepresentative Role = "representative"
	RoleDispatcher     Role = "dispatcher"
	RoleResident       Role = "resident"
)

const (
	ImportanceNormal    Importance = "normal"
	ImportanceImportant Importance = "important"
)

const (
	StatusAccepted   AppealStatus = "accepted"
	StatusInProgress AppealStatus = "in_progress"
	StatusCompleted  AppealStatus = "completed"
	StatusRejected   AppealStatus = "rejected"
)

const (
	ScopeHouse    NotificationScope = "house"
	ScopeEntrance NotificationScope = "entrance"
)

// ProblemTypeCodeOther — код темы "Другое". Уведомления и причины с этим
// кодом/флагом никогда не блокируют создание обращений (см. Reason.IsOther).
const ProblemTypeCodeOther = "other"

// User
type User struct {
	ID        uint           `gorm:"primaryKey" json:"id"`
	Phone     string         `gorm:"uniqueIndex;size:20;not null" json:"phone"`
	FullName  string         `gorm:"size:255;not null" json:"full_name"`
	Role      Role           `gorm:"size:20;not null;index" json:"role"`
	MaxUserID *string        `gorm:"size:100;uniqueIndex" json:"max_user_id,omitempty"`
	IsActive  bool           `gorm:"default:true" json:"is_active"`
	CreatedAt time.Time      `json:"created_at"`
	UpdatedAt time.Time      `json:"updated_at"`
	DeletedAt gorm.DeletedAt `gorm:"index" json:"-"`

	// Relations
	ResidentProfile  *Resident         `gorm:"foreignKey:UserID" json:"resident_profile,omitempty"`
	DispatcherHouses []DispatcherHouse `gorm:"foreignKey:DispatcherID" json:"dispatcher_houses,omitempty"`
}

// Company — управляющая компания. Одна запись на весь инстанс (один
// продукт = одна УК, см. описание проекта), поэтому у неё нет house_id —
// это не свойство дома, а общие реквизиты, показываются в карточке любого
// дома одинаково.
type Company struct {
	ID              uint      `gorm:"primaryKey" json:"id"`
	FullName        string    `gorm:"size:500" json:"full_name"`
	ShortName       string    `gorm:"size:255" json:"short_name"`
	DispatcherPhone string    `gorm:"size:50" json:"dispatcher_phone"`
	ContactPhone    string    `gorm:"size:50" json:"contact_phone"`
	Email           string    `gorm:"size:255" json:"email"`
	Website         string    `gorm:"size:255" json:"website"`
	UpdatedAt       time.Time `json:"updated_at"`
}

// EmergencyService — аварийная служба (одна на всю систему, не привязана
// к дому — так решили, раз в вашем случае аварийки общие на всю УК).
// Показывается жителю при выборе критичной темы обращения (см.
// ProblemType.IsCritical) вместо формы — дальше человек сам решает, куда звонить.
type EmergencyService struct {
	ID        uint      `gorm:"primaryKey" json:"id"`
	Name      string    `gorm:"size:255;not null" json:"name"`
	Phone     string    `gorm:"size:50;not null" json:"phone"`
	CreatedAt time.Time `json:"created_at"`
}

// House
type House struct {
	ID               uint           `gorm:"primaryKey" json:"id"`
	Address          string         `gorm:"size:500;not null;uniqueIndex:idx_house_address_number" json:"address"`
	Number           string         `gorm:"size:50;uniqueIndex:idx_house_address_number" json:"number"`
	EntrancesCount   int            `gorm:"not null" json:"entrances_count"`
	FloorsCount      *int           `json:"floors_count,omitempty"`      // необязательно
	ConstructionYear *int           `json:"construction_year,omitempty"` // необязательно
	ChatInviteLink   *string        `gorm:"size:500" json:"chat_invite_link,omitempty"`
	CreatedAt        time.Time      `json:"created_at"`
	UpdatedAt        time.Time      `json:"updated_at"`
	DeletedAt        gorm.DeletedAt `gorm:"index" json:"-"`

	// Relations
	Appeals       []Appeal          `gorm:"foreignKey:HouseID" json:"appeals,omitempty"`
	Notifications []Notification    `gorm:"foreignKey:HouseID" json:"notifications,omitempty"`
	Residents     []Resident        `gorm:"foreignKey:HouseID" json:"residents,omitempty"`
	Dispatchers   []DispatcherHouse `gorm:"foreignKey:HouseID" json:"dispatchers,omitempty"`
}

// DispatcherHouse (many-to-many)
type DispatcherHouse struct {
	ID           uint      `gorm:"primaryKey" json:"id"`
	DispatcherID uint      `gorm:"not null;index:,unique,composite:disp_house" json:"dispatcher_id"`
	HouseID      uint      `gorm:"not null;index:,unique,composite:disp_house" json:"house_id"`
	AssignedBy   uint      `gorm:"not null" json:"assigned_by"` // Representative who assigned
	AssignedAt   time.Time `json:"assigned_at"`

	Dispatcher *User  `gorm:"foreignKey:DispatcherID" json:"dispatcher,omitempty"`
	House      *House `gorm:"foreignKey:HouseID" json:"house,omitempty"`
	Assigner   *User  `gorm:"foreignKey:AssignedBy" json:"assigner,omitempty"`
}

// Resident profile
type Resident struct {
	ID             uint           `gorm:"primaryKey" json:"id"`
	UserID         uint           `gorm:"uniqueIndex;not null" json:"user_id"`
	HouseID        uint           `gorm:"not null;index" json:"house_id"`
	EntranceNumber *int           `json:"entrance_number,omitempty"`
	Apartment      string         `gorm:"size:20;not null" json:"apartment"`
	CreatedAt      time.Time      `json:"created_at"`
	UpdatedAt      time.Time      `json:"updated_at"`
	DeletedAt      gorm.DeletedAt `gorm:"index" json:"-"`

	User  *User  `gorm:"foreignKey:UserID" json:"user,omitempty"`
	House *House `gorm:"foreignKey:HouseID" json:"house,omitempty"`
}

// ProblemType — тема обращения/уведомления (Лифт, Вода, Подъезд и т.д.)
type ProblemType struct {
	ID         uint      `gorm:"primaryKey" json:"id"`
	Code       string    `gorm:"uniqueIndex;size:50;not null" json:"code"` // код нужен для простоты определения проблемы
	Title      string    `gorm:"size:255;not null" json:"title"`
	IsCritical bool      `gorm:"default:false" json:"is_critical"` // маркер того, что проблему надо решать срочно и через звонок
	CreatedAt  time.Time `json:"created_at"`

	Reasons []Reason `gorm:"foreignKey:ProblemTypeID" json:"reasons,omitempty"`
}

// Reason — уточнение темы (для темы "Лифт": "Не работает", "Застревает" и т.д.).
// У каждой темы (включая "Другое") есть ровно одна причина с IsOther=true — она
// используется, когда тема сама по себе "Другое", и никогда не участвует в
// блокировке обращений уведомлениями.
type Reason struct {
	ID            uint      `gorm:"primaryKey" json:"id"`
	ProblemTypeID uint      `gorm:"not null;index:,unique,composite:type_code" json:"problem_type_id"`
	Code          string    `gorm:"size:50;not null;index:,unique,composite:type_code" json:"code"`
	Title         string    `gorm:"size:255;not null" json:"title"`
	IsOther       bool      `gorm:"default:false" json:"is_other"`
	CreatedAt     time.Time `json:"created_at"`

	ProblemType ProblemType `gorm:"foreignKey:ProblemTypeID" json:"-"`
}

// Appeal
type Appeal struct {
	ID                 uint           `gorm:"primaryKey" json:"id"`
	HouseID            uint           `gorm:"not null;index" json:"house_id"`
	AuthorID           uint           `gorm:"not null;index" json:"author_id"`
	ProblemTypeID      uint           `gorm:"not null;index" json:"problem_type_id"`
	ReasonID           uint           `gorm:"not null;index" json:"reason_id"`
	EntranceNumber     *int           `gorm:"index" json:"entrance_number,omitempty"` // null = весь дом
	DiscoveredAt       *time.Time     `json:"discovered_at,omitempty"`                // когда житель заметил проблему (необязательно)
	Description        string         `gorm:"type:text;not null" json:"description"`
	Importance         Importance     `gorm:"size:20;default:'normal'" json:"importance"`
	Status             AppealStatus   `gorm:"size:20;default:'accepted';index" json:"status"`
	WantsRecalculation bool           `gorm:"default:false" json:"wants_recalculation"`
	CreatedAt          time.Time      `json:"created_at"`
	UpdatedAt          time.Time      `json:"updated_at"`
	DeletedAt          gorm.DeletedAt `gorm:"index" json:"-"`

	House         *House               `gorm:"foreignKey:HouseID" json:"house,omitempty"`
	Author        *User                `gorm:"foreignKey:AuthorID" json:"author,omitempty"`
	ProblemType   *ProblemType         `gorm:"foreignKey:ProblemTypeID" json:"problem_type,omitempty"`
	Reason        *Reason              `gorm:"foreignKey:ReasonID" json:"reason,omitempty"`
	Subscriptions []AppealSubscription `gorm:"foreignKey:AppealID" json:"subscriptions,omitempty"`
	StatusChanges []AppealStatusChange `gorm:"foreignKey:AppealID" json:"status_changes,omitempty"`
	Attachments   []AppealAttachment   `gorm:"foreignKey:AppealID" json:"attachments,omitempty"`
}

// AppealStatusChange — история смены статуса обращения. Одна запись = один
// переход между статусами (включая обязательный для нескольких статусов
// комментарий и опциональное фото-подтверждение). Несколько таких записей
// подряд — это и есть "несколько комментариев" по одному обращению.
type AppealStatusChange struct {
	ID         uint         `gorm:"primaryKey" json:"id"`
	AppealID   uint         `gorm:"not null;index" json:"appeal_id"`
	FromStatus AppealStatus `gorm:"size:20;not null" json:"from_status"`
	ToStatus   AppealStatus `gorm:"size:20;not null" json:"to_status"`
	ChangedBy  uint         `gorm:"not null" json:"changed_by"` // диспетчер
	Comment    string       `gorm:"type:text" json:"comment,omitempty"`
	PhotoURL   *string      `gorm:"size:500" json:"photo_url,omitempty"`
	CreatedAt  time.Time    `json:"created_at"`

	Changer *User `gorm:"foreignKey:ChangedBy" json:"changed_by_user,omitempty"`
}

// NotificationRead — отметка "уведомление прочитано конкретным жителем".
type NotificationRead struct {
	ID             uint      `gorm:"primaryKey" json:"id"`
	UserID         uint      `gorm:"not null;index:,unique,composite:user_notification" json:"user_id"`
	NotificationID uint      `gorm:"not null;index:,unique,composite:user_notification" json:"notification_id"`
	CreatedAt      time.Time `json:"created_at"`
}

// AppealAttachment — фото/видео, прикреплённые к обращению жителем при
// создании. Файл заранее загружается через POST /upload (см. UploadHandler),
// сюда попадает уже готовая ссылка.
type AppealAttachment struct {
	ID        uint      `gorm:"primaryKey" json:"id"`
	AppealID  uint      `gorm:"not null;index" json:"appeal_id"`
	URL       string    `gorm:"size:1000;not null" json:"url"`
	CreatedAt time.Time `json:"created_at"`
}

// AppealSubscription (лайки)
type AppealSubscription struct {
	ID        uint      `gorm:"primaryKey" json:"id"`
	AppealID  uint      `gorm:"not null;index:,unique,composite:appeal_user" json:"appeal_id"`
	UserID    uint      `gorm:"not null;index:,unique,composite:appeal_user" json:"user_id"`
	CreatedAt time.Time `json:"created_at"`

	Appeal Appeal `gorm:"foreignKey:AppealID" json:"-"`
	User   *User  `gorm:"foreignKey:UserID" json:"user,omitempty"`
}

// Notification — плановое уведомление диспетчера. Пока действует
// (StartsAt..EndsAt) и покрывает дом/подъезд, оно блокирует создание новых
// обращений жителей по той же теме и причине (кроме случая, когда тема
// или причина — "Другое", см. ProblemTypeCodeOther и Reason.IsOther).
type Notification struct {
	ID             uint              `gorm:"primaryKey" json:"id"`
	HouseID        uint              `gorm:"not null;index" json:"house_id"`
	AuthorID       uint              `gorm:"not null" json:"author_id"`
	ReasonID       uint              `gorm:"not null;index" json:"reason_id"`
	ScopeType      NotificationScope `gorm:"size:20;not null" json:"scope_type"`
	EntranceNumber *int              `gorm:"index" json:"entrance_number,omitempty"` // обязателен при scope_type = entrance
	Title          string            `gorm:"size:255;not null" json:"title"`
	Body           string            `gorm:"type:text;not null" json:"body"`
	StartsAt       time.Time         `gorm:"index" json:"starts_at"`
	EndsAt         time.Time         `gorm:"index" json:"ends_at"`
	RevokedAt      *time.Time        `json:"revoked_at,omitempty"` // досрочная отмена
	CreatedAt      time.Time         `json:"created_at"`

	House  *House  `gorm:"foreignKey:HouseID" json:"house,omitempty"`
	Author *User   `gorm:"foreignKey:AuthorID" json:"author,omitempty"`
	Reason *Reason `gorm:"foreignKey:ReasonID" json:"reason,omitempty"`
}
