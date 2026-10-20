/**
 * P27 · el aviso de lo que eliminó el otro miembro. TS puro: se testea en node.
 *
 * Eliminar no pide aprobación del otro (K3 / X-02 siguen vigentes) y no hay
 * notificaciones en el MVP (SY-01), así que la única forma de enterarse era
 * abrir "Actividad reciente" desde el menú. Este aviso lo trae a la pantalla del
 * espacio mientras sea reciente: 7 días. No se guarda quién lo "vio" (haría
 * falta base): pasada la semana, deja de mostrarse y queda en la actividad.
 */

import type { ActivityEvent } from '@domain/activity';
import { addDays, type IsoDate } from '@domain/calendar';
import type { Slot } from '@domain/types';
import { activityLine, activityWhen, localDateOf } from './activityCopy';

/** Cuántos días dura el aviso. */
export const DELETION_NOTICE_DAYS = 7;

/** Lo que eliminó el OTRO en los últimos 7 días, lo más reciente primero. */
export function recentDeletionsByOther(
  events: readonly ActivityEvent[],
  mySlot: Slot,
  today: IsoDate,
): ActivityEvent[] {
  const since = addDays(today, -DELETION_NOTICE_DAYS);

  return events
    .filter(
      (event) =>
        event.verb === 'deleted' && event.bySlot !== mySlot && localDateOf(event.at) >= since,
    )
    .sort((a, b) => Date.parse(b.at) - Date.parse(a.at));
}

/**
 * "Martina eliminó Supermercado · $100.000 · ayer", y "(y 2 más)" si hubo
 * otras. `null` si no hay nada que avisar.
 */
export function deletionNoticeText(
  events: readonly ActivityEvent[],
  context: { mySlot: Slot; otherName: string; categoryLabel: (category: string) => string },
  today: IsoDate,
): string | null {
  const deletions = recentDeletionsByOther(events, context.mySlot, today);
  const latest = deletions[0];
  if (latest == null) return null;

  const rest = deletions.length - 1;
  const line = `${activityLine(latest, context)} · ${activityWhen(latest.at, today)}`;
  return rest > 0 ? `${line} (y ${rest} más)` : line;
}
