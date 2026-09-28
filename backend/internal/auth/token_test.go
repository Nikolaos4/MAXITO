package auth

import (
	"testing"
	"time"

	"maxito/internal/models"

	"github.com/golang-jwt/jwt/v5"
)

const testJWTSecret = "0123456789abcdef0123456789abcdef"

func TestToken_RoundTripAndAttacks(t *testing.T) {
	s := NewTokenService(testJWTSecret, time.Hour)
	now := time.Now()

	tok, exp, err := s.Issue(&models.User{ID: 42}, now)
	if err != nil || !exp.After(now) {
		t.Fatalf("issue: %v", err)
	}
	if c, err := s.Parse(tok); err != nil || c.UserID != 42 {
		t.Fatalf("parse: %v %+v", err, c)
	}

	if _, err := NewTokenService("ffffffffffffffffffffffffffffffff", time.Hour).Parse(tok); err == nil {
		t.Fatal("accepted with wrong secret")
	}

	old, _, _ := s.Issue(&models.User{ID: 42}, now.Add(-2*time.Hour))
	if _, err := s.Parse(old); err == nil {
		t.Fatal("accepted expired token")
	}

	none := jwt.NewWithClaims(jwt.SigningMethodNone, Claims{
		UserID:           42,
		RegisteredClaims: jwt.RegisteredClaims{ExpiresAt: jwt.NewNumericDate(now.Add(time.Hour))},
	})
	noneStr, _ := none.SignedString(jwt.UnsafeAllowNoneSignatureType)
	if _, err := s.Parse(noneStr); err == nil {
		t.Fatal("accepted alg=none")
	}

	noExp := jwt.NewWithClaims(jwt.SigningMethodHS256, Claims{UserID: 42})
	noExpStr, _ := noExp.SignedString([]byte(testJWTSecret))
	if _, err := s.Parse(noExpStr); err == nil {
		t.Fatal("accepted token without exp")
	}

	if _, err := s.Parse("a.b.c"); err == nil {
		t.Fatal("accepted garbage")
	}
}
