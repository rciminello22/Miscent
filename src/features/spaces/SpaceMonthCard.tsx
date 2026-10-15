import { addMonths, type Month } from '@domain/calendar';
import type { SpaceMonth } from '@domain/shared-balance';
import type { Slot } from '@domain/types';
import { formatDayMonth, formatMonth } from '@/lib/format';
import { prettyLabel } from '@/features/add/categories';
import { Money, Row, Stack, Text } from '@/ui/primitives';
import { Disclosure } from './Disclosure';
import { paymentSentence, previousMonthSentence, putExtraSentence } from './balanceCopy';
import { MemberContribution } from './SpaceRows';

/**
 * §24 · el mes del espacio. Presentacional.
 *
 * Queda a la vista lo que responde "¿quién viene poniendo más?": el total, las
 * barras de lo que puso cada uno con la marca de su parte, la frase de "puso de
 * más" (S-05) y el puente con el mes anterior. Lo de menor jerarquía (por
 * categoría, pagos entre ustedes, lo que se viene) va detrás de "Ver detalle del
 * mes" y NO desaparece: los pagos, además, siguen en Movimientos.
 */
export function SpaceMonthCard({
  month,
  mySlot,
  otherName,
  currentMonth,
  hasDetail,
  detailOpen,
  onToggleDetail,
}: {
  month: SpaceMonth;
  mySlot: Slot;
  otherName: string;
  currentMonth: Month;
  hasDetail: boolean;
  detailOpen: boolean;
  onToggleDetail: () => void;
}) {
  const max = Math.max(month.viewer.put, month.other.put, 1);
  const previous = previousMonthSentence(
    month,
    formatMonth(addMonths(currentMonth, -1), currentMonth),
  );
  const extra = putExtraSentence(month);

  return (
    <Stack gap="4">
      <Row justify="space-between" align="baseline">
        <Text variant="smallMedium" tone="secondary">
          {formatMonth(currentMonth, currentMonth)} · gastos compartidos
        </Text>
        <Money amount={month.total} variant="bodyMedium" animate />
      </Row>

      <Stack gap="4">
        <MemberContribution
          name="Vos"
          put={month.viewer.put}
          share={month.viewer.share}
          max={max}
          tone="viewer"
          index={0}
        />
        <MemberContribution
          name={otherName}
          put={month.other.put}
          share={month.other.share}
          max={max}
          tone="other"
          index={1}
        />
      </Stack>

      {/* S-05 · la frase es "puso de más", nunca la diferencia. */}
      {extra != null && <Text variant="small">{extra}</Text>}

      {previous != null && (
        <Text variant="caption" tone="muted">
          {previous}
        </Text>
      )}

      <Text variant="caption" tone="muted">
        La marca en cada barra es la parte de cada uno según el reparto. Cuenta lo que ya
        pasó, igual que lo que se deben.
      </Text>

      {hasDetail && (
        <Disclosure title="Ver detalle del mes" open={detailOpen} onToggle={onToggleDetail}>
          {/* Should 7 · por categoría, en lista y sin gráficos (§6). Con una
              sola categoría repetiría el total: no aparece. */}
          {month.byCategory.length > 1 && (
            <Stack gap="2">
              <Text variant="smallMedium" tone="secondary">
                Por categoría
              </Text>
              {month.byCategory.map((item) => (
                <Row key={item.category} justify="space-between" align="baseline">
                  <Text variant="small">{prettyLabel(item.category)}</Text>
                  <Money amount={item.total} variant="small" />
                </Row>
              ))}
            </Stack>
          )}

          {/* §25 · "en el mes: Pagos entre ustedes". No cambian lo que cada uno
              puso (P-04): por eso van aparte, y no en las barras. */}
          {month.payments.length > 0 && (
            <Stack gap="2">
              <Text variant="smallMedium" tone="secondary">
                Pagos entre ustedes
              </Text>
              {month.payments.map((payment, index) => (
                <Row key={`${payment.date}-${index}`} justify="space-between" align="baseline">
                  <Text variant="small">{paymentSentence(payment, mySlot, otherName)}</Text>
                  <Text variant="caption" tone="muted">
                    {formatDayMonth(payment.date)}
                  </Text>
                </Row>
              ))}
            </Stack>
          )}

          {/* Lo que falta del mes: todavía no cuenta (S-02). */}
          {month.upcoming.length > 0 && (
            <Stack gap="2">
              <Text variant="smallMedium" tone="secondary">
                Se vienen este mes
              </Text>
              {month.upcoming.map((item, index) => (
                <Row key={`${item.date}-${index}`} justify="space-between" align="baseline">
                  <Text variant="small">
                    {prettyLabel(item.label)} · {formatDayMonth(item.date)}
                  </Text>
                  <Money amount={item.amount} variant="small" />
                </Row>
              ))}
            </Stack>
          )}
        </Disclosure>
      )}
    </Stack>
  );
}
