import { ScrollView, View } from 'react-native';
import type { PaymentMethod } from '@domain/types';
import type { UpcomingPayment } from '@domain/upcoming';
import { prettyLabel } from '@/features/add/categories';
import { Divider, Money, Row, Sheet, Stack, Text } from '@/ui/primitives';
import { UPCOMING_COPY } from './UpcomingPaymentRow';
import { paymentDetail, type DetailGroup, type DetailLine } from './statementDetail';

/**
 * UX-08 · §23.2 · §4.10 · el detalle del resumen estimado de una tarjeta.
 *
 * "Al tocar, el detalle (compras, cuotas, fijos, partes de otros)". Mismo patrón
 * que M18 "¿de dónde sale?" (WhereFrom): una hoja que abre la cifra y muestra
 * de qué está hecha.
 *
 * Es la lente "lo que vas a pagar" (§7.3): cada línea por su TOTAL pagado, y la
 * suma es la cifra de la fila. La lente "tu parte" no aparece acá.
 *
 * Presentacional: el container (Inicio, Futuro) elige el pago y los medios de
 * pago. El armado vive en `paymentDetail` (pura, con test).
 */
export function StatementDetailSheet({
  payment,
  methods,
  onClose,
}: {
  payment: UpcomingPayment | null;
  methods: readonly PaymentMethod[];
  onClose: () => void;
}) {
  const detail = payment != null ? paymentDetail(payment, methods) : null;

  return (
    <Sheet visible={detail != null} onClose={onClose} title={detail?.title ?? ''}>
      {detail != null && (
        <ScrollView showsVerticalScrollIndicator={false}>
          <Stack gap="5">
            <Stack gap="1">
              {/* N-10 · todo resumen va rotulado. */}
              <Text variant="small" tone="secondary">
                {detail.estimateNote}
              </Text>
              {/* T-05 · el modo aproximado se declara. */}
              {detail.approximate && (
                <Text variant="caption" tone="muted">
                  {UPCOMING_COPY.approximate}
                </Text>
              )}
            </Stack>

            {detail.groups.map((group) => (
              <Group key={group.kind} group={group} />
            ))}

            <Divider />

            <Stack gap="1">
              <Row justify="space-between" align="baseline">
                <Text variant="bodyMedium">Total</Text>
                <Money amount={detail.total} variant="heading" />
              </Row>
              {/* §7.3 · la parte del otro, siempre aclarada. */}
              {detail.other != null && (
                <Text variant="caption" tone="shared">
                  {UPCOMING_COPY.includes}{' '}
                  <Money amount={detail.other.amount} variant="caption" tone="shared" /> de{' '}
                  {detail.other.name}
                </Text>
              )}
            </Stack>
          </Stack>
        </ScrollView>
      )}
    </Sheet>
  );
}

function Group({ group }: { group: DetailGroup }) {
  return (
    <Stack gap="2">
      <Text variant="overline" tone="muted">
        {group.title}
      </Text>
      <Stack gap="0">
        {group.lines.map((line, index) => (
          <View key={line.id}>
            <Line line={line} />
            {index < group.lines.length - 1 && <Divider />}
          </View>
        ))}
      </Stack>
    </Stack>
  );
}

function Line({ line }: { line: DetailLine }) {
  return (
    <Row gap="3" align="flex-start" style={{ paddingVertical: 10 }}>
      <View style={{ flex: 1, gap: 2 }}>
        <Text variant="smallMedium">{prettyLabel(line.label)}</Text>
        {line.note != null && (
          <Text variant="caption" tone="muted">
            {line.note}
          </Text>
        )}
        {line.includesOtherShare > 0 && line.otherMemberName != null && (
          <Text variant="caption" tone="shared">
            {UPCOMING_COPY.includes}{' '}
            <Money amount={line.includesOtherShare} variant="caption" tone="shared" /> de{' '}
            {line.otherMemberName}
          </Text>
        )}
      </View>
      <Money amount={line.amount} variant="smallMedium" />
    </Row>
  );
}
