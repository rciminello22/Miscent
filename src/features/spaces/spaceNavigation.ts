/**
 * A dónde lleva abrir un espacio, sus pantallas de detalle y "Volver".
 *
 * "Volver" es un destino FIJO y no `router.back()`: el historial puede tener
 * cualquier cosa debajo (las pantallas del login, por ejemplo) y "lo que haya
 * atrás" terminaba en un loop.
 *
 * TS puro: se testea en node.
 */

type AccountState = 'personal' | 'guest';

/**
 * A dónde lleva abrir un espacio.
 *
 * Con cuenta personal, adentro de la pestaña Compartidos: la barra queda
 * visible (decisión del 9/10). P23 (15/10): la pestaña abre SIEMPRE en la
 * lista, así que abrir un espacio es siempre ir al espacio concreto, aunque
 * sea el único. El invitado va a su pantalla sin pestañas (CA-06).
 */
export function spaceHref(args: { accountState: AccountState; spaceId: string }): string {
  if (args.accountState === 'guest') return `/space/${args.spaceId}`;
  return `/(personal)/compartidos/${args.spaceId}`;
}

/**
 * Opciones de navegación al abrir un espacio. Con cuenta personal, `withAnchor`
 * arma el stack de la pestaña como [lista, espacio] (la `initialRouteName` de
 * Compartidos): así "Volver" tiene la lista debajo y `popToTopOnBlur` deja la
 * pestaña en la lista. El invitado no tiene pestaña ni lista debajo.
 */
export function spaceOpenOptions(accountState: AccountState): { withAnchor: boolean } {
  return { withAnchor: accountState === 'personal' };
}

/**
 * A dónde lleva tocar una ocurrencia (una cuota, un gasto, un fijo). Un gasto se
 * edita desde su detalle; un fijo, desde el fijo (§21: los dos lo editan), no
 * desde un mes suelto. Las pantallas de detalle viven en /space/[id]/… y las
 * usan los dos árboles: un solo lugar arma la ruta.
 */
export function occurrenceHref(
  spaceId: string,
  occurrence: { sourceKind: 'expense' | 'recurrence'; sourceId: string },
): string {
  return occurrence.sourceKind === 'expense'
    ? `/space/${spaceId}/gasto/${occurrence.sourceId}`
    : `/space/${spaceId}/fijo/${occurrence.sourceId}`;
}

/** Las pantallas de detalle (N3) del espacio. */
export type SpaceDetailScreen = 'mes' | 'movimientos' | 'pendientes';

/**
 * A dónde lleva una pantalla de detalle del espacio. Viven en los DOS árboles
 * (la spec quiere el espacio igual en el Estado A y en el B): con cuenta
 * personal, dentro de la pestaña Compartidos, con la barra visible; el
 * invitado, en /space/[id], sin pestañas.
 *
 * `month` ("2026-11") elige el mes del Detalle del mes.
 */
export function spaceSubHref(args: {
  accountState: AccountState;
  spaceId: string;
  screen: SpaceDetailScreen;
  month?: string;
}): string {
  const base = `${spaceHref(args)}/${args.screen}`;
  return args.month == null ? base : `${base}?mes=${args.month}`;
}

/**
 * Si la pestaña Compartidos está mostrando un espacio (o una pantalla de su
 * detalle). Ahí se oculta el "Agregar" flotante (abre con "Solo yo", CA-10) y
 * queda solo el del espacio: dos botones parecidos con destinos distintos es el
 * riesgo que §32 marca como "rompe privacidad". Decisión del 9/10.
 *
 * P23 · la lista de espacios NO es un espacio: ahí el Agregar personal sí está.
 */
export function isInsideSpace(pathname: string): boolean {
  return pathname.startsWith('/compartidos/');
}

/**
 * §14 Estado B · "con un solo espacio, entra directo". Devuelve el id del único
 * espacio, o null si todavía no cargó, no hay ninguno o hay varios. La pantalla
 * lo RENDERIZA inline: nunca `useEffect` + `replace` (hacía loop).
 */
export function soleSpaceId(
  spaces: readonly { id: string }[] | undefined,
): string | null {
  return spaces?.length === 1 ? (spaces[0]?.id ?? null) : null;
}

export type SpaceBackTarget = '/(personal)/compartidos' | '/(guest)/espacios';

export function spaceBackTarget(args: {
  accountState: AccountState;
  /** null mientras la lista de espacios no cargó. */
  spaceCount: number | null;
}): SpaceBackTarget | null {
  // P23 · con cuenta personal, "Volver" lleva siempre a la lista de Compartidos:
  // ya no entra directo a un espacio, así que no hay loop posible.
  if (args.accountState === 'personal') return '/(personal)/compartidos';

  // §33 U1 · para el invitado con un solo espacio, el espacio ES su pantalla
  // principal: no hay a dónde volver, y en su lugar va el acceso al Perfil.
  const several = args.spaceCount != null && args.spaceCount > 1;
  return several ? '/(guest)/espacios' : null;
}
