import type { Slot } from '@domain/types';

/**
 * Los espacios del usuario: SUS filas activas de space_members.
 *
 * Filtrar por el usuario NO es redundante con la RLS: la RLS deja leer las
 * dos filas de cada espacio propio (hace falta, para ver el nombre del otro).
 * Sin este filtro, cuando el otro miembro entraba, cada espacio aparecía dos
 * veces, y el radar sumaba también la parte del otro (K9).
 *
 * TS puro: se testea en node.
 */
export function ownActiveMemberships(
  rows: readonly { space_id: string; slot: number; user_id: string | null; status: string }[],
  userId: string,
): { spaceId: string; slot: Slot }[] {
  return rows
    .filter((row) => row.user_id === userId && row.status === 'active')
    .map((row) => ({ spaceId: row.space_id, slot: row.slot === 1 ? 1 : 2 }));
}
