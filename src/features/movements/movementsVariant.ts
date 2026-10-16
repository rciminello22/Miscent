// TEMPORAL: variante B en prueba. Todo este archivo se borra al elegir una variante.
import { useRememberedFlag } from '@/features/shared/useRememberedFlag';

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

export function useMovementsVariant(): {
  variant: MovementsVariant | null;
  toggle: () => void;
} {
  const [flag, mark, forget] = useRememberedFlag(MOVEMENTS_VARIANT_KEY);
  const variant = variantFromFlag(flag);
  return { variant, toggle: variant === 'B' ? forget : mark };
}
