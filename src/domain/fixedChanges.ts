/**
 * F-03 · "Cambiar desde este mes" (§21).
 *
 * Cambia el monto hacia adelante y deja el pasado como estaba. El fijo guarda
 * un tramo por cada cambio ("hasta septiembre fue $500.000"), y el dominio
 * usa el tramo que corresponde a cada mes al expandirlo.
 *
 * Por qué importa: un mes cerrado tiene que seguir dando lo que el usuario
 * vio. Y en un fijo compartido, reescribir el pasado cambiaba el saldo de
 * todos los meses anteriores.
 */

import { addMonths, compareMonths, type Month } from './calendar';
import type { Pesos } from './money';
import type { PastTerms, Recurrence, Split } from './types';

export function changeAmountFrom(
  recurrence: Recurrence,
  amount: Pesos,
  fromMonth: Month,
): { amount: Pesos; split: Split | null; pastTerms: PastTerms[] } {
  const lastOld = addMonths(fromMonth, -1);

  // Los tramos que terminan antes del cambio siguen valiendo tal cual. Uno que
  // terminara después ya no puede: lo pisa el monto nuevo.
  const kept = recurrence.pastTerms.filter((terms) => compareMonths(terms.until, lastOld) <= 0);
  const alreadyClosed = kept.some((terms) => terms.until === lastOld);
  const hasPast = compareMonths(lastOld, recurrence.startMonth) >= 0;

  const pastTerms =
    hasPast && !alreadyClosed
      ? [...kept, { until: lastOld, amount: recurrence.amount, split: recurrence.split }]
      : kept;

  return {
    amount,
    split: scaleSplit(recurrence.split, recurrence.amount, amount),
    pastTerms: pastTerms.sort((a, b) => compareMonths(a.until, b.until)),
  };
}

/**
 * F-04 · con reparto personalizado, el monto nuevo se reparte en la misma
 * proporción. Las partes suman exacto el total (C-02).
 */
function scaleSplit(split: Split | null, from: Pesos, to: Pesos): Split | null {
  if (split == null || split.mode === 'even') return split;
  const slot1 = from === 0 ? Math.round(to / 2) : Math.round((to * split.shareSlot1) / from);
  return { mode: 'custom', shareSlot1: slot1, shareSlot2: to - slot1 };
}
