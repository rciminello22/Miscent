import { useEffect, useRef } from 'react';
import { Alert } from 'react-native';
import { useOpenSpace } from '@/features/spaces/useOpenSpace';
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
  const { session, profile, refreshProfile } = useSession();
  const openSpace = useOpenSpace();
  const queryClient = useQueryClient();
  /**
   * Para QUÉ usuario ya se miró el token pendiente. No alcanza con un "ya lo
   * hice": este componente vive en el layout raíz y no se desmonta, así que
   * si alguien cierra sesión y entra otra persona sin cerrar la app (dos
   * cuentas en un teléfono), la segunda nunca aceptaba su invitación.
   */
  const handledFor = useRef<string | null>(null);

  useEffect(() => {
    // Espera al PERFIL, no solo a la sesión: space_members.user_id tiene FK a
    // profiles, y aceptar antes de que el perfil exista fallaba (el error que
    // vio la invitada el 9/10, con la invitación sin usar).
    if (session == null || profile == null || handledFor.current === session.user.id) return;
    handledFor.current = session.user.id;

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
      openSpace(result.spaceId, 'replace', true);
    })();
  }, [session, profile, refreshProfile, queryClient, openSpace]);

  return null;
}
