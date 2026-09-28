package auth

import (
	"errors"
	"fmt"
	"time"

	"maxito/internal/models"

	"github.com/golang-jwt/jwt/v5"
)

var ErrInvalidToken = errors.New("invalid or expired token")

// Claims — содержимое нашего JWT. Роль намеренно НЕ кладём в токен:
// middleware всё равно берёт пользователя из БД на каждый запрос, поэтому
// смена роли или отключение пользователя действуют сразу, а не через месяц.
type Claims struct {
	UserID uint `json:"uid"`
	jwt.RegisteredClaims
}

type TokenService struct {
	secret []byte
	ttl    time.Duration
}

func NewTokenService(secret string, ttl time.Duration) *TokenService {
	return &TokenService{secret: []byte(secret), ttl: ttl}
}

// Issue выпускает токен для пользователя и возвращает его вместе со временем истечения.
func (s *TokenService) Issue(user *models.User, now time.Time) (string, time.Time, error) {
	expiresAt := now.Add(s.ttl)
	claims := Claims{
		UserID: user.ID,
		RegisteredClaims: jwt.RegisteredClaims{
			Subject:   fmt.Sprint(user.ID),
			IssuedAt:  jwt.NewNumericDate(now),
			ExpiresAt: jwt.NewNumericDate(expiresAt),
		},
	}

	signed, err := jwt.NewWithClaims(jwt.SigningMethodHS256, claims).SignedString(s.secret)
	if err != nil {
		return "", time.Time{}, err
	}
	return signed, expiresAt, nil
}

// Parse проверяет подпись и срок действия. Принимается только HS256 —
// иначе можно было бы подсунуть токен с алгоритмом "none".
func (s *TokenService) Parse(tokenString string) (*Claims, error) {
	claims := &Claims{}
	token, err := jwt.ParseWithClaims(
		tokenString,
		claims,
		func(t *jwt.Token) (interface{}, error) { return s.secret, nil },
		jwt.WithValidMethods([]string{jwt.SigningMethodHS256.Alg()}),
	)
	if err != nil || !token.Valid {
		return nil, ErrInvalidToken
	}
	// Токен без срока жизни считаем недействительным.
	if claims.ExpiresAt == nil || claims.UserID == 0 {
		return nil, ErrInvalidToken
	}
	return claims, nil
}
