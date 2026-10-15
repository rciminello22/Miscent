/**
 * UX-05 · qué muestra la pantalla del espacio, en qué orden y con qué límites.
 * TS puro: `SpaceScreen` solo dibuja lo que esto decide.
 *
 * El orden responde a la pregunta de la pantalla ("¿quién le debe a quién?") y
 * a su acción más frecuente (cargar un gasto): el saldo y las dos acciones van
 * arriba, y lo que pide atención se agrupa en una sola fila.
 */

/** Cuántos movimientos se ven antes de "Ver todos". */
export const MOVEMENTS_PREVIEW = 10;

export type SpaceSection = 'balance' | 'actions' | 'pending' | 'month' | 'upcoming' | 'movements';

export type SpaceLayoutInput = {
  /** SA-04 · fijos que detuvo una salida y que quien queda no decidió. */
  stoppedFixed: number;
  /** Gastos que el otro cargó como pagados por vos, sin medio. */
  paidByOther: number;
  /** K10 · cosas que cargó, editó o eliminó el otro y no revisaste. */
  toReview: number;
  month: {
    total: number;
    payments: number;
    upcoming: number;
    /** Cuántas categorías distintas tiene el mes. */
    categories: number;
  };
  upcomingMonths: number;
  movements: number;
};

export type SpaceLayout = {
  sections: SpaceSection[];
  /**
   * La fila de pendientes. `startsOpen` es verdadero con un fijo detenido:
   * SA-04 ("¿Lo seguís pagando vos?") es una pregunta que la spec quiere que
   * quien queda conteste, y plegada pasaría desapercibida.
   */
  pending: { count: number; startsOpen: boolean } | null;
  /** ¿Hay algo detrás de "Ver detalle del mes"? */
  monthDetail: boolean;
};

export function planSpaceLayout(input: SpaceLayoutInput): SpaceLayout {
  const pendingCount = input.stoppedFixed + input.paidByOther + input.toReview;
  const pending =
    pendingCount > 0 ? { count: pendingCount, startsOpen: input.stoppedFixed > 0 } : null;

  const hasMonth =
    input.month.total > 0 || input.month.payments > 0 || input.month.upcoming > 0;

  const sections: SpaceSection[] = ['balance', 'actions'];
  if (pending != null) sections.push('pending');
  if (hasMonth) sections.push('month');
  if (input.upcomingMonths > 0) sections.push('upcoming');
  sections.push('movements');

  return {
    sections,
    pending,
    // Con una sola categoría "Por categoría" repetiría el total: no aparece.
    monthDetail:
      input.month.categories > 1 || input.month.payments > 0 || input.month.upcoming > 0,
  };
}

/**
 * Los movimientos que se ven. Nunca se corta sin avisar: `hidden` es lo que
 * falta, para rotular el "Ver todos".
 */
export function limitMovements<T>(
  items: readonly T[],
  expanded: boolean,
  preview: number = MOVEMENTS_PREVIEW,
): { visible: T[]; hidden: number } {
  if (expanded || items.length <= preview) return { visible: [...items], hidden: 0 };
  return { visible: items.slice(0, preview), hidden: items.length - preview };
}

export function pendingGroupTitle(count: number): string {
  return count === 1 ? '1 cosa para completar o revisar' : `${count} cosas para completar o revisar`;
}
