package config

import (
	"encoding/hex"
	"errors"
	"fmt"
	"os"
	"strconv"

	"github.com/joho/godotenv"
)

type Config struct {
	AppPort    string
	GinMode    string
	DBHost     string
	DBPort     string
	DBUser     string
	DBPassword string
	DBName     string
	DBSSLMode  string
	UploadDir  string

	// Авторизация.
	JWTSecret   string // подпись наших JWT
	JWTTTLHours int    // срок жизни JWT

	// MaxInitDataSecret — НЕ токен бота, а производный ключ
	// HMAC_SHA256("WebAppData", BOT_TOKEN) в hex (получить: go run ./cmd/derivekey).
	// По нему проверяется подпись initData от MAX; сам токен бота бэкенду не нужен.
	MaxInitDataSecret    string
	InitDataMaxAgeSecond int // насколько старым может быть auth_date в initData

	// InternalAPIKey — общий секрет между ботом и бэкендом для /internal/*.
	InternalAPIKey string

	// AllowDevHeaders включает старую авторизацию по заголовкам
	// X-Max-User-Id / X-Max-User-Phone. Только для локальной отладки в Postman.
	AllowDevHeaders bool
}

func Load() (*Config, error) {
	// Загружаем .env файл, если он есть (в Docker его может не быть)
	_ = godotenv.Load()

	ttl, err := getEnvInt("JWT_TTL_HOURS", 720)
	if err != nil {
		return nil, err
	}
	maxAge, err := getEnvInt("INITDATA_MAX_AGE_SECONDS", 86400)
	if err != nil {
		return nil, err
	}
	allowDev, err := getEnvBool("ALLOW_DEV_HEADERS", false)
	if err != nil {
		return nil, err
	}

	cfg := &Config{
		AppPort:    getEnv("APP_PORT", "8080"),
		GinMode:    getEnv("GIN_MODE", "debug"),
		DBHost:     getEnv("DB_HOST", "localhost"),
		DBPort:     getEnv("DB_PORT", "5432"),
		DBUser:     getEnv("DB_USER", "postgres"),
		DBPassword: getEnv("DB_PASSWORD", "postgres"),
		DBName:     getEnv("DB_NAME", "umniy_gorod"),
		DBSSLMode:  getEnv("DB_SSLMODE", "disable"),
		UploadDir:  getEnv("UPLOAD_DIR", "./uploads"),

		JWTSecret:            getEnv("JWT_SECRET", ""),
		JWTTTLHours:          ttl,
		MaxInitDataSecret:    getEnv("MAX_INITDATA_SECRET", ""),
		InitDataMaxAgeSecond: maxAge,
		InternalAPIKey:       getEnv("INTERNAL_API_KEY", ""),
		AllowDevHeaders:      allowDev,
	}

	if err := cfg.validate(); err != nil {
		return nil, err
	}
	return cfg, nil
}

// validate проверяет секреты при старте — лучше упасть сразу с понятным
// сообщением, чем работать с пустым или слабым ключом.
func (c *Config) validate() error {
	if len(c.JWTSecret) < 32 {
		return errors.New("JWT_SECRET is required and must be at least 32 characters")
	}
	if c.JWTTTLHours < 1 {
		return errors.New("JWT_TTL_HOURS must be a positive number")
	}
	if c.InitDataMaxAgeSecond < 1 {
		return errors.New("INITDATA_MAX_AGE_SECONDS must be a positive number")
	}
	if c.MaxInitDataSecret != "" {
		if _, err := c.InitDataSecretBytes(); err != nil {
			return err
		}
	}
	return nil
}

// InitDataSecretBytes декодирует MAX_INITDATA_SECRET. Возвращает nil, nil,
// если переменная не задана (тогда POST /auth/max отвечает 503).
func (c *Config) InitDataSecretBytes() ([]byte, error) {
	if c.MaxInitDataSecret == "" {
		return nil, nil
	}
	key, err := hex.DecodeString(c.MaxInitDataSecret)
	if err != nil || len(key) != 32 {
		return nil, errors.New(
			"MAX_INITDATA_SECRET must be 64 hex characters — the derived key, not the bot token (run: go run ./cmd/derivekey)",
		)
	}
	return key, nil
}

// логирование
func (c *Config) DSN() string {
	return fmt.Sprintf(
		"host=%s user=%s password=%s dbname=%s port=%s sslmode=%s",
		c.DBHost, c.DBUser, c.DBPassword, c.DBName, c.DBPort, c.DBSSLMode,
	)
}

func getEnv(key, defaultValue string) string {
	if value, exists := os.LookupEnv(key); exists {
		return value
	}
	return defaultValue
}

func getEnvInt(key string, defaultValue int) (int, error) {
	raw, exists := os.LookupEnv(key)
	if !exists || raw == "" {
		return defaultValue, nil
	}
	n, err := strconv.Atoi(raw)
	if err != nil {
		return 0, fmt.Errorf("%s must be an integer, got %q", key, raw)
	}
	return n, nil
}

func getEnvBool(key string, defaultValue bool) (bool, error) {
	raw, exists := os.LookupEnv(key)
	if !exists || raw == "" {
		return defaultValue, nil
	}
	b, err := strconv.ParseBool(raw)
	if err != nil {
		return false, fmt.Errorf("%s must be true or false, got %q", key, raw)
	}
	return b, nil
}
