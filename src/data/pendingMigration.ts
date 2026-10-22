/**
 * ¿El error es "esa función todavía no existe en la base"?
 *
 * Igual que `isMissingTable`: existe para UNA cosa, que la app siga andando
 * mientras la migración 0022 no se aplicó (HANDOFF §6: "la app tiene que
 * tolerar que todavía no esté"). En ese caso el repositorio vuelve al camino
 * de antes. Cualquier otro error se sigue tirando.
 *
 *   PGRST202  PostgREST no encuentra la función (o esa firma) en su caché
 *   42883     Postgres: undefined_function
 */
export function isMissingFunction(error: { code?: string } | null): boolean {
  return error != null && (error.code === 'PGRST202' || error.code === '42883');
}
