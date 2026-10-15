import { View } from 'react-native';
import { CreditCard } from 'lucide-react-native';
import type { PaymentMethod } from '@domain/types';
import { Button, Card, Divider, Row, Stack, Text } from '@/ui/primitives';
import { useTheme } from '@/ui/theme';
import { cardScheduleLine } from './cards';

/**
 * UX-21 · "Tus tarjetas": las que ya existen, y agregar otra sin el wizard.
 * Presentacional.
 *
 * Las filas son INFORMATIVAS (sin chevron ni rol de botón) a propósito: editar
 * las fechas de una tarjeta recalcula todo lo de esa tarjeta con aviso, y
 * eliminarla no se puede con cuotas o fijos activos (§22). Esas reglas todavía
 * no existen en la app, así que no se ofrece lo que no se puede cumplir.
 */
export function CardsList({
  cards,
  onAdd,
}: {
  cards: readonly PaymentMethod[];
  onAdd: () => void;
}) {
  const theme = useTheme();

  if (cards.length === 0) {
    return (
      <Card tone="sunken">
        <Stack gap="5">
          <Text variant="body" tone="secondary">
            Todavía no cargaste ninguna tarjeta.
          </Text>
          <Text variant="small" tone="muted">
            Con el día de cierre y el de vencimiento, la app sabe en qué resumen cae cada compra.
          </Text>
          <Button label="Agregar una tarjeta" fullWidth onPress={onAdd} />
        </Stack>
      </Card>
    );
  }

  return (
    <Stack gap="5">
      <Card>
        <Stack gap="0">
          {cards.map((card, index) => (
            <View key={card.id}>
              <Row gap="3" align="center" style={{ paddingVertical: theme.space['4'] }}>
                <CreditCard size={18} color={theme.colors.brand} />
                <View style={{ flex: 1, gap: 2 }}>
                  <Text variant="bodyMedium">{card.name}</Text>
                  <Text variant="caption" tone="muted">
                    {cardScheduleLine(card)}
                  </Text>
                </View>
              </Row>
              {index < cards.length - 1 && <Divider />}
            </View>
          ))}
        </Stack>
      </Card>

      <Button label="Agregar otra tarjeta" variant="secondary" fullWidth onPress={onAdd} />
    </Stack>
  );
}
