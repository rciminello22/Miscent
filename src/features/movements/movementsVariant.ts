// TEMPORAL: variante B en prueba. Todo este archivo se borra al elegir una variante.
import { useCallback, useSyncExternalStore } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';

export type MovementsVariant = 'A' | 'B';

/** La marca guardada. Prendida es la variante B; apagada (o ausente), la A. */
export const MOVEMENTS_VARIANT_KEY = 'radar.dev.movimientos.varianteB';

/** Mientras se lee la marca (`null`) no se sabe: la pantalla no muestra ninguna. */
export function variantFromFlag(flag: boolean | null): MovementsVariant | null {
  if (flag === null) return null;
  return flag ? 'B' : 'A';
}

/** El texto del interruptor del Perfil (solo en desarrollo). */
export function variantSwitchLabel(variant: MovementsVariant): string {
  return `Movimientos: variante ${variant}`;
}

// TEMPORAL: variante B en prueba. El store se borra con el resto del archivo.
/*
 * Store compartido, en memoria. `useRememberedFlag` guarda el estado por
 * instancia: Perfil escribía y la pestaña Movimientos (que queda montada) nunca
 * se enteraba. Acá hay UNA sola fuente y todos los que la usan se suscriben.
 */
let current: boolean | null = null;
let loading = false;
let touched = false;
const listeners = new Set<() => void>();

function emit() {
  listeners.forEach((listener) => listener());
}

/** Carga inicial de AsyncStorage, una sola vez. Si falla, degrada a la A. */
function loadOnce() {
  if (loading || current !== null) return;
  loading = true;
  AsyncStorage.getItem(MOVEMENTS_VARIANT_KEY)
    .then((stored) => stored === '1')
    .catch(() => false)
    .then((flag) => {
      // Si el usuario ya alternó mientras leía, gana lo que tocó.
      if (touched) return;
      current = flag;
      emit();
    });
}

function subscribe(listener: () => void) {
  listeners.add(listener);
  loadOnce();
  return () => {
    listeners.delete(listener);
  };
}

function getSnapshot() {
  return current;
}

function setFlag(next: boolean) {
  touched = true;
  current = next;
  emit();
  const write = next
    ? AsyncStorage.setItem(MOVEMENTS_VARIANT_KEY, '1')
    : AsyncStorage.removeItem(MOVEMENTS_VARIANT_KEY);
  write.catch(() => undefined);
}

/** Solo para los tests: vuelve al estado de recién abierta la app. */
export function resetMovementsVariantForTests(): void {
  current = null;
  loading = false;
  touched = false;
  listeners.clear();
}

export function useMovementsVariant(): {
  variant: MovementsVariant | null;
  toggle: () => void;
} {
  const flag = useSyncExternalStore(subscribe, getSnapshot, getSnapshot);
  const variant = variantFromFlag(flag);
  // Mientras no se leyó (`null`), alternar no hace nada: no se sabe desde dónde.
  const toggle = useCallback(() => {
    if (current === null) return;
    setFlag(!current);
  }, []);
  return { variant, toggle };
}
