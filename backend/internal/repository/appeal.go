package repository

import (
	"sort"

	"maxito/internal/models"

	"gorm.io/gorm"
)

// AppealFilter — набор необязательных фильтров для списка обращений.
// Пустой слайс = фильтр не применяется (значение не ограничивается).
type AppealFilter struct {
	HouseIDs       []uint
	Statuses       []models.AppealStatus
	EntranceNums   []int
	ProblemTypeIDs []uint
	Page           int
	PageSize       int
}

type AppealRepository struct {
	db *gorm.DB
}

func NewAppealRepository(db *gorm.DB) *AppealRepository {
	return &AppealRepository{db: db}
}

func (r *AppealRepository) Create(appeal *models.Appeal) error {
	return r.db.Create(appeal).Error
}

func (r *AppealRepository) GetByID(id uint) (*models.Appeal, error) {
	var appeal models.Appeal
	err := r.db.
		Preload("House").
		Preload("Author").
		Preload("ProblemType").
		Preload("Reason").
		First(&appeal, id).Error
	if err != nil {
		return nil, err
	}
	return &appeal, nil
}

func (r *AppealRepository) CountLikes(appealID uint) (int64, error) {
	var count int64
	err := r.db.Model(&models.AppealSubscription{}).Where("appeal_id = ?", appealID).Count(&count).Error
	return count, err
}

// List возвращает обращения по фильтру, отсортированные по количеству
// лайков (убыв.), затем по дате создания (новые выше), с пагинацией.
// Возвращает также total — число подходящих под фильтр обращений без учёта пагинации.
func (r *AppealRepository) List(filter AppealFilter) ([]models.Appeal, int64, error) {
	if filter.Page < 1 {
		filter.Page = 1
	}
	if filter.PageSize < 1 {
		filter.PageSize = 20
	}

	base := r.db.Model(&models.Appeal{})
	base = applyAppealFilters(base, filter)

	var total int64
	if err := base.Count(&total).Error; err != nil {
		return nil, 0, err
	}
	if total == 0 {
		return []models.Appeal{}, 0, nil
	}

	// Сортировка по количеству лайков требует JOIN + GROUP BY, поэтому
	// сначала отдельным запросом получаем ID нужной страницы в нужном
	// порядке, а затем одним запросом с Preload догружаем сами объекты —
	// так Preload не приходится городить поверх агрегатного запроса.
	type idRow struct {
		ID uint
	}
	var idRows []idRow

	idQuery := r.db.Table("appeals").
		Joins("LEFT JOIN appeal_subscriptions ON appeal_subscriptions.appeal_id = appeals.id")
	idQuery = applyAppealFilters(idQuery, filter)

	err := idQuery.
		Select("appeals.id").
		Group("appeals.id").
		Order("COUNT(appeal_subscriptions.id) DESC, appeals.created_at DESC").
		Limit(filter.PageSize).
		Offset((filter.Page - 1) * filter.PageSize).
		Scan(&idRows).Error
	if err != nil {
		return nil, 0, err
	}
	if len(idRows) == 0 {
		return []models.Appeal{}, total, nil
	}

	ids := make([]uint, len(idRows))
	order := make(map[uint]int, len(idRows))
	for i, row := range idRows {
		ids[i] = row.ID
		order[row.ID] = i
	}

	var appeals []models.Appeal
	err = r.db.
		Preload("House").
		Preload("Author").
		Preload("ProblemType").
		Preload("Reason").
		Where("id IN ?", ids).
		Find(&appeals).Error
	if err != nil {
		return nil, 0, err
	}

	// "IN" не гарантирует порядок — восстанавливаем порядок по лайкам из idRows.
	sort.Slice(appeals, func(i, j int) bool {
		return order[appeals[i].ID] < order[appeals[j].ID]
	})

	return appeals, total, nil
}

// HouseStatusCount — сырая строка агрегата "дом + статус + количество",
// вход для подсчёта статистики по необработанным обращениям.
type HouseStatusCount struct {
	HouseID uint
	Status  models.AppealStatus
	Count   int64
}

// CountUnprocessedByHouse считает обращения в "неразобранных" статусах
// (accepted, in_progress, need_info) по каждому из указанных домов,
// сгруппированные по статусу. Дома без единого обращения в выборке
// просто не попадут в результат — их нулями достраивает вызывающий код.
func (r *AppealRepository) CountUnprocessedByHouse(houseIDs []uint) ([]HouseStatusCount, error) {
	if len(houseIDs) == 0 {
		return nil, nil
	}

	var rows []HouseStatusCount
	err := r.db.Model(&models.Appeal{}).
		Select("house_id, status, COUNT(*) as count").
		Where("house_id IN ?", houseIDs).
		Where("status IN ?", []models.AppealStatus{
			models.StatusAccepted, models.StatusInProgress, models.StatusNeedInfo,
		}).
		Group("house_id, status").
		Scan(&rows).Error
	return rows, err
}

func applyAppealFilters(q *gorm.DB, f AppealFilter) *gorm.DB {
	if len(f.HouseIDs) > 0 {
		q = q.Where("appeals.house_id IN ?", f.HouseIDs)
	}
	if len(f.Statuses) > 0 {
		q = q.Where("appeals.status IN ?", f.Statuses)
	}
	if len(f.EntranceNums) > 0 {
		q = q.Where("appeals.entrance_number IN ?", f.EntranceNums)
	}
	if len(f.ProblemTypeIDs) > 0 {
		q = q.Where("appeals.problem_type_id IN ?", f.ProblemTypeIDs)
	}
	return q
}
