import { useCallback } from 'react';
import { useRouter, type Href } from 'expo-router';
import { useSession } from '@/features/auth/SessionProvider';
import { spaceHref, spaceSubHref, type SpaceDetailScreen } from './spaceNavigation';
import { resetTo } from '@/features/shared/navigation';

/**
 * Abre un espacio donde corresponde según quién lo abre (spaceHref): con
 * cuenta personal, adentro de la pestaña Compartidos; el invitado, en su
 * pantalla sin pestañas. Ningún lugar de la app arma la ruta a mano.
 */
export function useOpenSpace() {
  const router = useRouter();
  const { accountState } = useSession();
  const state = accountState === 'personal' ? 'personal' : 'guest';

  return useCallback(
    (
      spaceId: string,
      /** 'reset' limpia el historial: al entrar, el login no queda debajo. */
      mode: 'push' | 'replace' | 'reset' = 'push',
    ) => {
      const href = spaceHref({ accountState: state, spaceId }) as Href;

      if (mode === 'reset') resetTo(router, href);
      else if (mode === 'replace') router.replace(href);
      else router.push(href);
    },
    [router, state],
  );
}

/**
 * Abre una pantalla de detalle del espacio (Detalle del mes, Movimientos,
 * Pendientes) en el árbol que corresponde: dentro de la pestaña, o sin ella.
 */
export function useOpenSpaceDetail() {
  const router = useRouter();
  const { accountState } = useSession();
  const state = accountState === 'personal' ? 'personal' : 'guest';

  return useCallback(
    (spaceId: string, screen: SpaceDetailScreen, month?: string) => {
      router.push(spaceSubHref({ accountState: state, spaceId, screen, month }) as Href);
    },
    [router, state],
  );
}
