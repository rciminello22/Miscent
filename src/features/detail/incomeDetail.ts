import { monthOf, parseDate, type IsoDate, type Month } from '@domain/calendar';
import { formatLongDate, formatMonth } from '@/lib/format';
import type { Fact } from './installmentsCycle';

/**
 * 15·5 · el detalle de un ingreso: el copy, en TS puro.
 *
 * Un ingreso fijo y uno puntual se leen igual: una línea que dice qué es y
 * desde/cuándo, y una tarjeta con las mismas filas ("Qué es" primero).
 */

/**
 * Cómo se llama un ingreso que entró una sola vez, en el detalle Y en la lista
 * de Movimientos (el usuario decidió unificarlos). Cambiarlo acá cambia los dos.
 * "Ingresos registrados" del radar es otra cosa: el total (glosario §7.2).
 */
export const ONE_OFF_INCOME_LABEL = 'Extra';

export type IncomeDetailCopy = { subtitle: string; facts: Fact[] };

/** "12 de octubre"; con el año solo si es de otro. */
function dateWithYear(date: IsoDate, today: IsoDate): string {
  const year = parseDate(date).year;
  const text = formatLongDate(date);
  return year === parseDate(today).year ? text : `${text} de ${year}`;
}

/** El día de cobro, tal como se guardó: "cada ~28", "cada día 5" o "sin día". */
function dayPhrase(day: number | null, approx: boolean): string {
  if (day == null) return 'sin día';
  return approx ? `cada ~${day}` : `cada día ${day}`;
}

export function fixedIncomeDetail(
  recurrence: {
    dayOfMonth: number | null;
    dayApprox: boolean;
    startMonth: Month;
    endMonth: Month | null;
  },
  today: IsoDate,
): IncomeDetailCopy {
  const reference = monthOf(today);
  const day = dayPhrase(recurrence.dayOfMonth, recurrence.dayApprox);
  const since = formatMonth(recurrence.startMonth, reference);
  const until =
    recurrence.endMonth == null ? null : `hasta ${formatMonth(recurrence.endMonth, reference)}`;
  const approximate = recurrence.dayApprox && recurrence.dayOfMonth != null;

  return {
    subtitle: ['Fijo', day, `desde ${since}`, until].filter((part) => part != null).join(' · '),
    facts: [
      { label: 'Qué es', value: 'Fijo, se repite todos los meses' },
      { label: 'Desde', value: since },
      { label: 'Día', value: approximate ? `${day} · aproximado` : day },
    ],
  };
}

export function oneOffIncomeDetail(
  income: { date: IsoDate; categoryLabel: string },
  today: IsoDate,
): IncomeDetailCopy {
  const when = dateWithYear(income.date, today);

  return {
    subtitle: `${ONE_OFF_INCOME_LABEL} · ${when}`,
    facts: [
      { label: 'Qué es', value: `${ONE_OFF_INCOME_LABEL}, entró una sola vez` },
      { label: 'Cuándo', value: when },
      { label: 'Categoría', value: income.categoryLabel },
    ],
  };
}
