package repository

import (
	"maxito/internal/models"

	"gorm.io/gorm"
)

type AppealAttachmentRepository struct {
	db *gorm.DB
}

func NewAppealAttachmentRepository(db *gorm.DB) *AppealAttachmentRepository {
	return &AppealAttachmentRepository{db: db}
}

func (r *AppealAttachmentRepository) ListByAppeal(appealID uint) ([]models.AppealAttachment, error) {
	var attachments []models.AppealAttachment
	err := r.db.Where("appeal_id = ?", appealID).Order("created_at ASC").Find(&attachments).Error
	return attachments, err
}
