const p = (n: number) => String(n).padStart(2, "0");

export function formatDate(iso: string) {
  const d = new Date(iso);
  return `${p(d.getDate())}.${p(d.getMonth() + 1)}.${d.getFullYear()}`;
}

export function formatTime(iso: string) {
  const d = new Date(iso);
  return `${p(d.getHours())}:${p(d.getMinutes())}`;
}

/** «жалоба» с правильным склонением */
export function plural(n: number, one: string, few: string, many: string) {
  const m10 = n % 10, m100 = n % 100;
  if (m10 === 1 && m100 !== 11) return one;
  if (m10 >= 2 && m10 <= 4 && (m100 < 10 || m100 >= 20)) return few;
  return many;
}
