package representative

import (
	"net/http"

	"maxito/internal/models"
	"maxito/internal/repository"
	"maxito/internal/services"

	"github.com/gin-gonic/gin"
)

type HouseHandler struct {
	houseRepo *repository.HouseRepository
	repSvc    *services.RepresentativeService
}

func NewHouseHandler(houseRepo *repository.HouseRepository, repSvc *services.RepresentativeService) *HouseHandler {
	return &HouseHandler{houseRepo: houseRepo, repSvc: repSvc}
}

type CreateHouseRequest struct {
	Address string `json:"address" binding:"required"`
	Number  string `json:"number"`
}

// CreateHouse — создать дом (единичное добавление, оставлено без изменений).
func (h *HouseHandler) CreateHouse(c *gin.Context) {
	var req CreateHouseRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	house := models.House{
		Address: req.Address,
		Number:  req.Number,
	}

	if err := h.houseRepo.Create(&house); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "failed to create house"})
		return
	}

	c.JSON(http.StatusCreated, house)
}

// ListHouses — список всех домов.
func (h *HouseHandler) ListHouses(c *gin.Context) {
	houses, err := h.houseRepo.GetAll()
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "failed to fetch houses"})
		return
	}

	c.JSON(http.StatusOK, houses)
}

// ImportHousesCSV — массовое добавление домов через CSV.
// Обязательная колонка: address. Необязательная: number.
func (h *HouseHandler) ImportHousesCSV(c *gin.Context) {
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

	report, err := h.repSvc.ImportHousesCSV(file)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	c.JSON(http.StatusOK, report)
}
