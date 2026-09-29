// issuetoken выпускает JWT для уже существующего пользователя — минуя вход
// через подписанный initData MAX. Нужен для тестовых аккаунтов жюри:
// автоматический чекер не может пройти реальный вход в MAX, поэтому ему
// заранее выдаётся готовый access_token на посеянного в БД жителя/диспетчера.
//
// Запуск:
//
//	go run ./cmd/issuetoken -phone=+70000000001
//	go run ./cmd/issuetoken -user-id=42 -ttl-hours=2160
package main

import (
	"flag"
	"fmt"
	"log"
	"time"

	"maxito/internal/auth"
	"maxito/internal/config"
	"maxito/internal/database"
	"maxito/internal/models"
	"maxito/internal/repository"
)

func main() {
	userID := flag.Uint("user-id", 0, "ID пользователя в таблице users")
	phone := flag.String("phone", "", "телефон пользователя (альтернатива -user-id)")
	ttlHours := flag.Int("ttl-hours", 0, "срок жизни токена в часах (по умолчанию — JWT_TTL_HOURS из .env)")
	flag.Parse()

	if *userID == 0 && *phone == "" {
		log.Fatal("нужно указать -user-id или -phone")
	}

	cfg, err := config.Load()
	if err != nil {
		log.Fatalf("failed to load config: %v", err)
	}

	db, err := database.Connect(cfg)
	if err != nil {
		log.Fatalf("database connection failed: %v", err)
	}

	userRepo := repository.NewUserRepository(db)

	var (
		u      *models.User
		lookup error
	)
	if *phone != "" {
		u, lookup = userRepo.GetByPhone(*phone)
	} else {
		u, lookup = userRepo.GetByID(*userID)
	}
	if lookup != nil {
		log.Fatalf("пользователь не найден: %v", lookup)
	}
	log.Printf("Найден пользователь: id=%d, роль=%s, имя=%s", u.ID, u.Role, u.FullName)

	ttl := time.Duration(cfg.JWTTTLHours) * time.Hour
	if *ttlHours > 0 {
		ttl = time.Duration(*ttlHours) * time.Hour
	}

	tokenSvc := auth.NewTokenService(cfg.JWTSecret, ttl)
	token, expiresAt, err := tokenSvc.Issue(u, time.Now())
	if err != nil {
		log.Fatalf("не удалось выпустить токен: %v", err)
	}

	fmt.Println(token)
	log.Printf("Токен действителен до: %s", expiresAt.Format(time.RFC3339))
}
