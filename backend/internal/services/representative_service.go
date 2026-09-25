package services

import (
	"errors"
	"fmt"
	"mime/multipart"
	"strconv"
	"time"

	"maxito/internal/models"
	"maxito/internal/repository"
	"maxito/internal/util"

	"gorm.io/gorm"
)

// RowResult — результат обработки одной строки CSV-импорта (или одного
// элемента массового назначения — используем ту же структуру отчёта).
type RowResult struct {
	Row     int    `json:"row"`
	Status  string `json:"status"` // created | skipped | error
	Message string `json:"message,omitempty"`
	ID      *uint  `json:"id,omitempty"`
}

// ImportReport — сводный отчёт по массовой операции.
type ImportReport struct {
	TotalRows int         `json:"total_rows"`
	Created   int         `json:"created"`
	Skipped   int         `json:"skipped"`
	Failed    int         `json:"failed"`
	Rows      []RowResult `json:"rows"`
}

func (rep *ImportReport) add(row int, status, message string, id *uint) {
	rep.Rows = append(rep.Rows, RowResult{Row: row, Status: status, Message: message, ID: id})
	switch status {
	case "created":
		rep.Created++
	case "skipped":
		rep.Skipped++
	case "error":
		rep.Failed++
	}
}

type RepresentativeService struct {
	db            *gorm.DB
	userRepo      *repository.UserRepository
	houseRepo     *repository.HouseRepository
	residentRepo  *repository.ResidentRepository
	dispHouseRepo *repository.DispatcherHouseRepository
}

func NewRepresentativeService(
	db *gorm.DB,
	userRepo *repository.UserRepository,
	houseRepo *repository.HouseRepository,
	residentRepo *repository.ResidentRepository,
	dispHouseRepo *repository.DispatcherHouseRepository,
) *RepresentativeService {
	return &RepresentativeService{
		db:            db,
		userRepo:      userRepo,
		houseRepo:     houseRepo,
		residentRepo:  residentRepo,
		dispHouseRepo: dispHouseRepo,
	}
}

// ==================== Диспетчеры ====================

// CreateDispatcher создаёт одного диспетчера. Используется и единичным
// хендлером, и построчно при CSV-импорте — чтобы правила валидации не
// разъезжались между двумя путями создания.
func (s *RepresentativeService) CreateDispatcher(fullName, rawPhone string) (*models.User, error) {
	if fullName == "" {
		return nil, errors.New("full_name is required")
	}

	phone, err := util.NormalizePhone(rawPhone)
	if err != nil {
		return nil, err
	}

	if _, err := s.userRepo.GetByPhone(phone); err == nil {
		return nil, fmt.Errorf("phone %s is already registered", phone)
	} else if !errors.Is(err, gorm.ErrRecordNotFound) {
		return nil, err
	}

	user := &models.User{
		Phone:    phone,
		FullName: fullName,
		Role:     models.RoleDispatcher,
		IsActive: true,
	}
	if err := s.userRepo.Create(user); err != nil {
		return nil, err
	}
	return user, nil
}

// ImportDispatchersCSV построчно создаёт диспетчеров из CSV.
// Обязательные колонки: full_name, phone.
func (s *RepresentativeService) ImportDispatchersCSV(file multipart.File) (*ImportReport, error) {
	parsed, err := util.ParseCSV(file, []string{"full_name", "phone"})
	if err != nil {
		return nil, err
	}

	report := &ImportReport{TotalRows: len(parsed.Records)}
	for i, record := range parsed.Records {
		rowNum := i + 2 // +1 за заголовок, +1 т.к. нумерация строк с 1
		fullName := parsed.Get(record, "full_name")
		phone := parsed.Get(record, "phone")

		user, err := s.CreateDispatcher(fullName, phone)
		if err != nil {
			report.add(rowNum, "error", err.Error(), nil)
			continue
		}
		report.add(rowNum, "created", "", &user.ID)
	}
	return report, nil
}

// ==================== Дома ====================

