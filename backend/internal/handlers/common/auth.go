package common

import (
	"errors"
	"net/http"

	"maxito/internal/auth"
	"maxito/internal/services"

	"github.com/gin-gonic/gin"
)

type AuthHandler struct {
	svc *services.AuthService
}

func NewAuthHandler(svc *services.AuthService) *AuthHandler {
	return &AuthHandler{svc: svc}
}

type loginRequest struct {
	// InitData — значение window.WebApp.initData, строка целиком, без изменений.
	InitData string `json:"init_data" binding:"required"`
}

// loginResponse — успешный ответ POST /auth/max.
type loginResponse struct {
	Token     string    `json:"token"`
	ExpiresAt string    `json:"expires_at"`
	User      loginUser `json:"user"`
}

type loginUser struct {
	ID       uint   `json:"id"`
	FullName string `json:"full_name"`
	Role     string `json:"role" example:"resident"`
}

// LoginByMax — вход из мини-приложения: меняет подписанный MAX'ом initData на наш JWT.
// Поле "code" в ошибке нужно фронту, чтобы показать правильное сообщение:
//
//	invalid_init_data — подпись не сошлась / данные повреждены (401)
//	init_data_expired — приложение открыто слишком давно, откройте заново (401)
//	not_bound         — человек не делился контактом в боте (403)
//	inactive          — пользователь отключён Представителем (403)
//	auth_not_configured — на сервере не задан ключ проверки подписи (503)
//
// @ID authLoginByMax
// @Summary Вход из мини-приложения (initData -> JWT)
// @Tags auth
// @Accept json
// @Produce json
// @Param body body loginRequest true "initData из window.WebApp.initData, как есть"
// @Success 200 {object} loginResponse
// @Failure 400 {object} apidoc.ErrorResponse
// @Failure 401 {object} apidoc.ErrorResponse "invalid_init_data | init_data_expired"
// @Failure 403 {object} apidoc.ErrorResponse "not_bound | inactive"
// @Failure 503 {object} apidoc.ErrorResponse "auth_not_configured"
// @Router /auth/max [post]
func (h *AuthHandler) LoginByMax(c *gin.Context) {
	var req loginRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "init_data is required", "code": "bad_request"})
		return
	}

	result, err := h.svc.LoginByInitData(req.InitData)
	if err != nil {
		switch {
		case errors.Is(err, auth.ErrInitDataExpired):
			c.JSON(http.StatusUnauthorized, gin.H{"error": err.Error(), "code": "init_data_expired"})
		case errors.Is(err, auth.ErrInitDataSignature), errors.Is(err, auth.ErrInitDataMalformed):
			c.JSON(http.StatusUnauthorized, gin.H{"error": "invalid init data", "code": "invalid_init_data"})
		case errors.Is(err, services.ErrNotBound):
			c.JSON(http.StatusForbidden, gin.H{"error": err.Error(), "code": "not_bound"})
		case errors.Is(err, services.ErrUserInactive):
			c.JSON(http.StatusForbidden, gin.H{"error": err.Error(), "code": "inactive"})
		case errors.Is(err, services.ErrAuthNotConfigured):
			c.JSON(http.StatusServiceUnavailable, gin.H{"error": err.Error(), "code": "auth_not_configured"})
		default:
			c.JSON(http.StatusInternalServerError, gin.H{"error": "internal error", "code": "internal"})
		}
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"token":      result.Token,
		"expires_at": result.ExpiresAt,
		"user": gin.H{
			"id":        result.User.ID,
			"full_name": result.User.FullName,
			"role":      result.User.Role,
		},
	})
}
