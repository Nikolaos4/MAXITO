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
	AuthorID       *uint // используется жителем для фильтра "только мои"
	Page           int
	PageSize       int
}

// openStatuses — статусы, которые считаются "ещё не закрытыми" для целей
// поиска дублей: обращение, которое уже выполнено или отклонено, дублем
// не считается — по нему можно создавать новое обращение заново.
var openStatuses = []models.AppealStatus{
	models.StatusAccepted, models.StatusInProgress, models.StatusNeedInfo,
}

// FindOpenDuplicate ищет самое старое ещё не закрытое обращение по той же
// причине В ТОМ ЖЕ доме И ПОДЪЕЗДЕ (точное совпадение entrance_number,
// включая случай "весь дом" — nil совпадает только с nil). Обращения на
// один подъезд и на весь дом дублями друг друга не считаются, как и
// обращения на разные подъезды. Возвращает gorm.ErrRecordNotFound, если
// дублей нет.
func (r *AppealRepository) FindOpenDuplicate(houseID, reasonID uint, entranceNumber *int) (*models.Appeal, error) {
	q := r.db.
		Where("house_id = ? AND reason_id = ?", houseID, reasonID).
		Where("status IN ?", openStatuses)

	if entranceNumber != nil {
		q = q.Where("entrance_number = ?", *entranceNumber)
	} else {
		q = q.Where("entrance_number IS NULL")
	}

	var appeal models.Appeal
	err := q.Order("created_at ASC").First(&appeal).Error
	if err != nil {
		return nil, err
	}
	return &appeal, nil
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

// AppealWithLikes — обращение с числом лайков, посчитанным в том же
// запросе, что и сортировка по ним (без лишнего N+1 на каждую строку).
type AppealWithLikes struct {
	models.Appeal
	LikesCount int64 `json:"likes_count"`
}

// List возвращает обращения по фильтру, отсортированные по количеству
// лайков (убыв.), затем по дате создания (новые выше), с пагинацией.
// Возвращает также total — число подходящих под фильтр обращений без учёта пагинации.
func (r *AppealRepository) List(filter AppealFilter) ([]AppealWithLikes, int64, error) {
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
		return []AppealWithLikes{}, 0, nil
	}

	// Сортировка по количеству лайков требует JOIN + GROUP BY, поэтому
	// сначала отдельным запросом получаем ID нужной страницы в нужном
	// порядке (и заодно само число лайков — чтобы не считать его ещё раз),
	// а затем одним запросом с Preload догружаем сами объекты — так Preload
	// не приходится городить поверх агрегатного запроса.
	type idRow struct {
		ID    uint
		Likes int64
	}
	var idRows []idRow

	idQuery := r.db.Table("appeals").
		Joins("LEFT JOIN appeal_subscriptions ON appeal_subscriptions.appeal_id = appeals.id")
	idQuery = applyAppealFilters(idQuery, filter)

	err := idQuery.
		Select("appeals.id, COUNT(appeal_subscriptions.id) as likes").
		Group("appeals.id").
		Order("COUNT(appeal_subscriptions.id) DESC, appeals.created_at DESC").
		Limit(filter.PageSize).
		Offset((filter.Page - 1) * filter.PageSize).
		Scan(&idRows).Error
	if err != nil {
		return nil, 0, err
	}
	if len(idRows) == 0 {
		return []AppealWithLikes{}, total, nil
	}

	ids := make([]uint, len(idRows))
	order := make(map[uint]int, len(idRows))
	likesByID := make(map[uint]int64, len(idRows))
	for i, row := range idRows {
		ids[i] = row.ID
		order[row.ID] = i
		likesByID[row.ID] = row.Likes
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

	result := make([]AppealWithLikes, len(appeals))
	for i, a := range appeals {
		result[i] = AppealWithLikes{Appeal: a, LikesCount: likesByID[a.ID]}
	}

	return result, total, nil
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
	if f.AuthorID != nil {
		q = q.Where("appeals.author_id = ?", *f.AuthorID)
	}
	return q
}
