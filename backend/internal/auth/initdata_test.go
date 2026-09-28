package auth

import (
	"encoding/hex"
	"strings"
	"testing"
	"time"
)

// Эталонный вектор посчитан независимой реализацией (Python), которая
// буквально повторяет шаги из dev.max.ru/docs/webapps/validation: из токена
// бота "1234567890:TEST-token_abc" получен secret_key, затем подписаны
// отсортированные пары. В значениях есть кириллица, "+", пробел, "=" и "&".
const (
	testInitData  = "auth_date=1790586624&chat=%7B%22id%22%3A12345%2C%22type%22%3A%22DIALOG%22%7D&ip=192.168.0.1&query_id=4c0ab423-342b-4e45-aea4-2747dbc500cd&start_param=a%2Bb%20c%3Dd%26e&user=%7B%22id%22%3A67890%2C%22first_name%22%3A%22%D0%98%D0%B2%D0%B0%D0%BD%22%2C%22last_name%22%3A%22%D0%9F%D0%B5%D1%82%D1%80%D0%BE%D0%B2%22%2C%22username%22%3Anull%2C%22language_code%22%3A%22ru%22%2C%22photo_url%22%3Anull%7D&hash=37c16e0a9a652054d4d1cd49964b96e3a671175ef369b56f0bc344f8a15cf50a"
	testSecretHex = "068294f8edd20ad11df6d7d461fb7434d9668ad56b09fc3ab6e002b161606030"
	testAuthDate  = 1790586624
)

func testKey(t *testing.T) []byte {
	t.Helper()
	key, err := hex.DecodeString(testSecretHex)
	if err != nil {
		t.Fatal(err)
	}
	return key
}

func testNow() time.Time { return time.Unix(testAuthDate+60, 0) }

func TestValidateInitData_Valid(t *testing.T) {
	d, err := ValidateInitData(testInitData, testKey(t), 24*time.Hour, testNow())
	if err != nil {
		t.Fatalf("expected valid, got %v", err)
	}
	if d.User.ID != 67890 || d.User.FirstName != "Иван" || d.QueryID == "" {
		t.Fatalf("bad parse: %+v", d)
	}
}

func TestValidateInitData_Tampered(t *testing.T) {
	bad := strings.Replace(testInitData, "%3A67890", "%3A11111", 1)
	if bad == testInitData {
		t.Fatal("test setup: nothing replaced")
	}
	if _, err := ValidateInitData(bad, testKey(t), 24*time.Hour, testNow()); err != ErrInitDataSignature {
		t.Fatalf("want signature error, got %v", err)
	}
}

func TestValidateInitData_WrongSecret(t *testing.T) {
	if _, err := ValidateInitData(testInitData, make([]byte, 32), 24*time.Hour, testNow()); err != ErrInitDataSignature {
		t.Fatalf("want signature error, got %v", err)
	}
}

func TestValidateInitData_HashRules(t *testing.T) {
	noHash := testInitData[:strings.Index(testInitData, "&hash=")]
	if _, err := ValidateInitData(noHash, testKey(t), 24*time.Hour, testNow()); err != ErrInitDataMalformed {
		t.Fatalf("missing hash: got %v", err)
	}
	if _, err := ValidateInitData(testInitData+"&hash=00", testKey(t), 24*time.Hour, testNow()); err != ErrInitDataMalformed {
		t.Fatalf("duplicate hash: got %v", err)
	}
	if _, err := ValidateInitData("ip=1.1.1.1&"+testInitData, testKey(t), 24*time.Hour, testNow()); err != ErrInitDataMalformed {
		t.Fatalf("duplicate key: got %v", err)
	}
}

func TestValidateInitData_Age(t *testing.T) {
	if _, err := ValidateInitData(testInitData, testKey(t), time.Hour, time.Unix(testAuthDate+7200, 0)); err != ErrInitDataExpired {
		t.Fatalf("expired: got %v", err)
	}
	if _, err := ValidateInitData(testInitData, testKey(t), 24*time.Hour, time.Unix(testAuthDate-3600, 0)); err != ErrInitDataMalformed {
		t.Fatalf("auth_date in the future: got %v", err)
	}
}

func TestValidateInitData_Garbage(t *testing.T) {
	for _, s := range []string{"", "abc", "a=b", "hash=zz", "=x&hash=00", "%zz=1&hash=00"} {
		if _, err := ValidateInitData(s, testKey(t), time.Hour, testNow()); err == nil {
			t.Fatalf("garbage %q accepted", s)
		}
	}
	if _, err := ValidateInitData(testInitData, nil, time.Hour, testNow()); err == nil {
		t.Fatal("empty secret accepted")
	}
}
