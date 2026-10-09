import { Redirect, useLocalSearchParams, useRouter } from 'expo-router';
import { useSpaces } from '@/features/spaces/useSpaces';
import { SpaceScreen } from '@/features/spaces/SpaceScreen';

/**
 * Un espacio dentro de la pestaña Compartidos, con la barra visible.
 *
 * Se llega desde la lista (con varios espacios), así que "Volver" es volver a
 * la lista dentro de la misma pestaña. Con un solo espacio, la pestaña ya lo
 * muestra: esta ruta lo apilaría dos veces, y "Volver" mostraría el mismo
 * espacio otra vez.
 */
export default function CompartidoRoute() {
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id: string }>();
  const { data: spaces } = useSpaces();

  if (spaces?.length === 1) return <Redirect href="/(personal)/compartidos" />;

  return (
    <SpaceScreen
      spaceId={id ?? ''}
      leading={{
        kind: 'back',
        onPress: () =>
          router.canGoBack() ? router.back() : router.replace('/(personal)/compartidos'),
      }}
    />
  );
}
