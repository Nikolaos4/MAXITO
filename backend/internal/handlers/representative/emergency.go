package representative

import (
	"net/http"

	"maxito/internal/services"

	"github.com/gin-gonic/gin"
)

type EmergencyHandler struct {
	repSvc *services.RepresentativeService
}

func NewEmergencyHandler(repSvc *services.RepresentativeService) *EmergencyHandler {
	return &EmergencyHandler{repSvc: repSvc}
}

// ImportEmergencyServicesCSV — массовая загрузка аварийных служб.
// Обязательные колонки: name, phone. Общий список на всю систему, не по домам.
//
// @ID representativeImportEmergencyServicesCSV
// @Summary Массово загрузить аварийные службы из CSV
// @Description Обязательные колонки: name, phone. Общий список на всю систему, не по домам. Строки с уже существующим телефоном пропускаются (skipped), не дублируются.
// @Tags representative-emergency
// @Accept mpfd
// @Produce json
// @Security BearerAuth
// @Param file formData file true "CSV-файл"
// @Success 200 {object} services.ImportReport
// @Failure 400 {object} apidoc.ErrorResponse
// @Failure 401 {object} apidoc.ErrorResponse
// @Router /representative/emergency-services/csv [post]
func (h *EmergencyHandler) ImportEmergencyServicesCSV(c *gin.Context) {
	fileHeader, err := c.FormFile("file")
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "file is required (multipart field 'file')"})
		return
	}
	file, err := fileHeader.Open()
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "failed to open uploaded file"})
		return
	}
	defer file.Close()

	report, err := h.repSvc.ImportEmergencyServicesCSV(file)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}
	c.JSON(http.StatusOK, report)
}
