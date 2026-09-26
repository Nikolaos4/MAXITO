import { ArrowLeftIcon } from "./Icons";

/** Заголовок страницы; стрелка «назад» слева от него, если есть куда возвращаться. */
export function PageHead({ title, onBack }: { title: string; onBack?: () => void }) {
  return (
    <div className="page-head">
      {onBack && (
        <button className="page-head__back" aria-label="Назад" onClick={onBack}>
          <ArrowLeftIcon width={28} height={28} strokeWidth={2} />
        </button>
      )}
      <h1 className="page-title">{title}</h1>
    </div>
  );
}
