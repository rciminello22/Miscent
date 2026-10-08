import 'react-native-gesture-handler';
import { useEffect, useMemo, useState } from 'react';
import { useFonts } from 'expo-font';
import { Slot, SplashScreen, useRouter, useSegments } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import * as Linking from 'expo-linking';
import { QueryClientProvider } from '@tanstack/react-query';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { createQueryClient, wireAppStateToQueries } from '@/data/queryClient';
import { completeMagicLink } from '@/data/auth';
import { SessionProvider, useSession } from '@/features/auth/SessionProvider';
import { ThemeProvider } from '@/ui/theme';
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
            <StatusBar style="auto" />
            <MagicLinkListener />
            <RouteGuard />
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
  const [, setHandled] = useState(false);

  useEffect(() => {
    let active = true;

    async function handle(url: string | null) {
      if (url == null || !url.includes('auth')) return;
      await completeMagicLink(url);
      if (active) setHandled(true);
    }

    void Linking.getInitialURL().then(handle);
    const subscription = Linking.addEventListener('url', (event) => void handle(event.url));

    return () => {
      active = false;
      subscription.remove();
    };
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
     */
    const SHARED_ROUTES = new Set(['onboarding', 'agregar']);

    if (accountState === 'signed-out' && !inAuth) {
      router.replace('/(auth)/bienvenida');
      return;
    }

    if (group != null && SHARED_ROUTES.has(group)) return;

    if (accountState === 'guest' && !inGuest) {
      router.replace('/(guest)/espacios');
      return;
    }

    if (accountState === 'personal' && !inPersonal) {
      router.replace('/(personal)/inicio');
    }
  }, [accountState, segments, router]);

  return <Slot />;
}
