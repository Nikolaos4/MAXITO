package common

import (
	"net/http"

	"maxito/internal/middleware"
	"maxito/internal/models"
	"maxito/internal/repository"

	"github.com/gin-gonic/gin"
)

type MeHandler struct {
	residentRepo  *repository.ResidentRepository
	dispHouseRepo *repository.DispatcherHouseRepository
}

func NewMeHandler(residentRepo *repository.ResidentRepository, dispHouseRepo *repository.DispatcherHouseRepository) *MeHandler {
	return &MeHandler{residentRepo: residentRepo, dispHouseRepo: dispHouseRepo}
}

type ResidentInfo struct {
	HouseID        uint `json:"house_id"`
	Apartment      string `json:"apartment"`
	EntranceNumber *int `json:"entrance_number,omitempty"`
}

type DispatcherInfo struct {
	HousesCount int `json:"houses_count"`
}

type MeResponse struct {
	ID       uint        `json:"id"`
	Phone    string      `json:"phone"`
	FullName string      `json:"full_name"`
	Role     models.Role `json:"role"`
	IsActive bool        `json:"is_active"`

	// Заполняется только для соответствующей роли, у остальных отсутствует в JSON.
	Resident   *ResidentInfo   `json:"resident,omitempty"`
	Dispatcher *DispatcherInfo `json:"dispatcher,omitempty"`
}

// Me — информация о текущем пользователе и его роли. Единственный
// эндпоинт, доступный сразу после авторизации по X-Max-User-Id без
// привязки к конкретной роли — по нему клиент (бот) решает, какое меню
// показать: Представителя, Диспетчера или Жителя.
func (h *MeHandler) Me(c *gin.Context) {
	currentUser := middleware.GetCurrentUser(c)
	if currentUser == nil {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "unauthorized"})
		return
	}

	resp := MeResponse{
		ID:       currentUser.ID,
		Phone:    currentUser.Phone,
		FullName: currentUser.FullName,
		Role:     currentUser.Role,
		IsActive: currentUser.IsActive,
	}

	switch currentUser.Role {
	case models.RoleResident:
		resident, err := h.residentRepo.GetByUserID(currentUser.ID)
		if err == nil {
			resp.Resident = &ResidentInfo{
				HouseID:        resident.HouseID,
				Apartment:      resident.Apartment,
				EntranceNumber: resident.EntranceNumber,
			}
		}
		// Если профиля жителя почему-то нет (данные ещё не до конца
		// синхронизированы) — просто не заполняем блок, не роняем запрос.
	case models.RoleDispatcher:
		houses, err := h.dispHouseRepo.ListHousesByDispatcher(currentUser.ID)
		if err == nil {
			resp.Dispatcher = &DispatcherInfo{HousesCount: len(houses)}
		}
	}

	c.JSON(http.StatusOK, resp)
}
