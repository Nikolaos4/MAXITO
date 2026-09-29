// Package notify отправляет боту события для рассылки пользователям MAX —
// по контракту из NOTIFY_API.md. Бэкенд решает "кого", бот решает "что
// написать": сюда передаются только сырые данные события, текст
// сообщений здесь не собирается.
package notify

import (
	"bytes"
	"context"
	"encoding/json"
	"log"
	"net/http"
	"time"
)

const requestTimeout = 5 * time.Second

type Client struct {
	url         string
	internalKey string
	httpClient  *http.Client
}

// NewClient. Пустой url отключает отправку — вызовы становятся no-op
// (используется, если адрес бота ещё не настроен, чтобы не падать).
func NewClient(url, internalKey string) *Client {
	return &Client{
		url:         url,
		internalKey: internalKey,
		httpClient:  &http.Client{Timeout: requestTimeout},
	}
}

type requestBody struct {
	Type       string      `json:"type"`
	MaxUserIDs []string    `json:"max_user_ids"`
	Payload    interface{} `json:"payload"`
}

// send — асинхронно, без ретраев: вызывается уже ПОСЛЕ успешного commit
// основного действия, недоступность бота не должна задерживать или
// ронять ответ пользователю. Ошибки только логируются.
func (c *Client) send(eventType string, maxUserIDs []string, payload interface{}) {
	if c.url == "" {
		return // адрес бота не настроен — молча выходим
	}
	if len(maxUserIDs) == 0 {
		return // некого оповещать (например, все получатели ещё не открывали бота)
	}

	body, err := json.Marshal(requestBody{Type: eventType, MaxUserIDs: maxUserIDs, Payload: payload})
	if err != nil {
		log.Printf("notify: failed to marshal %s payload: %v", eventType, err)
		return
	}

	go func() {
		ctx, cancel := context.WithTimeout(context.Background(), requestTimeout)
		defer cancel()

		req, err := http.NewRequestWithContext(ctx, http.MethodPost, c.url, bytes.NewReader(body))
		if err != nil {
			log.Printf("notify: failed to build %s request: %v", eventType, err)
			return
		}
		req.Header.Set("Content-Type", "application/json")
		req.Header.Set("X-Internal-Key", c.internalKey)

		resp, err := c.httpClient.Do(req)
		if err != nil {
			log.Printf("notify: %s delivery failed: %v", eventType, err)
			return
		}
		defer resp.Body.Close()
		if resp.StatusCode != http.StatusOK {
			log.Printf("notify: %s got HTTP %d from bot", eventType, resp.StatusCode)
		}
	}()
}

// ---------- appeal_created ----------

type AppealCreatedPayload struct {
	AppealID         uint   `json:"appeal_id"`
	ProblemTypeTitle string `json:"problem_type_title"`
	HouseAddress     string `json:"house_address"`
	EntranceNumber   *int   `json:"entrance_number,omitempty"`
	Description      string `json:"description"`
}

// AppealCreated — диспетчерам дома, сразу после создания обращения.
func (c *Client) AppealCreated(maxUserIDs []string, p AppealCreatedPayload) {
	c.send("appeal_created", maxUserIDs, p)
}

// ---------- appeal_status_changed ----------

type AppealStatusChangedPayload struct {
	AppealID         uint   `json:"appeal_id"`
	ProblemTypeTitle string `json:"problem_type_title"`
	HouseAddress     string `json:"house_address"`
	ToStatus         string `json:"to_status"`
	Comment          string `json:"comment,omitempty"`
}

// AppealStatusChanged — автору обращения при любой смене статуса.
func (c *Client) AppealStatusChanged(maxUserIDs []string, p AppealStatusChangedPayload) {
	c.send("appeal_status_changed", maxUserIDs, p)
}

// ---------- notification_created ----------

type NotificationCreatedPayload struct {
	Title        string    `json:"title"`
	Body         string    `json:"body"`
	HouseAddress string    `json:"house_address"`
	StartsAt     time.Time `json:"starts_at"`
	EndsAt       time.Time `json:"ends_at"`
}

// NotificationCreated — жителям дома/подъезда при публикации уведомления.
func (c *Client) NotificationCreated(maxUserIDs []string, p NotificationCreatedPayload) {
	c.send("notification_created", maxUserIDs, p)
}
