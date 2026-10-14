import type { IsoDate } from '@domain/calendar';
import type { Pesos } from '@domain/money';
import { formatDayMonth, formatPesos } from '@/lib/format';

/**
 * "¿Con qué lo pagaste?" · el texto para los gastos que figuran como pagados
 * por el usuario y no tienen medio (§5 1º Should, §11 paso 4). TS puro.
 */

/** En el espacio: dice quién lo cargó, que es lo que explica la pregunta. */
export function paidByOtherTitle(otherName: string, count: number): string {
  return count === 1
    ? `${otherName} cargó un gasto que pagaste vos. ¿Con qué lo pagaste?`
    : `${otherName} cargó ${count} gastos que pagaste vos. ¿Con qué los pagaste?`;
}

/** §11 paso 4, literal. */
export function onboardingPaidTitle(spaceName: string): string {
  return `Pagaste estos gastos de ${spaceName}. ¿Con qué?`;
}

/** "Supermercado · 10 oct · $100.000" · "Heladera · 12 cuotas · $600.000". */
export function paidItemLine(item: {
  label: string;
  date: IsoDate;
  amount: Pesos;
  installmentCount: number | null;
}): string {
  // En cuotas, la cantidad importa más que la fecha: el medio decide cuándo
  // vence cada una (Q-02 con tarjeta, Q-03 sin ella).
  const when =
    item.installmentCount != null ? `${item.installmentCount} cuotas` : formatDayMonth(item.date);
  return [item.label, when, formatPesos(item.amount)].join(' · ');
}

/** La pista en Inicio. */
export function toCompleteLine(count: number): string {
  return count === 1 ? 'Hay 1 gasto para completar' : `Hay ${count} gastos para completar`;
}
