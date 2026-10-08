import { useRouter } from 'expo-router';
import { EmptyState, Screen, Stack, Text } from '@/ui/primitives';

/**
 * §14 · Compartidos: lista de espacios. Con uno solo, entra directo.
 *
 * K1 · un usuario puede tener varios espacios, "con poco protagonismo en la
 * UX": por eso es una lista sobria y no un tablero.
 *
 * ⚠️ Fase 3 · los espacios, el saldo de cada uno y la creación llegan en la
 * Fase 6. Acá está el estado vacío definitivo de §33.
 */
export default function Compartidos() {
  const router = useRouter();

  return (
    <Screen>
      <Stack gap="7">
        <Text variant="overline" tone="muted">
          Compartidos
        </Text>

        <EmptyState
          title="¿Compartís gastos con alguien?"
          description="Anótenlos acá y la app hace las cuentas."
          actionLabel="Crear espacio"
          onAction={() => router.push('/(personal)/compartidos')}
        />
      </Stack>
    </Screen>
  );
}
