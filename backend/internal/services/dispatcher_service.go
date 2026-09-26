package services

import (
	"errors"
	"fmt"
	"sort"
	"time"

	"maxito/internal/models"
	"maxito/internal/repository"

	"gorm.io/gorm"
)

// allowedTransitions — граф допустимых переходов статуса обращения.
// completed и rejected — конечные состояния, переходов из них нет.
var allowedTransitions = map[models.AppealStatus][]models.AppealStatus{
	models.StatusAccepted:   {models.StatusInProgress, models.StatusRejected},
	models.StatusInProgress: {models.StatusNeedInfo, models.StatusCompleted, models.StatusRejected},
	models.StatusNeedInfo:   {models.StatusInProgress},
	models.StatusCompleted:  {},
	models.StatusRejected:   {},
}

func isTransitionAllowed(from, to models.AppealStatus) bool {
	for _, s := range allowedTransitions[from] {
		if s == to {
			return true
		}
	}
	return false
}

// AppealDetail — обращение вместе с числом лайков и полной историей смены статусов.
type AppealDetail struct {
	models.Appeal
	LikesCount int64                        `json:"likes_count"`
	History    []models.AppealStatusChange  `json:"history"`
}

// ChangeStatusInput — вход для смены статуса обращения диспетчером.
type ChangeStatusInput struct {
	NewStatus models.AppealStatus
	Comment   string
	PhotoURL  string
}

// CreateNotificationInput — вход для создания уведомления диспетчером.
type CreateNotificationInput struct {
	HouseID        uint
	Scope          models.NotificationScope
	EntranceNumber *int
	ProblemTypeID  uint
	ReasonID       *uint // необязателен, если тема — "Другое" (заполняется автоматически)
	Title          string
	Body           string
	StartsAt       time.Time
	EndsAt         time.Time
}

type DispatcherService struct {
	db               *gorm.DB
	dispHouseRepo    *repository.DispatcherHouseRepository
	appealRepo       *repository.AppealRepository
	statusChangeRepo *repository.AppealStatusChangeRepository
	notificationRepo *repository.NotificationRepository
	problemTypeRepo  *repository.ProblemTypeRepository
	reasonRepo       *repository.ReasonRepository
}

func NewDispatcherService(
	db *gorm.DB,
	dispHouseRepo *repository.DispatcherHouseRepository,
	appealRepo *repository.AppealRepository,
	statusChangeRepo *repository.AppealStatusChangeRepository,
	notificationRepo *repository.NotificationRepository,
	problemTypeRepo *repository.ProblemTypeRepository,
	reasonRepo *repository.ReasonRepository,
) *DispatcherService {
	return &DispatcherService{
		db:               db,
		dispHouseRepo:    dispHouseRepo,
		appealRepo:       appealRepo,
		statusChangeRepo: statusChangeRepo,
		notificationRepo: notificationRepo,
		problemTypeRepo:  problemTypeRepo,
		reasonRepo:       reasonRepo,
	}
}

// ---------- Дома диспетчера (для scoping всего остального) ----------

func (s *DispatcherService) ownedHouseIDs(dispatcherID uint) ([]uint, error) {
	houses, err := s.dispHouseRepo.ListHousesByDispatcher(dispatcherID)
	if err != nil {
		return nil, err
	}
	ids := make([]uint, len(houses))
	for i, h := range houses {
		ids[i] = h.ID
	}
	return ids, nil
}

func (s *DispatcherService) ensureOwnsHouse(dispatcherID, houseID uint) error {
	ids, err := s.ownedHouseIDs(dispatcherID)
	if err != nil {
		return err
	}
	for _, id := range ids {
		if id == houseID {
			return nil
		}
	}
	return fmt.Errorf("house %d is not assigned to this dispatcher", houseID)
}

// ---------- Обращения ----------

// ListAppeals возвращает обращения только по домам, закреплённым за диспетчером.
// Если в фильтре указаны house_id — они пересекаются со "своими" домами;
// запрос на чужой дом молча отбрасывается, а не считается ошибкой доступа
// (чтобы фильтр "все свои дома + этот один чужой по ошибке" не валил весь запрос).
func (s *DispatcherService) ListAppeals(dispatcherID uint, filter repository.AppealFilter) ([]models.Appeal, int64, error) {
	owned, err := s.ownedHouseIDs(dispatcherID)
	if err != nil {
		return nil, 0, err
	}
	if len(owned) == 0 {
		return []models.Appeal{}, 0, nil
	}

	if len(filter.HouseIDs) == 0 {
		filter.HouseIDs = owned
	} else {
		ownedSet := make(map[uint]bool, len(owned))
		for _, id := range owned {
			ownedSet[id] = true
		}
		allowed := make([]uint, 0, len(filter.HouseIDs))
		for _, id := range filter.HouseIDs {
			if ownedSet[id] {
				allowed = append(allowed, id)
			}
		}
		if len(allowed) == 0 {
			return []models.Appeal{}, 0, nil
		}
		filter.HouseIDs = allowed
	}

	return s.appealRepo.List(filter)
}

