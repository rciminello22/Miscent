import { useCallback } from 'react';
import { useRouter, type Href } from 'expo-router';
import { useSession } from '@/features/auth/SessionProvider';
import { useSpaces } from './useSpaces';
import { spaceHref } from './spaceNavigation';
import { resetTo } from '@/features/shared/navigation';

/**
 * Abre un espacio donde corresponde según quién lo abre (spaceHref): con
 * cuenta personal, adentro de la pestaña Compartidos; el invitado, en su
 * pantalla sin pestañas. Ningún lugar de la app arma la ruta a mano.
 */
export function useOpenSpace() {
  const router = useRouter();
  const { accountState } = useSession();
  const { data: spaces } = useSpaces();
  const spaceCount = spaces?.length ?? null;

  return useCallback(
    (
      spaceId: string,
      /** 'reset' limpia el historial: al entrar, el login no queda debajo. */
      mode: 'push' | 'replace' | 'reset' = 'push',
      /**
       * true justo después de crear o sumarse a un espacio: la lista en caché
       * todavía tiene la cantidad vieja. Se va al espacio concreto, y su ruta
       * se acomoda sola si resulta ser el único.
       */
      justChanged = false,
    ) => {
      const href = spaceHref({
        accountState: accountState === 'personal' ? 'personal' : 'guest',
        spaceId,
        spaceCount: justChanged ? null : spaceCount,
      }) as Href;

      if (mode === 'reset') resetTo(router, href);
      else if (mode === 'replace') router.replace(href);
      else router.push(href);
    },
    [router, accountState, spaceCount],
  );
}
