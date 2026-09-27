package resident

import (
	"net/http"

	"maxito/internal/middleware"
	"maxito/internal/services"

	"github.com/gin-gonic/gin"
)

type HouseHandler struct {
	svc *services.ResidentService
}

func NewHouseHandler(svc *services.ResidentService) *HouseHandler {
	return &HouseHandler{svc: svc}
}

// ChatLink — ссылка-приглашение в общий чат дома.
// chat_invite_link будет null, если диспетчер её ещё не завёл.
func (h *HouseHandler) ChatLink(c *gin.Context) {
	currentUser := middleware.GetCurrentUser(c)
	if currentUser == nil {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "unauthorized"})
		return
	}

	link, err := h.svc.GetChatInviteLink(currentUser.ID)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}
	c.JSON(http.StatusOK, gin.H{"chat_invite_link": link})
}

// GetHouse — полная информация о доме жителя (адрес, номер, число подъездов, ссылка на чат).
func (h *HouseHandler) GetHouse(c *gin.Context) {
	currentUser := middleware.GetCurrentUser(c)
	if currentUser == nil {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "unauthorized"})
		return
	}

	house, err := h.svc.GetHouse(currentUser.ID)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}
	c.JSON(http.StatusOK, house)
}

// ListEntrances — номера подъездов дома жителя (1..entrances_count), для формы создания обращения.
func (h *HouseHandler) ListEntrances(c *gin.Context) {
	currentUser := middleware.GetCurrentUser(c)
	if currentUser == nil {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "unauthorized"})
		return
	}

	entrances, err := h.svc.ListEntrances(currentUser.ID)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}
	c.JSON(http.StatusOK, entrances)
}
