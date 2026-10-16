/**
 * Qué muestra la pantalla del espacio y en qué orden. TS puro: `SpaceScreen`
 * solo dibuja lo que esto decide.
 *
 * Jerarquía N1/N2/N3 (15/10):
 *   N1 · el saldo con su balanza y las acciones: siempre está.
 *   N2 · como mucho TRES puertas, en este orden de prioridad:
 *        Pendientes (solo si hay) · Mes · Movimientos.
 *   N3 · cada puerta abre su pantalla. Nada de desplegables.
 *
 * "Próximos meses" ya no es una puerta: vive dentro del Detalle del mes, como
 * parte de su selector (§23.4).
 */

export type SpaceDoor = 'pending' | 'month' | 'movements';

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
  };
  /** Compromisos compartidos de los próximos meses. */
  upcomingMonths: number;
  /** Gastos y pagos que ya pasaron. */
  movements: number;
  /** Lo que eliminó el otro y todavía no revisaste (queda su rastro). */
  deletions: number;
};

export type SpaceLayout = {
  doors: SpaceDoor[];
  /**
   * La puerta de pendientes. `urgent` es verdadero con un fijo detenido:
   * SA-04 ("¿Lo seguís pagando vos?") es una pregunta que la spec quiere que
   * quien queda conteste, y no puede quedar escondida detrás de una puerta
   * como cualquier otro pendiente.
   */
  pending: { count: number; urgent: boolean; caption: string } | null;
  /** No hay nada para abrir aparte de los pendientes: se muestra el aviso de vacío. */
  empty: boolean;
};

export function planSpaceLayout(input: SpaceLayoutInput): SpaceLayout {
  const count = input.stoppedFixed + input.paidByOther + input.toReview;
  const pending =
    count > 0
      ? {
          count,
          urgent: input.stoppedFixed > 0,
          caption: pendingDoorCaption({
            stoppedFixed: input.stoppedFixed,
            paidByOther: input.paidByOther,
            toReview: input.toReview,
          }),
        }
      : null;

  const hasMonth =
    input.month.total > 0 ||
    input.month.payments > 0 ||
    input.month.upcoming > 0 ||
    input.upcomingMonths > 0;
  const hasMovements = input.movements > 0 || input.deletions > 0;

  const doors: SpaceDoor[] = [];
  if (pending != null) doors.push('pending');
  if (hasMonth) doors.push('month');
  if (hasMovements) doors.push('movements');

  return { doors, pending, empty: !hasMonth && !hasMovements };
}

/**
 * La línea de la puerta de Pendientes: "2 para revisar · 1 sin completar".
 * Un fijo detenido (SA-04) va primero: es lo único que pide una decisión.
 */
export function pendingDoorCaption(counts: {
  stoppedFixed: number;
  paidByOther: number;
  toReview: number;
}): string {
  const parts: string[] = [];
  if (counts.stoppedFixed > 0) {
    parts.push(
      counts.stoppedFixed === 1 ? '1 fijo para decidir' : `${counts.stoppedFixed} fijos para decidir`,
    );
  }
  if (counts.toReview > 0) parts.push(`${counts.toReview} para revisar`);
  if (counts.paidByOther > 0) parts.push(`${counts.paidByOther} sin completar`);
  return parts.join(' · ');
}
