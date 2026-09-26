package util

import "strconv"

// ParseIntDefault парсит строку в int, возвращая def при пустой строке
// или ошибке парсинга (а не падая с ошибкой) — удобно для query-параметров
// вроде ?page=2, где отсутствие/кривое значение не должно ронять запрос.
func ParseIntDefault(raw string, def int) int {
	if raw == "" {
		return def
	}
	n, err := strconv.Atoi(raw)
	if err != nil {
		return def
	}
	return n
}

// ParseUintList парсит список строк вида ?house_id=1&house_id=2 в []uint,
// молча пропуская значения, которые не удалось распарсить.
func ParseUintList(raw []string) []uint {
	result := make([]uint, 0, len(raw))
	for _, v := range raw {
		n, err := strconv.ParseUint(v, 10, 64)
		if err != nil {
			continue
		}
		result = append(result, uint(n))
	}
	return result
}

// ParseIntList — аналог ParseUintList для знаковых чисел (например, номеров подъездов).
func ParseIntList(raw []string) []int {
	result := make([]int, 0, len(raw))
	for _, v := range raw {
		n, err := strconv.Atoi(v)
		if err != nil {
			continue
		}
		result = append(result, n)
	}
	return result
}
