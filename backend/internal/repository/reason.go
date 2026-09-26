package repository

import (
	"maxito/internal/models"

	"gorm.io/gorm"
)

type ReasonRepository struct {
	db *gorm.DB
}

func NewReasonRepository(db *gorm.DB) *ReasonRepository {
	return &ReasonRepository{db: db}
}

func (r *ReasonRepository) ListByProblemType(problemTypeID uint) ([]models.Reason, error) {
	var reasons []models.Reason
	err := r.db.Where("problem_type_id = ?", problemTypeID).Order("id ASC").Find(&reasons).Error
	return reasons, err
}

func (r *ReasonRepository) GetByID(id uint) (*models.Reason, error) {
	var reason models.Reason
	err := r.db.First(&reason, id).Error
	if err != nil {
		return nil, err
	}
	return &reason, nil
}

// GetOtherByProblemType возвращает причину "другое" для темы — у каждой
// темы (включая саму тему "Другое") она ровно одна.
func (r *ReasonRepository) GetOtherByProblemType(problemTypeID uint) (*models.Reason, error) {
	var reason models.Reason
	err := r.db.Where("problem_type_id = ? AND is_other = ?", problemTypeID, true).First(&reason).Error
	if err != nil {
		return nil, err
	}
	return &reason, nil
}
