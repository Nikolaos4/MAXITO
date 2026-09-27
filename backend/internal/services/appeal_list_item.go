package services

import "maxito/internal/repository"

// AppealListItem — обращение в списке с числом лайков и отметкой, лайкнул
// ли его сам текущий пользователь. Форма одна на диспетчера и жителя.
type AppealListItem struct {
	repository.AppealWithLikes
	LikedByMe bool `json:"liked_by_me"`
}

// attachLikedByMe достраивает LikedByMe для каждого элемента списка одним
// дополнительным запросом (вместо N+1 на каждую строку).
func attachLikedByMe(
	items []repository.AppealWithLikes, userID uint, subRepo *repository.AppealSubscriptionRepository,
) ([]AppealListItem, error) {
	ids := make([]uint, len(items))
	for i, it := range items {
		ids[i] = it.ID
	}

	liked, err := subRepo.ListLikedAppealIDs(userID, ids)
	if err != nil {
		return nil, err
	}

	result := make([]AppealListItem, len(items))
	for i, it := range items {
		result[i] = AppealListItem{AppealWithLikes: it, LikedByMe: liked[it.ID]}
	}
	return result, nil
}
