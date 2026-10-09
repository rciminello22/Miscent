import { useLocalSearchParams, useRouter } from 'expo-router';
import { useSession } from '@/features/auth/SessionProvider';
import { useSpaces } from '@/features/spaces/useSpaces';
import { spaceBackTarget } from '@/features/spaces/spaceNavigation';
import { SpaceScreen } from '@/features/spaces/SpaceScreen';
import { resetTo } from '@/features/shared/navigation';

/**
 * El espacio FUERA de las pestañas: la pantalla principal del invitado
 * (Estado B, sin barra, CA-06). Un usuario con cuenta personal lo ve dentro
 * de la pestaña Compartidos; si llega acá por otro camino, "Volver" lo lleva
 * a su árbol.
 *
 * "Volver" va a un destino FIJO (spaceBackTarget), nunca a "lo que haya
 * atrás": el historial podía tener las pantallas del login, o una lista que
 * con un solo espacio entra directo otra vez, y terminaba en un loop.
 */
export default function SpaceRoute() {
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id: string }>();
  const { accountState } = useSession();
  const { data: mySpaces } = useSpaces();

  const target = spaceBackTarget({
    accountState: accountState === 'personal' ? 'personal' : 'guest',
    spaceCount: mySpaces?.length ?? null,
  });

  return (
    <SpaceScreen
      spaceId={id ?? ''}
      leading={
        target == null
          ? { kind: 'profile' }
          : { kind: 'back', onPress: () => resetTo(router, target) }
      }
    />
  );
}
