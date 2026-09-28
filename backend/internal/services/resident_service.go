package services

import (
	"errors"
	"fmt"
	"time"

	"maxito/internal/models"
	"maxito/internal/repository"

	"gorm.io/gorm"
)

// CreateAppealInput — вход для создания обращения жителем.
type CreateAppealInput struct {
	ProblemTypeID      uint
	ReasonID           *uint
	EntranceNumber     *int
	Description        string
	Importance         string
	WantsRecalculation bool
	DiscoveredAt       *time.Time // когда житель заметил проблему — необязательно
	PhotoURLs          []string   // заранее загруженные через POST /upload, необязательно
	CreatedAt          time.Time
}

// DuplicateAppealError возвращается вместо обычной ошибки, когда в доме уже
// есть открытое обращение по той же причине — хендлер разворачивает её в
// ответ с id существующего обращения, чтобы бот сразу предложил лайкнуть.
type DuplicateAppealError struct {
	ExistingAppealID uint
}

func (e *DuplicateAppealError) Error() string {
	return fmt.Sprintf("a similar open appeal already exists (id %d) — consider liking it instead of creating a new one", e.ExistingAppealID)
}

// ResidentAppealDetail — обращение вместе с числом лайков и полной историей
// смены статусов. По форме совпадает с тем, что видит диспетчер (п. 8 —
// решили показывать жителю историю целиком), но это отдельный тип: имя
// AppealDetail уже занято в dispatcher_service.go в этом же пакете.
type ResidentAppealDetail struct {
	models.Appeal
	LikesCount  int64                       `json:"likes_count"`
	LikedByMe   bool                        `json:"liked_by_me"`
	Attachments []models.AppealAttachment   `json:"attachments"`
	History     []models.AppealStatusChange `json:"history"`
}

// NotificationListItem — уведомление с отметкой, прочитано ли оно текущим
// жителем.
type NotificationListItem struct {
	models.Notification
	IsRead bool `json:"is_read"`
}

type ResidentService struct {
	db               *gorm.DB
	residentRepo     *repository.ResidentRepository
	appealRepo       *repository.AppealRepository
	statusChangeRepo *repository.AppealStatusChangeRepository
	subscriptionRepo *repository.AppealSubscriptionRepository
	attachmentRepo   *repository.AppealAttachmentRepository
	notificationRepo *repository.NotificationRepository
	notifReadRepo    *repository.NotificationReadRepository
	houseRepo        *repository.HouseRepository
	problemTypeRepo  *repository.ProblemTypeRepository
	reasonRepo       *repository.ReasonRepository
}

func NewResidentService(
	db *gorm.DB,
	residentRepo *repository.ResidentRepository,
	appealRepo *repository.AppealRepository,
	statusChangeRepo *repository.AppealStatusChangeRepository,
	subscriptionRepo *repository.AppealSubscriptionRepository,
	attachmentRepo *repository.AppealAttachmentRepository,
	notificationRepo *repository.NotificationRepository,
	notifReadRepo *repository.NotificationReadRepository,
	houseRepo *repository.HouseRepository,
	problemTypeRepo *repository.ProblemTypeRepository,
	reasonRepo *repository.ReasonRepository,
) *ResidentService {
	return &ResidentService{
		db:               db,
		residentRepo:     residentRepo,
		appealRepo:       appealRepo,
		statusChangeRepo: statusChangeRepo,
		subscriptionRepo: subscriptionRepo,
		attachmentRepo:   attachmentRepo,
		notificationRepo: notificationRepo,
		notifReadRepo:    notifReadRepo,
		houseRepo:        houseRepo,
		problemTypeRepo:  problemTypeRepo,
		reasonRepo:       reasonRepo,
	}
}

// ---------- Обращения ----------

