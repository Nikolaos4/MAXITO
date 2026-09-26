import { CloseIcon } from "./Icons";

export function Chip({ children, onRemove }: { children: React.ReactNode; onRemove?: () => void }) {
  return (
    <span className="chip">
      {children}
      {onRemove && (
        <button type="button" className="chip__x" aria-label="Убрать" onClick={onRemove}>
          <CloseIcon width={10} height={10} strokeWidth={2.4} />
        </button>
      )}
    </span>
  );
}
