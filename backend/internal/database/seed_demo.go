package database

import (
	"errors"
	"fmt"
	"time"

	"maxito/internal/models"

	"gorm.io/gorm"
)

// demoHouseAddress/demoHouseNumber — единственный на весь инстанс "демо-дом",
// который автоматически получают все, кто вошёл по кодовому слову
// (см. services.DemoService). Общий для всех — так жюри видит одну и ту же
// предсказуемую картину вне зависимости от того, кто из них заходил.
const (
	demoHouseAddress = "Демо-дом для проверки API"
	demoHouseNumber  = "DEMO"

	demoSeedResidentPhone   = "+70000000001"
	demoSeedDispatcherPhone = "+70000000002"
)

// SeedDemoFixtures создаёт демо-дом с парой обращений и плановым уведомлением,
// если их ещё нет — идемпотентно, безопасно вызывать при каждом старте.
// Вызывается только если задан DEMO_CODE_WORD (см. main.go) — без демо-режима
// эти данные никому не нужны и не создаются.
func SeedDemoFixtures(db *gorm.DB) (uint, error) {
	house, err := upsertDemoHouse(db)
	if err != nil {
		return 0, fmt.Errorf("demo house: %w", err)
	}

	seedResident, err := upsertDemoUser(db, demoSeedResidentPhone, "Демо-житель (авто)", models.RoleResident)
	if err != nil {
		return 0, fmt.Errorf("demo seed resident: %w", err)
	}
	if err := ensureResidentProfile(db, seedResident.ID, house.ID); err != nil {
		return 0, fmt.Errorf("demo resident profile: %w", err)
	}

	seedDispatcher, err := upsertDemoUser(db, demoSeedDispatcherPhone, "Демо-диспетчер (авто)", models.RoleDispatcher)
	if err != nil {
		return 0, fmt.Errorf("demo seed dispatcher: %w", err)
	}
	if err := ensureDispatcherAssignment(db, seedDispatcher.ID, house.ID); err != nil {
		return 0, fmt.Errorf("demo dispatcher assignment: %w", err)
	}

	if err := ensureDemoAppeals(db, house.ID, seedResident.ID); err != nil {
		return 0, fmt.Errorf("demo appeals: %w", err)
	}
	if err := ensureDemoNotification(db, house.ID, seedDispatcher.ID); err != nil {
		return 0, fmt.Errorf("demo notification: %w", err)
	}

	return house.ID, nil
}

func upsertDemoHouse(db *gorm.DB) (*models.House, error) {
	var house models.House
	err := db.Where("address = ? AND number = ?", demoHouseAddress, demoHouseNumber).First(&house).Error
	if err == nil {
		return &house, nil
	}
	if !errors.Is(err, gorm.ErrRecordNotFound) {
		return nil, err
	}
	house = models.House{Address: demoHouseAddress, Number: demoHouseNumber, EntrancesCount: 3}
	if err := db.Create(&house).Error; err != nil {
		return nil, err
	}
	return &house, nil
}

func upsertDemoUser(db *gorm.DB, phone, fullName string, role models.Role) (*models.User, error) {
	var user models.User
	err := db.Where("phone = ?", phone).First(&user).Error
	if err == nil {
		return &user, nil
	}
	if !errors.Is(err, gorm.ErrRecordNotFound) {
		return nil, err
	}
	user = models.User{Phone: phone, FullName: fullName, Role: role, IsActive: true, IsDemo: true}
	if err := db.Create(&user).Error; err != nil {
		return nil, err
	}
	return &user, nil
}

func ensureResidentProfile(db *gorm.DB, userID, houseID uint) error {
	var resident models.Resident
	err := db.Where("user_id = ?", userID).First(&resident).Error
	if err == nil {
		return nil
	}
	if !errors.Is(err, gorm.ErrRecordNotFound) {
		return err
	}
	entrance := 1
	resident = models.Resident{UserID: userID, HouseID: houseID, Apartment: "1", EntranceNumber: &entrance}
	return db.Create(&resident).Error
}

func ensureDispatcherAssignment(db *gorm.DB, dispatcherID, houseID uint) error {
	var link models.DispatcherHouse
	err := db.Where("dispatcher_id = ? AND house_id = ?", dispatcherID, houseID).First(&link).Error
	if err == nil {
		return nil
	}
	if !errors.Is(err, gorm.ErrRecordNotFound) {
		return err
	}
	link = models.DispatcherHouse{
		DispatcherID: dispatcherID, HouseID: houseID,
		AssignedBy: dispatcherID, AssignedAt: time.Now(),
	}
	return db.Create(&link).Error
}

func ensureDemoAppeals(db *gorm.DB, houseID, authorID uint) error {
	var count int64
	if err := db.Model(&models.Appeal{}).Where("house_id = ?", houseID).Count(&count).Error; err != nil {
		return err
	}
	if count > 0 {
		return nil
	}

	seeds := []struct {
		problemCode string
		reasonCode  string
		description string
		status      models.AppealStatus
	}{
		{"elevator", "elevator_not_working", "Лифт не работает второй день, застревает между этажами.", models.StatusAccepted},
		{"water", "water_no_hot", "Нет горячей воды в квартире с утра.", models.StatusInProgress},
	}

	for _, s := range seeds {
		var reason models.Reason
		if err := db.Joins("JOIN problem_types ON problem_types.id = reasons.problem_type_id").
			Where("problem_types.code = ? AND reasons.code = ?", s.problemCode, s.reasonCode).
			First(&reason).Error; err != nil {
			return fmt.Errorf("reason %s/%s not found (reference data not seeded yet?): %w", s.problemCode, s.reasonCode, err)
		}

		appeal := models.Appeal{
			HouseID:       houseID,
			AuthorID:      authorID,
			ProblemTypeID: reason.ProblemTypeID,
			ReasonID:      reason.ID,
			Description:   s.description,
			Importance:    models.ImportanceNormal,
			Status:        s.status,
		}
		if err := db.Create(&appeal).Error; err != nil {
			return err
		}
	}
	return nil
}

func ensureDemoNotification(db *gorm.DB, houseID, authorID uint) error {
	var count int64
	if err := db.Model(&models.Notification{}).Where("house_id = ?", houseID).Count(&count).Error; err != nil {
		return err
	}
	if count > 0 {
		return nil
	}

	var reason models.Reason
	if err := db.Joins("JOIN problem_types ON problem_types.id = reasons.problem_type_id").
		Where("problem_types.code = ? AND reasons.code = ? AND reasons.allows_notification = ?", "elevator", "elevator_not_working", true).
		First(&reason).Error; err != nil {
		return fmt.Errorf("notification reason not found (reference data not seeded yet?): %w", err)
	}

	now := time.Now()
	notification := models.Notification{
		HouseID:   houseID,
		AuthorID:  authorID,
		ReasonID:  reason.ID,
		ScopeType: models.ScopeHouse,
		Title:     "Плановые работы (демо)",
		Body:      "Тестовое плановое уведомление для проверки функционала.",
		StartsAt:  now,
		EndsAt:    now.Add(72 * time.Hour),
	}
	return db.Create(&notification).Error
}
