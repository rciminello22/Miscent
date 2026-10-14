/**
 * F-03 · `recurrences.past_terms` (jsonb) ↔ `PastTerms[]` del dominio.
 *
 * Un jsonb no tiene tipos: lo valida esta función. Un tramo mal formado NO
 * se ignora, porque ignorarlo cambiaría el monto de un mes pasado sin avisar.
 */

import type { Month } from '@domain/calendar';
import type { PastTerms, Split } from '@domain/types';
import type { Json } from './database.types';

function fail(): never {
  throw new Error('No pudimos leer los montos anteriores de un fijo.');
}

function isObject(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value != null && !Array.isArray(value);
}

function toSplit(value: unknown): Split | null {
  if (value == null) return null;
  if (!isObject(value)) fail();
  if (value.mode === 'even') return { mode: 'even' };
  if (
    value.mode === 'custom' &&
    typeof value.shareSlot1 === 'number' &&
    typeof value.shareSlot2 === 'number'
  ) {
    return { mode: 'custom', shareSlot1: value.shareSlot1, shareSlot2: value.shareSlot2 };
  }
  return fail();
}

export function toPastTerms(value: Json | unknown): PastTerms[] {
  if (!Array.isArray(value)) fail();

  return value
    .map((item: unknown): PastTerms => {
      if (!isObject(item)) fail();
      if (typeof item.until !== 'string' || !/^\d{4}-\d{2}$/.test(item.until)) fail();
      if (typeof item.amount !== 'number' || item.amount <= 0) fail();
      return { until: item.until as Month, amount: item.amount, split: toSplit(item.split) };
    })
    .sort((a, b) => (a.until < b.until ? -1 : a.until > b.until ? 1 : 0));
}

export function fromPastTerms(terms: readonly PastTerms[]): Json {
  return terms.map((item) => ({
    until: item.until,
    amount: item.amount,
    split: item.split == null ? null : { ...item.split },
  }));
}
