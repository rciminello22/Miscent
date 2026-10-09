import { useSyncExternalStore } from 'react';

/**
 * El resultado de cerrar el enlace mágico, compartido entre quien lo procesa
 * (MagicLinkListener, en el layout raíz) y quien lo muestra (app/auth/callback).
 *
 * Son dos piezas separadas por una razón: el deep link puede llegar con la app
 * en cualquier pantalla, así que se procesa arriba de todo. Pero expo-router
 * también navega a la URL, y la pantalla a la que llega necesita saber cómo
 * terminó: si el enlace venció, el usuario tiene que verlo (§13 O1 paso 4).
 */

export type MagicLinkStatus =
  | { kind: 'idle' }
  | { kind: 'pending' }
  | { kind: 'done' }
  | { kind: 'failed'; message: string };

let current: MagicLinkStatus = { kind: 'idle' };
const listeners = new Set<() => void>();

export function setMagicLinkStatus(next: MagicLinkStatus): void {
  current = next;
  for (const listener of listeners) listener();
}

function subscribe(listener: () => void): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

export function useMagicLinkStatus(): MagicLinkStatus {
  return useSyncExternalStore(subscribe, () => current);
}
