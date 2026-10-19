import { MovementsScreen } from '@/features/movements/MovementsScreen';

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
 * La pestaña es UNA pantalla: hoy y el mes arriba, los filtros, la franja de una
 * semana y la lista del día elegido. Acepta `mes`, `filtro` y `dia` por la ruta.
 * §39 declara el riesgo de esta pantalla (empujar a "registrar por registrar");
 * se mitiga mostrando el EFECTO de cada movimiento, que es lo que lo vuelve útil.
 */
export default function Movimientos() {
  return <MovementsScreen />;
}
