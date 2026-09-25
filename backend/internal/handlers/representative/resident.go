package representative

import (
	"net/http"
	"strconv"

	"maxito/internal/repository"
	"maxito/internal/services"

	"github.com/gin-gonic/gin"
)

type ResidentHandler struct {
	repSvc       *services.RepresentativeService
	residentRepo *repository.ResidentRepository
}

func NewResidentHandler(repSvc *services.RepresentativeService, residentRepo *repository.ResidentRepository) *ResidentHandler {
	return &ResidentHandler{repSvc: repSvc, residentRepo: residentRepo}
}

// ImportResidentsCSV — массовое добавление жителей конкретного дома через CSV.
// Обязательные колонки: full_name, phone, apartment. Необязательная: entrance_number.
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