// CreateAppeal создаёт обращение от лица жителя userID. Дом берётся из его
// профиля жителя (не из запроса — житель не может создать обращение "не за
// свой дом"). Порядок проверок:
//  1. Дубль: если в доме и ТОМ ЖЕ подъезде (точное совпадение
//     entrance_number, "весь дом" совпадает только с "весь дом") уже есть
//     не закрытое (accepted/in_progress/need_info) обращение по той же
//     причине — вернётся DuplicateAppealError с id существующего
//     обращения, новое не создаётся. Обращение на другой подъезд или на
//     весь дом дублем не считается.
//  2. Блокировка по активному уведомлению диспетчера.
//
// Обе проверки пропускаются для причин с IsOther=true — "другое" слишком
// растяжимо, чтобы валидно считать два таких обращения дублями друг друга
// или блокировать их скопом одного уведомления.
func (s *ResidentService) CreateAppeal(userID uint, in CreateAppealInput) (*models.Appeal, error) {
	resident, err := s.residentRepo.GetByUserID(userID)
	if err != nil {
		return nil, errors.New("resident profile not found for this user")
	}

	house, err := s.houseRepo.GetByID(resident.HouseID)
	if err != nil {
		return nil, err
	}
	if err := validateEntranceNumber(house, in.EntranceNumber); err != nil {
		return nil, err
	}

	problemType, reason, err := resolveReason(s.problemTypeRepo, s.reasonRepo, in.ProblemTypeID, in.ReasonID)
	if err != nil {
		return nil, err
	}

	if in.Description == "" {
		return nil, errors.New("description is required")
	}

	if !reason.IsOther {
		duplicate, err := s.appealRepo.FindOpenDuplicate(resident.HouseID, reason.ID, in.EntranceNumber)
		if err == nil {
			return nil, &DuplicateAppealError{ExistingAppealID: duplicate.ID}
		}
		if !errors.Is(err, gorm.ErrRecordNotFound) {
			return nil, err
		}

		at := in.CreatedAt
		if at.IsZero() {
			at = time.Now()
		}
		blocked, err := s.notificationRepo.HasActiveBlock(resident.HouseID, reason.ID, in.EntranceNumber, at)
		if err != nil {
			return nil, err
		}
		if blocked {
			return nil, errors.New("appeal is blocked: an active notification already covers this problem for this period")
		}
	}

	importance := models.ImportanceNormal
	if in.Importance == string(models.ImportanceImportant) {
		importance = models.ImportanceImportant
	}

	appeal := &models.Appeal{
		HouseID:            resident.HouseID,
		AuthorID:           userID,
		ProblemTypeID:      problemType.ID,
		ReasonID:           reason.ID,
		EntranceNumber:     in.EntranceNumber,
		DiscoveredAt:       in.DiscoveredAt,
		Description:        in.Description,
		Importance:         importance,
		Status:             models.StatusAccepted,
		WantsRecalculation: in.WantsRecalculation,
	}

	// Обращение и его вложения создаются одной транзакцией — либо всё
	// целиком, либо ничего (не может получиться обращение без части фото,
	// на которые ссылается фронт).
	txErr := s.db.Transaction(func(tx *gorm.DB) error {
		if err := tx.Create(appeal).Error; err != nil {
			return err
		}
		if len(in.PhotoURLs) > 0 {
			attachments := make([]models.AppealAttachment, len(in.PhotoURLs))
			for i, url := range in.PhotoURLs {
				attachments[i] = models.AppealAttachment{AppealID: appeal.ID, URL: url}
			}
			if err := tx.Create(&attachments).Error; err != nil {
				return err
			}
		}
		return nil
	})
	if txErr != nil {
		return nil, txErr
	}

	return appeal, nil
}

// ListAppeals — обращения по дому жителя (никогда не по чужому — house_id
// берётся из профиля, не принимается параметром). mine=true сужает до
// собственных обращений жителя.
func (s *ResidentService) ListAppeals(userID uint, mine bool, filter repository.AppealFilter) ([]AppealListItem, int64, error) {
	resident, err := s.residentRepo.GetByUserID(userID)
	if err != nil {
		return nil, 0, errors.New("resident profile not found for this user")
	}

	filter.HouseIDs = []uint{resident.HouseID}
	if mine {
		filter.AuthorID = &userID
	}

	appeals, total, err := s.appealRepo.List(filter)
	if err != nil {
		return nil, 0, err
	}
	items, err := attachLikedByMe(appeals, userID, s.subscriptionRepo)
	if err != nil {
		return nil, 0, err
	}
	return items, total, nil
}

// GetAppealDetail — карточка обращения с числом лайков и историей статусов.
// Доступна только на обращения из своего дома (иначе — как будто не нашли,
// не палим существование чужих).
func (s *ResidentService) GetAppealDetail(userID, appealID uint) (*ResidentAppealDetail, error) {
	resident, err := s.residentRepo.GetByUserID(userID)
	if err != nil {
		return nil, errors.New("resident profile not found for this user")
	}

	appeal, err := s.appealRepo.GetByID(appealID)
	if err != nil {
		return nil, err
	}
	if appeal.HouseID != resident.HouseID {
		return nil, gorm.ErrRecordNotFound
	}

	likes, err := s.appealRepo.CountLikes(appealID)
	if err != nil {
		return nil, err
	}

	likedMap, err := s.subscriptionRepo.ListLikedAppealIDs(userID, []uint{appealID})
	if err != nil {
		return nil, err
	}

	attachments, err := s.attachmentRepo.ListByAppeal(appealID)
	if err != nil {
		return nil, err
	}

	history, err := s.statusChangeRepo.ListByAppeal(appealID)
	if err != nil {
		return nil, err
	}

	return &ResidentAppealDetail{
		Appeal:      *appeal,
		LikesCount:  likes,
		LikedByMe:   likedMap[appealID],
		Attachments: attachments,
		History:     history,
	}, nil
}

// ---------- Лайки ----------

