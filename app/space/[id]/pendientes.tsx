import { useLocalSearchParams } from 'expo-router';
import { SpacePendingScreen } from '@/features/spaces/SpacePendingScreen';

/** Lo pendiente de un espacio FUERA de las pestañas (Estado B, CA-06). */
export default function PendientesRoute() {
  const { id } = useLocalSearchParams<{ id: string }>();
  return <SpacePendingScreen spaceId={id ?? ''} inTabs={false} />;
}
