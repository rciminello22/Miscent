import { useEffect } from 'react';
import { useRouter } from 'expo-router';
import { useSession } from '@/features/auth/SessionProvider';
import { useMagicLinkStatus } from '@/features/auth/magicLinkStatus';
import { MagicLinkStatusView } from '@/features/auth/MagicLinkStatusView';
import { resetTo } from '@/features/shared/navigation';

/**
 * La ruta a la que vuelve el enlace mágico: `<esquema>/--/auth/callback`.
 *
 * Tiene que existir aunque la sesión la arme MagicLinkListener (en el layout):
 * expo-router TAMBIÉN navega a la URL del deep link, y sin pantalla acá
 * muestra "Unmatched Route".
 *
 * Se va cuando hay sesión y el estado de cuenta dejó de ser 'loading' (que
 * cubre el perfil en camino), con el historial limpio: las pantallas del
 * login no quedan debajo de la app. La raíz decide el destino (§14).
 */
export default function AuthCallback() {
  const router = useRouter();
  const { session, accountState } = useSession();
  const status = useMagicLinkStatus();

  const ready = session != null && accountState !== 'loading';

  useEffect(() => {
    if (ready) resetTo(router, '/');
  }, [ready, router]);

  return (
    <MagicLinkStatusView
      status={status.kind === 'failed' ? status : { kind: 'pending' }}
      onRetry={() => router.replace('/(auth)/email')}
    />
  );
}
