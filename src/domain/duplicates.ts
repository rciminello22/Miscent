/**
 * §11 paso 3 · prevención de duplicados al activar la cuenta personal.
 *
 * "No se copia ningún gasto compartido: la cuenta personal calcula la parte.
 * El único riesgo de duplicado es cargar a mano como personal algo que ya
 * está en un espacio." Si Martina tilda "Alquiler" como fijo personal, el
 * radar lo cuenta dos veces: su parte de Casa (K9) y el fijo.
 *
 * Acá solo se calcula QUÉ ya está en los espacios. Qué hacer con eso (avisar,
 * preguntar "¿Es otro alquiler?") es de la pantalla.
 */

import { addMonths, hasPassed, monthOf, type IsoDate } from './calendar';
import { expandSpaceOccurrences, type SpaceOccurrence } from './occurrences';
import type { Pesos } from './money';
import { shareOf } from './split';
import type { Category, PersonalFacts } from './types';

/** CA-09 · un fijo compartido: "Ya en Casa · tu parte $250.000". */
export type FixedInSpace = {
  recurrenceId: string;
  spaceId: string;
  spaceName: string;
  category: Category;
  /** "Luz": dice CUÁL de los servicios es. `null` → por su categoría. */
  description: string | null;
  /** Tu parte de la PRÓXIMA ocurrencia, con su ajuste (F-03) si lo tiene. */
  myShare: Pesos;
  nextDate: IsoDate;
};

/** §13 O3 paso 4 · una compra compartida en cuotas que pagó el usuario. */
export type InstallmentsInSpace = {
  expenseId: string;
  spaceId: string;
  spaceName: string;
  /** El nombre lo arma la pantalla: la descripción, o si no la categoría. */
  description: string | null;
  category: Category;
  /** Monto de la próxima cuota: es el que figura en el resumen de la tarjeta. */
  installmentAmount: Pesos;
  myShare: Pesos;
  remaining: number;
  count: number;
};

export type AlreadyInSpaces = {
  fixed: FixedInSpace[];
  installments: InstallmentsInSpace[];
};

/**
 * Hasta dónde se busca la próxima ocurrencia de un fijo. Un año alcanza para
 * uno que empieza más adelante; más lejos no es algo que se vaya a duplicar
 * hoy.
 */
const FIXED_LOOKAHEAD_MONTHS = 12;

export function alreadyInSpaces(
  spaces: PersonalFacts['spaces'],
  today: IsoDate,
): AlreadyInSpaces {
  const fixed: FixedInSpace[] = [];
  const installments: InstallmentsInSpace[] = [];
  const thisMonth = monthOf(today);

  for (const { facts, mySlot, leftOn } of spaces) {
    const space = { spaceId: facts.space.id, spaceName: facts.space.name };

    // Q-05 · una ocurrencia cuya fecha llegó "ya pasó": no se va a duplicar.
    const upcoming = expandSpaceOccurrences(facts, {
      from: thisMonth,
      to: addMonths(thisMonth, FIXED_LOOKAHEAD_MONTHS),
    }).filter((occurrence) => !hasPassed(occurrence.balanceDate, today));

    const bySource = new Map<string, SpaceOccurrence[]>();
    for (const occurrence of upcoming) {
      bySource.set(occurrence.sourceId, [...(bySource.get(occurrence.sourceId) ?? []), occurrence]);
    }

    for (const [sourceId, occurrences] of bySource) {
      // La expansión viene ordenada por fecha: la primera es la próxima.
      const next = occurrences[0]!;

      if (next.isRecurrence) {
        // SA-04 · al salir, los fijos compartidos dejan de ser suyos.
        if (leftOn != null) continue;
        fixed.push({
          recurrenceId: sourceId,
          ...space,
          category: next.category,
          description:
            facts.recurrences.find((recurrence) => recurrence.id === sourceId)?.description ?? null,
          myShare: shareOf(next.shares, mySlot),
          nextDate: next.balanceDate,
        });
        continue;
      }

      // Solo las que pagó él: las que pagó el otro nunca figuran en el resumen
      // de su tarjeta, así que no hay forma de que las cargue dos veces.
      if (next.installment == null || next.payerSlot !== mySlot) continue;
      installments.push({
        expenseId: sourceId,
        ...space,
        description: facts.expenses.find((expense) => expense.id === sourceId)?.description ?? null,
        category: next.category,
        installmentAmount: next.amount,
        myShare: shareOf(next.shares, mySlot),
        remaining: occurrences.length,
        count: next.installment.count,
      });
    }
  }

  return { fixed, installments };
}
