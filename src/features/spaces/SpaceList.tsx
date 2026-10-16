import type { SpaceSummary } from '@/data/repositories/spaces';
import { SpaceListView } from './SpaceListView';
import { useOpenSpace } from './useOpenSpace';
import { useSpaceListRows } from './useSpaceListRows';

/**
 * La lista de espacios. §14 · P23: "Compartidos: lista de espacios → cada
 * espacio", SIEMPRE, aunque haya uno solo.
 *
 * K1 · un usuario puede tener varios, "con poco protagonismo en la UX": de ahí
 * que sea una lista sobria y no un tablero. Y los saldos no se suman entre
 * espacios (Caso 17: "saldos separados por espacio; no se compensan entre sí"),
 * así que no hay ningún total general.
 *
 * Es el container: arma las filas (`useSpaceListRows`) y abre el espacio; el
 * dibujo, el orden y el filtro viven en `SpaceListView`.
 */
export function SpaceList({ spaces }: { spaces: readonly SpaceSummary[] }) {
  const openSpace = useOpenSpace();
  const rows = useSpaceListRows(spaces);

  return <SpaceListView rows={rows} onOpen={(spaceId) => openSpace(spaceId)} />;
}
