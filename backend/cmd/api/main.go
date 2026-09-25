package main

import (
	"fmt"
	"log"

	"maxito/internal/config"
	"maxito/internal/database"
	"maxito/internal/handlers/representative"
	"maxito/internal/middleware"
	"maxito/internal/models"
	"maxito/internal/repository"
	"maxito/internal/services"

	"github.com/gin-gonic/gin"
)

func main() {
	cfg, err := config.Load()
	if err != nil {
		log.Fatalf("failed to load config: %v", err)
	}

	db, err := database.Connect(cfg)
	if err != nil {
		log.Fatalf("database connection failed: %v", err)
	}

	// AutoMigrate
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

	// Repositories
	userRepo := repository.NewUserRepository(db)
	houseRepo := repository.NewHouseRepository(db)
	residentRepo := repository.NewResidentRepository(db)
	dispHouseRepo := repository.NewDispatcherHouseRepository(db)

	// Services
	repSvc := services.NewRepresentativeService(db, userRepo, houseRepo, residentRepo, dispHouseRepo)

	// Handlers
	houseHandler := representative.NewHouseHandler(houseRepo, repSvc)
	dispatcherHandler := representative.NewDispatcherHandler(repSvc, userRepo)
	residentHandler := representative.NewResidentHandler(repSvc, residentRepo)
	assignmentHandler := representative.NewAssignmentHandler(repSvc)

	gin.SetMode(cfg.GinMode)
	r := gin.Default()

	// Health
	r.GET("/health", func(c *gin.Context) {
		c.JSON(200, gin.H{"status": "ok"})
	})

	// API v1
	api := r.Group("/api/v1")
	{
		rep := api.Group("/representative")
		rep.Use(middleware.AuthByMaxUserID(db))
		rep.Use(middleware.RequireRole(models.RoleRepresentative))
		{
			// Дома
			rep.POST("/houses", houseHandler.CreateHouse)
			rep.GET("/houses", houseHandler.ListHouses)
			rep.POST("/houses/csv", houseHandler.ImportHousesCSV)
			rep.GET("/houses/unassigned", assignmentHandler.ListUnassignedHouses)

			// Жители конкретного дома
			rep.GET("/houses/:house_id/residents", residentHandler.ListResidents)
			rep.POST("/houses/:house_id/residents/csv", residentHandler.ImportResidentsCSV)

			// Диспетчеры
			rep.POST("/dispatchers", dispatcherHandler.CreateDispatcher)
			rep.POST("/dispatchers/csv", dispatcherHandler.ImportDispatchersCSV)
			rep.GET("/dispatchers", dispatcherHandler.ListDispatchers)
			
			// Распределение домов между диспетчерами
			rep.POST("/dispatchers/:dispatcher_id/houses", assignmentHandler.AssignHouses)
			rep.DELETE("/dispatchers/:dispatcher_id/houses/:house_id", assignmentHandler.UnassignHouse)
			rep.GET("/dispatchers/:dispatcher_id/houses", assignmentHandler.ListDispatcherHouses)

			rep.GET("/assignments", assignmentHandler.ListAssignments)
		}
	}

	addr := fmt.Sprintf(":%s", cfg.AppPort)
	log.Printf("Starting server on %s", addr)

	if err := r.Run(addr); err != nil {
		log.Fatalf("failed to start server: %v", err)
	}
}
