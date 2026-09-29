package resident

import (
	"errors"
	"net/http"
	"strconv"
	"time"

	"maxito/internal/middleware"
	"maxito/internal/models"
	"maxito/internal/repository"
	"maxito/internal/services"
	"maxito/internal/util"

	"github.com/gin-gonic/gin"
)

// parseStatusList — та же логика, что в handlers/dispatcher/appeal.go;
// не выношу в util, чтобы не тащить туда models ради одной строчки.
func parseStatusList(raw []string) []models.AppealStatus {
	statuses := make([]models.AppealStatus, 0, len(raw))
	for _, v := range raw {
		statuses = append(statuses, models.AppealStatus(v))
	}
	return statuses
}

type AppealHandler struct {
	svc *services.ResidentService
}

func NewAppealHandler(svc *services.ResidentService) *AppealHandler {
	return &AppealHandler{svc: svc}
}

type CreateAppealRequest struct {
	ProblemTypeID      uint     `json:"problem_type_id" binding:"required"`
	ReasonID           *uint    `json:"reason_id"` // не нужен, если тема — "Другое"
	EntranceNumber     *int     `json:"entrance_number"`
	Description        string   `json:"description" binding:"required"`
	Importance         string   `json:"importance"`
	WantsRecalculation bool     `json:"wants_recalculation"`
	DiscoveredAt       string   `json:"discovered_at"` // необязательно, RFC3339
	PhotoURLs          []string `json:"photo_urls"`    // ссылки, полученные заранее через POST /upload
}

// CreateAppeal — создание обращения жителем.
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

	var discoveredAt *time.Time
	if req.DiscoveredAt != "" {
		t, err := time.Parse(time.RFC3339, req.DiscoveredAt)
		if err != nil {
			c.JSON(http.StatusBadRequest, gin.H{"error": "invalid discovered_at, expected RFC3339"})
			return
		}
		discoveredAt = &t
	}

	appeal, err := h.svc.CreateAppeal(currentUser.ID, services.CreateAppealInput{
		ProblemTypeID:      req.ProblemTypeID,
		ReasonID:           req.ReasonID,
		EntranceNumber:     req.EntranceNumber,
		Description:        req.Description,
		Importance:         req.Importance,
		WantsRecalculation: req.WantsRecalculation,
		DiscoveredAt:       discoveredAt,
		PhotoURLs:          req.PhotoURLs,
		CreatedAt:          time.Now(),
	})
	if err != nil {
		var dupErr *services.DuplicateAppealError
		if errors.As(err, &dupErr) {
			c.JSON(http.StatusConflict, gin.H{
				"error":              err.Error(),
				"existing_appeal_id": dupErr.ExistingAppealID,
			})
			return
		}
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	c.JSON(http.StatusCreated, appeal)
}

// ListAppeals — обращения по дому жителя. Query: mine=true (только свои),
// status/problem_type_id/entrance_number (повторяемы), page/page_size.
func (h *AppealHandler) ListAppeals(c *gin.Context) {
	currentUser := middleware.GetCurrentUser(c)
	if currentUser == nil {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "unauthorized"})
		return
	}

	mine := c.Query("mine") == "true"

	filter := repository.AppealFilter{
		Statuses:       parseStatusList(c.QueryArray("status")),
		EntranceNums:   util.ParseIntList(c.QueryArray("entrance_number")),
		ProblemTypeIDs: util.ParseUintList(c.QueryArray("problem_type_id")),
		Page:           util.ParseIntDefault(c.Query("page"), 1),
		PageSize:       util.ParseIntDefault(c.Query("page_size"), 20),
	}
	if filter.Page < 1 {
		filter.Page = 1
	}
	if filter.PageSize < 1 || filter.PageSize > 100 {
		filter.PageSize = 20
	}

	appeals, total, err := h.svc.ListAppeals(currentUser.ID, mine, filter)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"total":     total,
		"page":      filter.Page,
		"page_size": filter.PageSize,
		"items":     appeals,
	})
}

// GetAppeal — карточка обращения с числом лайков и полной историей статусов.
func (h *AppealHandler) GetAppeal(c *gin.Context) {
	currentUser := middleware.GetCurrentUser(c)
	if currentUser == nil {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "unauthorized"})
		return
	}

	appealID, err := strconv.ParseUint(c.Param("id"), 10, 64)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "invalid appeal id"})
		return
	}

	detail, err := h.svc.GetAppealDetail(currentUser.ID, uint(appealID))
	if err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "appeal not found"})
		return
	}
	c.JSON(http.StatusOK, detail)
}

// Like — поставить лайк чужому обращению.
func (h *AppealHandler) Like(c *gin.Context) {
	currentUser := middleware.GetCurrentUser(c)
	if currentUser == nil {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "unauthorized"})
		return
	}

	appealID, err := strconv.ParseUint(c.Param("id"), 10, 64)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "invalid appeal id"})
		return
	}

	if err := h.svc.LikeAppeal(currentUser.ID, uint(appealID)); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}
	c.Status(http.StatusNoContent)
}

// Unlike — снять лайк.
func (h *AppealHandler) Unlike(c *gin.Context) {
	currentUser := middleware.GetCurrentUser(c)
	if currentUser == nil {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "unauthorized"})
		return
	}

	appealID, err := strconv.ParseUint(c.Param("id"), 10, 64)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "invalid appeal id"})
		return
	}

	if err := h.svc.UnlikeAppeal(currentUser.ID, uint(appealID)); err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "like not found"})
		return
	}
	c.Status(http.StatusNoContent)
}
