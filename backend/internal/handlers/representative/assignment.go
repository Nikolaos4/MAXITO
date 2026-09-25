package representative

import (
	"net/http"
	"strconv"

	"maxito/internal/middleware"
	"maxito/internal/services"

	"github.com/gin-gonic/gin"
)

type AssignmentHandler struct {
	repSvc *services.RepresentativeService
}

func NewAssignmentHandler(repSvc *services.RepresentativeService) *AssignmentHandler {
	return &AssignmentHandler{repSvc: repSvc}
}

type AssignHousesRequest struct {
	HouseIDs []uint `json:"house_ids" binding:"required,min=1"`
}

// AssignHouses — назначить диспетчеру один или несколько домов (массовое назначение).
func (h *AssignmentHandler) AssignHouses(c *gin.Context) {
	dispatcherID, err := strconv.ParseUint(c.Param("dispatcher_id"), 10, 64)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "invalid dispatcher_id"})
		return
	}

	var req AssignHousesRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	currentUser := middleware.GetCurrentUser(c)
	if currentUser == nil {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "unauthorized"})
		return
	}

	report, err := h.repSvc.AssignHouses(uint(dispatcherID), req.HouseIDs, currentUser.ID)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	c.JSON(http.StatusOK, report)
}

// UnassignHouse — снять с диспетчера ответственность за конкретный дом.
func (h *AssignmentHandler) UnassignHouse(c *gin.Context) {
	dispatcherID, err := strconv.ParseUint(c.Param("dispatcher_id"), 10, 64)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "invalid dispatcher_id"})
		return
	}
	houseID, err := strconv.ParseUint(c.Param("house_id"), 10, 64)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "invalid house_id"})
		return
	}

	if err := h.repSvc.UnassignHouse(uint(dispatcherID), uint(houseID)); err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "assignment not found"})
		return
	}

	c.Status(http.StatusNoContent)
}

// ListDispatcherHouses — список домов, закреплённых за диспетчером.
func (h *AssignmentHandler) ListDispatcherHouses(c *gin.Context) {
	dispatcherID, err := strconv.ParseUint(c.Param("dispatcher_id"), 10, 64)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "invalid dispatcher_id"})
		return
	}

	houses, err := h.repSvc.ListDispatcherHouses(uint(dispatcherID))
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "failed to fetch houses"})
		return
	}

	c.JSON(http.StatusOK, houses)
}

// ListUnassignedHouses — дома, за которые пока не отвечает ни один диспетчер.
func (h *AssignmentHandler) ListUnassignedHouses(c *gin.Context) {
	houses, err := h.repSvc.ListUnassignedHouses()
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "failed to fetch houses"})
		return
	}

	c.JSON(http.StatusOK, houses)
}

// ListAssignments — все текущие назначения диспетчер-дом.
func (h *AssignmentHandler) ListAssignments(c *gin.Context) {
	assignments, err := h.repSvc.ListAssignments()
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "failed to fetch assignments"})
		return
	}

	c.JSON(http.StatusOK, assignments)
}
