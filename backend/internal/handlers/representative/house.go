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
	Address          string  `json:"address" binding:"required"`
	Number           string  `json:"number"`
	EntrancesCount   int     `json:"entrances_count" binding:"required,min=1"`
	FloorsCount      *int    `json:"floors_count"`      // необязательно
	ConstructionYear *int    `json:"construction_year"` // необязательно
	ChatInviteLink   *string `json:"chat_invite_link"`  // необязательно
}

// CreateHouse — создать дом (единичное добавление).
//
// @ID representativeCreateHouse
// @Summary Добавить дом
// @Tags representative-houses
// @Accept json
// @Produce json
// @Security BearerAuth
// @Param body body CreateHouseRequest true "Адрес, число подъездов; этажность/год/ссылка на чат — необязательно"
// @Success 201 {object} models.House
// @Failure 400 {object} apidoc.ErrorResponse
// @Failure 401 {object} apidoc.ErrorResponse
// @Failure 409 {object} apidoc.ErrorResponse "дом с таким адресом и номером уже есть"
// @Router /representative/houses [post]
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
		ChatInviteLink:   req.ChatInviteLink,
	}

	if err := h.houseRepo.Create(&house); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "failed to create house"})
		return
	}

	c.JSON(http.StatusCreated, house)
}

// ListHouses — список всех домов.
//
// @ID representativeListHouses
// @Summary Список всех домов УК
// @Tags representative-houses
// @Produce json
// @Security BearerAuth
// @Success 200 {array} models.House
// @Failure 401 {object} apidoc.ErrorResponse
// @Failure 500 {object} apidoc.ErrorResponse
// @Router /representative/houses [get]
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
	EntrancesCount   *int    `json:"entrances_count"`
	FloorsCount      *int    `json:"floors_count"`
	ConstructionYear *int    `json:"construction_year"`
	ChatInviteLink   *string `json:"chat_invite_link"`
}

// UpdateHouse — единственный эндпоинт для редактирования дома. Любое поле
// можно не передавать — тогда оно останется как было. Покрывает и
// дозаполнение необязательных полей (floors_count/construction_year), и
// ссылку на чат, и адрес/число подъездов — отдельного эндпоинта под
// какое-то одно поле больше нет.
// @ID representativeUpdateHouse
// @Summary Редактировать дом
// @Description Любое поле можно не передавать — останется как было.
// @Tags representative-houses
// @Accept json
// @Produce json
// @Security BearerAuth
// @Param house_id path int true "ID дома"
// @Param body body UpdateHouseRequest true "Только те поля, что нужно поменять"
// @Success 200 {object} models.House
// @Failure 400 {object} apidoc.ErrorResponse
// @Failure 401 {object} apidoc.ErrorResponse
// @Router /representative/houses/{house_id} [put]
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
		EntrancesCount:   req.EntrancesCount,
		FloorsCount:      req.FloorsCount,
		ConstructionYear: req.ConstructionYear,
		ChatInviteLink:   req.ChatInviteLink,
	})
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}
	c.JSON(http.StatusOK, house)
}

// ImportHousesCSV — массовое добавление домов через CSV.
// Обязательные колонки: address, entrances_count.
// Необязательные: number, floors_count, construction_year, chat_invite_link.
//
// @ID representativeImportHousesCSV
// @Summary Массово добавить дома из CSV
// @Description Обязательные колонки: address, entrances_count. Необязательные: number, floors_count, construction_year, chat_invite_link.
// @Tags representative-houses
// @Accept mpfd
// @Produce json
// @Security BearerAuth
// @Param file formData file true "CSV-файл"
// @Success 200 {object} services.ImportReport
// @Failure 400 {object} apidoc.ErrorResponse
// @Failure 401 {object} apidoc.ErrorResponse
// @Router /representative/houses/csv [post]
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
