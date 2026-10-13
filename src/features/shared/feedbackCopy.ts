import type { MemberStatus } from '@domain/types';

/**
 * §17 · §12 · el texto de los avisos después de guardar o eliminar. TS puro:
 * se testea en node.
 *
 * Dicen siempre QUIÉN lo ve, porque §12 lo pone entre los indicadores de
 * audiencia obligatorios. Y nunca prometen de más: si el otro miembro no tiene
 * acceso, hoy no lo ve.
 */

export type FeedbackAudience =
  | { kind: 'private' }
  | { kind: 'shared'; spaceName: string; otherName: string; otherStatus: MemberStatus };

/** §17 "Guardado · Solo vos lo ves" · §12 "Agregado a Casa · Martina lo ve". */
export function savedTitle(audience: FeedbackAudience): string {
  if (audience.kind === 'private') return 'Guardado · Solo vos lo ves';

  const base = `Agregado a ${audience.spaceName}`;
  if (audience.otherStatus === 'active') return `${base} · ${audience.otherName} lo ve`;
  // I-04 · al aceptar la invitación ve todo el historial.
  if (audience.otherStatus === 'no_access') {
    return `${base} · ${audience.otherName} lo va a ver cuando entre`;
  }
  return base;
}

/** X-01 · X-03 "el otro también deja de verlo". */
export function deletedTitle(audience: FeedbackAudience): string {
  if (audience.kind === 'private') return 'Eliminado · Tu radar ya no lo cuenta';

  const base = `Eliminado de ${audience.spaceName}`;
  return audience.otherStatus === 'active'
    ? `${base} · ${audience.otherName} también deja de verlo`
    : base;
}
