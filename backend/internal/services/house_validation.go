package services

import (
	"fmt"

	"maxito/internal/models"
)

// validateEntranceNumber проверяет, что номер подъезда (если он вообще
// указан — nil значит "весь дом" и всегда допустим) укладывается в
// диапазон 1..EntrancesCount конкретного дома. Общий хелпер для создания
// обращения жителем, уведомления диспетчером и загрузки жителей CSV —
// правило одно и то же везде.
func validateEntranceNumber(house *models.House, entranceNumber *int) error {
	if entranceNumber == nil {
		return nil
	}
	if *entranceNumber < 1 || *entranceNumber > house.EntrancesCount {
		return fmt.Errorf("entrance_number must be between 1 and %d for this house", house.EntrancesCount)
	}
	return nil
}
