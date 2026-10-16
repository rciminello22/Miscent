import { CreditCard } from 'lucide-react-native';
import type { PaymentMethod } from '@domain/types';
import { Button, Card, Door, Stack, Text } from '@/ui/primitives';

/**
 * P24 · "Tus tarjetas": una puerta por tarjeta con su próximo resumen estimado
 * (N-10). Tocarla abre el detalle, donde se corrige el nombre y se elimina con
 * las reglas de §22. Agregar otra no pasa por el wizard. Presentacional.
 *
 * C-05 · las tarjetas se ven solo en lo personal. Nunca número, límite, pago
 * mínimo ni intereses (T-01).
 */
export function CardsList({
  rows,
  onOpen,
  onAdd,
}: {
  rows: readonly { card: PaymentMethod; line: string }[];
  onOpen: (cardId: string) => void;
  onAdd: () => void;
}) {
  if (rows.length === 0) {
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
    <Stack gap="4">
      {rows.map(({ card, line }) => (
        <Door
          key={card.id}
          icon={CreditCard}
          title={card.name}
          caption={line}
          accessibilityLabel={`${card.name}. ${line}`}
          onPress={() => onOpen(card.id)}
        />
      ))}

      <Button label="Agregar otra tarjeta" variant="secondary" fullWidth onPress={onAdd} />
    </Stack>
  );
}
