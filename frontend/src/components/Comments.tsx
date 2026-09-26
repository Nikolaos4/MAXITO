import type { Appeal } from "../types";
import { HeartIcon } from "./Icons";

export function LikeButton({ appeal, readOnly, onLike }: { appeal: Appeal; readOnly?: boolean; onLike: () => void }) {
  return (
    <button className={`like${appeal.likedByMe ? " is-on" : ""}`} aria-label="Нравится" aria-pressed={appeal.likedByMe}
      disabled={readOnly} onClick={onLike}>
      <HeartIcon width={24} height={24} filled={appeal.likedByMe} />
      <span>{appeal.likes}</span>
    </button>
  );
}