// TopAppeals — N обращений с наибольшим числом лайков по своим домам.
func (s *DispatcherService) TopAppeals(dispatcherID uint, limit int) ([]models.Appeal, error) {
	owned, err := s.ownedHouseIDs(dispatcherID)
	if err != nil {
		return nil, err
	}
	if len(owned) == 0 {
		return []models.Appeal{}, nil
	}

	appeals, _, err := s.appealRepo.List(repository.AppealFilter{
		HouseIDs: owned,
		Page:     1,
		PageSize: limit,
	})
	return appeals, err
}

// GetAppealDetail — карточка обращения с числом лайков и историей статусов.
// Возвращает ошибку, если обращение принадлежит дому не этого диспетчера.
func (s *DispatcherService) GetAppealDetail(dispatcherID, appealID uint) (*AppealDetail, error) {
	appeal, err := s.appealRepo.GetByID(appealID)
	if err != nil {
		return nil, err
	}
	if err := s.ensureOwnsHouse(dispatcherID, appeal.HouseID); err != nil {
		return nil, err
	}

	likes, err := s.appealRepo.CountLikes(appealID)
	if err != nil {
		return nil, err
	}

	history, err := s.statusChangeRepo.ListByAppeal(appealID)
	if err != nil {
		return nil, err
	}

	return &AppealDetail{Appeal: *appeal, LikesCount: likes, History: history}, nil
}

// ChangeStatus меняет статус обращения по графу допустимых переходов.
// Комментарий обязателен всегда; фото допускается только при переходе в "completed".
func (s *DispatcherService) ChangeStatus(dispatcherID, appealID uint, in ChangeStatusInput) (*models.AppealStatusChange, error) {
	appeal, err := s.appealRepo.GetByID(appealID)
	if err != nil {
		return nil, err
	}
	if err := s.ensureOwnsHouse(dispatcherID, appeal.HouseID); err != nil {
		return nil, err
	}

	if in.Comment == "" {
		return nil, errors.New("comment is required")
	}
	if in.PhotoURL != "" && in.NewStatus != models.StatusCompleted {
		return nil, errors.New("photo is only allowed when the new status is 'completed'")
	}
	if !isTransitionAllowed(appeal.Status, in.NewStatus) {
		return nil, fmt.Errorf("transition from %q to %q is not allowed", appeal.Status, in.NewStatus)
	}

	var photoURL *string
	if in.PhotoURL != "" {
		photoURL = &in.PhotoURL
	}

	change := &models.AppealStatusChange{
		AppealID:   appealID,
		FromStatus: appeal.Status,
		ToStatus:   in.NewStatus,
		Comment:    in.Comment,
		PhotoURL:   photoURL,
		ChangedBy:  dispatcherID,
	}

	txErr := s.db.Transaction(func(tx *gorm.DB) error {
		if err := tx.Create(change).Error; err != nil {
			return err
		}
		return tx.Model(&models.Appeal{}).Where("id = ?", appealID).Update("status", in.NewStatus).Error
	})
	if txErr != nil {
		return nil, txErr
	}

	return change, nil
}

// HouseAppealStats — статистика по необработанным обращениям одного дома.
// "Необработанные" = accepted + in_progress + need_info (completed и
// rejected — уже закрытые, в статистику не попадают).
type HouseAppealStats struct {
	HouseID    uint   `json:"house_id"`
	Address    string `json:"address"`
	Accepted   int64  `json:"accepted"`
	InProgress int64  `json:"in_progress"`
	NeedInfo   int64  `json:"need_info"`
	Total      int64  `json:"total"`
}

