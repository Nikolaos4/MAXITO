package repository

import (
	"maxito/internal/models"

	"gorm.io/gorm"
)

type EmergencyServiceRepository struct {
	db *gorm.DB
}

func NewEmergencyServiceRepository(db *gorm.DB) *EmergencyServiceRepository {
	return &EmergencyServiceRepository{db: db}
}

func (r *EmergencyServiceRepository) List() ([]models.EmergencyService, error) {
	var list []models.EmergencyService
	err := r.db.Order("id ASC").Find(&list).Error
	return list, err
}

func (r *EmergencyServiceRepository) Create(service *models.EmergencyService) error {
	return r.db.Create(service).Error
}

// ExistsByPhone — чтобы повторная загрузка того же CSV не плодила дубли
// (тот же принцип идемпотентной догрузки, что и у домов/жителей).
func (r *EmergencyServiceRepository) ExistsByPhone(phone string) (bool, error) {
	var count int64
	err := r.db.Model(&models.EmergencyService{}).Where("phone = ?", phone).Count(&count).Error
	return count > 0, err
}
