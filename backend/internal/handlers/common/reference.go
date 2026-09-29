package common

import (
	"errors"
	"net/http"

	"maxito/internal/models"
	"maxito/internal/repository"

	"github.com/gin-gonic/gin"
	"gorm.io/gorm"
)

// Company/EmergencyService в коде ниже приходят уже типизированными из
// репозитория (без литерального "models.…" в тексте) — этот импорт нужен
// исключительно затем, чтобы swag мог резолвить models.Company/
// models.EmergencyService в @Success-аннотациях.
var _ = models.Company{}

// ReferenceHandler — данные, не завязанные на роль: реквизиты УК и список
// аварийных служб. Монтируется в группы всех трёх ролей одним и тем же
// объектом (данные и так одни на всю систему).
type ReferenceHandler struct {
	companyRepo          *repository.CompanyRepository
	emergencyServiceRepo *repository.EmergencyServiceRepository
}

func NewReferenceHandler(companyRepo *repository.CompanyRepository, emergencyServiceRepo *repository.EmergencyServiceRepository) *ReferenceHandler {
	return &ReferenceHandler{companyRepo: companyRepo, emergencyServiceRepo: emergencyServiceRepo}
}

// GetCompany — реквизиты УК. Если ещё не заполнены Представителем —
// пустой объект, а не ошибка.
//
// @Summary Реквизиты управляющей компании
// @Description Одна запись на весь инстанс, не привязана к дому. Если Представитель ещё не заполнил — пустой объект "{}", не ошибка.
// @Tags company-emergency
// @Produce json
// @Security BearerAuth
// @Success 200 {object} models.Company
// @Failure 401 {object} apidoc.ErrorResponse
// @Failure 500 {object} apidoc.ErrorResponse
// @Router /representative/company [get]
// @Router /dispatcher/company [get]
// @Router /resident/company [get]
func (h *ReferenceHandler) GetCompany(c *gin.Context) {
	company, err := h.companyRepo.Get()
	if err != nil {
		if errors.Is(err, gorm.ErrRecordNotFound) {
			c.JSON(http.StatusOK, gin.H{})
			return
		}
		c.JSON(http.StatusInternalServerError, gin.H{"error": "failed to fetch company"})
		return
	}
	c.JSON(http.StatusOK, company)
}

// ListEmergencyServices — список аварийных служб (общий на всю систему).
// Показывается жителю при выборе критичной темы обращения.
//
// @Summary Список аварийных служб
// @Description Общий на всю систему список, не привязан к дому.
// @Tags company-emergency
// @Produce json
// @Security BearerAuth
// @Success 200 {array} models.EmergencyService
// @Failure 401 {object} apidoc.ErrorResponse
// @Failure 500 {object} apidoc.ErrorResponse
// @Router /representative/emergency-services [get]
// @Router /dispatcher/emergency-services [get]
// @Router /resident/emergency-services [get]
func (h *ReferenceHandler) ListEmergencyServices(c *gin.Context) {
	services, err := h.emergencyServiceRepo.List()
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "failed to fetch emergency services"})
		return
	}
	c.JSON(http.StatusOK, services)
}
