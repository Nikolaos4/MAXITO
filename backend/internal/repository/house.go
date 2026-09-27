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

func (r *HouseRepository) UpdateChatInviteLink(houseID uint, link string) error {
	res := r.db.Model(&models.House{}).Where("id = ?", houseID).Update("chat_invite_link", link)
	if res.Error != nil {
		return res.Error
	}
	if res.RowsAffected == 0 {
		return gorm.ErrRecordNotFound
	}
	return nil
}
