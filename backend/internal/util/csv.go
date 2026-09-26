package util

import (
	"encoding/csv"
	"fmt"
	"io"
	"strings"
)

// ParsedCSV — результат разбора CSV-файла с заголовком.
// Header хранит индекс колонки по её (нормализованному) названию,
// что делает импорт устойчивым к порядку колонок в файле.
type ParsedCSV struct {
	Header  map[string]int
	Records [][]string
}

// ParseCSV читает CSV из r, ожидая первую строку как заголовок.
// requiredColumns — колонки, без которых импорт не имеет смысла;
// их отсутствие возвращает ошибку сразу, не читая тело файла.
func ParseCSV(r io.Reader, requiredColumns []string) (*ParsedCSV, error) {
	reader := csv.NewReader(r)
	reader.TrimLeadingSpace = true
	// Разное число колонок в разных строках (например, необязательная
	// последняя колонка не указана до конца файла) не должно валить весь файл.
	reader.FieldsPerRecord = -1

	headerRow, err := reader.Read()
	if err != nil {
		return nil, fmt.Errorf("не удалось прочитать заголовок CSV: %w", err)
	}

	header := make(map[string]int, len(headerRow))
	for i, col := range headerRow {
		header[strings.ToLower(strings.TrimSpace(col))] = i
	}

	for _, col := range requiredColumns {
		if _, ok := header[col]; !ok {
			return nil, fmt.Errorf("в CSV отсутствует обязательная колонка %q", col)
		}
	}

	var records [][]string
	for {
		record, err := reader.Read()
		if err == io.EOF {
			break
		}
		if err != nil {
			return nil, fmt.Errorf("не удалось прочитать строку CSV: %w", err)
		}
		// Пропускаем полностью пустые строки (частый случай в конце файла).
		if isBlankRecord(record) {
			continue
		}
		records = append(records, record)
	}

	return &ParsedCSV{Header: header, Records: records}, nil
}

// Get безопасно возвращает значение колонки column для строки record.
// Возвращает пустую строку, если колонки нет в заголовке или в этой
// конкретной строке недостаточно полей.
func (p *ParsedCSV) Get(record []string, column string) string {
	idx, ok := p.Header[column]
	if !ok || idx >= len(record) {
		return ""
	}
	return strings.TrimSpace(record[idx])
}

func isBlankRecord(record []string) bool {
	for _, v := range record {
		if strings.TrimSpace(v) != "" {
			return false
		}
	}
	return true
}
