package repository

import (
	"maxito/internal/models"

	"gorm.io/gorm"
)

type NotificationReadRepository struct {
	db *gorm.DB
}

func NewNotificationReadRepository(db *gorm.DB) *NotificationReadRepository {
	return &NotificationReadRepository{db: db}
}

// MarkRead идемпотентно отмечает уведомление прочитанным этим пользователем
// (повторный вызов ничего не ломает и не плодит дублей).
func (r *NotificationReadRepository) MarkRead(userID, notificationID uint) error {
	var existing models.NotificationRead
	err := r.db.Where("user_id = ? AND notification_id = ?", userID, notificationID).First(&existing).Error
	if err == nil {
		return nil
	}
	if err != gorm.ErrRecordNotFound {
		return err
	}
	return r.db.Create(&models.NotificationRead{UserID: userID, NotificationID: notificationID}).Error
}

// ListReadNotificationIDs — какие из перечисленных уведомлений уже прочитаны
// этим пользователем (один запрос вместо N+1 на каждую строку списка).
func (r *NotificationReadRepository) ListReadNotificationIDs(userID uint, notificationIDs []uint) (map[uint]bool, error) {
	if len(notificationIDs) == 0 {
		return map[uint]bool{}, nil
	}

	var rows []struct{ NotificationID uint }
	err := r.db.Model(&models.NotificationRead{}).
		Select("notification_id").
		Where("user_id = ? AND notification_id IN ?", userID, notificationIDs).
		Scan(&rows).Error
	if err != nil {
		return nil, err
	}

	read := make(map[uint]bool, len(rows))
	for _, row := range rows {
		read[row.NotificationID] = true
	}
	return read, nil
}
