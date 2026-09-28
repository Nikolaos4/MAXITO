package auth

import (
	"crypto/hmac"
	"crypto/sha256"
	"encoding/hex"
	"encoding/json"
	"errors"
	"net/url"
	"sort"
	"strconv"
	"strings"
	"time"
)

var (
	ErrInitDataMalformed = errors.New("init data is malformed")
	ErrInitDataSignature = errors.New("init data signature is invalid")
	ErrInitDataExpired   = errors.New("init data is expired")
)

// clockSkew — на сколько auth_date может "опережать" наше время (разница часов).
const clockSkew = 5 * time.Minute

// InitDataUser — пользователь MAX из подписанного initData.
type InitDataUser struct {
	ID        int64   `json:"id"`
	FirstName string  `json:"first_name"`
	LastName  string  `json:"last_name"`
	Username  *string `json:"username"`
}

// InitData — проверенные данные запуска мини-приложения.
type InitData struct {
	User     InitDataUser
	AuthDate time.Time
	QueryID  string
}

// ValidateInitData проверяет подпись строки window.WebApp.initData и
// возвращает разобранные данные. Алгоритм — из официальной документации
// MAX (dev.max.ru/docs/webapps/validation):
//
//  1. разбить по "&" на пары key=value, вынуть hash (ровно один);
//  2. URL-декодировать значения;
//  3. отсортировать пары по ключу a→z;
//  4. склеить "key=value" через "\n" — это launch_params;
//  5. signature = hex(HMAC_SHA256(secretKey, launch_params)),
//     где secretKey = HMAC_SHA256("WebAppData", BOT_TOKEN) — уже посчитан
//     заранее и передаётся сюда, сам токен бота бэкенду не нужен;
//  6. сравнить с hash (в постоянное время).
//
// maxAge ограничивает возраст auth_date, чтобы перехваченную строку нельзя
// было использовать повторно бесконечно.
func ValidateInitData(raw string, secretKey []byte, maxAge time.Duration, now time.Time) (*InitData, error) {
	if raw == "" || len(secretKey) == 0 {
		return nil, ErrInitDataMalformed
	}

	type pair struct{ key, value string }
	var pairs []pair
	seen := make(map[string]bool)
	var gotHash string
	hashCount := 0

	for _, part := range strings.Split(raw, "&") {
		if part == "" {
			continue
		}
		key, value, ok := strings.Cut(part, "=")
		if !ok || key == "" {
			return nil, ErrInitDataMalformed
		}
		// PathUnescape, а не QueryUnescape: он не превращает "+" в пробел,
		// то есть ведёт себя как decodeURIComponent из примера в документации.
		decoded, err := url.PathUnescape(value)
		if err != nil {
			return nil, ErrInitDataMalformed
		}

		if key == "hash" {
			hashCount++
			gotHash = decoded
			continue
		}
		// Повторяющийся ключ — неоднозначность, которой можно воспользоваться
		// для подмены значений; такие данные не принимаем.
		if seen[key] {
			return nil, ErrInitDataMalformed
		}
		seen[key] = true
		pairs = append(pairs, pair{key, decoded})
	}
	if hashCount != 1 {
		return nil, ErrInitDataMalformed
	}

	sort.Slice(pairs, func(i, j int) bool { return pairs[i].key < pairs[j].key })

	lines := make([]string, len(pairs))
	for i, p := range pairs {
		lines[i] = p.key + "=" + p.value
	}
	launchParams := strings.Join(lines, "\n")

	mac := hmac.New(sha256.New, secretKey)
	mac.Write([]byte(launchParams))
	expected := mac.Sum(nil)

	got, err := hex.DecodeString(gotHash)
	if err != nil || !hmac.Equal(got, expected) {
		return nil, ErrInitDataSignature
	}

	// Подпись верна — теперь можно доверять содержимому.
	values := make(map[string]string, len(pairs))
	for _, p := range pairs {
		values[p.key] = p.value
	}

	authUnix, err := strconv.ParseInt(values["auth_date"], 10, 64)
	if err != nil || authUnix <= 0 {
		return nil, ErrInitDataMalformed
	}
	authDate := time.Unix(authUnix, 0)
	if authDate.After(now.Add(clockSkew)) {
		return nil, ErrInitDataMalformed
	}
	if now.Sub(authDate) > maxAge {
		return nil, ErrInitDataExpired
	}

	var user InitDataUser
	if err := json.Unmarshal([]byte(values["user"]), &user); err != nil || user.ID == 0 {
		return nil, ErrInitDataMalformed
	}

	return &InitData{User: user, AuthDate: authDate, QueryID: values["query_id"]}, nil
}
