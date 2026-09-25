package repository

import (
	"maxito/internal/models"
	"gorm.io/gorm"
)

type HouseRepository struct {
	db *gorm.DB
}

func NewHouseRepository(db *gorm.DB) *HouseRepository {
	return &HouseRepository{db: db}
}

func (r *HouseRepository) Create(house *models.House) error {
	return r.db.Create(house).Error
}

func (r *HouseRepository) GetAll() ([]models.House, error) {
	var houses []models.House
	err := r.db.Find(&houses).Error
	return houses, err
}

func (r *HouseRepository) GetByID(id uint) (*models.House, error) {
	var house models.House
	err := r.db.First(&house, id).Error
	if err != nil {
		return nil, err
	}
	return &house, nil
}
