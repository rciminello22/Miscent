import { View } from 'react-native';
import { Button, Card, Stack, Text, TextLink } from '@/ui/primitives';
import { useTheme } from '@/ui/theme';

/**
 * §33 U1 · la pantalla principal del invitado: "que entienda en segundos que
 * está en un espacio compartido y que sus finanzas personales son otra cosa".
 *
 * Presentacionales: cuándo se muestran (una sola vez, "Ahora no") lo decide
 * `guestHomeBlocks`, con una marca que sobrevive cerrar la app.
 */

/** "Bienvenida única": compacta, arriba del N1. La pantalla ya es usable detrás. */
export function GuestWelcome({
  spaceName,
  otherName,
  onDismiss,
}: {
  spaceName: string;
  otherName: string;
  onDismiss: () => void;
}) {
  const theme = useTheme();

  return (
    <Card tone="shared" style={{ padding: theme.space['4'] }}>
      <Stack gap="2">
        <Text variant="bodyMedium">Estás en {spaceName}.</Text>
        <Text variant="small">
          Acá anotan lo que pagan entre los dos y la app hace las cuentas. Lo que cargues acá
          lo ven vos y {otherName}.
        </Text>
        <TextLink label="Entendido" variant="smallMedium" onPress={onDismiss} />
      </Stack>
    </Card>
  );
}

/**
 * "Tarjeta fija 'Tu plata personal'… [Crear mi cuenta personal] · [Ahora no]
 * ('Ahora no' la reduce a una línea; nunca insiste)". Nunca un candado.
 *
 * Va al pie, después de las puertas, y no compite con el N1: superficie hundida
 * y el botón es secundario.
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
  const theme = useTheme();

  if (reduced) {
    return (
      <TextLink label="Crear mi cuenta personal" onPress={onCreate} />
    );
  }

  return (
    <Card tone="sunken">
      <Stack gap="3">
        <Stack gap="2">
          <Text variant="bodyMedium">Tu plata personal</Text>
          <Text variant="small" tone="secondary">
            {spaceName} es lo que compartís con {otherName}. Tus ingresos y tus gastos propios
            son otra cosa: si querés, podés ordenarlos acá, en privado.
          </Text>
        </Stack>
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', gap: theme.space['2'] }}>
          <Button label="Crear mi cuenta personal" variant="secondary" onPress={onCreate} />
          <Button label="Ahora no" variant="ghost" haptic="none" onPress={onNotNow} />
        </View>
      </Stack>
    </Card>
  );
}
