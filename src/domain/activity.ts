/**
 * Should 6 · actividad reciente del espacio.
 *
 * No hay un registro de actividad aparte: sale de los hechos que ya existen.
 * La autoría (K3) y las fechas las pone el servidor, y lo eliminado deja su
 * rastro (deleted_shared_records). Por eso cada línea es un dato, no una
 * suposición.
 *
 * Lo que NO se puede saber no aparece: de un gasto editado varias veces se
 * conoce la última edición, no cada una; de un fijo de antes de guardar su
 * autor, nada.
 */

import type { IsoDate } from './calendar';
import type { Pesos } from './money';
import type { Category, DeletedRecord, Slot, SpaceFacts, Timestamp } from './types';

export type ActivityEvent = {
  /** Clave estable para listas. */
  key: string;
  at: Timestamp;
  bySlot: Slot;
  verb: 'created' | 'edited' | 'deleted';
  kind: 'expense' | 'recurrence' | 'payment';
  amount: Pesos | null;
  category: Category | null;
  description: string | null;
  /** Gasto o pago: su fecha. Un fijo no tiene una sola. */
  date: IsoDate | null;
  /** Solo pagos: quién le pagó a quién. */
  fromSlot: Slot | null;
};

/** Menos que esto entre el alta y el último cambio es el mismo guardado. */
const SAME_SAVE_MS = 2_000;

export function recentActivity(
  facts: SpaceFacts,
  deletions: readonly DeletedRecord[],
  limit = 20,
): ActivityEvent[] {
  const events: ActivityEvent[] = [];
  const edited = (createdAt: Timestamp, updatedAt: Timestamp) =>
    Date.parse(updatedAt) - Date.parse(createdAt) > SAME_SAVE_MS;

  for (const expense of facts.expenses) {
    const base = {
      kind: 'expense' as const,
      amount: expense.amount,
      category: expense.category,
      description: expense.description,
      date: expense.date,
      fromSlot: null,
    };
    events.push({ ...base, key: `${expense.id}:c`, at: expense.createdAt, bySlot: expense.createdBySlot, verb: 'created' });
    if (edited(expense.createdAt, expense.updatedAt)) {
      events.push({ ...base, key: `${expense.id}:e`, at: expense.updatedAt, bySlot: expense.updatedBySlot, verb: 'edited' });
    }
  }

  for (const recurrence of facts.recurrences) {
    if (recurrence.spaceId == null) continue;
    const base = {
      kind: 'recurrence' as const,
      amount: recurrence.amount,
      category: recurrence.category,
      description: recurrence.description,
      date: null,
      fromSlot: null,
    };
    if (recurrence.createdBySlot != null) {
      events.push({ ...base, key: `${recurrence.id}:c`, at: recurrence.createdAt, bySlot: recurrence.createdBySlot, verb: 'created' });
    }
    if (recurrence.updatedBySlot != null && edited(recurrence.createdAt, recurrence.updatedAt)) {
      events.push({ ...base, key: `${recurrence.id}:e`, at: recurrence.updatedAt, bySlot: recurrence.updatedBySlot, verb: 'edited' });
    }
  }

  for (const payment of facts.payments) {
    events.push({
      key: `${payment.id}:c`,
      at: payment.createdAt,
      bySlot: payment.recordedBySlot,
      verb: 'created',
      kind: 'payment',
      amount: payment.amount,
      category: null,
      description: null,
      date: payment.date,
      fromSlot: payment.fromSlot,
    });
  }

  for (const item of deletions) {
    // Un rastro de antes, sin lo que era: no se puede decir qué fue.
    if (item.amount == null) continue;
    events.push({
      key: `${item.sourceId}:d`,
      at: item.deletedAt,
      bySlot: item.deletedBySlot,
      verb: 'deleted',
      kind: item.kind,
      amount: item.amount,
      category: item.category,
      description: item.description,
      date: item.occurredOn,
      fromSlot: item.fromSlot,
    });
  }

  return events.sort((a, b) => Date.parse(b.at) - Date.parse(a.at)).slice(0, limit);
}