// UnprocessedStats — статистика по каждому дому диспетчера, отсортированная
// по убыванию total (самый "горящий" дом — первым). Дома без единого
// необработанного обращения тоже включены, с нулями — чтобы диспетчер видел
// полную картину по всем своим домам, а не только по проблемным.
func (s *DispatcherService) UnprocessedStats(dispatcherID uint) ([]HouseAppealStats, error) {
	houses, err := s.dispHouseRepo.ListHousesByDispatcher(dispatcherID)
	if err != nil {
		return nil, err
	}
	if len(houses) == 0 {
		return []HouseAppealStats{}, nil
	}

	houseIDs := make([]uint, len(houses))
	statsByHouse := make(map[uint]*HouseAppealStats, len(houses))
	for i, h := range houses {
		houseIDs[i] = h.ID
		statsByHouse[h.ID] = &HouseAppealStats{HouseID: h.ID, Address: h.Address}
	}

	rows, err := s.appealRepo.CountUnprocessedByHouse(houseIDs)
	if err != nil {
		return nil, err
	}

	for _, row := range rows {
		stat, ok := statsByHouse[row.HouseID]
		if !ok {
			continue
		}
		switch row.Status {
		case models.StatusAccepted:
			stat.Accepted = row.Count
		case models.StatusInProgress:
			stat.InProgress = row.Count
		case models.StatusNeedInfo:
			stat.NeedInfo = row.Count
		}
		stat.Total += row.Count
	}

	result := make([]HouseAppealStats, 0, len(houses))
	for _, h := range houses {
		result = append(result, *statsByHouse[h.ID])
	}

	sort.Slice(result, func(i, j int) bool {
		if result[i].Total != result[j].Total {
			return result[i].Total > result[j].Total
		}
		return result[i].Address < result[j].Address // стабильный tie-break
	})

	return result, nil
}

// ---------- Уведомления ----------

// CreateNotification создаёт уведомление по дому/подъезду. Диспетчер
// должен быть ответственным за указанный дом.
func (s *DispatcherService) CreateNotification(dispatcherID uint, in CreateNotificationInput) (*models.Notification, error) {
	if err := s.ensureOwnsHouse(dispatcherID, in.HouseID); err != nil {
		return nil, err
	}

	if in.Scope != models.ScopeHouse && in.Scope != models.ScopeEntrance {
		return nil, errors.New("scope must be 'house' or 'entrance'")
	}
	if in.Scope == models.ScopeEntrance && in.EntranceNumber == nil {
		return nil, errors.New("entrance_number is required when scope is 'entrance'")
	}
	if in.Scope == models.ScopeHouse {
		in.EntranceNumber = nil
	}
	if !in.EndsAt.After(in.StartsAt) {
		return nil, errors.New("ends_at must be after starts_at")
	}
	if in.Body == "" {
		return nil, errors.New("body (comment) is required")
	}

	problemType, reason, err := resolveReason(s.problemTypeRepo, s.reasonRepo, in.ProblemTypeID, in.ReasonID)
	if err != nil {
		return nil, err
	}

	title := in.Title
	if title == "" {
		title = problemType.Title
	}

	notification := &models.Notification{
		HouseID:        in.HouseID,
		AuthorID:       dispatcherID,
		ReasonID:       reason.ID,
		ScopeType:      in.Scope,
		EntranceNumber: in.EntranceNumber,
		Title:          title,
		Body:           in.Body,
		StartsAt:       in.StartsAt,
		EndsAt:         in.EndsAt,
	}

	if err := s.notificationRepo.Create(notification); err != nil {
		return nil, err
	}
	return notification, nil
}

// ListNotifications возвращает уведомления только по домам, закреплённым
// за диспетчером. Если houseIDs пуст — по всем его домам; если указан —
// пересекается со "своими" домами (та же логика, что в ListAppeals).
func (s *DispatcherService) ListNotifications(dispatcherID uint, houseIDs []uint, status string) ([]models.Notification, error) {
	owned, err := s.ownedHouseIDs(dispatcherID)
	if err != nil {
		return nil, err
	}
	if len(owned) == 0 {
		return []models.Notification{}, nil
	}

	targetHouseIDs := owned
	if len(houseIDs) > 0 {
		ownedSet := make(map[uint]bool, len(owned))
		for _, id := range owned {
			ownedSet[id] = true
		}
		allowed := make([]uint, 0, len(houseIDs))
		for _, id := range houseIDs {
			if ownedSet[id] {
				allowed = append(allowed, id)
			}
		}
		if len(allowed) == 0 {
			return []models.Notification{}, nil
		}
		targetHouseIDs = allowed
	}

	return s.notificationRepo.List(repository.NotificationFilter{
		HouseIDs: targetHouseIDs,
		Status:   status,
	})
}

// RevokeNotification досрочно отзывает уведомление (перестаёт блокировать
// новые обращения раньше исходного срока действия).
func (s *DispatcherService) RevokeNotification(dispatcherID, notificationID uint) error {
	notification, err := s.notificationRepo.GetByID(notificationID)
	if err != nil {
		return err
	}
	if err := s.ensureOwnsHouse(dispatcherID, notification.HouseID); err != nil {
		return err
	}
	return s.notificationRepo.Revoke(notificationID)
}
