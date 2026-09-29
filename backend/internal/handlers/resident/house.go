package resident

import (
	"net/http"

	"maxito/internal/middleware"
	"maxito/internal/models"
	"maxito/internal/services"

	"github.com/gin-gonic/gin"
)

// Нужен только затем, чтобы swag мог резолвить models.House в @Success.
var _ = models.House{}

type HouseHandler struct {
	svc *services.ResidentService
}

func NewHouseHandler(svc *services.ResidentService) *HouseHandler {
	return &HouseHandler{svc: svc}
}

// chatLinkResponse — ответ GET /resident/house/chat-link.
type chatLinkResponse struct {
	ChatInviteLink *string `json:"chat_invite_link"`
}

// ChatLink — ссылка-приглашение в общий чат дома.
// chat_invite_link будет null, если диспетчер её ещё не завёл.
//
// @ID residentChatLink
// @Summary Ссылка на общий чат дома
// @Tags resident-house
// @Produce json
// @Security BearerAuth
// @Success 200 {object} chatLinkResponse
// @Failure 400 {object} apidoc.ErrorResponse
// @Failure 401 {object} apidoc.ErrorResponse
// @Router /resident/house/chat-link [get]
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
//
// @ID residentGetHouse
// @Summary Информация о своём доме
// @Tags resident-house
// @Produce json
// @Security BearerAuth
// @Success 200 {object} models.House
// @Failure 400 {object} apidoc.ErrorResponse
// @Failure 401 {object} apidoc.ErrorResponse
// @Router /resident/house [get]
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
//
// @ID residentListEntrances
// @Summary Номера подъездов своего дома
// @Tags resident-house
// @Produce json
// @Security BearerAuth
// @Success 200 {array} int
// @Failure 400 {object} apidoc.ErrorResponse
// @Failure 401 {object} apidoc.ErrorResponse
// @Router /resident/house/entrances [get]
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
