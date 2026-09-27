package repository

import (
	"maxito/internal/models"

	"gorm.io/gorm"
)

type DispatcherHouseRepository struct {
	db *gorm.DB
}

func NewDispatcherHouseRepository(db *gorm.DB) *DispatcherHouseRepository {
	return &DispatcherHouseRepository{db: db}
}

func (r *DispatcherHouseRepository) Create(link *models.DispatcherHouse) error {
	return r.db.Create(link).Error
}

// GetByDispatcherAndHouse — используется, чтобы отличить "уже назначено" от реальной ошибки БД.
func (r *DispatcherHouseRepository) GetByDispatcherAndHouse(dispatcherID, houseID uint) (*models.DispatcherHouse, error) {
	var link models.DispatcherHouse
	err := r.db.Where("dispatcher_id = ? AND house_id = ?", dispatcherID, houseID).First(&link).Error
	if err != nil {
		return nil, err
	}
	return &link, nil
}

// Delete снимает дом с ответственности диспетчера. Возвращает gorm.ErrRecordNotFound,
// если такого назначения не было.
func (r *DispatcherHouseRepository) Delete(dispatcherID, houseID uint) error {
	res := r.db.Where("dispatcher_id = ? AND house_id = ?", dispatcherID, houseID).
		Delete(&models.DispatcherHouse{})
	if res.Error != nil {
		return res.Error
	}
	if res.RowsAffected == 0 {
		return gorm.ErrRecordNotFound
	}
	return nil
}

// ListHousesByDispatcher — дома, закреплённые за конкретным диспетчером.
func (r *DispatcherHouseRepository) ListHousesByDispatcher(dispatcherID uint) ([]models.House, error) {
	var houses []models.House
	err := r.db.
		Joins("JOIN dispatcher_houses ON dispatcher_houses.house_id = houses.id").
		Where("dispatcher_houses.dispatcher_id = ?", dispatcherID).
		Find(&houses).Error
	return houses, err
}

// ListUnassignedHouses — дома, за которые пока не отвечает ни один диспетчер.
func (r *DispatcherHouseRepository) ListUnassignedHouses() ([]models.House, error) {
	var houses []models.House
	err := r.db.
		Where("id NOT IN (?)", r.db.Model(&models.DispatcherHouse{}).Select("house_id")).
		Find(&houses).Error
	return houses, err
}

// ListAll — все текущие назначения диспетчер-дом с подгруженными связями.
func (r *DispatcherHouseRepository) ListAll() ([]models.DispatcherHouse, error) {
	var links []models.DispatcherHouse
	err := r.db.Preload("Dispatcher").Preload("House").Find(&links).Error
	return links, err
}