// ImportHousesCSV построчно создаёт дома из CSV. Обязательная колонка: address,
// необязательная: number. Повторяющаяся пара address+number пропускается —
// это делает повторную загрузку того же файла безопасной (догрузка новых строк).
func (s *RepresentativeService) ImportHousesCSV(file multipart.File) (*ImportReport, error) {
	parsed, err := util.ParseCSV(file, []string{"address"})
	if err != nil {
		return nil, err
	}

	report := &ImportReport{TotalRows: len(parsed.Records)}
	for i, record := range parsed.Records {
		rowNum := i + 2
		address := parsed.Get(record, "address")
		number := parsed.Get(record, "number")

		if address == "" {
			report.add(rowNum, "error", "address is required", nil)
			continue
		}

		var existing models.House
		err := s.db.Where("address = ? AND number = ?", address, number).First(&existing).Error
		if err == nil {
			report.add(rowNum, "skipped", "house already exists", &existing.ID)
			continue
		}
		if !errors.Is(err, gorm.ErrRecordNotFound) {
			report.add(rowNum, "error", err.Error(), nil)
			continue
		}

		house := &models.House{Address: address, Number: number}
		if err := s.houseRepo.Create(house); err != nil {
			report.add(rowNum, "error", err.Error(), nil)
			continue
		}
		report.add(rowNum, "created", "", &house.ID)
	}
	return report, nil
}

// ==================== Жители ====================

// ImportResidentsCSV построчно добавляет жителей конкретного дома (house_id
// передаётся отдельно, а не колонкой в CSV — один файл всегда про один дом).
// Обязательные колонки: full_name, phone, apartment; необязательная: entrance_number.
//
// Если телефон уже зарегистрирован как житель ЭТОГО ЖЕ дома — строка
// пропускается (это и есть повторная догрузка списка новыми жителями).
// Если телефон занят под другой ролью или уже является жителем другого
// дома — строка считается ошибкой.
func (s *RepresentativeService) ImportResidentsCSV(houseID uint, file multipart.File) (*ImportReport, error) {
	if _, err := s.houseRepo.GetByID(houseID); err != nil {
		return nil, fmt.Errorf("house %d not found", houseID)
	}

	parsed, err := util.ParseCSV(file, []string{"full_name", "phone", "apartment"})
	if err != nil {
		return nil, err
	}

	report := &ImportReport{TotalRows: len(parsed.Records)}
	for i, record := range parsed.Records {
		rowNum := i + 2
		fullName := parsed.Get(record, "full_name")
		apartment := parsed.Get(record, "apartment")
		entranceRaw := parsed.Get(record, "entrance_number")

		phone, err := util.NormalizePhone(parsed.Get(record, "phone"))
		if err != nil {
			report.add(rowNum, "error", err.Error(), nil)
			continue
		}
		if fullName == "" {
			report.add(rowNum, "error", "full_name is required", nil)
			continue
		}
		if apartment == "" {
			report.add(rowNum, "error", "apartment is required", nil)
			continue
		}

		var entranceNumber *int
		if entranceRaw != "" {
			n, err := strconv.Atoi(entranceRaw)
			if err != nil {
				report.add(rowNum, "error", fmt.Sprintf("invalid entrance_number %q", entranceRaw), nil)
				continue
			}
			entranceNumber = &n
		}

		id, status, message, err := s.upsertResident(houseID, fullName, phone, apartment, entranceNumber)
		if err != nil {
			report.add(rowNum, "error", err.Error(), nil)
			continue
		}
		report.add(rowNum, status, message, id)
	}
	return report, nil
}

