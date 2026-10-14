/**
 * Should 6 · el texto de la actividad reciente. TS puro: se testea en node.
 * Mismo tono que "para revisar" (§39): dice quién hizo qué, sin juzgar.
 */

import type { ActivityEvent } from '@domain/activity';
import type { IsoDate } from '@domain/calendar';
import type { Slot } from '@domain/types';
import { addDays } from '@domain/calendar';
import { formatDayMonth, formatPesos } from '@/lib/format';

const VERBS = {
  created: { me: 'Cargaste', other: 'cargó' },
  edited: { me: 'Editaste', other: 'editó' },
  deleted: { me: 'Eliminaste', other: 'eliminó' },
} as const;

export function activityLine(
  event: ActivityEvent,
  context: { mySlot: Slot; otherName: string; categoryLabel: (category: string) => string },
): string {
  const byMe = event.bySlot === context.mySlot;
  const amount = event.amount != null ? formatPesos(event.amount, { sign: 'never' }) : '';

  if (event.kind === 'payment') {
    if (event.verb === 'deleted') {
      return `${byMe ? 'Eliminaste' : `${context.otherName} eliminó`} el pago de ${amount}`;
    }
    const iPaid = event.fromSlot === context.mySlot;
    const what = iPaid ? `le pagaste ${amount} a ${context.otherName}` : `${context.otherName} te pagó ${amount}`;
    if (byMe) return `Registraste que ${what}`;
    return iPaid
      ? `${context.otherName} registró que le pagaste ${amount}`
      : `${context.otherName} registró que te pagó ${amount}`;
  }

  const name = event.description ?? (event.category != null ? context.categoryLabel(event.category) : '');
  const what = event.kind === 'recurrence' ? `el fijo ${name}` : name;
  const verb = byMe ? VERBS[event.verb].me : `${context.otherName} ${VERBS[event.verb].other}`;
  return `${verb} ${what} · ${amount}`;
}

/** "hoy", "ayer" o "5 oct", en la fecha del teléfono. */
export function activityWhen(at: string, today: IsoDate): string {
  const date = new Date(at);
  const local = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
  if (local === today) return 'hoy';
  if (local === addDays(today, -1)) return 'ayer';
  return formatDayMonth(local);
}
