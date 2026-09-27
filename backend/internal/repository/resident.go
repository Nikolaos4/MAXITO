package repository

import (
	"maxito/internal/models"

	"gorm.io/gorm"
)

type ResidentRepository struct {
	db *gorm.DB
}

func NewResidentRepository(db *gorm.DB) *ResidentRepository {
	return &ResidentRepository{db: db}
}

func (r *ResidentRepository) Create(resident *models.Resident) error {
	return r.db.Create(resident).Error
}

func (r *ResidentRepository) GetByUserID(userID uint) (*models.Resident, error) {
	var resident models.Resident
	err := r.db.Where("user_id = ?", userID).First(&resident).Error
	if err != nil {
		return nil, err
	}
	return &resident, nil
}

func (r *ResidentRepository) ListByHouse(houseID uint) ([]models.Resident, error) {
	var residents []models.Resident
	err := r.db.Preload("User").Where("house_id = ?", houseID).Find(&residents).Error
	return residents, err
}
