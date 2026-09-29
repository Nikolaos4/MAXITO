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

// ListMaxUserIDsByHouse — max_user_id жителей дома для рассылки уведомлений.
// entranceNumber = nil — все жители дома (общедомовое уведомление);
// иначе — только жители этого подъезда. Жители без привязанного max_user_id
// (ещё не открывали бота) в выборку не попадают — боту нечего им слать.
func (r *ResidentRepository) ListMaxUserIDsByHouse(houseID uint, entranceNumber *int) ([]string, error) {
	q := r.db.Table("residents").
		Joins("JOIN users ON users.id = residents.user_id").
		Where("residents.house_id = ? AND users.max_user_id IS NOT NULL", houseID)
	if entranceNumber != nil {
		q = q.Where("residents.entrance_number = ?", *entranceNumber)
	}

	var ids []string
	err := q.Pluck("users.max_user_id", &ids).Error
	return ids, err
}

func (r *ResidentRepository) ListByHouse(houseID uint) ([]models.Resident, error) {
	var residents []models.Resident
	err := r.db.Preload("User").Where("house_id = ?", houseID).Find(&residents).Error
	return residents, err
}
