package dispatcher

import (
	"net/http"
	"strconv"

	"maxito/internal/middleware"
	"maxito/internal/services"

	"github.com/gin-gonic/gin"
)

type HouseHandler struct {
	svc *services.DispatcherService
}

func NewHouseHandler(svc *services.DispatcherService) *HouseHandler {
	return &HouseHandler{svc: svc}
}

// ListHouses — дома, закреплённые за диспетчером (простой список без статистики).
func (h *HouseHandler) ListHouses(c *gin.Context) {
	currentUser := middleware.GetCurrentUser(c)
	if currentUser == nil {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "unauthorized"})
		return
	}

	houses, err := h.svc.ListHouses(currentUser.ID)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "failed to fetch houses"})
		return
	}
	c.JSON(http.StatusOK, houses)
}

// GetHouse — карточка дома (только своего).
func (h *HouseHandler) GetHouse(c *gin.Context) {
	currentUser := middleware.GetCurrentUser(c)
	if currentUser == nil {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "unauthorized"})
		return
	}

	houseID, err := strconv.ParseUint(c.Param("house_id"), 10, 64)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "invalid house_id"})
		return
	}

	house, err := h.svc.GetHouse(currentUser.ID, uint(houseID))
	if err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "house not found"})
		return
	}
	c.JSON(http.StatusOK, house)
}

// ListEntrances — номера подъездов дома (1..entrances_count), для формы
// создания уведомления.
func (h *HouseHandler) ListEntrances(c *gin.Context) {
	currentUser := middleware.GetCurrentUser(c)
	if currentUser == nil {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "unauthorized"})
		return
	}

	houseID, err := strconv.ParseUint(c.Param("house_id"), 10, 64)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "invalid house_id"})
		return
	}

	entrances, err := h.svc.ListEntrances(currentUser.ID, uint(houseID))
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}
	c.JSON(http.StatusOK, entrances)
}
