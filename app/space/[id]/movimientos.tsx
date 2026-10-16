import { useLocalSearchParams } from 'expo-router';
import { SpaceMovementsScreen } from '@/features/spaces/SpaceMovementsScreen';

/** Los movimientos de un espacio FUERA de las pestañas (Estado B, CA-06). */
export default function MovimientosRoute() {
  const { id } = useLocalSearchParams<{ id: string }>();
  return <SpaceMovementsScreen spaceId={id ?? ''} inTabs={false} />;
}
