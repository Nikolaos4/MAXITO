package representative

import (
	"net/http"

	"maxito/internal/repository"
	"maxito/internal/services"

	"github.com/gin-gonic/gin"
)

type DispatcherHandler struct {
	repSvc   *services.RepresentativeService
	userRepo *repository.UserRepository
}

func NewDispatcherHandler(repSvc *services.RepresentativeService, userRepo *repository.UserRepository) *DispatcherHandler {
	return &DispatcherHandler{repSvc: repSvc, userRepo: userRepo}
}

type CreateDispatcherRequest struct {
	FullName string `json:"full_name" binding:"required"`
	Phone    string `json:"phone" binding:"required"`
}

// CreateDispatcher — единичное добавление диспетчера (форма в мини-аппе).
func (h *DispatcherHandler) CreateDispatcher(c *gin.Context) {
	var req CreateDispatcherRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	user, err := h.repSvc.CreateDispatcher(req.FullName, req.Phone)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	c.JSON(http.StatusCreated, user)
}

// ImportDispatchersCSV — массовое добавление диспетчеров через CSV.
// Обязательные колонки: full_name, phone.
func (h *DispatcherHandler) ImportDispatchersCSV(c *gin.Context) {
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

	report, err := h.repSvc.ImportDispatchersCSV(file)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	c.JSON(http.StatusOK, report)
}

// ListDispatchers — список активных диспетчеров (нужен, чтобы Представитель
// выбирал, кому назначать дома).
func (h *DispatcherHandler) ListDispatchers(c *gin.Context) {
	dispatchers, err := h.userRepo.GetDispatchers()
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "failed to fetch dispatchers"})
		return
	}
	c.JSON(http.StatusOK, dispatchers)
}
