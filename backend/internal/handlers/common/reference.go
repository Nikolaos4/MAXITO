package common

import (
	"errors"
	"net/http"

	"maxito/internal/repository"

	"github.com/gin-gonic/gin"
	"gorm.io/gorm"
)

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
func (h *ReferenceHandler) ListEmergencyServices(c *gin.Context) {
	services, err := h.emergencyServiceRepo.List()
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "failed to fetch emergency services"})
		return
	}
	c.JSON(http.StatusOK, services)
}
