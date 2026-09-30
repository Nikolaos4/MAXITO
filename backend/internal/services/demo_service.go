package services

import (
	"crypto/subtle"
	"errors"
	"fmt"

	"maxito/internal/models"
	"maxito/internal/repository"
	"maxito/internal/util"

	"gorm.io/gorm"
)

var (
	// ErrDemoDisabled — DEMO_CODE_WORD не задан на сервере, демо-режим выключен.
	ErrDemoDisabled = errors.New("demo mode is not enabled on this server")
	// ErrDemoWrongCodeWord — неверное кодовое слово.
	ErrDemoWrongCodeWord = errors.New("wrong code word")
	// ErrDemoInvalidRole — роль не входит в representative|dispatcher|resident.
	ErrDemoInvalidRole = errors.New("role must be one of: representative, dispatcher, resident")
	// ErrDemoPhoneTaken — телефон уже занят обычным (не демо) аккаунтом.
	ErrDemoPhoneTaken = errors.New("this phone is already used by a real account")
	// ErrDemoNotDemoAccount — попытка сменить роль не через демо-аккаунт.
	ErrDemoNotDemoAccount = errors.New("this account was not created via the demo code word, role switching is not available")
)

// DemoService — вход по кодовому слову в обход обычной регистрации и
// переключение роли для таких аккаунтов. Только для показа функционала
// жюри/проверяющим, отключается снятием DEMO_CODE_WORD из .env.
type DemoService struct {
	userRepo      *repository.UserRepository
	residentRepo  *repository.ResidentRepository
	dispHouseRepo *repository.DispatcherHouseRepository
	codeWord      string
	demoHouseID   uint
}

func NewDemoService(
	userRepo *repository.UserRepository,
	residentRepo *repository.ResidentRepository,
	dispHouseRepo *repository.DispatcherHouseRepository,
	codeWord string,
	demoHouseID uint,
) *DemoService {
	return &DemoService{
		userRepo:      userRepo,
		residentRepo:  residentRepo,
		dispHouseRepo: dispHouseRepo,
		codeWord:      codeWord,
		demoHouseID:   demoHouseID,
	}
}

// VerifyCodeWord — быстрая проверка кодового слова до того, как бот попросит
// у человека роль/ФИО/телефон (чтобы не заставлять зря всё это вводить,
// если слово неверное).
func (s *DemoService) VerifyCodeWord(codeWord string) error {
	if s.codeWord == "" {
		return ErrDemoDisabled
	}
	if subtle.ConstantTimeCompare([]byte(codeWord), []byte(s.codeWord)) != 1 {
		return ErrDemoWrongCodeWord
	}
	return nil
}

func parseRole(raw string) (models.Role, error) {
	switch models.Role(raw) {
	case models.RoleRepresentative, models.RoleDispatcher, models.RoleResident:
		return models.Role(raw), nil
	default:
		return "", ErrDemoInvalidRole
	}
}

// RegisterDemoUser — создаёт (или переиспользует, если этот max_user_id уже
// заходил по кодовому слову раньше) демо-пользователя, привязывает его к
// чату и выдаёт фикстуры демо-дома под выбранную роль.
func (s *DemoService) RegisterDemoUser(codeWord, rawRole, fullName, rawPhone, maxUserID string) (*models.User, error) {
	if err := s.VerifyCodeWord(codeWord); err != nil {
		return nil, err
	}
	role, err := parseRole(rawRole)
	if err != nil {
		return nil, err
	}
	if fullName == "" {
		return nil, errors.New("full_name is required")
	}
	phone, err := util.NormalizePhone(rawPhone)
	if err != nil {
		return nil, err
	}

	// Тот же чат MAX уже когда-то заходил по кодовому слову — переиспользуем
	// запись вместо создания дубля (иначе упрёмся в уникальный max_user_id).
	if existing, err := s.userRepo.GetByMaxUserID(maxUserID); err == nil {
		if !existing.IsDemo {
			return nil, ErrDemoPhoneTaken
		}
		return s.reregister(existing, role, fullName, phone)
	} else if !errors.Is(err, gorm.ErrRecordNotFound) {
		return nil, err
	}

	existingByPhone, err := s.userRepo.GetByPhone(phone)
	switch {
	case err == nil:
		if !existingByPhone.IsDemo {
			return nil, ErrDemoPhoneTaken
		}
		user, err := s.reregister(existingByPhone, role, fullName, phone)
		if err != nil {
			return nil, err
		}
		if err := s.userRepo.SetMaxUserID(user.ID, maxUserID); err != nil {
			return nil, err
		}
		user.MaxUserID = &maxUserID
		return user, nil
	case errors.Is(err, gorm.ErrRecordNotFound):
		// новый демо-пользователь
	default:
		return nil, err
	}

	user := &models.User{
		Phone: phone, FullName: fullName, Role: role, IsActive: true, IsDemo: true,
		MaxUserID: &maxUserID,
	}
	if err := s.userRepo.Create(user); err != nil {
		return nil, err
	}
	if err := s.ensureRoleFixtures(user.ID, role); err != nil {
		return nil, err
	}
	return user, nil
}

func (s *DemoService) reregister(user *models.User, role models.Role, fullName, phone string) (*models.User, error) {
	user.Role = role
	user.FullName = fullName
	user.Phone = phone
	user.IsActive = true
	if err := s.userRepo.Update(user); err != nil {
		return nil, err
	}
	if err := s.ensureRoleFixtures(user.ID, role); err != nil {
		return nil, err
	}
	return user, nil
}

// SwitchRole — меняет роль уже существующего демо-аккаунта (кнопка "Сменить
// роль" в меню бота). Для обычных (не демо) аккаунтов недоступна.
func (s *DemoService) SwitchRole(maxUserID, rawRole string) (*models.User, error) {
	if s.codeWord == "" {
		return nil, ErrDemoDisabled
	}
	role, err := parseRole(rawRole)
	if err != nil {
		return nil, err
	}

	user, err := s.userRepo.GetByMaxUserID(maxUserID)
	if err != nil {
		return nil, err
	}
	if !user.IsDemo {
		return nil, ErrDemoNotDemoAccount
	}

	user.Role = role
	if err := s.userRepo.Update(user); err != nil {
		return nil, err
	}
	if err := s.ensureRoleFixtures(user.ID, role); err != nil {
		return nil, err
	}
	return user, nil
}

// ensureRoleFixtures прикрепляет пользователя к демо-дому нужным для роли
// способом (Resident-профиль / DispatcherHouse). Представителю ничего
// прикреплять не нужно — он и так видит все дома.
func (s *DemoService) ensureRoleFixtures(userID uint, role models.Role) error {
	switch role {
	case models.RoleResident:
		if _, err := s.residentRepo.GetByUserID(userID); err == nil {
			return nil
		} else if !errors.Is(err, gorm.ErrRecordNotFound) {
			return err
		}
		entrance := 1
		return s.residentRepo.Create(&models.Resident{
			UserID: userID, HouseID: s.demoHouseID, Apartment: "99", EntranceNumber: &entrance,
		})
	case models.RoleDispatcher:
		if _, err := s.dispHouseRepo.GetByDispatcherAndHouse(userID, s.demoHouseID); err == nil {
			return nil
		} else if !errors.Is(err, gorm.ErrRecordNotFound) {
			return err
		}
		return s.dispHouseRepo.Create(&models.DispatcherHouse{
			DispatcherID: userID, HouseID: s.demoHouseID, AssignedBy: userID,
		})
	case models.RoleRepresentative:
		return nil
	default:
		return fmt.Errorf("unexpected role %q", role)
	}
}
