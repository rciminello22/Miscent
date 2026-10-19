import { useLocalSearchParams, useRouter } from 'expo-router';
import { X } from 'lucide-react-native';
import { goBack } from '@/features/shared/navigation';
import { SpacePaymentPanel } from '@/features/spaces/SpacePaymentPanel';
import { useSpace } from '@/features/spaces/useSpaces';
import { AudienceBadge, Button, IconButton, Row, Screen, Stack, Text } from '@/ui/primitives';
import { useTheme } from '@/ui/theme';

/**
 * §25 · el detalle de un pago entre miembros, abierto desde Movimientos.
 *
 * Es la misma pieza que la hoja del espacio (`SpacePaymentPanel`): revisar y
 * eliminar. "Atrás" vuelve a la lista de la que se vino. Vive bajo /space para
 * que lo usen los dos árboles, como el detalle de un gasto.
 */
export default function PagoEntreMiembros() {
  const theme = useTheme();
  const router = useRouter();
  const { id, pid } = useLocalSearchParams<{ id: string; pid: string }>();
  const spaceId = id ?? '';
  const { derived, today, isLoading } = useSpace(spaceId);

  const payment = derived?.facts.payments.find((item) => item.id === pid);

  if (derived == null || payment == null) {
    return (
      <Screen>
        <Stack gap="5">
          <Text variant="body" tone="secondary">
            {isLoading ? 'Cargando…' : 'Este pago ya no existe. Puede que la otra persona lo haya eliminado.'}
          </Text>
          <Button label="Volver" variant="secondary" onPress={() => goBack(router)} />
        </Stack>
      </Screen>
    );
  }

  return (
    <Screen>
      <Stack gap="6">
        <Row justify="space-between" align="center">
          <Text variant="heading" numberOfLines={1} style={{ flex: 1 }}>
            Pago entre ustedes
          </Text>
          <IconButton
            label="Cerrar"
            onPress={() => goBack(router)}
            icon={<X size={18} color={theme.colors.textSecondary} />}
          />
        </Row>

        <AudienceBadge audience={{ kind: 'shared', otherMemberName: derived.other.displayName }} />

        <SpacePaymentPanel
          spaceId={spaceId}
          derived={derived}
          today={today}
          payment={payment}
          onDone={() => goBack(router)}
        />
      </Stack>
    </Screen>
  );
}
