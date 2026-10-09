import { Redirect, useRouter } from 'expo-router';
import { useSession } from '@/features/auth/SessionProvider';
import { useMagicLinkStatus } from '@/features/auth/magicLinkStatus';
import { MagicLinkStatusView } from '@/features/auth/MagicLinkStatusView';

/**
 * La ruta a la que vuelve el enlace mágico: `<esquema>/--/auth/callback`.
 *
 * Tiene que existir aunque la sesión la arme MagicLinkListener (en el layout):
 * expo-router TAMBIÉN navega a la URL del deep link, y sin pantalla acá
 * muestra "Unmatched Route".
 *
 * Espera sesión Y perfil antes de irse. Entre una cosa y la otra,
 * `accountState` vale 'guest' un instante; redirigir ahí mandaría a un
 * usuario con cuenta personal a la pantalla del invitado.
 *
 * La raíz (app/index.tsx) decide el destino según el estado de la cuenta.
 */
export default function AuthCallback() {
  const router = useRouter();
  const { session, profile } = useSession();
  const status = useMagicLinkStatus();

  if (session != null && profile != null) return <Redirect href="/" />;

  return (
    <MagicLinkStatusView
      status={status.kind === 'failed' ? status : { kind: 'pending' }}
      onRetry={() => router.replace('/(auth)/email')}
    />
  );
}
