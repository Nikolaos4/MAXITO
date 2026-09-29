package representative

import (
	"net/http"
	"strconv"

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
	Address          string `json:"address" binding:"required"`
	Number           string `json:"number"`
	EntrancesCount   int    `json:"entrances_count" binding:"required,min=1"`
	FloorsCount      *int   `json:"floors_count"`      // необязательно
	ConstructionYear *int   `json:"construction_year"` // необязательно
}

// CreateHouse — создать дом (единичное добавление).
func (h *HouseHandler) CreateHouse(c *gin.Context) {
	var req CreateHouseRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	exists, err := h.houseRepo.ExistsByAddressNumber(req.Address, req.Number)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "failed to check existing houses"})
		return
	}
	if exists {
		c.JSON(http.StatusConflict, gin.H{"error": "a house with this address and number already exists"})
		return
	}

	house := models.House{
		Address:          req.Address,
		Number:           req.Number,
		EntrancesCount:   req.EntrancesCount,
		FloorsCount:      req.FloorsCount,
		ConstructionYear: req.ConstructionYear,
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

type UpdateHouseRequest struct {
	Address          *string `json:"address"`
	Number           *string `json:"number"`
	FloorsCount      *int    `json:"floors_count"`
	ConstructionYear *int    `json:"construction_year"`
}

// UpdateHouse — частичное обновление дома. Любое поле можно не передавать —
// тогда оно останется как было. Для дозаполнения floors_count/construction_year
// после того, как дом уже создан (они необязательны при создании).
func (h *HouseHandler) UpdateHouse(c *gin.Context) {
	houseID, err := strconv.ParseUint(c.Param("house_id"), 10, 64)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "invalid house_id"})
		return
	}

	var req UpdateHouseRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	house, err := h.repSvc.UpdateHouseDetails(uint(houseID), services.UpdateHouseInput{
		Address:          req.Address,
		Number:           req.Number,
		FloorsCount:      req.FloorsCount,
		ConstructionYear: req.ConstructionYear,
	})
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}
	c.JSON(http.StatusOK, house)
}

type SetChatLinkRequest struct {
	ChatInviteLink string `json:"chat_invite_link" binding:"required"`
}

// SetChatLink — сохранить ссылку-приглашение в чат дома. Ссылку Представитель
// создаёт вручную на стороне MAX и один раз кладёт сюда — автоматическое
// создание группы ботом не делаем (см. исходное описание проекта).
func (h *HouseHandler) SetChatLink(c *gin.Context) {
	houseID, err := strconv.ParseUint(c.Param("house_id"), 10, 64)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "invalid house_id"})
		return
	}

	var req SetChatLinkRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	if err := h.houseRepo.UpdateChatInviteLink(uint(houseID), req.ChatInviteLink); err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "house not found"})
		return
	}
	c.Status(http.StatusNoContent)
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
