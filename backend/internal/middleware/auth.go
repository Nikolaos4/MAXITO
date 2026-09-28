package middleware

import (
	"crypto/subtle"
	"errors"
	"net/http"
	"strings"

	"maxito/internal/auth"
	"maxito/internal/models"
	"maxito/internal/util"

	"github.com/gin-gonic/gin"
	"gorm.io/gorm"
)

const ContextUserKey = "currentUser"

// Authenticate — авторизация запроса. Три способа, проверяются в этом порядке:
//
//  1. "Authorization: Bearer <JWT>" — мини-приложение, токен выдан POST /auth/max.
//  2. "X-Internal-Key" + "X-Max-User-Id" — сервер бота действует от имени
//     пользователя (действия в чате). Ключ доказывает, что запрос пришёл от
//     бота, а max_id бот получает от MAX напрямую. Ключ — общий секрет:
//     он должен храниться только на сервере бота и бэкенда.
//  3. Только при allowDevHeaders — отладочная схема, см. ниже.
//
// Пользователь на каждый запрос заново берётся из БД, поэтому отключение
// пользователя и смена роли действуют сразу, а не только после истечения токена.
//
// Если allowDevHeaders=true (ALLOW_DEV_HEADERS в .env), дополнительно
// принимается старая схема X-Max-User-Id / X-Max-User-Phone — ТОЛЬКО для
// отладки в Postman. В боевом окружении флаг должен быть выключен: эти
// заголовки ничем не подтверждены, любой может подставить чужие.
func Authenticate(db *gorm.DB, tokens *auth.TokenService, internalKey string, allowDevHeaders bool) gin.HandlerFunc {
	expectedKey := []byte(internalKey)
	return func(c *gin.Context) {
		var (
			user *models.User
			ok   bool
		)

		switch {
		case c.GetHeader("Authorization") != "":
			user, ok = authenticateBearer(c, db, tokens)
		case c.GetHeader("X-Internal-Key") != "":
			user, ok = authenticateBot(c, db, expectedKey)
		case allowDevHeaders && c.GetHeader("X-Max-User-Id") != "":
			user, ok = authenticateDevHeaders(c, db)
		default:
			c.AbortWithStatusJSON(http.StatusUnauthorized, gin.H{"error": "authorization required"})
			return
		}
		if !ok {
			return // ответ с ошибкой уже отправлен
		}

		c.Set(ContextUserKey, user)
		c.Next()
	}
}

func authenticateBearer(c *gin.Context, db *gorm.DB, tokens *auth.TokenService) (*models.User, bool) {
	header := c.GetHeader("Authorization")
	scheme, tokenString, found := strings.Cut(header, " ")
	if !found || !strings.EqualFold(scheme, "Bearer") || strings.TrimSpace(tokenString) == "" {
		c.AbortWithStatusJSON(http.StatusUnauthorized, gin.H{"error": "expected header 'Authorization: Bearer <token>'"})
		return nil, false
	}

	claims, err := tokens.Parse(strings.TrimSpace(tokenString))
	if err != nil {
		c.AbortWithStatusJSON(http.StatusUnauthorized, gin.H{"error": "invalid or expired token"})
		return nil, false
	}

	var user models.User
	err = db.Where("id = ? AND is_active = ?", claims.UserID, true).First(&user).Error
	if err != nil {
		if errors.Is(err, gorm.ErrRecordNotFound) {
			c.AbortWithStatusJSON(http.StatusUnauthorized, gin.H{"error": "user not found or deactivated"})
			return nil, false
		}
		c.AbortWithStatusJSON(http.StatusInternalServerError, gin.H{"error": "database error"})
		return nil, false
	}
	return &user, true
}

// authenticateBot — запрос от сервера бота от имени пользователя. Сначала
// проверяем ключ, и только после этого доверяем X-Max-User-Id. Если ключ
// указан, но неверный, запрос отклоняется — на другие способы мы не
// переключаемся, чтобы неверный ключ не превращался в "попробуем иначе".
func authenticateBot(c *gin.Context, db *gorm.DB, expectedKey []byte) (*models.User, bool) {
	if !internalKeyMatches(c, expectedKey) {
		c.AbortWithStatusJSON(http.StatusUnauthorized, gin.H{"error": "invalid internal key"})
		return nil, false
	}

	maxUserID := strings.TrimSpace(c.GetHeader("X-Max-User-Id"))
	if maxUserID == "" {
		c.AbortWithStatusJSON(http.StatusUnauthorized, gin.H{"error": "X-Max-User-Id is required together with X-Internal-Key"})
		return nil, false
	}

	var user models.User
	err := db.Where("max_user_id = ?", maxUserID).First(&user).Error
	if err != nil {
		if errors.Is(err, gorm.ErrRecordNotFound) {
			c.AbortWithStatusJSON(http.StatusForbidden, gin.H{
				"error": "this MAX account is not linked to a user: ask the user to share their contact first",
				"code":  "not_bound",
			})
			return nil, false
		}
		c.AbortWithStatusJSON(http.StatusInternalServerError, gin.H{"error": "database error"})
		return nil, false
	}
	if !user.IsActive {
		c.AbortWithStatusJSON(http.StatusForbidden, gin.H{"error": "user is deactivated", "code": "inactive"})
		return nil, false
	}
	return &user, true
}

