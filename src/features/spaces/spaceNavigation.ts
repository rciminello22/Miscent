/**
 * A dónde lleva "Volver" desde la pantalla de un espacio.
 *
 * Es un destino FIJO y no `router.back()`: el historial puede tener cualquier
 * cosa debajo (las pantallas del login, una lista que con un solo espacio
 * entra directo otra vez) y "lo que haya atrás" terminaba en un loop.
 *
 * TS puro: se testea en node.
 */

/**
 * A dónde lleva abrir un espacio.
 *
 * Con cuenta personal, adentro de la pestaña Compartidos: la barra queda
 * visible (decisión del 9/10). Con uno solo, la pestaña ya lo muestra, y
 * abrir la ruta del espacio apilaría el mismo espacio dos veces. El invitado
 * va a su pantalla sin pestañas (CA-06).
 */
export function spaceHref(args: {
  accountState: 'personal' | 'guest';
  spaceId: string;
  spaceCount: number | null;
}): string {
  if (args.accountState === 'guest') return `/space/${args.spaceId}`;
  if (args.spaceCount === 1) return '/(personal)/compartidos';
  return `/(personal)/compartidos/${args.spaceId}`;
}

/**
 * Si la pestaña Compartidos está mostrando un espacio. Ahí se oculta el
 * "Agregar" flotante (abre con "Solo yo", CA-10) y queda solo el del espacio:
 * dos botones parecidos con destinos distintos es el riesgo que §32 marca
 * como "rompe privacidad". Decisión del 9/10.
 */
export function isInsideSpace(pathname: string, spaceCount: number | null): boolean {
  if (pathname.startsWith('/compartidos/')) return true;
  return pathname === '/compartidos' && spaceCount === 1;
}

export type SpaceBackTarget = '/(personal)/inicio' | '/(personal)/compartidos' | '/(guest)/espacios';

export function spaceBackTarget(args: {
  accountState: 'personal' | 'guest';
  /** null mientras la lista de espacios no cargó. */
  spaceCount: number | null;
}): SpaceBackTarget | null {
  const several = args.spaceCount != null && args.spaceCount > 1;

  if (args.accountState === 'personal') {
    // §14 · con uno solo, Compartidos entra directo al espacio: volver ahí
    // sería volver acá.
    return several ? '/(personal)/compartidos' : '/(personal)/inicio';
  }

  // §33 U1 · para el invitado con un solo espacio, el espacio ES su pantalla
  // principal: no hay a dónde volver, y en su lugar va el acceso al Perfil.
  return several ? '/(guest)/espacios' : null;
}
