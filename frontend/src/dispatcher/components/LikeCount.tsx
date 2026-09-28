import { HeartIcon } from "../../components/Icons";
import type { Appeal } from "../../types";

/** Диспетчер лайки не ставит — только видит число подписок жителей (для сортировки). */
export function LikeCount({ appeal }: { appeal: Appeal }) {
  return (
    <span className="like like--readonly" aria-label={`${appeal.likes} лайков`}>
      {/* Диспетчер не может лайкнуть обращение — заливка сердечка означает
          «лайкнул я», а не «есть хотя бы один лайк», поэтому она здесь не
          нужна: иначе выглядит так, будто диспетчер уже поставил лайк. */}
      <HeartIcon width={24} height={24} />
      <span>{appeal.likes}</span>
    </span>
  );
}