// internalKeyMatches сравнивает X-Internal-Key с ожидаемым в постоянное
// время. Пустой ожидаемый ключ не совпадает никогда.
func internalKeyMatches(c *gin.Context, expected []byte) bool {
	if len(expected) == 0 {
		return false
	}
	return subtle.ConstantTimeCompare([]byte(c.GetHeader("X-Internal-Key")), expected) == 1
}

// authenticateDevHeaders — прежняя схема для отладки: ищет пользователя по
// X-Max-User-Id, а если он ещё не привязан — привязывает по телефону из
// X-Max-User-Phone (первый вход).
func authenticateDevHeaders(c *gin.Context, db *gorm.DB) (*models.User, bool) {
	maxUserID := c.GetHeader("X-Max-User-Id")

	var user models.User
	err := db.Where("max_user_id = ? AND is_active = ?", maxUserID, true).First(&user).Error
	switch {
	case err == nil:
		return &user, true
	case !errors.Is(err, gorm.ErrRecordNotFound):
		c.AbortWithStatusJSON(http.StatusInternalServerError, gin.H{"error": "database error"})
		return nil, false
	}

	bound, ok := bindByPhone(c, db, maxUserID)
	if !ok {
		return nil, false
	}
	return &bound, true
}

func bindByPhone(c *gin.Context, db *gorm.DB, maxUserID string) (models.User, bool) {
	rawPhone := c.GetHeader("X-Max-User-Phone")
	if rawPhone == "" {
		c.AbortWithStatusJSON(http.StatusUnauthorized, gin.H{
			"error": "user not registered: unknown max_user_id and no phone provided to bind",
		})
		return models.User{}, false
	}

	phone, err := util.NormalizePhone(rawPhone)
	if err != nil {
		c.AbortWithStatusJSON(http.StatusUnauthorized, gin.H{"error": "invalid phone format"})
		return models.User{}, false
	}

	var user models.User
	err = db.Where("phone = ? AND is_active = ?", phone, true).First(&user).Error
	if err != nil {
		if errors.Is(err, gorm.ErrRecordNotFound) {
			c.AbortWithStatusJSON(http.StatusUnauthorized, gin.H{
				"error": "user not found: phone is not registered in the system",
			})
			return models.User{}, false
		}
		c.AbortWithStatusJSON(http.StatusInternalServerError, gin.H{"error": "database error"})
		return models.User{}, false
	}

	if user.MaxUserID != nil && *user.MaxUserID != maxUserID {
		c.AbortWithStatusJSON(http.StatusConflict, gin.H{
			"error": "phone is already bound to a different max_user_id",
		})
		return models.User{}, false
	}

	if user.MaxUserID == nil {
		if err := db.Model(&user).Update("max_user_id", maxUserID).Error; err != nil {
			c.AbortWithStatusJSON(http.StatusInternalServerError, gin.H{"error": "failed to bind user"})
			return models.User{}, false
		}
		user.MaxUserID = &maxUserID
	}

	return user, true
}

// RequireInternalKey защищает служебные эндпоинты для бота (/internal/*)
// общим секретом в заголовке X-Internal-Key. Если ключ на сервере не задан,
// эндпоинты закрыты полностью — пустой ключ никогда не должен совпасть с
// пустым заголовком.
func RequireInternalKey(key string) gin.HandlerFunc {
	expected := []byte(key)
	return func(c *gin.Context) {
		if len(expected) == 0 {
			c.AbortWithStatusJSON(http.StatusServiceUnavailable, gin.H{"error": "internal API is not configured"})
			return
		}
		if !internalKeyMatches(c, expected) {
			c.AbortWithStatusJSON(http.StatusUnauthorized, gin.H{"error": "invalid internal key"})
			return
		}
		c.Next()
	}
}

// RequireRole проверяет, что у пользователя нужная роль.
func RequireRole(roles ...models.Role) gin.HandlerFunc {
	return func(c *gin.Context) {
		val, exists := c.Get(ContextUserKey)
		if !exists {
			c.AbortWithStatusJSON(http.StatusUnauthorized, gin.H{"error": "unauthorized"})
			return
		}

		user, ok := val.(*models.User)
		if !ok {
			c.AbortWithStatusJSON(http.StatusUnauthorized, gin.H{"error": "unauthorized"})
			return
		}

		for _, role := range roles {
			if user.Role == role {
				c.Next()
				return
			}
		}

		c.AbortWithStatusJSON(http.StatusForbidden, gin.H{
			"error": "forbidden: insufficient role",
		})
	}
}

// GetCurrentUser — хелпер для получения пользователя из контекста.
func GetCurrentUser(c *gin.Context) *models.User {
	val, exists := c.Get(ContextUserKey)
	if !exists {
		return nil
	}
	user, ok := val.(*models.User)
	if !ok {
		return nil
	}
	return user
}
