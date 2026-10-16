import { MovementsScreenA } from '@/features/movements/MovementsScreenA';
// TEMPORAL: variante B en prueba
import { MovementsScreenB } from '@/features/movements/MovementsScreenB';
// TEMPORAL: variante B en prueba
import { useMovementsVariant } from '@/features/movements/movementsVariant';

/**
 * §16 · Movimientos. "Ver qué se registró en un mes y corregir errores."
 *
 * Dos reglas que ordenan la pantalla:
 *
 * 1. Se listan **hechos**, no ocurrencias: una compra en cuotas aparece una
 *    sola vez, en su fecha de compra. Las cuotas se ven mes a mes en Futuro.
 * 2. De un gasto compartido, la cifra principal es **tu parte** (K9), y el
 *    total va en gris al lado. Son las dos lentes de §7.3, y nunca se mezclan
 *    en el mismo número.
 *
 * La pantalla es la lista (variante A): el mes y la tira de días arriba, el
 * control segmentado pegado y los registros agrupados por día. §39 declara el
 * riesgo de esta pantalla (empujar a "registrar por registrar"); se mitiga
 * mostrando el EFECTO de cada movimiento, que es lo que lo vuelve útil.
 */
export default function Movimientos() {
  // TEMPORAL: variante B en prueba. Un interruptor del Perfil (solo en desarrollo)
  // elige entre las dos; mientras se lee la marca no se muestra ninguna.
  const { variant } = useMovementsVariant();
  if (variant === null) return null;
  if (variant === 'B') return <MovementsScreenB />;

  return <MovementsScreenA />;
}
