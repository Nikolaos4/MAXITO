package resident

import (
	"net/http"
	"time"

	"maxito/internal/middleware"
	"maxito/internal/services"

	"github.com/gin-gonic/gin"
)

type AppealHandler struct {
	svc *services.ResidentService
}

func NewAppealHandler(svc *services.ResidentService) *AppealHandler {
	return &AppealHandler{svc: svc}
}

type CreateAppealRequest struct {
	ProblemTypeID      uint   `json:"problem_type_id" binding:"required"`
	ReasonID           *uint  `json:"reason_id"` // не нужен, если тема — "Другое"
	EntranceNumber     *int   `json:"entrance_number"`
	Description        string `json:"description" binding:"required"`
	Importance         string `json:"importance"`
	WantsRecalculation bool   `json:"wants_recalculation"`
}

// CreateAppeal — минимальное создание обращения жителем (для проверки
// блокировки по активным уведомлениям).
func (h *AppealHandler) CreateAppeal(c *gin.Context) {
	currentUser := middleware.GetCurrentUser(c)
	if currentUser == nil {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "unauthorized"})
		return
	}

	var req CreateAppealRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	appeal, err := h.svc.CreateAppeal(currentUser.ID, services.CreateAppealInput{
		ProblemTypeID:      req.ProblemTypeID,
		ReasonID:           req.ReasonID,
		EntranceNumber:     req.EntranceNumber,
		Description:        req.Description,
		Importance:         req.Importance,
		WantsRecalculation: req.WantsRecalculation,
		CreatedAt:          time.Now(),
	})
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	c.JSON(http.StatusCreated, appeal)
}
