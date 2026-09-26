package repository

import (
	"time"

	"maxito/internal/models"

	"gorm.io/gorm"
)

type NotificationRepository struct {
	db *gorm.DB
}

func NewNotificationRepository(db *gorm.DB) *NotificationRepository {
	return &NotificationRepository{db: db}
}

func (r *NotificationRepository) Create(n *models.Notification) error {
	return r.db.Create(n).Error
}

func (r *NotificationRepository) GetByID(id uint) (*models.Notification, error) {
	var n models.Notification
	err := r.db.First(&n, id).Error
	if err != nil {
		return nil, err
	}
	return &n, nil
}

// NotificationFilter — необязательные фильтры для списка уведомлений.
// Пустой HouseIDs = фильтр по дому не применяется; пустой Status = без
// фильтра по статусу (показать все, включая отозванные и истёкшие).
type NotificationFilter struct {
	HouseIDs []uint
	Status   string // "active" | "expired" | "revoked" | ""
}

// List возвращает уведомления по фильтру. Сортировка: активные сейчас —
// сверху, дальше по дате начала действия (новые выше).
func (r *NotificationRepository) List(filter NotificationFilter) ([]models.Notification, error) {
	q := r.db.Model(&models.Notification{}).
		Preload("House").
		Preload("Reason")

	if len(filter.HouseIDs) > 0 {
		q = q.Where("house_id IN ?", filter.HouseIDs)
	}

	switch filter.Status {
	case "active":
		q = q.Where("revoked_at IS NULL AND ends_at >= ?", time.Now())
	case "expired":
		q = q.Where("revoked_at IS NULL AND ends_at < ?", time.Now())
	case "revoked":
		q = q.Where("revoked_at IS NOT NULL")
	}

	var list []models.Notification
	// NOW() — прямо в SQL, а не через bind-параметр: Order() в GORM не
	// поддерживает плейсхолдеры "?" так же, как Where().
	err := q.
		Order("(revoked_at IS NULL AND ends_at >= NOW()) DESC, starts_at DESC").
		Find(&list).Error
	return list, err
}

// HasActiveBlock проверяет, есть ли активное (не отозванное, в пределах
// срока действия) уведомление по той же теме и причине, которое блокирует
// создание обращения на момент at.
//
// Уведомление на весь дом (scope_type=house) блокирует обращения и по
// всему дому, и по любому конкретному подъезду. Уведомление на подъезд
// (scope_type=entrance) блокирует только обращения с тем же номером
// подъезда — обращение "по всему дому" (entranceNumber == nil) им не
// блокируется.
func (r *NotificationRepository) HasActiveBlock(
	houseID, reasonID uint, entranceNumber *int, at time.Time,
) (bool, error) {
	q := r.db.Model(&models.Notification{}).
		Where("house_id = ? AND reason_id = ?", houseID, reasonID).
		Where("revoked_at IS NULL").
		Where("starts_at <= ? AND ends_at >= ?", at, at)

	if entranceNumber != nil {
		q = q.Where("(scope_type = ? OR (scope_type = ? AND entrance_number = ?))",
			models.ScopeHouse, models.ScopeEntrance, *entranceNumber)
	} else {
		q = q.Where("scope_type = ?", models.ScopeHouse)
	}

	var count int64
	err := q.Count(&count).Error
	return count > 0, err
}

func (r *NotificationRepository) Revoke(id uint) error {
	res := r.db.Model(&models.Notification{}).
		Where("id = ? AND revoked_at IS NULL", id).
		Update("revoked_at", time.Now())
	if res.Error != nil {
		return res.Error
	}
	if res.RowsAffected == 0 {
		return gorm.ErrRecordNotFound
	}
	return nil
}
