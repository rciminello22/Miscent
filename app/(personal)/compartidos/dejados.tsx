import { FormerSpacesScreen } from '@/features/spaces/FormerSpacesScreen';

/**
 * P26 · "Espacios que dejaste" dentro de la pestaña Compartidos (Estado A): la
 * barra de pestañas queda visible. El invitado ve la misma pantalla en
 * /(guest)/dejados, sin pestañas.
 */
export default function DejadosRoute() {
  return <FormerSpacesScreen inTabs />;
}
