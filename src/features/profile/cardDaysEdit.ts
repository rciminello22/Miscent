/**
 * Corregir los días de una tarjeta desde Perfil (§22, T-02, T-05, T-06). TS puro:
 * el borrador del formulario, qué se puede guardar y lo que se le dice al
 * usuario. El cálculo de qué se mueve vive en `@domain/cardDays`.
 */

import type { CardDaysPlan } from '@domain/cardDays';
import type { PaymentMethod } from '@domain/types';
import type { CardEdit } from '@/data/repositories/cardDays';
import {
  answerFromStored,
  dayAnswerToStored,
  isAnswered,
  type DayAnswer,
  type StoredDay,
} from '@/features/onboarding/dayAnswer';

export type CardDraft = { name: string; closing: DayAnswer; due: DayAnswer };

/**
 * Abre el formulario con lo guardado. "Ya sé el día exacto" abre en "Sé el día"
 * y SIN día los que eran aproximados, para elegir el firme; los demás quedan.
 */
export function draftFromCard(
  card: PaymentMethod,
  options?: { knowExactDay?: boolean },
): CardDraft {
  const know = options?.knowExactDay === true;
  return {
    name: card.name,
    closing: answerFromStored(
      { day: card.closingDay, approx: card.closingApprox },
      { knowExactDay: know && card.closingApprox },
    ),
    due: answerFromStored(
      { day: card.dueDay, approx: card.dueApprox },
      { knowExactDay: know && card.dueApprox },
    ),
  };
}

/** Lo que se escribe de la tarjeta (y lo que se vuelve a escribir al deshacer). */
export function cardEditOf(card: PaymentMethod): CardEdit {
  return {
    name: card.name,
    closingDay: card.closingDay,
    closingApprox: card.closingApprox,
    dueDay: card.dueDay,
    dueApprox: card.dueApprox,
  };
}

/** La tarjeta como quedaría, o `null` si falta responder algún día. */
export function editedCard(card: PaymentMethod, draft: CardDraft): PaymentMethod | null {
  if (!isAnswered(draft.closing) || !isAnswered(draft.due)) return null;

  const closing = dayAnswerToStored(draft.closing);
  const due = dayAnswerToStored(draft.due);
  return {
    ...card,
    name: draft.name.trim(),
    closingDay: closing.day,
    closingApprox: closing.approx,
    dueDay: due.day,
    dueApprox: due.approx,
  };
}

/** ¿Cambió algún día, o la marca de aproximado de alguno? */
export function daysChanged(card: PaymentMethod, draft: CardDraft): boolean {
  const next = editedCard(card, draft);
  if (next == null) return false;
  return (
    next.closingDay !== card.closingDay ||
    next.closingApprox !== card.closingApprox ||
    next.dueDay !== card.dueDay ||
    next.dueApprox !== card.dueApprox
  );
}

export function canSaveDraft(card: PaymentMethod, draft: CardDraft): boolean {
  const name = draft.name.trim();
  if (name === '' || editedCard(card, draft) == null) return false;
  return name !== card.name || daysChanged(card, draft);
}

/**
 * "Antes: ~15" debajo de un día que cambió (o que se está por elegir). Nada si
 * no cambió ni si todavía no se respondió.
 */
export function dayBefore(stored: StoredDay, answer: DayAnswer): string | null {
  if (answer.mode == null) return null;

  const next = dayAnswerToStored(answer);
  if (next.day === stored.day && next.approx === stored.approx) return null;

  if (stored.day == null) return 'Antes: sin dato';
  return stored.approx ? `Antes: ~${stored.day}` : `Antes: ${stored.day}`;
}

/** La nota de la edición. T-06 · se avisa qué pasa con lo que ya está registrado. */
export function editNote(args: { daysChanged: boolean; plan: CardDaysPlan }): string {
  const nothing = args.plan.items.length === 0 && args.plan.writes.length === 0;
  if (args.daysChanged && nothing) {
    return 'Esta tarjeta no tiene pagos por venir: no hay nada para recalcular.';
  }
  return 'Al cambiar los días se recalculan los pagos de este mes en adelante. Los meses pasados no cambian.';
}

/** El aviso de después de guardar: "Visa Galicia actualizada". */
export function updatedTitle(name: string): string {
  return `${name} actualizada`;
}

/** "3 pagos recalculados". Nada si no se movió nada. */
export function recalculatedDetail(count: number): string | null {
  if (count <= 0) return null;
  return count === 1 ? '1 pago recalculado' : `${count} pagos recalculados`;
}
