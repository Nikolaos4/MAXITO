// Package apidoc содержит только вспомогательные типы для генерации
// OpenAPI-спецификации (swaggo/swag) — реального кода приложения тут нет.
// Обработчики почти everywhere отвечают на ошибку через gin.H{"error": ...},
// а swag не умеет строить схему из gin.H — для @Failure нужен именованный
// тип, поэтому он вынесен сюда одним общим на все пакеты хендлеров.
package apidoc

// ErrorResponse — общий формат ошибки для всех эндпоинтов.
type ErrorResponse struct {
	Error string `json:"error" example:"invalid request"`
	// Code — машиночитаемый код ошибки; присутствует только у части
	// эндпоинтов (см. описание конкретного эндпоинта), у остальных отсутствует.
	Code string `json:"code,omitempty" example:"bad_request"`
}
