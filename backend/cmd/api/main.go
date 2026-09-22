package main

import (
	"fmt"
	"log"

	"maxito/internal/config"
	"maxito/internal/database"
	"maxito/internal/models"

	"github.com/gin-gonic/gin"
)

func main() {
	cfg, err := config.Load()
	if err != nil {
		log.Fatalf("failed to load config: %v", err)
	}

	// Подключение к БД
	db, err := database.Connect(cfg)
	if err != nil {
		log.Fatalf("database connection failed: %v", err)
	}

	// Автомиграция моделей
	if err := db.AutoMigrate(
		&models.User{},
		&models.House{},
		&models.DispatcherHouse{},
		&models.Resident{},
		&models.ProblemType{},
		&models.Appeal{},
		&models.AppealSubscription{},
		&models.Notification{},
	); err != nil {
		log.Fatalf("auto migrate failed: %v", err)
	}
	log.Println("AutoMigrate completed successfully")

	gin.SetMode(cfg.GinMode)

	r := gin.Default()

	r.GET("/health", func(c *gin.Context) {
		c.JSON(200, gin.H{
			"status": "ok",
		})
	})

	addr := fmt.Sprintf(":%s", cfg.AppPort)
	log.Printf("Starting server on %s", addr)

	if err := r.Run(addr); err != nil {
		log.Fatalf("failed to start server: %v", err)
	}
}
