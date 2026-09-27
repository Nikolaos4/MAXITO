import { HeartIcon } from "../../components/Icons";
import type { Appeal } from "../../types";

/** Диспетчер лайки не ставит — только видит число подписок жителей (для сортировки). */
export function LikeCount({ appeal }: { appeal: Appeal }) {
  return (
    <span className="like like--readonly" aria-label={`${appeal.likes} лайков`}>
      <HeartIcon width={24} height={24} filled={appeal.likes > 0} />
      <span>{appeal.likes}</span>
    </span>
  );
}
