/**
 * 3ii · el último momento en que se abrió cada espacio, en este dispositivo.
 * TS puro. Sirve para ordenar la lista de Compartidos (lo que usás va primero);
 * es un dato de comodidad, no un hecho de la cuenta: si falta o está roto, la
 * lista se ordena por nombre.
 */

/** Id del espacio → cuándo se abrió por última vez (ms desde 1970). */
export type OpenTimes = Record<string, number>;

/** No se guarda para siempre: con más espacios que esto se olvidan los más viejos. */
export const MAX_REMEMBERED_SPACES = 50;

/** Tolerante: cualquier cosa que no sea un mapa de momentos válidos se descarta. */
export function decodeOpenTimes(raw: string | null): OpenTimes {
  if (raw == null || raw === '') return {};

  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch {
    return {};
  }
  if (typeof parsed !== 'object' || parsed === null || Array.isArray(parsed)) return {};

  const times: OpenTimes = {};
  for (const [id, value] of Object.entries(parsed)) {
    if (typeof value === 'number' && Number.isFinite(value) && value >= 0) times[id] = value;
  }
  return times;
}

export function encodeOpenTimes(times: OpenTimes): string {
  return JSON.stringify(times);
}

/** Anota que `spaceId` se abrió ahora, sin tocar el mapa que recibe. */
export function recordOpen(times: OpenTimes, spaceId: string, now: number): OpenTimes {
  const next = { ...times, [spaceId]: now };

  const entries = Object.entries(next);
  if (entries.length <= MAX_REMEMBERED_SPACES) return next;

  return Object.fromEntries(
    entries.sort((a, b) => b[1] - a[1]).slice(0, MAX_REMEMBERED_SPACES),
  );
}
