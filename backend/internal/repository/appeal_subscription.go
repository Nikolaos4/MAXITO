package repository

import (
	"maxito/internal/models"

	"gorm.io/gorm"
)

type AppealSubscriptionRepository struct {
	db *gorm.DB
}

func NewAppealSubscriptionRepository(db *gorm.DB) *AppealSubscriptionRepository {
	return &AppealSubscriptionRepository{db: db}
}

func (r *AppealSubscriptionRepository) Create(sub *models.AppealSubscription) error {
	return r.db.Create(sub).Error
}

func (r *AppealSubscriptionRepository) Exists(appealID, userID uint) (bool, error) {
	var count int64
	err := r.db.Model(&models.AppealSubscription{}).
		Where("appeal_id = ? AND user_id = ?", appealID, userID).
		Count(&count).Error
	return count > 0, err
}

// ListLikedAppealIDs — какие из перечисленных обращений уже лайкнуты этим
// пользователем (один запрос вместо N+1 на каждую строку списка).
func (r *AppealSubscriptionRepository) ListLikedAppealIDs(userID uint, appealIDs []uint) (map[uint]bool, error) {
	if len(appealIDs) == 0 {
		return map[uint]bool{}, nil
	}

	var rows []struct{ AppealID uint }
	err := r.db.Model(&models.AppealSubscription{}).
		Select("appeal_id").
		Where("user_id = ? AND appeal_id IN ?", userID, appealIDs).
		Scan(&rows).Error
	if err != nil {
		return nil, err
	}

	liked := make(map[uint]bool, len(rows))
	for _, row := range rows {
		liked[row.AppealID] = true
	}
	return liked, nil
}

// Delete снимает лайк. Возвращает gorm.ErrRecordNotFound, если лайка не было.
func (r *AppealSubscriptionRepository) Delete(appealID, userID uint) error {
	res := r.db.Where("appeal_id = ? AND user_id = ?", appealID, userID).
		Delete(&models.AppealSubscription{})
	if res.Error != nil {
		return res.Error
	}
	if res.RowsAffected == 0 {
		return gorm.ErrRecordNotFound
	}
	return nil
}
