import { useCallback, useSyncExternalStore } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { APPEARANCE_KEY, parseAppearance, type AppearancePreference } from './appearance';

/*
 * La preferencia de apariencia, en un store en memoria con AsyncStorage detrás.
 * Una sola fuente: el ThemeProvider (arriba de todo) y la fila del Perfil se
 * suscriben a la misma, así que cambiar acá repinta la app entera al instante.
 */

let current: AppearancePreference = 'auto';
let touched = false;
let hydration: Promise<void> | null = null;
const listeners = new Set<() => void>();

function emit() {
  listeners.forEach((listener) => listener());
}

/**
 * Lee la elección guardada, una sola vez. Nunca rechaza: si AsyncStorage falla,
 * la app sigue en Automático. El layout raíz la espera junto con las fuentes
 * para no pintar un frame con el tema equivocado.
 */
export function hydrateAppearance(): Promise<void> {
  hydration ??= AsyncStorage.getItem(APPEARANCE_KEY)
    .then(parseAppearance)
    .catch((): AppearancePreference => 'auto')
    .then((stored) => {
      // Si el usuario ya eligió mientras se leía, gana lo que tocó.
      if (touched) return;
      current = stored;
      emit();
    });
  return hydration;
}

export function setAppearance(next: AppearancePreference): void {
  touched = true;
  current = next;
  emit();
  AsyncStorage.setItem(APPEARANCE_KEY, next).catch(() => undefined);
}

/** Solo para los tests: vuelve al estado de recién abierta la app. */
export function resetAppearanceForTests(): void {
  current = 'auto';
  touched = false;
  hydration = null;
  listeners.clear();
}

function subscribe(listener: () => void) {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

function getSnapshot() {
  return current;
}

export function useAppearance(): {
  preference: AppearancePreference;
  setPreference: (next: AppearancePreference) => void;
} {
  const preference = useSyncExternalStore(subscribe, getSnapshot, getSnapshot);
  const setPreference = useCallback((next: AppearancePreference) => setAppearance(next), []);
  return { preference, setPreference };
}
