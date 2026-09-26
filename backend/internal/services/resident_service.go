package services

import (
	"errors"
	"time"

	"maxito/internal/models"
	"maxito/internal/repository"
)

// CreateAppealInput — вход для создания обращения жителем.
type CreateAppealInput struct {
	ProblemTypeID      uint
	ReasonID           *uint
	EntranceNumber     *int
	Description        string
	Importance         string
	WantsRecalculation bool
	CreatedAt          time.Time
}

type ResidentService struct {
	residentRepo     *repository.ResidentRepository
	appealRepo       *repository.AppealRepository
	notificationRepo *repository.NotificationRepository
	problemTypeRepo  *repository.ProblemTypeRepository
	reasonRepo       *repository.ReasonRepository
}

func NewResidentService(
	residentRepo *repository.ResidentRepository,
	appealRepo *repository.AppealRepository,
	notificationRepo *repository.NotificationRepository,
	problemTypeRepo *repository.ProblemTypeRepository,
	reasonRepo *repository.ReasonRepository,
) *ResidentService {
	return &ResidentService{
		residentRepo:     residentRepo,
		appealRepo:       appealRepo,
		notificationRepo: notificationRepo,
		problemTypeRepo:  problemTypeRepo,
		reasonRepo:       reasonRepo,
	}
}

// CreateAppeal создаёт обращение от лица жителя userID. Дом берётся из его
// профиля жителя (не из запроса — житель не может создать обращение "не за
// свой дом"). Если по теме+причине сейчас действует уведомление диспетчера
// (и ни тема, ни причина не отмечены как "другое") — обращение блокируется.
func (s *ResidentService) CreateAppeal(userID uint, in CreateAppealInput) (*models.Appeal, error) {
	resident, err := s.residentRepo.GetByUserID(userID)
	if err != nil {
		return nil, errors.New("resident profile not found for this user")
	}

	problemType, reason, err := resolveReason(s.problemTypeRepo, s.reasonRepo, in.ProblemTypeID, in.ReasonID)
	if err != nil {
		return nil, err
	}

	if in.Description == "" {
		return nil, errors.New("description is required")
	}

	// "Другое" (сама тема или конкретная причина внутри обычной темы)
	// никогда не блокируется уведомлениями — см. Reason.IsOther.
	if !reason.IsOther {
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
		Description:        in.Description,
		Importance:         importance,
		Status:             models.StatusAccepted,
		WantsRecalculation: in.WantsRecalculation,
	}

	if err := s.appealRepo.Create(appeal); err != nil {
		return nil, err
	}
	return appeal, nil
}
