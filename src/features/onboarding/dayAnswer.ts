/**
 * T-02 · T-05 · "Sé el día", "Más o menos" y "No sé": el patrón de respuesta
 * para el cierre y el vencimiento de una tarjeta y el día de cobro de un
 * ingreso. TS puro.
 *
 * Qué se guarda: "Sé el día" el día elegido; "Más o menos" 2, 15 o 28 marcado
 * como aproximado; "No sé" sin día. Sin responder, sin día: nadie queda con un
 * día que no eligió.
 */

export type DayMode = 'exact' | 'approx' | 'unknown';
export type DayAnswer = { mode: DayMode | null; day: number | null };
export type StoredDay = { day: number | null; approx: boolean };

/** Principio, Mediados y Fin de mes. */
export const APPROX_PRESETS: readonly { label: string; day: number }[] = [
  { label: 'Principio', day: 2 },
  { label: 'Mediados', day: 15 },
  { label: 'Fin de mes', day: 28 },
];

export function emptyAnswer(): DayAnswer {
  return { mode: null, day: null };
}

/** Cambiar de modo descarta el día; volver a tocar el mismo conserva lo elegido. */
export function chooseMode(answer: DayAnswer, mode: DayMode): DayAnswer {
  if (answer.mode === mode) return answer;
  return { mode, day: null };
}

export function chooseDay(answer: DayAnswer, day: number): DayAnswer {
  return { ...answer, day };
}

export function dayAnswerToStored(answer: DayAnswer): StoredDay {
  if (answer.day == null) return { day: null, approx: false };
  if (answer.mode === 'exact') return { day: answer.day, approx: false };
  if (answer.mode === 'approx' && APPROX_PRESETS.some((preset) => preset.day === answer.day)) {
    return { day: answer.day, approx: true };
  }
  return { day: null, approx: false };
}

/** "No sé" es una respuesta; un modo con el día todavía sin elegir, no. */
export function isAnswered(answer: DayAnswer): boolean {
  if (answer.mode === 'unknown') return true;
  return answer.mode != null && answer.day != null;
}

/**
 * Abre lo ya guardado. `knowExactDay` es "Ya sé el día exacto": el selector
 * abre en "Sé el día" y sin día, para elegir el firme.
 */
export function answerFromStored(
  stored: StoredDay,
  options?: { knowExactDay?: boolean },
): DayAnswer {
  if (options?.knowExactDay === true) return { mode: 'exact', day: null };
  if (stored.day == null) return { mode: 'unknown', day: null };
  return { mode: stored.approx ? 'approx' : 'exact', day: stored.day };
}

export function approxNote(day: number | null): string | null {
  return day == null ? null : `Guardamos el ${day}, marcado como aproximado.`;
}

/** Perfil > Ingresos y el detalle del ingreso. */
export function incomeDayPhrase(stored: StoredDay): string {
  if (stored.day == null) return 'sin día';
  return stored.approx ? `cada ~${stored.day} · aprox.` : `cada día ${stored.day}`;
}
