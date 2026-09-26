package repository

import (
	"maxito/internal/models"

	"gorm.io/gorm"
)

type AppealStatusChangeRepository struct {
	db *gorm.DB
}

func NewAppealStatusChangeRepository(db *gorm.DB) *AppealStatusChangeRepository {
	return &AppealStatusChangeRepository{db: db}
}

func (r *AppealStatusChangeRepository) Create(change *models.AppealStatusChange) error {
	return r.db.Create(change).Error
}

func (r *AppealStatusChangeRepository) ListByAppeal(appealID uint) ([]models.AppealStatusChange, error) {
	var changes []models.AppealStatusChange
	err := r.db.
		Preload("Changer").
		Where("appeal_id = ?", appealID).
		Order("created_at ASC").
		Find(&changes).Error
	return changes, err
}
