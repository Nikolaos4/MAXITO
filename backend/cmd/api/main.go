package main

import (
	"fmt"
	"log"
	"time"

	"maxito/internal/auth"
	"maxito/internal/config"
	"maxito/internal/database"
	"maxito/internal/handlers/bot"
	"maxito/internal/handlers/common"
	"maxito/internal/handlers/dispatcher"
	"maxito/internal/handlers/representative"
	"maxito/internal/handlers/resident"
	"maxito/internal/middleware"
	"maxito/internal/models"
	"maxito/internal/notify"
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
		&models.AppealAttachment{},
		&models.NotificationRead{},
		&models.Notification{},
		&models.Company{},
		&models.EmergencyService{},
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
	subscriptionRepo := repository.NewAppealSubscriptionRepository(db)
	attachmentRepo := repository.NewAppealAttachmentRepository(db)
	notificationRepo := repository.NewNotificationRepository(db)
	notifReadRepo := repository.NewNotificationReadRepository(db)
	companyRepo := repository.NewCompanyRepository(db)
	emergencyServiceRepo := repository.NewEmergencyServiceRepository(db)

	// Services
	repSvc := services.NewRepresentativeService(
		db, userRepo, houseRepo, residentRepo, dispHouseRepo, companyRepo, emergencyServiceRepo,
	)
	if cfg.NotifyURL == "" {
		log.Println("WARNING: NOTIFY_URL is empty — bot notifications are disabled")
	}
	notifyClient := notify.NewClient(cfg.NotifyURL, cfg.InternalAPIKey)
	dispatcherSvc := services.NewDispatcherService(
		db, dispHouseRepo, appealRepo, statusChangeRepo, subscriptionRepo, attachmentRepo,
		notificationRepo, residentRepo, houseRepo, problemTypeRepo, reasonRepo, notifyClient,
	)
	residentSvc := services.NewResidentService(
		db, residentRepo, appealRepo, statusChangeRepo, subscriptionRepo, attachmentRepo,
		notificationRepo, notifReadRepo, dispHouseRepo, houseRepo, problemTypeRepo, reasonRepo, notifyClient,
	)

	// Авторизация: JWT + проверка подписи initData от MAX.
	initDataSecret, err := cfg.InitDataSecretBytes()
	if err != nil {
		log.Fatalf("invalid config: %v", err)
	}
	if len(initDataSecret) == 0 {
		log.Println("WARNING: MAX_INITDATA_SECRET is not set — POST /auth/max will answer 503")
	}
	if cfg.InternalAPIKey == "" {
		log.Println("WARNING: INTERNAL_API_KEY is not set — /internal/* endpoints are disabled")
	}
	if cfg.AllowDevHeaders {
		log.Println("WARNING: ALLOW_DEV_HEADERS=true — X-Max-User-Id header auth is ENABLED. Never use this in production")
	}
	tokenSvc := auth.NewTokenService(cfg.JWTSecret, time.Duration(cfg.JWTTTLHours)*time.Hour)
	authSvc := services.NewAuthService(
		userRepo, tokenSvc, initDataSecret, time.Duration(cfg.InitDataMaxAgeSecond)*time.Second,
	)
	authMW := middleware.Authenticate(db, tokenSvc, cfg.InternalAPIKey, cfg.AllowDevHeaders)

	// Handlers — Представитель
	houseHandler := representative.NewHouseHandler(houseRepo, repSvc)
	companyHandler := representative.NewCompanyHandler(repSvc)
	emergencyHandler := representative.NewEmergencyHandler(repSvc)
	dispatcherMgmtHandler := representative.NewDispatcherHandler(repSvc, userRepo)
	residentMgmtHandler := representative.NewResidentHandler(repSvc, residentRepo)
	assignmentHandler := representative.NewAssignmentHandler(repSvc)

	// Handlers — Диспетчер
	appealHandler := dispatcher.NewAppealHandler(dispatcherSvc)
	notificationHandler := dispatcher.NewNotificationHandler(dispatcherSvc)
	referenceHandler := dispatcher.NewReferenceHandler(problemTypeRepo, reasonRepo)
	dispatcherHouseHandler := dispatcher.NewHouseHandler(dispatcherSvc)

	// Handlers — Житель
	residentAppealHandler := resident.NewAppealHandler(residentSvc)
	residentNotificationHandler := resident.NewNotificationHandler(residentSvc)
	residentHouseHandler := resident.NewHouseHandler(residentSvc)

	// Handlers — общий
	commonReferenceHandler := common.NewReferenceHandler(companyRepo, emergencyServiceRepo)
	authHandler := common.NewAuthHandler(authSvc)
	botHandler := bot.NewHandler(authSvc)
	meHandler := common.NewMeHandler(residentRepo, dispHouseRepo)
	uploadHandler := common.NewUploadHandler(cfg.UploadDir)

	gin.SetMode(cfg.GinMode)
	r := gin.Default()

	// Health
	r.GET("/health", func(c *gin.Context) {
		c.JSON(200, gin.H{"status": "ok"})
	})

	// Отдаём загруженные файлы напрямую как статику.
	r.Static("/uploads", cfg.UploadDir)

	// API v1
	api := r.Group("/api/v1")
	{
		// Кто я — доступно любой роли, без RequireRole, ровно потому,
		// что клиент ещё не знает роль на момент вызова.
		api.GET("/me", authMW, meHandler.Me)
		api.POST("/upload", authMW, uploadHandler.Upload)

		// Вход из мини-приложения: подписанный MAX'ом initData -> наш JWT.
		// Без авторизации — именно здесь её и получают.
		api.POST("/auth/max", authHandler.LoginByMax)

		// Служебные эндпоинты для сервера бота (общий секрет X-Internal-Key).
		internalAPI := api.Group("/internal")
		internalAPI.Use(middleware.RequireInternalKey(cfg.InternalAPIKey))
		{
			internalAPI.POST("/bind", botHandler.Bind)
		}

		rep := api.Group("/representative")
		rep.Use(authMW)
		rep.Use(middleware.RequireRole(models.RoleRepresentative))
		{
			// Дома
			rep.POST("/houses", houseHandler.CreateHouse)
			rep.GET("/houses", houseHandler.ListHouses)
			rep.POST("/houses/csv", houseHandler.ImportHousesCSV)
			rep.GET("/houses/unassigned", assignmentHandler.ListUnassignedHouses)
			rep.PUT("/houses/:house_id", houseHandler.UpdateHouse)
			rep.PUT("/houses/:house_id/chat-link", houseHandler.SetChatLink)

			// Компания и аварийные службы
			rep.GET("/company", commonReferenceHandler.GetCompany)
			rep.PUT("/company", companyHandler.UpdateCompany)
			rep.GET("/emergency-services", commonReferenceHandler.ListEmergencyServices)
			rep.POST("/emergency-services/csv", emergencyHandler.ImportEmergencyServicesCSV)

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
		disp.Use(authMW)
		disp.Use(middleware.RequireRole(models.RoleDispatcher))
		{
			// Обращения (только по своим домам)
			disp.GET("/appeals", appealHandler.ListAppeals)
			disp.GET("/appeals/top", appealHandler.TopAppeals)
			disp.GET("/appeals/stats", appealHandler.UnprocessedStats)
			disp.GET("/appeals/:id", appealHandler.GetAppeal)
			disp.POST("/appeals/:id/status", appealHandler.ChangeStatus)

			// Уведомления
			disp.GET("/notifications", notificationHandler.ListNotifications)
			disp.POST("/notifications", notificationHandler.CreateNotification)
			disp.POST("/notifications/:id/revoke", notificationHandler.RevokeNotification)

			// Справочники (темы/причины — нужны для формы создания уведомления)
			disp.GET("/problem-types", referenceHandler.ListProblemTypes)
			disp.GET("/problem-types/:id/reasons", referenceHandler.ListReasons)

			// Дома диспетчера
			disp.GET("/houses", dispatcherHouseHandler.ListHouses)
			disp.GET("/houses/:house_id", dispatcherHouseHandler.GetHouse)
			disp.GET("/houses/:house_id/entrances", dispatcherHouseHandler.ListEntrances)

			// Компания и аварийные службы
			disp.GET("/company", commonReferenceHandler.GetCompany)
			disp.GET("/emergency-services", commonReferenceHandler.ListEmergencyServices)
		}

		res := api.Group("/resident")
		res.Use(authMW)
		res.Use(middleware.RequireRole(models.RoleResident))
		{
			// Обращения
			res.POST("/appeals", residentAppealHandler.CreateAppeal)
			res.GET("/appeals", residentAppealHandler.ListAppeals)
			res.GET("/appeals/:id", residentAppealHandler.GetAppeal)
			res.POST("/appeals/:id/like", residentAppealHandler.Like)
			res.DELETE("/appeals/:id/like", residentAppealHandler.Unlike)

			// Уведомления
			res.GET("/notifications", residentNotificationHandler.ListNotifications)
			res.GET("/notifications/:id", residentNotificationHandler.GetNotification)

			// Дом
			res.GET("/house", residentHouseHandler.GetHouse)
			res.GET("/house/chat-link", residentHouseHandler.ChatLink)
			res.GET("/house/entrances", residentHouseHandler.ListEntrances)

			// Компания и аварийные службы
			res.GET("/company", commonReferenceHandler.GetCompany)
			res.GET("/emergency-services", commonReferenceHandler.ListEmergencyServices)

			// Справочники (те же темы/причины, что у диспетчера — нужны
			// для формы создания обращения)
			res.GET("/problem-types", referenceHandler.ListProblemTypes)
			res.GET("/problem-types/:id/reasons", referenceHandler.ListReasons)
		}
	}

	addr := fmt.Sprintf(":%s", cfg.AppPort)
	log.Printf("Starting server on %s", addr)

	if err := r.Run(addr); err != nil {
		log.Fatalf("failed to start server: %v", err)
	}
}
