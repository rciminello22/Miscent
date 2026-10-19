import type { IsoDate } from '@domain/calendar';
import type { Pesos } from '@domain/money';
import { formatLongDate, formatPesos } from '@/lib/format';
import { amountSpeech, signOf } from '@/features/movements/amountSign';
import { Button, Divider, Money, Row, Stack, Text } from '@/ui/primitives';

/**
 * §25 · el detalle de un pago entre miembros. Presentacional: se abre en un
 * Sheet desde el espacio.
 *
 * P-01 dice qué es un pago: quién le pagó a quién, monto, fecha y quién lo
 * registró. No hay "con qué le pagó": no cambia ninguna cifra (P-04) y
 * sugeriría que la app sabe de dónde salió la plata (G-06).
 */
export function PaymentDetail({
  sentence,
  amount,
  direction,
  date,
  recordedBy,
  review,
  onDelete,
}: {
  /** "Martina te pagó" / "Le pagaste a Martina": sin la cifra, que va aparte con su signo. */
  sentence: string;
  amount: Pesos;
  /** 15 · la de quien mira: te pagaron (+, en brand) o pagaste (−). */
  direction: 'received' | 'sent';
  date: IsoDate;
  recordedBy: { isMe: boolean; name: string };
  /** Opción B · si lo registró el otro y todavía no se revisó. */
  review?: { label: string; onReviewed: () => void };
  onDelete: () => void;
}) {
  const kind = direction === 'received' ? 'payment-received' : 'payment-sent';

  return (
    <Stack gap="5">
      <Stack gap="1">
        <Text variant="title">{sentence}</Text>
        <Money
          amount={amount}
          variant="display"
          numberOfLines={1}
          sign={signOf(kind)}
          accessibilityLabel={amountSpeech(kind, amount, formatPesos)}
        />
      </Stack>

      {review != null && (
        <Row justify="space-between" align="center" gap="3">
          <Text variant="caption" tone="shared" style={{ flex: 1 }}>
            {review.label}
          </Text>
          <Button label="Está bien" variant="secondary" onPress={review.onReviewed} />
        </Row>
      )}

      <Stack gap="3">
        <Row justify="space-between" align="baseline">
          <Text variant="small" tone="secondary">
            Fecha
          </Text>
          <Text variant="smallMedium">{formatLongDate(date)}</Text>
        </Row>
        <Divider />
        <Row justify="space-between" align="baseline">
          <Text variant="small" tone="secondary">
            Lo registró
          </Text>
          <Text variant="smallMedium">{recordedBy.isMe ? 'Vos' : recordedBy.name}</Text>
        </Row>
        <Divider />
        {/* P-04 · lo primero que se lee bajo la cifra: no es un ingreso ni un gasto. */}
        <Row justify="space-between" align="baseline">
          <Text variant="small" tone="secondary">
            Tu radar
          </Text>
          <Text variant="smallMedium">No cambia</Text>
        </Row>
      </Stack>

      <Text variant="caption" tone="muted">
        Es lo que declararon: la app no verifica la transferencia. Solo mueve el saldo entre
        ustedes: no cambia lo que puso cada uno ni el radar de nadie.
      </Text>

      <Button label="Eliminar este pago" variant="destructive" fullWidth onPress={onDelete} />
    </Stack>
  );
}
