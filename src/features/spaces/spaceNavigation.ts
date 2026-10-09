/**
 * A dónde lleva "Volver" desde la pantalla de un espacio.
 *
 * Es un destino FIJO y no `router.back()`: el historial puede tener cualquier
 * cosa debajo (las pantallas del login, una lista que con un solo espacio
 * entra directo otra vez) y "lo que haya atrás" terminaba en un loop.
 *
 * TS puro: se testea en node.
 */

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
