package util

import (
	"crypto/rand"
	"encoding/hex"
	"fmt"
)

// RandomHex генерирует случайную шестнадцатеричную строку длиной n*2 символов —
// используется для имён загружаемых файлов, чтобы избежать коллизий и не
// давать угадывать чужие ссылки по порядку.
func RandomHex(n int) (string, error) {
	bytes := make([]byte, n)
	if _, err := rand.Read(bytes); err != nil {
		return "", fmt.Errorf("failed to generate random bytes: %w", err)
	}
	return hex.EncodeToString(bytes), nil
}
