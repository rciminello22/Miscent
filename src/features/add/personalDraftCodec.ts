/**
 * Caso 18 · CA-07 · el gasto que la invitada quiso cargar como personal antes
 * de tener cuenta personal. Si elige crearla, se guarda como personal al
 * terminar la activación.
 *
 * TS puro: se testea en node. El guardado vive en `personalDraft.ts`.
 */

import type { IsoDate } from '@domain/calendar';
import type { Pesos } from '@domain/money';
import type { Category } from '@domain/types';

export type PersonalDraft = {
  amount: Pesos;
  category: Category;
  date: IsoDate;
  description: string | null;
};

/** `null` si no hay nada que guardar (sin monto). */
export function encodePersonalDraft(input: {
  amount: Pesos;
  category: Category | null;
  date: IsoDate;
  description: string;
}): string | null {
  if (input.amount <= 0) return null;
  const description = input.description.trim();
  const draft: PersonalDraft = {
    amount: input.amount,
    // Sin categoría todavía: el monto es lo que no se puede perder, y la
    // categoría se corrige después desde Movimientos.
    category: input.category ?? 'otros',
    date: input.date,
    description: description === '' ? null : description,
  };
  return JSON.stringify(draft);
}

export function decodePersonalDraft(stored: string | null): PersonalDraft | null {
  if (stored == null || stored === '') return null;
  try {
    const parsed = JSON.parse(stored) as Record<string, unknown>;
    if (typeof parsed.amount !== 'number' || parsed.amount <= 0) return null;
    if (typeof parsed.category !== 'string' || typeof parsed.date !== 'string') return null;
    return {
      amount: parsed.amount,
      category: parsed.category as Category,
      date: parsed.date,
      description: typeof parsed.description === 'string' ? parsed.description : null,
    };
  } catch {
    return null;
  }
}
