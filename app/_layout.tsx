import 'react-native-gesture-handler';
import { useEffect, useMemo } from 'react';
import { useFonts } from 'expo-font';
import { Slot, SplashScreen, useRouter, useSegments } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import * as Linking from 'expo-linking';
import { QueryClientProvider } from '@tanstack/react-query';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { createQueryClient, wireAppStateToQueries } from '@/data/queryClient';
import { completeMagicLink } from '@/data/auth';
import { SessionProvider, useSession } from '@/features/auth/SessionProvider';
import { setMagicLinkStatus } from '@/features/auth/magicLinkStatus';
import { resetTo } from '@/features/shared/navigation';
import { PendingInvitation } from '@/features/auth/PendingInvitation';
import { ThemeProvider } from '@/ui/theme';
import { ToastProvider } from '@/ui/primitives';
import { fontsToLoad } from '@/ui/tokens';

void SplashScreen.preventAutoHideAsync();

export default function RootLayout() {
  const [fontsLoaded, fontError] = useFonts(fontsToLoad);
  const queryClient = useMemo(() => createQueryClient(), []);

  useEffect(() => wireAppStateToQueries(), []);

  useEffect(() => {
    if (fontsLoaded || fontError != null) void SplashScreen.hideAsync();
  }, [fontsLoaded, fontError]);

  if (!fontsLoaded && fontError == null) return null;

  return (
    <QueryClientProvider client={queryClient}>
      <SessionProvider>
        <ThemeProvider>
          <SafeAreaProvider>
            {/* §17 · §12 · el aviso al guardar sobrevive a la pantalla que guardó. */}
            <ToastProvider>
              <StatusBar style="auto" />
              <MagicLinkListener />
              <PendingInvitation />
              <RouteGuard />
            </ToastProvider>
          </SafeAreaProvider>
        </ThemeProvider>
      </SessionProvider>
    </QueryClientProvider>
  );
}

/**
 * Cierra el enlace mágico cuando la app se abre desde el email (P1).
 *
 * Tiene que estar acá arriba y no en una pantalla, porque el deep link puede
 * llegar con la app cerrada o en cualquier pantalla.
 */
function MagicLinkListener() {
  useEffect(() => {
    // El mismo enlace puede llegar dos veces: como URL inicial y como evento.
    let lastHandled: string | null = null;

    async function handle(url: string | null) {
      if (url == null || !url.includes('auth/callback') || url === lastHandled) return;
      lastHandled = url;

      setMagicLinkStatus({ kind: 'pending' });
      const result = await completeMagicLink(url);
      setMagicLinkStatus(
        result.ok
          ? { kind: 'done' }
          : { kind: 'failed', message: result.message ?? 'Este enlace ya no sirve. Pedí uno nuevo.' },
      );
    }

    void Linking.getInitialURL().then(handle);
    const subscription = Linking.addEventListener('url', (event) => void handle(event.url));

    return () => subscription.remove();
  }, []);

  return null;
}

/**
 * §14 · decide QUÉ ÁRBOL ve el usuario.
 *
 * Los tres estados son excluyentes y cada uno tiene su propio layout:
 *   signed-out → (auth)      · onboarding e identidad
 *   guest      → (guest)     · sus espacios, SIN barra de pestañas
 *   personal   → (personal)  · Inicio, Movimientos, Futuro, Compartidos
 *
 * CA-06 · un usuario sin cuenta personal "no ve Inicio, Movimientos ni Futuro,
 * ni pestañas bloqueadas". De ahí que no sea un árbol con pantallas
 * deshabilitadas: el Estado B simplemente no las tiene.
 */
function RouteGuard() {
  const { accountState } = useSession();
  const segments = useSegments();
  const router = useRouter();

  useEffect(() => {
    if (accountState === 'loading') return;

    const group = segments[0];
    const inAuth = group === '(auth)';
    const inPersonal = group === '(personal)';
    const inGuest = group === '(guest)';

    /**
     * Rutas que viven fuera de los tres árboles porque los cruzan:
     *   onboarding · activar la cuenta personal, que se abre desde el Estado B
     *   agregar    · §14 · el formulario único existe en los DOS estados
     *                (en el B, con los espacios como únicos destinos)
     *   space      · §24 · la pantalla del espacio es IGUAL en los dos
     *                estados, y el invitado vive ahí
     */
    const SHARED_ROUTES = new Set([
      'onboarding',
      'agregar',
      'space',
      // Hojas de detalle: viven fuera de las pestanas (secciones 16 y 21).
      'movimiento',
      'fijo',
      'tarjetas',
    ]);

    // O2 · una invitacion se abre ANTES de tener sesion: el enlace llega
    // por fuera de la app y la persona todavia no es usuaria.
    if (group === 'invite') return;

    // P1 · la vuelta del enlace mágico: llega SIN sesión, porque la sesión se
    // arma recién ahí. La propia pantalla redirige cuando está lista.
    if (group === 'auth') return;

    // La ruta raíz la resuelve app/index.tsx con un <Redirect> declarativo.
    // Si el guard también la redirigiera, habría dos fuentes de verdad para
    // el mismo destino y el orden entre ellas no está garantizado.
    if (group == null) return;

    // Cambiar de árbol limpia el historial: las pantallas del login no pueden
    // quedar debajo de la app, ni las de la app debajo del login.
    if (accountState === 'signed-out' && !inAuth) {
      resetTo(router, '/(auth)/bienvenida');
      return;
    }

    if (group != null && SHARED_ROUTES.has(group)) return;

    if (accountState === 'guest' && !inGuest) {
      resetTo(router, '/(guest)/espacios');
      return;
    }

    if (accountState === 'personal' && !inPersonal) {
      resetTo(router, '/(personal)/inicio');
    }
  }, [accountState, segments, router]);

  return <Slot />;
}
