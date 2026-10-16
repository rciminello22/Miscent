import { useLocalSearchParams } from 'expo-router';
import { SpaceMonthScreen } from '@/features/spaces/SpaceMonthScreen';

/**
 * El Detalle del mes de un espacio FUERA de las pestañas (Estado B, CA-06). Con
 * cuenta personal se ve dentro de la pestaña Compartidos (spaceSubHref).
 */
export default function MesRoute() {
  const { id, mes } = useLocalSearchParams<{ id: string; mes?: string }>();
  return <SpaceMonthScreen spaceId={id ?? ''} monthParam={mes} inTabs={false} />;
}
