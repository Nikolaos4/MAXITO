import { useEffect } from "react";

const TOAST_MS = 3500;

/** Всплывающее уведомление: само исчезает через несколько секунд. */
export function Toast({ message, onHide }: { message: string; onHide: () => void }) {
  useEffect(() => {
    const t = setTimeout(onHide, TOAST_MS);
    return () => clearTimeout(t);
  }, [message, onHide]);

  return <div className="toast" role="status">{message}</div>;
}
