package services

import (
	"errors"
	"fmt"

	"maxito/internal/models"
	"maxito/internal/repository"
)

// resolveReason определяет тему и итоговую причину по problemTypeID/reasonID.
// Используется и при создании уведомления диспетчером, и при создании
// обращения жителем — правила одинаковые в обоих случаях:
//   - если тема — "Другое" (models.ProblemTypeCodeOther), причина
//     подставляется автоматически (у темы ровно одна причина с IsOther=true);
//   - иначе reasonID обязателен и должен реально принадлежать этой теме.
func resolveReason(
	problemTypeRepo *repository.ProblemTypeRepository,
	reasonRepo *repository.ReasonRepository,
	problemTypeID uint,
	reasonID *uint,
) (*models.ProblemType, *models.Reason, error) {
	problemType, err := problemTypeRepo.GetByID(problemTypeID)
	if err != nil {
		return nil, nil, fmt.Errorf("problem type %d not found", problemTypeID)
	}

	if problemType.Code == models.ProblemTypeCodeOther {
		reason, err := reasonRepo.GetOtherByProblemType(problemType.ID)
		if err != nil {
			return nil, nil, fmt.Errorf("no 'other' reason configured for problem type %d", problemType.ID)
		}
		return problemType, reason, nil
	}

	if reasonID == nil {
		return nil, nil, errors.New("reason_id is required for this problem type")
	}

	reason, err := reasonRepo.GetByID(*reasonID)
	if err != nil {
		return nil, nil, fmt.Errorf("reason %d not found", *reasonID)
	}
	if reason.ProblemTypeID != problemType.ID {
		return nil, nil, fmt.Errorf("reason %d does not belong to problem type %d", *reasonID, problemType.ID)
	}
	return problemType, reason, nil
}
