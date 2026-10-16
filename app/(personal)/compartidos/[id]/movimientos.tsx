import { useLocalSearchParams } from 'expo-router';
import { SpaceMovementsScreen } from '@/features/spaces/SpaceMovementsScreen';

/** Los movimientos de un espacio dentro de la pestaña Compartidos (Estado A). */
export default function MovimientosRoute() {
  const { id } = useLocalSearchParams<{ id: string }>();
  return <SpaceMovementsScreen spaceId={id ?? ''} inTabs />;
}
