package representative

import (
	"net/http"
	"strconv"

	"maxito/internal/models"
	"maxito/internal/repository"
	"maxito/internal/services"

	"github.com/gin-gonic/gin"
)

// Нужен только затем, чтобы swag мог резолвить models.Resident в @Success.
var _ = models.Resident{}

type ResidentHandler struct {
	repSvc       *services.RepresentativeService
	residentRepo *repository.ResidentRepository
}

func NewResidentHandler(repSvc *services.RepresentativeService, residentRepo *repository.ResidentRepository) *ResidentHandler {
	return &ResidentHandler{repSvc: repSvc, residentRepo: residentRepo}
}

// ImportResidentsCSV — массовое добавление жителей конкретного дома через CSV.
// Обязательные колонки: full_name, phone, apartment. Необязательная: entrance_number.
//
// @ID representativeImportResidentsCSV
// @Summary Массово добавить жителей дома из CSV
// @Description Обязательные колонки: full_name, phone, apartment. Необязательная: entrance_number.
// @Tags representative-residents
// @Accept mpfd
// @Produce json
// @Security BearerAuth
// @Param house_id path int true "ID дома"
// @Param file formData file true "CSV-файл"
// @Success 200 {object} services.ImportReport
// @Failure 400 {object} apidoc.ErrorResponse
// @Failure 401 {object} apidoc.ErrorResponse
// @Router /representative/houses/{house_id}/residents/csv [post]
func (h *ResidentHandler) ImportResidentsCSV(c *gin.Context) {
	houseID, err := strconv.ParseUint(c.Param("house_id"), 10, 64)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "invalid house_id"})
		return
	}

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

	report, err := h.repSvc.ImportResidentsCSV(uint(houseID), file)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	c.JSON(http.StatusOK, report)
}

// ListResidents — список жителей конкретного дома (для проверки после загрузки).
//
// @ID representativeListResidents
// @Summary Список жителей дома
// @Tags representative-residents
// @Produce json
// @Security BearerAuth
// @Param house_id path int true "ID дома"
// @Success 200 {array} models.Resident
// @Failure 400 {object} apidoc.ErrorResponse
// @Failure 401 {object} apidoc.ErrorResponse
// @Failure 500 {object} apidoc.ErrorResponse
// @Router /representative/houses/{house_id}/residents [get]
func (h *ResidentHandler) ListResidents(c *gin.Context) {
	houseID, err := strconv.ParseUint(c.Param("house_id"), 10, 64)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "invalid house_id"})
		return
	}

	residents, err := h.residentRepo.ListByHouse(uint(houseID))
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "failed to fetch residents"})
		return
	}

	c.JSON(http.StatusOK, residents)
}
