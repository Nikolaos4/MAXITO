package common

import (
	"fmt"
	"net/http"
	"os"
	"path/filepath"
	"strings"

	"maxito/internal/middleware"
	"maxito/internal/util"

	"github.com/gin-gonic/gin"
)

const maxUploadSize = 10 << 20 // 10 МБ

var allowedImageExtensions = map[string]bool{
	".jpg":  true,
	".jpeg": true,
	".png":  true,
	".webp": true,
	".gif":  true,
}

type UploadHandler struct {
	uploadDir string
}

func NewUploadHandler(uploadDir string) *UploadHandler {
	return &UploadHandler{uploadDir: uploadDir}
}

// Upload — общая загрузка файла: фото к обращению жителя, фото-подтверждение
// к смене статуса диспетчером и т.п. Не привязан к роли — ограничения
// одинаковые для всех, заводить отдельный эндпоинт под каждую роль незачем.
// Возвращает {"url": "https://.../uploads/xxxx.jpg"} — эту строку дальше
// передают как есть в photo_url / photo_urls.
func (h *UploadHandler) Upload(c *gin.Context) {
	currentUser := middleware.GetCurrentUser(c)
	if currentUser == nil {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "unauthorized"})
		return
	}

	fileHeader, err := c.FormFile("file")
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "file is required (multipart field 'file')"})
		return
	}

	if fileHeader.Size > maxUploadSize {
		c.JSON(http.StatusBadRequest, gin.H{"error": "file is too large (max 10MB)"})
		return
	}

	ext := strings.ToLower(filepath.Ext(fileHeader.Filename))
	if !allowedImageExtensions[ext] {
		c.JSON(http.StatusBadRequest, gin.H{"error": "unsupported file type; allowed: jpg, jpeg, png, webp, gif"})
		return
	}

	randomName, err := util.RandomHex(16)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "failed to generate filename"})
		return
	}
	filename := randomName + ext

	if err := os.MkdirAll(h.uploadDir, 0o755); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "failed to prepare upload directory"})
		return
	}

	destPath := filepath.Join(h.uploadDir, filename)
	if err := c.SaveUploadedFile(fileHeader, destPath); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "failed to save file"})
		return
	}

	c.JSON(http.StatusCreated, gin.H{"url": buildFileURL(c, "/uploads/"+filename)})
}

// buildFileURL собирает абсолютный URL из текущего запроса (схема+хост),
// чтобы не заводить отдельную переменную окружения с публичным доменом —
// он и так есть в каждом входящем запросе.
func buildFileURL(c *gin.Context, relPath string) string {
	scheme := "http"
	if c.Request.TLS != nil || c.GetHeader("X-Forwarded-Proto") == "https" {
		scheme = "https"
	}
	return fmt.Sprintf("%s://%s%s", scheme, c.Request.Host, relPath)
}
