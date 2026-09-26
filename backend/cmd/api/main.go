package main

import (
	"fmt"
	"log"

	"maxito/internal/config"
	"maxito/internal/database"
	"maxito/internal/handlers/dispatcher"
	"maxito/internal/handlers/representative"
	"maxito/internal/handlers/resident"
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
		&models.Reason{},
		&models.Appeal{},
		&models.AppealStatusChange{},
		&models.AppealSubscription{},
		&models.Notification{},
	); err != nil {
		log.Fatalf("auto migrate failed: %v", err)
	}
	log.Println("AutoMigrate completed successfully")

	if err := database.SeedReferenceData(db); err != nil {
		log.Fatalf("failed to seed reference data: %v", err)
	}
	log.Println("Reference data (problem types, reasons) seeded successfully")

	// Repositories
	userRepo := repository.NewUserRepository(db)
	houseRepo := repository.NewHouseRepository(db)
	residentRepo := repository.NewResidentRepository(db)
	dispHouseRepo := repository.NewDispatcherHouseRepository(db)
	problemTypeRepo := repository.NewProblemTypeRepository(db)
	reasonRepo := repository.NewReasonRepository(db)
	appealRepo := repository.NewAppealRepository(db)
	statusChangeRepo := repository.NewAppealStatusChangeRepository(db)
	notificationRepo := repository.NewNotificationRepository(db)

	// Services
	repSvc := services.NewRepresentativeService(db, userRepo, houseRepo, residentRepo, dispHouseRepo)
	dispatcherSvc := services.NewDispatcherService(
		db, dispHouseRepo, appealRepo, statusChangeRepo, notificationRepo, problemTypeRepo, reasonRepo,
	)
	residentSvc := services.NewResidentService(residentRepo, appealRepo, notificationRepo, problemTypeRepo, reasonRepo)

	// Handlers — Представитель
	houseHandler := representative.NewHouseHandler(houseRepo, repSvc)
	dispatcherMgmtHandler := representative.NewDispatcherHandler(repSvc, userRepo)
	residentMgmtHandler := representative.NewResidentHandler(repSvc, residentRepo)
	assignmentHandler := representative.NewAssignmentHandler(repSvc)

	// Handlers — Диспетчер
	appealHandler := dispatcher.NewAppealHandler(dispatcherSvc)
	notificationHandler := dispatcher.NewNotificationHandler(dispatcherSvc)
	referenceHandler := dispatcher.NewReferenceHandler(problemTypeRepo, reasonRepo)

	// Handlers — Житель
	residentAppealHandler := resident.NewAppealHandler(residentSvc)

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
			rep.GET("/houses/:house_id/residents", residentMgmtHandler.ListResidents)
			rep.POST("/houses/:house_id/residents/csv", residentMgmtHandler.ImportResidentsCSV)

			// Диспетчеры
			rep.POST("/dispatchers", dispatcherMgmtHandler.CreateDispatcher)
			rep.POST("/dispatchers/csv", dispatcherMgmtHandler.ImportDispatchersCSV)
			rep.GET("/dispatchers", dispatcherMgmtHandler.ListDispatchers)

			// Распределение домов между диспетчерами
			rep.POST("/dispatchers/:dispatcher_id/houses", assignmentHandler.AssignHouses)
			rep.DELETE("/dispatchers/:dispatcher_id/houses/:house_id", assignmentHandler.UnassignHouse)
			rep.GET("/dispatchers/:dispatcher_id/houses", assignmentHandler.ListDispatcherHouses)

			rep.GET("/assignments", assignmentHandler.ListAssignments)
		}

		disp := api.Group("/dispatcher")
		disp.Use(middleware.AuthByMaxUserID(db))
		disp.Use(middleware.RequireRole(models.RoleDispatcher))
		{
			// Обращения (только по своим домам)
			disp.GET("/appeals", appealHandler.ListAppeals)
			disp.GET("/appeals/top", appealHandler.TopAppeals)
			disp.GET("/appeals/:id", appealHandler.GetAppeal)
			disp.POST("/appeals/:id/status", appealHandler.ChangeStatus)

			// Уведомления
			disp.GET("/notifications", notificationHandler.ListNotifications)
			disp.POST("/notifications", notificationHandler.CreateNotification)
			disp.POST("/notifications/:id/revoke", notificationHandler.RevokeNotification)

			// Справочники (темы/причины — нужны для формы создания уведомления)
			disp.GET("/problem-types", referenceHandler.ListProblemTypes)
			disp.GET("/problem-types/:id/reasons", referenceHandler.ListReasons)
		}

		res := api.Group("/resident")
		res.Use(middleware.AuthByMaxUserID(db))
		res.Use(middleware.RequireRole(models.RoleResident))
		{
			res.POST("/appeals", residentAppealHandler.CreateAppeal)
		}
	}

	addr := fmt.Sprintf(":%s", cfg.AppPort)
	log.Printf("Starting server on %s", addr)

	if err := r.Run(addr); err != nil {
		log.Fatalf("failed to start server: %v", err)
	}
}
