export const MAX_PHOTOS = 3;
export const MAX_VIDEOS = 1;
export const MAX_VIDEO_SECONDS = 60;
const MAX_PHOTO_MB = 10;
const MAX_VIDEO_MB = 100;

// То же самое, что проверяет бэкенд в UploadHandler.Upload — по расширению
// имени файла, не по содержимому (см. POST /upload). Реальный бэкенд видео
// не принимает вообще — там всё, что не входит в этот список, 400-нется.
export const ALLOWED_PHOTO_EXTENSIONS = [".jpg", ".jpeg", ".png", ".webp", ".gif"];

export const MEDIA_HINT = `До ${MAX_PHOTOS} фото и ${MAX_VIDEOS} видео (не длиннее 1 минуты)`;
export const PHOTO_HINT = `Фото — jpg, png, webp или gif, до ${MAX_PHOTO_MB} МБ`;

export const fileKind = (f: File): "image" | "video" | null =>
  f.type.startsWith("image/") ? "image" : f.type.startsWith("video/") ? "video" : null;

function hasAllowedPhotoExtension(name: string): boolean {
  const dot = name.lastIndexOf(".");
  if (dot === -1) return false;
  return ALLOWED_PHOTO_EXTENSIONS.includes(name.slice(dot).toLowerCase());
}

function videoDuration(file: File): Promise<number> {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file);
    const v = document.createElement("video");
    v.preload = "metadata";
    v.onloadedmetadata = () => { URL.revokeObjectURL(url); resolve(v.duration); };
    v.onerror = () => { URL.revokeObjectURL(url); reject(new Error("unreadable")); };
    v.src = url;
  });
}

/** Проверяет новые файлы с учётом уже выбранных: возвращает принятые и предупреждения. */
export async function checkFiles(existing: File[], incoming: File[]) {
  let photos = existing.filter((f) => fileKind(f) === "image").length;
  let videos = existing.filter((f) => fileKind(f) === "video").length;
  const accepted: File[] = [];
  const warnings = new Set<string>();

  for (const f of incoming) {
    const kind = fileKind(f);
    if (!kind) {
      warnings.add(`${f.name}: можно прикреплять только фото и видео`);
    } else if (kind === "image") {
      if (photos >= MAX_PHOTOS) warnings.add(`Можно прикрепить не более ${MAX_PHOTOS} фото`);
      else if (f.size > MAX_PHOTO_MB * 1024 * 1024) warnings.add(`${f.name}: фото больше ${MAX_PHOTO_MB} МБ`);
      else { accepted.push(f); photos++; }
    } else {
      if (videos >= MAX_VIDEOS) { warnings.add(`Можно прикрепить только ${MAX_VIDEOS} видео`); continue; }
      if (f.size > MAX_VIDEO_MB * 1024 * 1024) { warnings.add(`${f.name}: видео больше ${MAX_VIDEO_MB} МБ`); continue; }
      try {
        if ((await videoDuration(f)) > MAX_VIDEO_SECONDS) {
          warnings.add(`${f.name}: видео длиннее 1 минуты`);
          continue;
        }
      } catch {
        warnings.add(`${f.name}: не удалось прочитать видео`);
        continue;
      }
      accepted.push(f);
      videos++;
    }
  }
  return { accepted, warnings: [...warnings] };
}

/**
 * Строгая проверка под реальный бэкенд (POST /upload) — только фото по
 * белому списку расширений, до maxCount штук, до 10 МБ каждое. Видео тут
 * нет вообще — бэкенд его не принимает. Используется и у жителя
 * (несколько фото к обращению), и у диспетчера (maxCount=1 — фото
 * подтверждения при завершении, бэкенд там ждёт одну ссылку, не массив).
 */
export function checkPhotos(existing: File[], incoming: File[], maxCount: number) {
  const accepted: File[] = [];
  const warnings = new Set<string>();
  let count = existing.length;

  for (const f of incoming) {
    if (count >= maxCount) {
      warnings.add(maxCount === 1 ? "Можно прикрепить только одно фото" : `Можно прикрепить не более ${maxCount} фото`);
      continue;
    }
    if (!hasAllowedPhotoExtension(f.name)) {
      warnings.add(`${f.name}: поддерживаются только jpg, jpeg, png, webp, gif`);
      continue;
    }
    if (f.size > MAX_PHOTO_MB * 1024 * 1024) {
      warnings.add(`${f.name}: фото больше ${MAX_PHOTO_MB} МБ`);
      continue;
    }
    accepted.push(f);
    count++;
  }
  return { accepted, warnings: [...warnings] };
}
