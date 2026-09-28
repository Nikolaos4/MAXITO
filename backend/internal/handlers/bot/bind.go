package bot

import (
	"encoding/json"
	"errors"
	"net/http"

	"maxito/internal/services"

	"github.com/gin-gonic/gin"
)

// Handler — эндпоинты, которые вызывает только сервер бота (защищены
// X-Internal-Key). Каталог назван bot, а не internal: в Go каталог с именем
// internal ограничивает, кто может его импортировать.
type Handler struct {
	svc *services.AuthService
}

func NewHandler(svc *services.AuthService) *Handler {
	return &Handler{svc: svc}
}

type bindRequest struct {
	Phone string `json:"phone" binding:"required"`
	// json.Number принимает и число, и строку с числом — бот может прислать
	// max_user_id любым из способов, результат один и тот же.
	MaxUserID json.Number `json:"max_user_id" binding:"required"`
}

// Bind привязывает аккаунт MAX к пользователю по телефону. Бот вызывает его
// один раз — когда человек поделился контактом. Дальше вход в мини-приложение
// идёт по подписанному initData, телефон больше не нужен.
func (h *Handler) Bind(c *gin.Context) {
	var req bindRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "phone and max_user_id are required"})
		return
	}

	user, err := h.svc.BindMaxUser(req.Phone, req.MaxUserID.String())
	if err != nil {
		switch {
		case errors.Is(err, services.ErrInvalidBindInput):
			c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		case errors.Is(err, services.ErrPhoneNotRegistered):
			c.JSON(http.StatusNotFound, gin.H{"error": err.Error(), "code": "phone_not_registered"})
		case errors.Is(err, services.ErrUserInactive):
			c.JSON(http.StatusForbidden, gin.H{"error": err.Error(), "code": "inactive"})
		case errors.Is(err, services.ErrBindConflictPhone), errors.Is(err, services.ErrBindConflictMaxID):
			c.JSON(http.StatusConflict, gin.H{"error": err.Error(), "code": "conflict"})
		default:
			c.JSON(http.StatusInternalServerError, gin.H{"error": "internal error"})
		}
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"id":        user.ID,
		"full_name": user.FullName,
		"role":      user.Role,
	})
}