// upsertResident инкапсулирует всю логику "новый пользователь / уже есть,
// но не в этом доме / уже житель этого дома" для одной строки импорта.
func (s *RepresentativeService) upsertResident(
	houseID uint, fullName, phone, apartment string, entranceNumber *int,
) (*uint, string, string, error) {
	existingUser, err := s.userRepo.GetByPhone(phone)
	if err == nil {
		if existingUser.Role != models.RoleResident {
			return nil, "", "", fmt.Errorf("phone %s is already registered with role %s", phone, existingUser.Role)
		}

		resident, rErr := s.residentRepo.GetByUserID(existingUser.ID)
		switch {
		case rErr == nil:
			if resident.HouseID == houseID {
				return &resident.ID, "skipped", "resident already registered for this house", nil
			}
			return nil, "", "", fmt.Errorf("phone %s is already a resident of another house", phone)
		case errors.Is(rErr, gorm.ErrRecordNotFound):
			// Пользователь-житель есть, а профиля жителя почему-то нет — чиним, создавая его.
			newResident := &models.Resident{
				UserID:         existingUser.ID,
				HouseID:        houseID,
				Apartment:      apartment,
				EntranceNumber: entranceNumber,
			}
			if err := s.residentRepo.Create(newResident); err != nil {
				return nil, "", "", err
			}
			return &newResident.ID, "created", "", nil
		default:
			return nil, "", "", rErr
		}
	}
	if !errors.Is(err, gorm.ErrRecordNotFound) {
		return nil, "", "", err
	}

	// Совсем новый пользователь: создаём User и Resident атомарно в одной транзакции.
	var residentID uint
	txErr := s.db.Transaction(func(tx *gorm.DB) error {
		user := models.User{
			Phone:    phone,
			FullName: fullName,
			Role:     models.RoleResident,
			IsActive: true,
		}
		if err := tx.Create(&user).Error; err != nil {
			return err
		}

		resident := models.Resident{
			UserID:         user.ID,
			HouseID:        houseID,
			Apartment:      apartment,
			EntranceNumber: entranceNumber,
		}
		if err := tx.Create(&resident).Error; err != nil {
			return err
		}

		residentID = resident.ID
		return nil
	})
	if txErr != nil {
		return nil, "", "", txErr
	}
	return &residentID, "created", "", nil
}

// ==================== Распределение домов ====================

// AssignHouses назначает диспетчеру список домов. Уже назначенные дома
// пропускаются (идемпотентно), несуществующие — ошибка по конкретному элементу.
func (s *RepresentativeService) AssignHouses(dispatcherID uint, houseIDs []uint, assignedBy uint) (*ImportReport, error) {
	dispatcher, err := s.userRepo.GetByID(dispatcherID)
	if err != nil || dispatcher.Role != models.RoleDispatcher {
		return nil, fmt.Errorf("dispatcher %d not found", dispatcherID)
	}

	report := &ImportReport{TotalRows: len(houseIDs)}
	for i, houseID := range houseIDs {
		rowNum := i + 1

		if _, err := s.houseRepo.GetByID(houseID); err != nil {
			report.add(rowNum, "error", fmt.Sprintf("house %d not found", houseID), nil)
			continue
		}

		existing, err := s.dispHouseRepo.GetByDispatcherAndHouse(dispatcherID, houseID)
		if err == nil {
			report.add(rowNum, "skipped", "already assigned", &existing.ID)
			continue
		}
		if !errors.Is(err, gorm.ErrRecordNotFound) {
			report.add(rowNum, "error", err.Error(), nil)
			continue
		}

		link := &models.DispatcherHouse{
			DispatcherID: dispatcherID,
			HouseID:      houseID,
			AssignedBy:   assignedBy,
			AssignedAt:   time.Now(),
		}
		if err := s.dispHouseRepo.Create(link); err != nil {
			report.add(rowNum, "error", err.Error(), nil)
			continue
		}
		report.add(rowNum, "created", "", &link.ID)
	}
	return report, nil
}

// UnassignHouse снимает дом с ответственности диспетчера.
func (s *RepresentativeService) UnassignHouse(dispatcherID, houseID uint) error {
	return s.dispHouseRepo.Delete(dispatcherID, houseID)
}

func (s *RepresentativeService) ListDispatcherHouses(dispatcherID uint) ([]models.House, error) {
	return s.dispHouseRepo.ListHousesByDispatcher(dispatcherID)
}

func (s *RepresentativeService) ListUnassignedHouses() ([]models.House, error) {
	return s.dispHouseRepo.ListUnassignedHouses()
}

func (s *RepresentativeService) ListAssignments() ([]models.DispatcherHouse, error) {
	return s.dispHouseRepo.ListAll()
}
