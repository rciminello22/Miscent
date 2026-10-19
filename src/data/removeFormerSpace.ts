/**
 * Quitar un espacio del historial (migración 0021): los errores de la RPC.
 *
 * Existe para UNA cosa: que la app siga andando antes de aplicar la migración.
 * Sin la función en la base, PostgREST responde PGRST202 (no la encuentra en su
 * caché de esquema) o Postgres 42883 (undefined_function). La pantalla lo dice
 * por toast y no se rompe nada: la foto sigue donde estaba.
 */

/** ¿El error es "esa función todavía no existe en la base"? */
export function isMissingFunction(error: { code?: string } | null): boolean {
  return error != null && (error.code === 'PGRST202' || error.code === '42883');
}

/**
 * El error que ve la pantalla. El mensaje es el DETALLE del aviso "No pudimos
 * quitar el espacio": nunca el texto técnico de la base.
 */
export function removeFormerSpaceFailure(error: { code?: string; message?: string }): Error {
  return new Error(
    isMissingFunction(error)
      ? 'Todavía no se puede hacer. Probá de nuevo más tarde.'
      : 'Probá de nuevo en un momento.',
  );
}
