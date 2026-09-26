package dispatcher

import (
	"net/http"
	"strconv"

	"maxito/internal/middleware"
	"maxito/internal/models"
	"maxito/internal/repository"
	"maxito/internal/services"
	"maxito/internal/util"

	"github.com/gin-gonic/gin"
)

type AppealHandler struct {
	svc *services.DispatcherService
}

func NewAppealHandler(svc *services.DispatcherService) *AppealHandler {
	return &AppealHandler{svc: svc}
}

func parseStatusList(raw []string) []models.AppealStatus {
	statuses := make([]models.AppealStatus, 0, len(raw))
	for _, v := range raw {
		statuses = append(statuses, models.AppealStatus(v))
	}
	return statuses
}

// ListAppeals — список обращений по своим домам с фильтрами и пагинацией.
// Query-параметры: house_id, status, entrance_number, problem_type_id
// (каждый можно повторять — ?status=in_progress&status=need_info),
// page, page_size. Сортировка — по числу лайков, затем по дате создания.
func (h *AppealHandler) ListAppeals(c *gin.Context) {
	currentUser := middleware.GetCurrentUser(c)
	if currentUser == nil {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "unauthorized"})
		return
	}

	filter := repository.AppealFilter{
		HouseIDs:       util.ParseUintList(c.QueryArray("house_id")),
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

	appeals, total, err := h.svc.ListAppeals(currentUser.ID, filter)
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

// TopAppeals — N обращений с наибольшим числом лайков по своим домам.
func (h *AppealHandler) TopAppeals(c *gin.Context) {
	currentUser := middleware.GetCurrentUser(c)
	if currentUser == nil {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "unauthorized"})
		return
	}

	limit := util.ParseIntDefault(c.Query("limit"), 5)
	if limit < 1 || limit > 100 {
		limit = 5
	}

	appeals, err := h.svc.TopAppeals(currentUser.ID, limit)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}
	c.JSON(http.StatusOK, appeals)
}

// GetAppeal — карточка обращения с числом лайков и историей смены статусов.
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
		c.JSON(http.StatusNotFound, gin.H{"error": err.Error()})
		return
	}
	c.JSON(http.StatusOK, detail)
}

type ChangeStatusRequest struct {
	Status   models.AppealStatus `json:"status" binding:"required"`
	Comment  string               `json:"comment" binding:"required"`
	PhotoURL string               `json:"photo_url"`
}

// ChangeStatus — сменить статус обращения. Комментарий обязателен всегда;
// photo_url принимается только при переходе в статус "completed".
func (h *AppealHandler) ChangeStatus(c *gin.Context) {
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

	var req ChangeStatusRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	change, err := h.svc.ChangeStatus(currentUser.ID, uint(appealID), services.ChangeStatusInput{
		NewStatus: req.Status,
		Comment:   req.Comment,
		PhotoURL:  req.PhotoURL,
	})
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	c.JSON(http.StatusOK, change)
}
