package resident

import (
	"net/http"
	"strconv"

	"maxito/internal/middleware"
	"maxito/internal/services"

	"github.com/gin-gonic/gin"
)

type NotificationHandler struct {
	svc *services.ResidentService
}

func NewNotificationHandler(svc *services.ResidentService) *NotificationHandler {
	return &NotificationHandler{svc: svc}
}

// ListNotifications — актуальные уведомления жителя: общедомовые + подъездные для его подъезда.
func (h *NotificationHandler) ListNotifications(c *gin.Context) {
	currentUser := middleware.GetCurrentUser(c)
	if currentUser == nil {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "unauthorized"})
		return
	}

	notifications, err := h.svc.ListNotifications(currentUser.ID)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}
	c.JSON(http.StatusOK, notifications)
}

// GetNotification — подробности одного уведомления.
func (h *NotificationHandler) GetNotification(c *gin.Context) {
	currentUser := middleware.GetCurrentUser(c)
	if currentUser == nil {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "unauthorized"})
		return
	}

	id, err := strconv.ParseUint(c.Param("id"), 10, 64)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "invalid notification id"})
		return
	}

	notification, err := h.svc.GetNotification(currentUser.ID, uint(id))
	if err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "notification not found"})
		return
	}
	c.JSON(http.StatusOK, notification)
}
