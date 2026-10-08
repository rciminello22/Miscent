import { QueryClient, focusManager, onlineManager } from '@tanstack/react-query';
import { AppState, Platform } from 'react-native';
import NetInfo from '@react-native-community/netinfo';

/**
 * SY-01 · "Al abrir, volver a una pantalla o deslizar para actualizar se ven
 * los cambios del otro miembro. Sin notificaciones en el MVP."
 *
 * Esa regla es, literalmente, la configuración de abajo. No hace falta
 * realtime ni websockets: la spec pide exactamente estos tres momentos, y
 * TanStack Query los cubre con `refetchOnMount` (volver a una pantalla),
 * `refetchOnWindowFocus` + AppState (abrir la app) y el pull-to-refresh de
 * cada pantalla.
 */

export function createQueryClient(): QueryClient {
  return new QueryClient({
    defaultOptions: {
      queries: {
        // Los hechos los puede haber cambiado el otro miembro en cualquier
        // momento, así que nada se considera fresco por mucho tiempo.
        staleTime: 30_000,
        gcTime: 5 * 60_000,
        // SY-01 · volver a una pantalla trae los cambios del otro.
        refetchOnMount: 'always',
        refetchOnWindowFocus: true,
        refetchOnReconnect: true,
        retry: 2,
      },
      mutations: {
        retry: 0,
      },
    },
  });
}

/**
 * En React Native no hay `window`, así que el "focus" hay que conectarlo a
 * AppState a mano. Sin esto, `refetchOnWindowFocus` no hace nada y SY-01
 * queda a medias.
 */
export function wireAppStateToQueries(): () => void {
  if (Platform.OS === 'web') return () => {};

  const subscription = AppState.addEventListener('change', (status) => {
    focusManager.setFocused(status === 'active');
  });

  // onlineManager se encarga de llamar al cleanup que devuelve el callback.
  onlineManager.setEventListener((setOnline) =>
    NetInfo.addEventListener((state) => {
      setOnline(state.isConnected === true);
    }),
  );

  return () => {
    subscription.remove();
  };
}

/**
 * Claves de query. Centralizadas para que invalidar después de una mutación
 * sea obvio y no haya strings sueltos por el código.
 */
export const queryKeys = {
  session: ['session'] as const,
  profile: ['profile'] as const,

  personalFacts: (userId: string) => ['personal-facts', userId] as const,
  paymentMethods: (userId: string) => ['payment-methods', userId] as const,

  spaces: ['spaces'] as const,
  space: (spaceId: string) => ['space', spaceId] as const,
  spaceFacts: (spaceId: string) => ['space-facts', spaceId] as const,
  invitation: (spaceId: string) => ['invitation', spaceId] as const,
} as const;
