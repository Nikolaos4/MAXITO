package representative

import (
	"net/http"

	"maxito/internal/services"

	"github.com/gin-gonic/gin"
)

type CompanyHandler struct {
	repSvc *services.RepresentativeService
}

func NewCompanyHandler(repSvc *services.RepresentativeService) *CompanyHandler {
	return &CompanyHandler{repSvc: repSvc}
}

type UpdateCompanyRequest struct {
	FullName        string `json:"full_name" binding:"required"`
	ShortName       string `json:"short_name"`
	DispatcherPhone string `json:"dispatcher_phone"`
	ContactPhone    string `json:"contact_phone"`
	Email           string `json:"email"`
	Website         string `json:"website"`
}

// UpdateCompany — задать/поправить реквизиты УК. Запись всегда одна на весь
// инстанс, отдельного house_id нет.
func (h *CompanyHandler) UpdateCompany(c *gin.Context) {
	var req UpdateCompanyRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	company, err := h.repSvc.UpdateCompany(services.CompanyInput{
		FullName:        req.FullName,
		ShortName:       req.ShortName,
		DispatcherPhone: req.DispatcherPhone,
		ContactPhone:    req.ContactPhone,
		Email:           req.Email,
		Website:         req.Website,
	})
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}
	c.JSON(http.StatusOK, company)
}
