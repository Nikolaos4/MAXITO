package services

import (
	"errors"
	"fmt"
	"strconv"
	"time"

	"maxito/internal/auth"
	"maxito/internal/models"
	"maxito/internal/repository"
	"maxito/internal/util"

	"gorm.io/gorm"
)

var (
	// ErrAuthNotConfigured — не задан MAX_INITDATA_SECRET, проверять подпись нечем.
	ErrAuthNotConfigured = errors.New("MAX authentication is not configured on the server")
	// ErrNotBound — подпись верна, но этот аккаунт MAX ещё не привязан к
	// пользователю (человек не проходил шаг "поделиться контактом" в боте).
	ErrNotBound = errors.New("this MAX account is not linked to a user: open the bot and share your contact first")
	// ErrUserInactive — пользователь отключён Представителем.
	ErrUserInactive = errors.New("user is deactivated")

	// ErrInvalidBindInput — некорректные данные в запросе на привязку (плохой телефон и т.п.).
	ErrInvalidBindInput = errors.New("invalid bind input")

	ErrPhoneNotRegistered = errors.New("phone is not registered in the system")
	ErrBindConflictPhone  = errors.New("this phone is already linked to a different MAX account")
	ErrBindConflictMaxID  = errors.New("this MAX account is already linked to a different user")
)

// LoginResult — результат успешного входа.
type LoginResult struct {
	Token     string
	ExpiresAt time.Time
	User      *models.User
}

type AuthService struct {
	userRepo       *repository.UserRepository
	tokens         *auth.TokenService
	initDataSecret []byte // производный ключ HMAC_SHA256("WebAppData", BOT_TOKEN); может быть пуст
	initDataMaxAge time.Duration
}

func NewAuthService(
	userRepo *repository.UserRepository,
	tokens *auth.TokenService,
	initDataSecret []byte,
	initDataMaxAge time.Duration,
) *AuthService {
	return &AuthService{
		userRepo:       userRepo,
		tokens:         tokens,
		initDataSecret: initDataSecret,
		initDataMaxAge: initDataMaxAge,
	}
}

// LoginByInitData проверяет подпись initData от MAX и меняет её на наш JWT.
// Пользователя ищем по max_user_id из ПОДПИСАННЫХ данных — телефон здесь
// уже не участвует, он нужен только один раз при привязке (BindMaxUser).
func (s *AuthService) LoginByInitData(rawInitData string) (*LoginResult, error) {
	if len(s.initDataSecret) == 0 {
		return nil, ErrAuthNotConfigured
	}

	now := time.Now()
	data, err := auth.ValidateInitData(rawInitData, s.initDataSecret, s.initDataMaxAge, now)
	if err != nil {
		return nil, err
	}

	maxUserID := strconv.FormatInt(data.User.ID, 10)
	user, err := s.userRepo.GetByMaxUserID(maxUserID)
	if err != nil {
		if errors.Is(err, gorm.ErrRecordNotFound) {
			return nil, ErrNotBound
		}
		return nil, err
	}
	if !user.IsActive {
		return nil, ErrUserInactive
	}

	token, expiresAt, err := s.tokens.Issue(user, now)
	if err != nil {
		return nil, fmt.Errorf("failed to issue token: %w", err)
	}
	return &LoginResult{Token: token, ExpiresAt: expiresAt, User: user}, nil
}

// IssueTokenForPhone выпускает JWT напрямую по телефону, минуя подписанный
// initData MAX. Используется только для служебной выдачи тестовых токенов
// (например, жюри для автоматизированной проверки) через /internal/issue-token
// — обычный вход всегда идёт через LoginByInitData.
func (s *AuthService) IssueTokenForPhone(rawPhone string) (*LoginResult, error) {
	phone, err := util.NormalizePhone(rawPhone)
	if err != nil {
		return nil, fmt.Errorf("%w: %v", ErrInvalidBindInput, err)
	}

	user, err := s.userRepo.GetByPhone(phone)
	if err != nil {
		if errors.Is(err, gorm.ErrRecordNotFound) {
			return nil, ErrPhoneNotRegistered
		}
		return nil, err
	}
	if !user.IsActive {
		return nil, ErrUserInactive
	}

	now := time.Now()
	token, expiresAt, err := s.tokens.Issue(user, now)
	if err != nil {
		return nil, fmt.Errorf("failed to issue token: %w", err)
	}
	return &LoginResult{Token: token, ExpiresAt: expiresAt, User: user}, nil
}

// BindMaxUser привязывает аккаунт MAX к пользователю, которого заранее
// загрузил Представитель. Вызывается ботом (через /internal/bind), когда
// человек поделился контактом. Повторный вызов с теми же данными безвреден.
func (s *AuthService) BindMaxUser(rawPhone, maxUserID string) (*models.User, error) {
	phone, err := util.NormalizePhone(rawPhone)
	if err != nil {
		return nil, fmt.Errorf("%w: %v", ErrInvalidBindInput, err)
	}
	if maxUserID == "" {
		return nil, fmt.Errorf("%w: max_user_id is required", ErrInvalidBindInput)
	}

	user, err := s.userRepo.GetByPhone(phone)
	if err != nil {
		if errors.Is(err, gorm.ErrRecordNotFound) {
			return nil, ErrPhoneNotRegistered
		}
		return nil, err
	}
	if !user.IsActive {
		return nil, ErrUserInactive
	}

	if user.MaxUserID != nil {
		if *user.MaxUserID == maxUserID {
			return user, nil // уже привязан к этому же аккаунту
		}
		return nil, ErrBindConflictPhone
	}

	other, err := s.userRepo.GetByMaxUserID(maxUserID)
	if err == nil && other.ID != user.ID {
		return nil, ErrBindConflictMaxID
	}
	if err != nil && !errors.Is(err, gorm.ErrRecordNotFound) {
		return nil, err
	}

	if err := s.userRepo.SetMaxUserID(user.ID, maxUserID); err != nil {
		return nil, err
	}
	user.MaxUserID = &maxUserID
	return user, nil
}
