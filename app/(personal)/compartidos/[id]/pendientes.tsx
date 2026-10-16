import { useLocalSearchParams } from 'expo-router';
import { SpacePendingScreen } from '@/features/spaces/SpacePendingScreen';

/** Lo pendiente de un espacio dentro de la pestaña Compartidos (Estado A). */
export default function PendientesRoute() {
  const { id } = useLocalSearchParams<{ id: string }>();
  return <SpacePendingScreen spaceId={id ?? ''} inTabs />;
}
