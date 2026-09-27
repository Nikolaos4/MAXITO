package util

import (
	"fmt"
	"regexp"
)

var nonDigitRe = regexp.MustCompile(`\D`)

// NormalizePhone приводит номер телефона к единому формату +7XXXXXXXXXX
// и проверяет, что он в принципе похож на российский мобильный номер.
//
// Допускаются любые написания с пробелами/скобками/дефисами и разными
// ведущими цифрами: "+7 999 123-45-67", "8(999)1234567", "9991234567".
func NormalizePhone(raw string) (string, error) {
	digits := nonDigitRe.ReplaceAllString(raw, "")

	switch {
	case len(digits) == 11 && (digits[0] == '7' || digits[0] == '8'):
		digits = "7" + digits[1:]
	case len(digits) == 10 && digits[0] == '9':
		digits = "7" + digits
	default:
		return "", fmt.Errorf("некорректный формат номера телефона: %q", raw)
	}

	return "+" + digits, nil
}
