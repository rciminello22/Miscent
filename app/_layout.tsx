import 'react-native-gesture-handler';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaProvider } from 'react-native-safe-area-context';

/**
 * Raíz de navegación.
 *
 * En la Fase 3 se abre en dos árboles (§14):
 *   Estado A · usuario con cuenta personal → Inicio, Movimientos, Futuro, Compartidos
 *   Estado B · usuario sin cuenta personal → sus espacios, sin barra de pestañas
 *
 * No hay pestañas bloqueadas ni candados: el invitado nunca ve una sección
 * que no puede usar (§10, CA-06).
 */
export default function RootLayout() {
  return (
    <SafeAreaProvider>
      <StatusBar style="auto" />
      <Stack screenOptions={{ headerShown: false }} />
    </SafeAreaProvider>
  );
}
