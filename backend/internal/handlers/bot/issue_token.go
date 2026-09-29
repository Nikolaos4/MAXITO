package bot

import (
	"errors"
	"net/http"
	"time"

	"maxito/internal/services"

	"github.com/gin-gonic/gin"
)

type issueTokenRequest struct {
	Phone string `json:"phone" binding:"required"`
}

// issueTokenResponse — успешный ответ POST /internal/issue-token.
type issueTokenResponse struct {
	AccessToken string    `json:"access_token"`
	ExpiresAt   time.Time `json:"expires_at"`
	Role        string    `json:"role" example:"resident"`
}

// IssueToken выпускает JWT напрямую по телефону, минуя вход через MAX.
// Только для служебной выдачи тестовых токенов (например, жюри для
// автоматизированной проверки DATA-API.yaml) — обычные пользователи всегда
// входят через POST /auth/max.
//
// @ID botIssueToken
// @Summary Выпустить JWT по телефону, минуя вход через MAX
// @Description Только для сервера бота/администратора, требует X-Internal-Key вместо обычного JWT. Не для обычных пользователей.
// @Tags internal
// @Accept json
// @Produce json
// @Security InternalKey
// @Param body body issueTokenRequest true "Телефон пользователя"
// @Success 200 {object} issueTokenResponse
// @Failure 400 {object} apidoc.ErrorResponse
// @Failure 401 {object} apidoc.ErrorResponse "неверный или отсутствующий X-Internal-Key"
// @Failure 403 {object} apidoc.ErrorResponse "code: inactive"
// @Failure 404 {object} apidoc.ErrorResponse "code: phone_not_registered"
// @Router /internal/issue-token [post]
func (h *Handler) IssueToken(c *gin.Context) {
	var req issueTokenRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "phone is required"})
		return
	}

	result, err := h.svc.IssueTokenForPhone(req.Phone)
	if err != nil {
		switch {
		case errors.Is(err, services.ErrInvalidBindInput):
			c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		case errors.Is(err, services.ErrPhoneNotRegistered):
			c.JSON(http.StatusNotFound, gin.H{"error": err.Error(), "code": "phone_not_registered"})
		case errors.Is(err, services.ErrUserInactive):
			c.JSON(http.StatusForbidden, gin.H{"error": err.Error(), "code": "inactive"})
		default:
			c.JSON(http.StatusInternalServerError, gin.H{"error": "internal error"})
		}
		return
	}

	c.JSON(http.StatusOK, issueTokenResponse{
		AccessToken: result.Token,
		ExpiresAt:   result.ExpiresAt,
		Role:        string(result.User.Role),
	})
}
