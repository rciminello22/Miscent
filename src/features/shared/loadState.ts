/**
 * H-03 · qué puede mostrar una pantalla con lo que tiene una consulta.
 *
 *   ready    hay datos (aunque una actualización de fondo haya fallado: lo
 *            último que se leyó bien sigue siendo cierto)
 *   error    no hay datos y la lectura falló, o está en pausa porque no hay
 *            conexión. NUNCA se muestra como vacío, cero ni "ya no existe":
 *            sería afirmar algo que no se pudo leer
 *   loading  no hay datos y la lectura está en curso
 *
 * La pausa por falta de red cuenta como error a propósito: TanStack la deja
 * en `pending` sin buscar nada, y la pantalla quedaba cargando para siempre.
 */
export type LoadState = 'loading' | 'error' | 'ready';

export function loadState(query: {
  data: unknown;
  status: 'pending' | 'error' | 'success';
  fetchStatus: 'fetching' | 'paused' | 'idle';
}): LoadState {
  if (query.data !== undefined) return 'ready';
  // "Probar de nuevo" vuelve a buscar: mientras tanto, cargando.
  if (query.fetchStatus === 'fetching') return 'loading';
  if (query.status === 'error' || query.fetchStatus === 'paused') return 'error';
  return 'loading';
}
