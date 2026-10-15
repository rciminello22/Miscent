import type { IsoDate } from '@domain/calendar';
import { formatLongDate } from '@/lib/format';
import { Button, Divider, Row, Stack, Text } from '@/ui/primitives';

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
  date,
  recordedBy,
  review,
  onDelete,
}: {
  sentence: string;
  date: IsoDate;
  recordedBy: { isMe: boolean; name: string };
  /** Opción B · si lo registró el otro y todavía no se revisó. */
  review?: { label: string; onReviewed: () => void };
  onDelete: () => void;
}) {
  return (
    <Stack gap="5">
      <Text variant="title">{sentence}</Text>

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
      </Stack>

      <Text variant="caption" tone="muted">
        Es lo que declararon: la app no verifica la transferencia. Solo mueve el saldo entre
        ustedes: no cambia lo que puso cada uno ni el radar de nadie.
      </Text>

      <Button label="Eliminar este pago" variant="destructive" fullWidth onPress={onDelete} />
    </Stack>
  );
}
