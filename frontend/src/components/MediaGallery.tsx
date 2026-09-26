import { useEffect, useState } from "react";
import type { Attachment } from "../types";
import { CloseIcon } from "./Icons";

/** Сгруппированные квадратные превью; по нажатию открывается просмотр на весь экран. */
export function MediaGallery({ items }: { items: Attachment[] }) {
  const [current, setCurrent] = useState<number | null>(null);
  const shown = current === null ? null : items[current];

  useEffect(() => {
    if (current === null) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setCurrent(null);
      if (e.key === "ArrowLeft") setCurrent((i) => (i === null ? i : (i + items.length - 1) % items.length));
      if (e.key === "ArrowRight") setCurrent((i) => (i === null ? i : (i + 1) % items.length));
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [current, items.length]);

  return (
    <>
      <div className="thumbs">
        {items.map((a, i) => (
          <button key={a.name + i} className="thumb" aria-label={`Открыть ${a.name}`} disabled={!a.url}
            onClick={() => setCurrent(i)}>
            {a.kind === "image" ? (
              <img src={a.url} alt={a.name} loading="lazy" />
            ) : a.url ? (
              <>
                <video src={a.url} preload="metadata" muted playsInline />
                <span className="thumb__play" aria-hidden>▶</span>
              </>
            ) : (
              <span className="thumb__missing">Видео недоступно в демо</span>
            )}
          </button>
        ))}
      </div>

      {shown && (
        <div className="lightbox" role="dialog" aria-modal onClick={() => setCurrent(null)}>
          <button className="lightbox__close" aria-label="Закрыть" onClick={() => setCurrent(null)}>
            <CloseIcon width={28} height={28} />
          </button>
          <div className="lightbox__body" onClick={(e) => e.stopPropagation()}>
            {shown.kind === "image" ? (
              <img src={shown.url} alt={shown.name} />
            ) : (
              <video key={shown.url} src={shown.url} controls autoPlay playsInline />
            )}
          </div>
          {items.length > 1 && (
            <div className="lightbox__nav" onClick={(e) => e.stopPropagation()}>
              <button aria-label="Предыдущее" onClick={() => setCurrent((current! + items.length - 1) % items.length)}>‹</button>
              <span>{current! + 1} / {items.length}</span>
              <button aria-label="Следующее" onClick={() => setCurrent((current! + 1) % items.length)}>›</button>
            </div>
          )}
        </div>
      )}
    </>
  );
}