// LikeAppeal ставит лайк чужому обращению из своего дома. Лайкать своё же
// обращение нельзя — важное ограничение, подтверждённое отдельно.
func (s *ResidentService) LikeAppeal(userID, appealID uint) error {
	resident, err := s.residentRepo.GetByUserID(userID)
	if err != nil {
		return errors.New("resident profile not found for this user")
	}

	appeal, err := s.appealRepo.GetByID(appealID)
	if err != nil {
		return errors.New("appeal not found")
	}
	if appeal.HouseID != resident.HouseID {
		return errors.New("appeal not found")
	}
	if appeal.AuthorID == userID {
		return errors.New("you cannot like your own appeal")
	}

	exists, err := s.subscriptionRepo.Exists(appealID, userID)
	if err != nil {
		return err
	}
	if exists {
		return errors.New("already liked")
	}

	return s.subscriptionRepo.Create(&models.AppealSubscription{AppealID: appealID, UserID: userID})
}

// UnlikeAppeal снимает лайк.
func (s *ResidentService) UnlikeAppeal(userID, appealID uint) error {
	return s.subscriptionRepo.Delete(appealID, userID)
}

// ---------- Уведомления ----------

// ListNotifications — уведомления, актуальные для жителя: общедомовые плюс
// подъездные для его собственного подъезда (не для всего дома целиком).
func (s *ResidentService) ListNotifications(userID uint) ([]NotificationListItem, error) {
	resident, err := s.residentRepo.GetByUserID(userID)
	if err != nil {
		return nil, errors.New("resident profile not found for this user")
	}

	notifications, err := s.notificationRepo.ListActiveForResident(resident.HouseID, resident.EntranceNumber)
	if err != nil {
		return nil, err
	}

	ids := make([]uint, len(notifications))
	for i, n := range notifications {
		ids[i] = n.ID
	}
	readMap, err := s.notifReadRepo.ListReadNotificationIDs(userID, ids)
	if err != nil {
		return nil, err
	}

	items := make([]NotificationListItem, len(notifications))
	for i, n := range notifications {
		items[i] = NotificationListItem{Notification: n, IsRead: readMap[n.ID]}
	}
	return items, nil
}

// GetNotification — подробности одного уведомления. Доступно, только если
// оно относится к дому/подъезду жителя (та же логика видимости, что и в
// списке) — иначе как будто не нашли. Открытие карточки автоматически
// отмечает уведомление прочитанным этим жителем.
func (s *ResidentService) GetNotification(userID, notificationID uint) (*NotificationListItem, error) {
	resident, err := s.residentRepo.GetByUserID(userID)
	if err != nil {
		return nil, errors.New("resident profile not found for this user")
	}

	notification, err := s.notificationRepo.GetByID(notificationID)
	if err != nil {
		return nil, err
	}
	if notification.HouseID != resident.HouseID {
		return nil, gorm.ErrRecordNotFound
	}
	if notification.ScopeType == models.ScopeEntrance {
		if resident.EntranceNumber == nil || notification.EntranceNumber == nil ||
			*resident.EntranceNumber != *notification.EntranceNumber {
			return nil, gorm.ErrRecordNotFound
		}
	}

	if err := s.notifReadRepo.MarkRead(userID, notificationID); err != nil {
		return nil, err
	}

	return &NotificationListItem{Notification: *notification, IsRead: true}, nil
}

// ---------- Дом ----------

// GetChatInviteLink — ссылка на групповой чат дома, если Представитель её уже
// завёл (иначе nil — бот должен показать "ссылка ещё не готова").
func (s *ResidentService) GetChatInviteLink(userID uint) (*string, error) {
	resident, err := s.residentRepo.GetByUserID(userID)
	if err != nil {
		return nil, errors.New("resident profile not found for this user")
	}

	house, err := s.houseRepo.GetByID(resident.HouseID)
	if err != nil {
		return nil, err
	}
	return house.ChatInviteLink, nil
}

// GetHouse — полная информация о доме жителя (адрес, номер, число
// подъездов, ссылка на чат) — раньше из /me можно было достать только
// house_id, без самого адреса.
func (s *ResidentService) GetHouse(userID uint) (*models.House, error) {
	resident, err := s.residentRepo.GetByUserID(userID)
	if err != nil {
		return nil, errors.New("resident profile not found for this user")
	}
	return s.houseRepo.GetByID(resident.HouseID)
}

// ListEntrances — список номеров подъездов дома жителя (1..EntrancesCount),
// для формы создания обращения.
func (s *ResidentService) ListEntrances(userID uint) ([]int, error) {
	resident, err := s.residentRepo.GetByUserID(userID)
	if err != nil {
		return nil, errors.New("resident profile not found for this user")
	}

	house, err := s.houseRepo.GetByID(resident.HouseID)
	if err != nil {
		return nil, err
	}

	entrances := make([]int, house.EntrancesCount)
	for i := range entrances {
		entrances[i] = i + 1
	}
	return entrances, nil
}
