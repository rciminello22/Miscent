import { useEffect, useRef } from 'react';
import { Alert } from 'react-native';
import { useRouter } from 'expo-router';
import { useQueryClient } from '@tanstack/react-query';
import { queryKeys } from '@/data/queryClient';
import {
  acceptFailureMessage,
  acceptInvitation,
} from '@/data/repositories/invitations';
import { useSession } from './SessionProvider';
import { takeInvitationToken } from './invitationToken';

/**
 * Cierra el círculo de O2: alguien abre una invitación sin sesión, pide el
 * enlace mágico, vuelve, y la invitación se acepta sola.
 *
 * Sin esto el viaje al mail se come la invitación y la persona entra a la app
 * sin espacios, que es justo el estado que §33 U1 trata como el peor: una
 * pantalla vacía para quien fue invitado a algo.
 *
 * Corre una sola vez por sesión establecida.
 */
export function PendingInvitation() {
  const { session, refreshProfile } = useSession();
  const router = useRouter();
  const queryClient = useQueryClient();
  const handled = useRef(false);

  useEffect(() => {
    if (session == null || handled.current) return;
    handled.current = true;

    void (async () => {
      const token = await takeInvitationToken();
      if (token == null) return;

      const result = await acceptInvitation(token);

      if (!result.ok) {
        Alert.alert(
          'No pudimos abrir la invitación',
          acceptFailureMessage(result.reason, result.spaceName),
        );
        return;
      }

      // I-07 · aceptar no activa la cuenta personal; solo refrescamos para que
      // el RouteGuard vea el estado correcto.
      await refreshProfile();
      await queryClient.invalidateQueries({ queryKey: queryKeys.spaces });
      router.replace(`/space/${result.spaceId}`);
    })();
  }, [session, refreshProfile, queryClient, router]);

  return null;
}
