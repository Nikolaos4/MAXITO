package database

import (
	"fmt"

	"maxito/internal/models"

	"gorm.io/gorm"
)

type reasonSeed struct {
	Code    string
	Title   string
	IsOther bool
}

type problemTypeSeed struct {
	Code       string
	Title      string
	IsCritical bool
	Reasons    []reasonSeed
}

// referenceData — справочник тем и причин. "Другое" — отдельная тема с
// единственной причиной other_other (IsOther: true); у каждой обычной темы
// тоже есть своя причина "другое" на случай, когда сама тема подходит,
// а из списка причин ничего не подходит.
var referenceData = []problemTypeSeed{
	{
		Code: "elevator", Title: "Лифт", IsCritical: true,
		Reasons: []reasonSeed{
			{Code: "elevator_not_working", Title: "Не работает / стоит"},
			{Code: "elevator_stuck", Title: "Застревает"},
			{Code: "elevator_slow_doors", Title: "Долго едет / плохо закрываются двери"},
			{Code: "elevator_dirty", Title: "Грязный / неприятный запах"},
			{Code: "elevator_broken_panel", Title: "Сломана кнопка / панель / связь с диспетчером"},
			{Code: "elevator_noise", Title: "Сильные рывки / посторонние звуки"},
			{Code: "elevator_other", Title: "Другое", IsOther: true},
		},
	},
	{
		Code: "water", Title: "Вода", IsCritical: true,
		Reasons: []reasonSeed{
			{Code: "water_no_cold", Title: "Нет холодной воды"},
			{Code: "water_no_hot", Title: "Нет горячей воды"},
			{Code: "water_low_pressure", Title: "Слабый напор"},
			{Code: "water_dirty", Title: "Грязная / ржавая / мутная вода"},
			{Code: "water_temp_issue", Title: "Слишком горячая или слишком холодная горячая вода"},
			{Code: "water_leak", Title: "Протечка (стояк, трубы в подъезде)"},
			{Code: "water_other", Title: "Другое", IsOther: true},
		},
	},
	{
		Code: "entrance", Title: "Подъезд",
		Reasons: []reasonSeed{
			{Code: "entrance_dirty", Title: "Грязно / не убирают"},
			{Code: "entrance_smell", Title: "Неприятный запах"},
			{Code: "entrance_broken_intercom", Title: "Сломан домофон / дверь / доводчик"},
			{Code: "entrance_broken_windows", Title: "Разбиты окна / нет стёкол"},
			{Code: "entrance_no_light", Title: "Не работает освещение"},
			{Code: "entrance_damp", Title: "Протечка / сырость / плесень"},
			{Code: "entrance_clutter", Title: "Захламление (коробки, велосипеды, мусор)"},
			{Code: "entrance_other", Title: "Другое", IsOther: true},
		},
	},
	{
		Code: "yard", Title: "Двор",
		Reasons: []reasonSeed{
			{Code: "yard_trash", Title: "Не убран мусор / переполнены контейнеры"},
			{Code: "yard_snow", Title: "Не чистят снег / наледь"},
			{Code: "yard_puddles", Title: "Грязь / лужи / плохое покрытие"},
			{Code: "yard_no_light", Title: "Не работает освещение двора"},
			{Code: "yard_broken_playground", Title: "Сломаны детские / спортивные площадки"},
			{Code: "yard_other", Title: "Другое", IsOther: true},
		},
	},
	{
		Code: "heating", Title: "Отопление", IsCritical: true,
		Reasons: []reasonSeed{
			{Code: "heating_cold_radiators", Title: "Холодные батареи"},
			{Code: "heating_no_heat", Title: "Нет отопления во всём доме / стояке"},
			{Code: "heating_uneven", Title: "Неравномерный прогрев"},
			{Code: "heating_leak", Title: "Протечка радиатора / стояка"},
			{Code: "heating_noise", Title: "Шум / стук в батареях"},
			{Code: "heating_other", Title: "Другое", IsOther: true},
		},
	},
	{
		Code: "electricity", Title: "Электричество", IsCritical: true,
		Reasons: []reasonSeed{
			{Code: "electricity_no_power", Title: "Нет света в квартире / подъезде / доме"},
			{Code: "electricity_flicker", Title: "Мигает свет"},
			{Code: "electricity_breakers", Title: "Выбивает пробки / автоматы"},
			{Code: "electricity_no_entrance_light", Title: "Не работает освещение в подъезде / на этаже"},
			{Code: "electricity_sparks", Title: "Искры / запах гари из щитка"},
			{Code: "electricity_other", Title: "Другое", IsOther: true},
		},
	},
	{
		// Сама тема "Другое" — единственная причина у неё тоже "другое".
		Code: models.ProblemTypeCodeOther, Title: "Другое",
		Reasons: []reasonSeed{
			{Code: "other_other", Title: "Другое", IsOther: true},
		},
	},
}

// SeedReferenceData наполняет справочник тем/причин, если его ещё нет.
// Идемпотентно: ищет по уникальному Code и создаёт только отсутствующее,
// так что безопасно вызывать при каждом старте сервера.
func SeedReferenceData(db *gorm.DB) error {
	for _, pt := range referenceData {
		var problemType models.ProblemType
		err := db.Where("code = ?", pt.Code).First(&problemType).Error
		if err != nil {
			if err != gorm.ErrRecordNotFound {
				return fmt.Errorf("failed to query problem type %q: %w", pt.Code, err)
			}
			problemType = models.ProblemType{
				Code:       pt.Code,
				Title:      pt.Title,
				IsCritical: pt.IsCritical,
			}
			if err := db.Create(&problemType).Error; err != nil {
				return fmt.Errorf("failed to seed problem type %q: %w", pt.Code, err)
			}
		}

		for _, r := range pt.Reasons {
			var reason models.Reason
			err := db.Where("problem_type_id = ? AND code = ?", problemType.ID, r.Code).First(&reason).Error
			if err == nil {
				continue // уже есть
			}
			if err != gorm.ErrRecordNotFound {
				return fmt.Errorf("failed to query reason %q: %w", r.Code, err)
			}
			reason = models.Reason{
				ProblemTypeID: problemType.ID,
				Code:          r.Code,
				Title:         r.Title,
				IsOther:       r.IsOther,
			}
			if err := db.Create(&reason).Error; err != nil {
				return fmt.Errorf("failed to seed reason %q: %w", r.Code, err)
			}
		}
	}
	return nil
}
