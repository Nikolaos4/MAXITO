package repository

import (
	"gorm.io/gorm"
	"maxito/internal/models"
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

// ExistsByAddressNumber проверяет, есть ли уже дом с такой же парой
// адрес+номер — используется, чтобы не плодить дубли ни при единичном
// создании, ни при CSV-импорте.
func (r *HouseRepository) ExistsByAddressNumber(address, number string) (bool, error) {
	var count int64
	err := r.db.Model(&models.House{}).
		Where("address = ? AND number = ?", address, number).
		Count(&count).Error
	return count > 0, err
}

func (r *HouseRepository) Update(house *models.House) error {
	return r.db.Save(house).Error
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
