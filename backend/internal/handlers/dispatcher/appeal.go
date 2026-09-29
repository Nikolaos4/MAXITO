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

// appealListResponse — страница списка обращений.
type appealListResponse struct {
	Total    int64                     `json:"total"`
	Page     int                       `json:"page"`
	PageSize int                       `json:"page_size"`
	Items    []services.AppealListItem `json:"items"`
}

// ListAppeals — список обращений по своим домам с фильтрами и пагинацией.
// Query-параметры: house_id, status, entrance_number, problem_type_id
// (каждый можно повторять — ?status=accepted&status=in_progress),
// page, page_size. Сортировка — по числу лайков, затем по дате создания.
//
// @ID dispatcherListAppeals
// @Summary Список обращений по своим домам
// @Tags dispatcher-appeals
// @Produce json
// @Security BearerAuth
// @Param house_id query []int false "ID домов, можно повторять" collectionFormat(multi)
// @Param status query []string false "accepted|in_progress|completed|rejected, можно повторять" collectionFormat(multi)
// @Param entrance_number query []int false "можно повторять"
// @Param problem_type_id query []int false "можно повторять"
// @Param page query int false "по умолчанию 1"
// @Param page_size query int false "по умолчанию 20, максимум 100"
// @Success 200 {object} appealListResponse
// @Failure 400 {object} apidoc.ErrorResponse
// @Failure 401 {object} apidoc.ErrorResponse
// @Router /dispatcher/appeals [get]
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
//
// @ID dispatcherTopAppeals
// @Summary Топ обращений по лайкам
// @Tags dispatcher-appeals
// @Produce json
// @Security BearerAuth
// @Param limit query int false "по умолчанию 5, максимум 100"
// @Success 200 {array} services.AppealListItem
// @Failure 400 {object} apidoc.ErrorResponse
// @Failure 401 {object} apidoc.ErrorResponse
// @Router /dispatcher/appeals/top [get]
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

// UnprocessedStats — статистика по необработанным обращениям (accepted,
// in_progress) по каждому дому диспетчера, отсортировано по
// убыванию общего числа.
//
// @ID dispatcherUnprocessedStats
// @Summary Статистика необработанных обращений по домам
// @Tags dispatcher-appeals
// @Produce json
// @Security BearerAuth
// @Success 200 {array} services.HouseAppealStats
// @Failure 400 {object} apidoc.ErrorResponse
// @Failure 401 {object} apidoc.ErrorResponse
// @Router /dispatcher/appeals/stats [get]
func (h *AppealHandler) UnprocessedStats(c *gin.Context) {
	currentUser := middleware.GetCurrentUser(c)
	if currentUser == nil {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "unauthorized"})
		return
	}

	stats, err := h.svc.UnprocessedStats(currentUser.ID)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	c.JSON(http.StatusOK, stats)
}

// GetAppeal — карточка обращения с числом лайков и историей смены статусов.
//
// @ID dispatcherGetAppeal
// @Summary Карточка обращения
// @Tags dispatcher-appeals
// @Produce json
// @Security BearerAuth
// @Param id path int true "ID обращения"
// @Success 200 {object} services.AppealDetail
// @Failure 400 {object} apidoc.ErrorResponse
// @Failure 401 {object} apidoc.ErrorResponse
// @Failure 404 {object} apidoc.ErrorResponse "чужой дом или обращение не найдено"
// @Router /dispatcher/appeals/{id} [get]
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
	Comment  string              `json:"comment" binding:"required"`
	PhotoURL string              `json:"photo_url"`
}

// ChangeStatus — сменить статус обращения. Комментарий обязателен всегда;
// photo_url принимается только при переходе в статус "completed".
//
// @ID dispatcherChangeStatus
// @Summary Сменить статус обращения
// @Description Разрешённые переходы: accepted->in_progress|rejected, in_progress->completed|rejected. completed/rejected — конечные. photo_url принимается только при переходе в completed, иначе 400.
// @Tags dispatcher-appeals
// @Accept json
// @Produce json
// @Security BearerAuth
// @Param id path int true "ID обращения"
// @Param body body ChangeStatusRequest true "Новый статус, комментарий (обязателен), фото — только для completed"
// @Success 200 {object} models.AppealStatusChange
// @Failure 400 {object} apidoc.ErrorResponse "недопустимый переход | нет комментария | photo_url не при completed"
// @Failure 401 {object} apidoc.ErrorResponse
// @Router /dispatcher/appeals/{id}/status [post]
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
