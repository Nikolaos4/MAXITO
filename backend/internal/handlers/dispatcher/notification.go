package dispatcher

import (
	"net/http"
	"strconv"
	"time"

	"maxito/internal/middleware"
	"maxito/internal/models"
	"maxito/internal/services"
	"maxito/internal/util"

	"github.com/gin-gonic/gin"
)

type NotificationHandler struct {
	svc *services.DispatcherService
}

func NewNotificationHandler(svc *services.DispatcherService) *NotificationHandler {
	return &NotificationHandler{svc: svc}
}

type CreateNotificationRequest struct {
	HouseID        uint   `json:"house_id" binding:"required"`
	Scope          string `json:"scope" binding:"required"` // "house" | "entrance"
	EntranceNumber *int   `json:"entrance_number"`
	ProblemTypeID  uint   `json:"problem_type_id" binding:"required"`
	ReasonID       *uint  `json:"reason_id"` // не нужен, если тема — "Другое"
	Title          string `json:"title"`
	Body           string `json:"body" binding:"required"`
	StartsAt       string `json:"starts_at" binding:"required"` // RFC3339
	EndsAt         string `json:"ends_at" binding:"required"`   // RFC3339
}

// CreateNotification — создать уведомление для дома/подъезда.
func (h *NotificationHandler) CreateNotification(c *gin.Context) {
	currentUser := middleware.GetCurrentUser(c)
	if currentUser == nil {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "unauthorized"})
		return
	}

	var req CreateNotificationRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	startsAt, err := time.Parse(time.RFC3339, req.StartsAt)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "invalid starts_at, expected RFC3339 (e.g. 2026-09-25T00:00:00+03:00)"})
		return
	}
	endsAt, err := time.Parse(time.RFC3339, req.EndsAt)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "invalid ends_at, expected RFC3339"})
		return
	}

	notification, err := h.svc.CreateNotification(currentUser.ID, services.CreateNotificationInput{
		HouseID:        req.HouseID,
		Scope:          models.NotificationScope(req.Scope),
		EntranceNumber: req.EntranceNumber,
		ProblemTypeID:  req.ProblemTypeID,
		ReasonID:       req.ReasonID,
		Title:          req.Title,
		Body:           req.Body,
		StartsAt:       startsAt,
		EndsAt:         endsAt,
	})
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	c.JSON(http.StatusCreated, notification)
}

// ListNotifications — уведомления по своим домам.
// Query: house_id (можно повторять — ?house_id=1&house_id=2),
// status = active | expired | revoked (не указан — все, без фильтра).
func (h *NotificationHandler) ListNotifications(c *gin.Context) {
	currentUser := middleware.GetCurrentUser(c)
	if currentUser == nil {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "unauthorized"})
		return
	}

	status := c.Query("status")
	if status != "" && status != "active" && status != "expired" && status != "revoked" {
		c.JSON(http.StatusBadRequest, gin.H{"error": "status must be one of: active, expired, revoked"})
		return
	}

	notifications, err := h.svc.ListNotifications(currentUser.ID, util.ParseUintList(c.QueryArray("house_id")), status)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	c.JSON(http.StatusOK, notifications)
}

// RevokeNotification — досрочно отозвать уведомление.
func (h *NotificationHandler) RevokeNotification(c *gin.Context) {
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

	if err := h.svc.RevokeNotification(currentUser.ID, uint(id)); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	c.Status(http.StatusNoContent)
}
