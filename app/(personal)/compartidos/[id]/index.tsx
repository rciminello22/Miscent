import { useLocalSearchParams, useRouter } from 'expo-router';
import { goBack } from '@/features/shared/navigation';
import { SpaceScreen } from '@/features/spaces/SpaceScreen';

/**
 * Un espacio dentro de la pestaña Compartidos, con la barra visible.
 *
 * P23 · la pestaña abre siempre en la lista, así que se llega desde ahí (o
 * desde Inicio y Movimientos, que tienen la lista debajo gracias al
 * `initialRouteName` del stack): "Volver" es volver a la lista.
 */
export default function CompartidoRoute() {
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id: string }>();

  return (
    <SpaceScreen
      spaceId={id ?? ''}
      inTabs
      leading={{
        kind: 'back',
        onPress: () =>
          router.canGoBack() ? goBack(router) : router.replace('/(personal)/compartidos'),
      }}
    />
  );
}
