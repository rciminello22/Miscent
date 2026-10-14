import { Button, Card, Pressable, Stack, Text } from '@/ui/primitives';

/**
 * §33 U1 · la pantalla principal del invitado: "que entienda en segundos que
 * está en un espacio compartido y que sus finanzas personales son otra cosa".
 *
 * Presentacionales: cuándo se muestran (una sola vez, "Ahora no") lo decide
 * la pantalla, con una marca que sobrevive cerrar la app.
 */

/** "Bienvenida única". */
export function GuestWelcome({
  spaceName,
  otherName,
  onDismiss,
}: {
  spaceName: string;
  otherName: string;
  onDismiss: () => void;
}) {
  return (
    <Card tone="shared">
      <Stack gap="3">
        <Text variant="bodyMedium">Estás en {spaceName}.</Text>
        <Text variant="small">
          Acá anotan lo que pagan entre los dos y la app hace las cuentas. Lo que cargues acá
          lo ven vos y {otherName}.
        </Text>
        <Pressable onPress={onDismiss} haptic="none" accessibilityRole="button">
          <Text variant="smallMedium" tone="brand">
            Entendido
          </Text>
        </Pressable>
      </Stack>
    </Card>
  );
}

/**
 * "Tarjeta fija 'Tu plata personal'… [Crear mi cuenta personal] · [Ahora no]
 * ('Ahora no' la reduce a una línea; nunca insiste)". Nunca un candado.
 */
export function PersonalMoneyCard({
  spaceName,
  otherName,
  reduced,
  onCreate,
  onNotNow,
}: {
  spaceName: string;
  otherName: string;
  /** Después de "Ahora no": una línea. */
  reduced: boolean;
  onCreate: () => void;
  onNotNow: () => void;
}) {
  if (reduced) {
    return (
      <Pressable onPress={onCreate} haptic="none" accessibilityRole="button">
        <Text variant="small" tone="brand">
          Crear mi cuenta personal
        </Text>
      </Pressable>
    );
  }

  return (
    <Card tone="sunken">
      <Stack gap="4">
        <Stack gap="2">
          <Text variant="bodyMedium">Tu plata personal</Text>
          <Text variant="small" tone="secondary">
            {spaceName} es lo que compartís con {otherName}. Tus ingresos y tus gastos propios
            son otra cosa: si querés, podés ordenarlos acá, en privado.
          </Text>
        </Stack>
        <Stack gap="2">
          <Button label="Crear mi cuenta personal" fullWidth onPress={onCreate} />
          <Pressable onPress={onNotNow} haptic="none" accessibilityRole="button">
            <Text variant="small" tone="muted" align="center">
              Ahora no
            </Text>
          </Pressable>
        </Stack>
      </Stack>
    </Card>
  );
}
