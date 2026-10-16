/**
 * ¿El error es "esa tabla todavía no existe en la base"?
 *
 * Existe para UNA cosa: que la app siga andando antes de aplicar una migración
 * (hoy, la 0020 y `payment_method_days`). Cualquier otro error se sigue tirando,
 * porque tragarse una falla de red como "no hay nada" es peor que fallar.
 *
 *   PGRST205  PostgREST no la encuentra en su caché de esquema
 *   42P01     Postgres: undefined_table
 */
export function isMissingTable(error: { code?: string } | null): boolean {
  return error != null && (error.code === 'PGRST205' || error.code === '42P01');
}
