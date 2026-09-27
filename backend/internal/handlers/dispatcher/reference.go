package dispatcher

import (
	"net/http"
	"strconv"

	"maxito/internal/repository"

	"github.com/gin-gonic/gin"
)

type ReferenceHandler struct {
	problemTypeRepo *repository.ProblemTypeRepository
	reasonRepo      *repository.ReasonRepository
}

func NewReferenceHandler(problemTypeRepo *repository.ProblemTypeRepository, reasonRepo *repository.ReasonRepository) *ReferenceHandler {
	return &ReferenceHandler{problemTypeRepo: problemTypeRepo, reasonRepo: reasonRepo}
}

// ListProblemTypes — список тем (Лифт, Вода, ..., Другое).
func (h *ReferenceHandler) ListProblemTypes(c *gin.Context) {
	types, err := h.problemTypeRepo.List()
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "failed to fetch problem types"})
		return
	}
	c.JSON(http.StatusOK, types)
}

// ListReasons — список причин для конкретной темы.
func (h *ReferenceHandler) ListReasons(c *gin.Context) {
	problemTypeID, err := strconv.ParseUint(c.Param("id"), 10, 64)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "invalid problem type id"})
		return
	}

	reasons, err := h.reasonRepo.ListByProblemType(uint(problemTypeID))
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "failed to fetch reasons"})
		return
	}
	c.JSON(http.StatusOK, reasons)
}
