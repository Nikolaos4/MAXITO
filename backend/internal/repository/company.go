package repository

import (
	"maxito/internal/models"

	"gorm.io/gorm"
)

type CompanyRepository struct {
	db *gorm.DB
}

func NewCompanyRepository(db *gorm.DB) *CompanyRepository {
	return &CompanyRepository{db: db}
}

// Get возвращает единственную запись компании. gorm.ErrRecordNotFound,
// если Представитель ещё ни разу не заполнял реквизиты.
func (r *CompanyRepository) Get() (*models.Company, error) {
	var company models.Company
	err := r.db.Order("id ASC").First(&company).Error
	if err != nil {
		return nil, err
	}
	return &company, nil
}

// Upsert создаёт запись при первом сохранении или обновляет существующую —
// компания всегда ровно одна, вызывающему коду не нужно знать, был ли уже
// первый вызов.
func (r *CompanyRepository) Upsert(company *models.Company) error {
	existing, err := r.Get()
	if err != nil {
		if err == gorm.ErrRecordNotFound {
			return r.db.Create(company).Error
		}
		return err
	}
	company.ID = existing.ID
	return r.db.Save(company).Error
}
