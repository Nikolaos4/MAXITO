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
//
// @ID residentListNotifications
// @Summary Актуальные уведомления (плановые работы)
// @Tags resident-notifications
// @Produce json
// @Security BearerAuth
// @Success 200 {array} services.NotificationListItem
// @Failure 400 {object} apidoc.ErrorResponse
// @Failure 401 {object} apidoc.ErrorResponse
// @Router /resident/notifications [get]
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
//
// @ID residentGetNotification
// @Summary Подробности уведомления
// @Description Открытие карточки автоматически отмечает уведомление прочитанным.
// @Tags resident-notifications
// @Produce json
// @Security BearerAuth
// @Param id path int true "ID уведомления"
// @Success 200 {object} services.NotificationListItem
// @Failure 400 {object} apidoc.ErrorResponse
// @Failure 401 {object} apidoc.ErrorResponse
// @Failure 404 {object} apidoc.ErrorResponse
// @Router /resident/notifications/{id} [get]
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
