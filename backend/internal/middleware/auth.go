package middleware

import (
	"errors"
	"net/http"

	"maxito/internal/models"
	"maxito/internal/util"

	"github.com/gin-gonic/gin"
	"gorm.io/gorm"
)

const ContextUserKey = "currentUser"

// AuthByMaxUserID — авторизация по заголовку X-Max-User-Id.
//
// Представитель, диспетчеры и жители изначально попадают в базу с
// заполненным телефоном, но пустым max_user_id — он появляется только
// когда MAX впервые присылает пользователя в бота. Поэтому логика в
// два шага:
//  1. Ищем уже привязанного пользователя по max_user_id — обычный путь
//     для всех последующих запросов.
//  2. Если не нашли — пробуем найти пользователя по телефону
//     (заголовок X-Max-User-Phone) и, если он уже есть в базе,
//     привязываем его max_user_id прямо сейчас (это и есть первый вход).
//
// ВАЖНО: имя и формат заголовка с телефоном (X-Max-User-Phone) —
// заглушка, подставленная до уточнения реального контракта MAX Bot API
// (может прийти в другом заголовке или в теле initData/webapp-запроса).
// Как только формат станет известен, поменять нужно только этот файл.
func AuthByMaxUserID(db *gorm.DB) gin.HandlerFunc {
	return func(c *gin.Context) {
		maxUserID := c.GetHeader("X-Max-User-Id")
		if maxUserID == "" {
			c.AbortWithStatusJSON(http.StatusUnauthorized, gin.H{
				"error": "header X-Max-User-Id is required",
			})
			return
		}

		var user models.User
		err := db.Where("max_user_id = ? AND is_active = ?", maxUserID, true).First(&user).Error
		switch {
		case err == nil:
			c.Set(ContextUserKey, &user)
			c.Next()
			return
		case !errors.Is(err, gorm.ErrRecordNotFound):
			c.AbortWithStatusJSON(http.StatusInternalServerError, gin.H{"error": "database error"})
			return
		}

		// Пользователь с таким max_user_id ещё не привязан — пробуем первичный биндинг по телефону.
		user, ok := bindByPhone(c, db, maxUserID)
		if !ok {
			return // bindByPhone уже отправил ответ с ошибкой
		}

		c.Set(ContextUserKey, &user)
		c.Next()
	}
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

	// Если у найденного юзера уже стоит другой max_user_id — это конфликт данных
	// (например, телефон переиспользован), а не обычный первый вход.
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
