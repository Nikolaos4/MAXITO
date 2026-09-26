package repository

import (
	"maxito/internal/models"

	"gorm.io/gorm"
)

type ProblemTypeRepository struct {
	db *gorm.DB
}

func NewProblemTypeRepository(db *gorm.DB) *ProblemTypeRepository {
	return &ProblemTypeRepository{db: db}
}

func (r *ProblemTypeRepository) List() ([]models.ProblemType, error) {
	var types []models.ProblemType
	err := r.db.Order("id ASC").Find(&types).Error
	return types, err
}

func (r *ProblemTypeRepository) GetByID(id uint) (*models.ProblemType, error) {
	var pt models.ProblemType
	err := r.db.First(&pt, id).Error
	if err != nil {
		return nil, err
	}
	return &pt, nil
}
