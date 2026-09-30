package bot

import (
	"errors"
	"net/http"

	"maxito/internal/services"

	"github.com/gin-gonic/gin"
	"gorm.io/gorm"
)

type DemoHandler struct {
	svc *services.DemoService
}

func NewDemoHandler(svc *services.DemoService) *DemoHandler {
	return &DemoHandler{svc: svc}
}

func demoErrorStatus(err error) (int, string) {
	switch {
	case errors.Is(err, services.ErrDemoDisabled):
		return http.StatusServiceUnavailable, "demo_disabled"
	case errors.Is(err, services.ErrDemoWrongCodeWord):
		return http.StatusUnauthorized, "wrong_code_word"
	case errors.Is(err, services.ErrDemoInvalidRole):
		return http.StatusBadRequest, "invalid_role"
	case errors.Is(err, services.ErrDemoPhoneTaken):
		return http.StatusConflict, "phone_taken"
	case errors.Is(err, services.ErrDemoNotDemoAccount):
		return http.StatusForbidden, "not_demo_account"
	case errors.Is(err, gorm.ErrRecordNotFound):
		return http.StatusNotFound, "not_found"
	default:
		return http.StatusBadRequest, "bad_request"
	}
}

type demoVerifyRequest struct {
	CodeWord string `json:"code_word" binding:"required"`
}

// VerifyCode — быстрая проверка кодового слова до того, как бот попросит
// роль/ФИО/телефон (чтобы не заставлять зря вводить их при опечатке).
//
// @ID botDemoVerifyCode
// @Summary Проверить кодовое слово демо-входа
// @Description Только для сервера бота, требует X-Internal-Key. Ничего не создаёт — просто проверка.
// @Tags internal
// @Accept json
// @Produce json
// @Security InternalKey
// @Param body body demoVerifyRequest true "Кодовое слово"
// @Success 204 "слово верное"
// @Failure 400 {object} apidoc.ErrorResponse
// @Failure 401 {object} apidoc.ErrorResponse "code: wrong_code_word"
// @Failure 503 {object} apidoc.ErrorResponse "code: demo_disabled"
// @Router /internal/demo-verify-code [post]
func (h *DemoHandler) VerifyCode(c *gin.Context) {
	var req demoVerifyRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "code_word is required", "code": "bad_request"})
		return
	}
	if err := h.svc.VerifyCodeWord(req.CodeWord); err != nil {
		status, code := demoErrorStatus(err)
		c.JSON(status, gin.H{"error": err.Error(), "code": code})
		return
	}
	c.Status(http.StatusNoContent)
}

type demoRegisterRequest struct {
	CodeWord  string `json:"code_word" binding:"required"`
	Role      string `json:"role" binding:"required"`
	FullName  string `json:"full_name" binding:"required"`
	Phone     string `json:"phone" binding:"required"`
	MaxUserID string `json:"max_user_id" binding:"required"`
}

// demoUserResponse — успешный ответ demo-register/demo-switch-role.
type demoUserResponse struct {
	ID       uint   `json:"id"`
	FullName string `json:"full_name"`
	Role     string `json:"role" example:"resident"`
}

// Register — вход по кодовому слову в обход обычной регистрации через
// Представителя: создаёт (или переиспользует для этого же чата) демо-аккаунт
// с выбранной ролью, привязывает max_user_id и выдаёт фикстуры демо-дома.
//
// @ID botDemoRegister
// @Summary Регистрация демо-аккаунта по кодовому слову
// @Description Только для сервера бота, требует X-Internal-Key. Не для обычных пользователей — обход проверки телефона в БД.
// @Tags internal
// @Accept json
// @Produce json
// @Security InternalKey
// @Param body body demoRegisterRequest true "Кодовое слово, роль, ФИО, телефон, max_user_id"
// @Success 200 {object} demoUserResponse
// @Failure 400 {object} apidoc.ErrorResponse
// @Failure 401 {object} apidoc.ErrorResponse "code: wrong_code_word"
// @Failure 409 {object} apidoc.ErrorResponse "code: phone_taken"
// @Failure 503 {object} apidoc.ErrorResponse "code: demo_disabled"
// @Router /internal/demo-register [post]
func (h *DemoHandler) Register(c *gin.Context) {
	var req demoRegisterRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "code_word, role, full_name, phone and max_user_id are required", "code": "bad_request"})
		return
	}

	user, err := h.svc.RegisterDemoUser(req.CodeWord, req.Role, req.FullName, req.Phone, req.MaxUserID)
	if err != nil {
		status, code := demoErrorStatus(err)
		c.JSON(status, gin.H{"error": err.Error(), "code": code})
		return
	}

	c.JSON(http.StatusOK, demoUserResponse{ID: user.ID, FullName: user.FullName, Role: string(user.Role)})
}

type demoSwitchRoleRequest struct {
	MaxUserID string `json:"max_user_id" binding:"required"`
	Role      string `json:"role" binding:"required"`
}

// SwitchRole — сменить роль уже существующего демо-аккаунта (кнопка "Сменить
// роль" в меню бота). Для обычных (не демо) аккаунтов недоступна.
//
// @ID botDemoSwitchRole
// @Summary Сменить роль демо-аккаунта
// @Description Только для сервера бота, требует X-Internal-Key. Доступно только аккаунтам, созданным через кодовое слово.
// @Tags internal
// @Accept json
// @Produce json
// @Security InternalKey
// @Param body body demoSwitchRoleRequest true "max_user_id, новая роль"
// @Success 200 {object} demoUserResponse
// @Failure 400 {object} apidoc.ErrorResponse
// @Failure 403 {object} apidoc.ErrorResponse "code: not_demo_account"
// @Failure 404 {object} apidoc.ErrorResponse
// @Failure 503 {object} apidoc.ErrorResponse "code: demo_disabled"
// @Router /internal/demo-switch-role [post]
func (h *DemoHandler) SwitchRole(c *gin.Context) {
	var req demoSwitchRoleRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "max_user_id and role are required", "code": "bad_request"})
		return
	}

	user, err := h.svc.SwitchRole(req.MaxUserID, req.Role)
	if err != nil {
		status, code := demoErrorStatus(err)
		c.JSON(status, gin.H{"error": err.Error(), "code": code})
		return
	}

	c.JSON(http.StatusOK, demoUserResponse{ID: user.ID, FullName: user.FullName, Role: string(user.Role)})
}
