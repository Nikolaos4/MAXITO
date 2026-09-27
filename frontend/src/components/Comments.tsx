import type { Appeal } from "../types";
import { HeartIcon } from "./Icons";

export function LikeButton({ appeal, disabled, title, onLike }: {
  appeal: Appeal; disabled?: boolean; title?: string; onLike: () => void;
}) {
  return (
    <button className={`like${appeal.likedByMe ? " is-on" : ""}`} aria-label="Нравится" aria-pressed={appeal.likedByMe}
      disabled={disabled} title={title} onClick={onLike}>
      <HeartIcon width={24} height={24} filled={appeal.likedByMe} />
      <span>{appeal.likes}</span>
    </button>
  );
}
