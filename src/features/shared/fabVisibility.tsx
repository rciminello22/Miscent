import { createContext, useCallback, useContext, useMemo, useState, type ReactNode } from 'react';
import { useFocusEffect } from 'expo-router';

/**
 * El botón flotante "Agregar" es del layout de las pestañas, pero hay pantallas
 * donde no corresponde o sobra: un mes que ya pasó en Movimientos (no se
 * agrega con fecha de un mes cerrado) y el mes en curso vacío, que trae su
 * propio Agregar dentro del N1 (para no tener dos).
 *
 * La pantalla lo pide con `useHideFab`, y solo mientras está a la vista: las
 * pestañas siguen montadas al cambiar de una a otra, y el botón no debe quedar
 * escondido en las demás.
 */

type Visibility = { hidden: boolean; setHidden: (hidden: boolean) => void };

const FabVisibility = createContext<Visibility>({ hidden: false, setHidden: () => undefined });

export function FabVisibilityProvider({ children }: { children: ReactNode }) {
  const [hidden, setHidden] = useState(false);
  const value = useMemo(() => ({ hidden, setHidden }), [hidden]);
  return <FabVisibility.Provider value={value}>{children}</FabVisibility.Provider>;
}

/** ¿Alguna pantalla a la vista pidió esconder el botón flotante? */
export function useFabHidden(): boolean {
  return useContext(FabVisibility).hidden;
}

/** Esconde el botón flotante mientras esta pantalla está a la vista. */
export function useHideFab(hidden: boolean): void {
  const { setHidden } = useContext(FabVisibility);

  useFocusEffect(
    useCallback(() => {
      setHidden(hidden);
      return () => setHidden(false);
    }, [hidden, setHidden]),
  );
}
