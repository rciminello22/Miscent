import { useLocalSearchParams } from 'expo-router';
import { SpaceMonthScreen } from '@/features/spaces/SpaceMonthScreen';

/**
 * El Detalle del mes de un espacio dentro de la pestaña Compartidos (Estado A):
 * la barra de pestañas queda visible. El invitado ve la misma pantalla en
 * /space/[id]/mes, sin pestañas.
 */
export default function MesRoute() {
  const { id, mes } = useLocalSearchParams<{ id: string; mes?: string }>();
  return <SpaceMonthScreen spaceId={id ?? ''} monthParam={mes} inTabs />;
}
