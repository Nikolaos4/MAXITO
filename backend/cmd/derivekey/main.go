// derivekey считает MAX_INITDATA_SECRET — производный ключ для проверки
// подписи initData: HMAC_SHA256("WebAppData", BOT_TOKEN) в hex.
//
// Запуск (токен читается из stdin, чтобы не попасть в историю команд):
//
//	go run ./cmd/derivekey
//
// Полученную строку из 64 символов кладём в .env бэкенда как
// MAX_INITDATA_SECRET. Сам токен бота бэкенду не нужен и хранить его
// в .env бэкенда не надо.
package main

import (
	"bufio"
	"crypto/hmac"
	"crypto/sha256"
	"encoding/hex"
	"fmt"
	"os"
	"strings"
)

func main() {
	fmt.Fprint(os.Stderr, "Вставьте токен бота и нажмите Enter: ")
	line, err := bufio.NewReader(os.Stdin).ReadString('\n')
	token := strings.TrimSpace(line)
	if token == "" {
		if err != nil {
			fmt.Fprintln(os.Stderr, "\nне удалось прочитать токен:", err)
		} else {
			fmt.Fprintln(os.Stderr, "токен пустой")
		}
		os.Exit(1)
	}

	mac := hmac.New(sha256.New, []byte("WebAppData"))
	mac.Write([]byte(token))
	fmt.Println(hex.EncodeToString(mac.Sum(nil)))
}
