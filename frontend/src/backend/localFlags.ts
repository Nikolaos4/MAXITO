/**
 * Бэкенд не хранит две вещи, которые нужны интерфейсу:
 *  - «прочитал ли этот житель/диспетчер конкретное уведомление»;
 *  - «лайкнул ли текущий житель конкретное обращение» (список лайкнутых им
 *    самим нигде не отдаётся — только общее число лайков).
 * Раз бэкенд трогать нельзя, оба флага держим локально в этом браузере
 * (localStorage). Это не переживёт смену устройства — see итоговое
 * сообщение с оговоркой.
 */
function loadSet(key: string): Set<number> {
  try {
    const raw = localStorage.getItem(key);
    return raw ? new Set(JSON.parse(raw) as number[]) : new Set();
  } catch {
    return new Set();
  }
}

function saveSet(key: string, set: Set<number>) {
  try { localStorage.setItem(key, JSON.stringify([...set])); } catch { /* ignore */ }
}

export function isMarked(key: string, id: number): boolean {
  return loadSet(key).has(id);
}

export function mark(key: string, ids: number[]) {
  const set = loadSet(key);
  ids.forEach((id) => set.add(id));
  saveSet(key, set);
}

export function unmark(key: string, id: number) {
  const set = loadSet(key);
  set.delete(id);
  saveSet(key, set);
}

export function countUnmarked(key: string, ids: number[]): number {
  const set = loadSet(key);
  return ids.filter((id) => !set.has(id)).length;
}
