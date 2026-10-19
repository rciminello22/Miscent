import { View } from 'react-native';
import { formatPesos } from '@/lib/format';
import { amountSpeech } from '@/features/movements/amountSign';
import { Card, Divider, Money, Row, SectionHeader, Stack, Text } from '@/ui/primitives';
import { useTheme } from '@/ui/theme';
import type { InstallmentsDetail as InstallmentsDetailModel, SegmentState } from './installmentsCycle';

/**
 * 15·4 · el cuerpo del detalle de una compra en cuotas: arriba el monto con su
 * signo y la línea de la compra, una tarjeta con el ciclo, debajo la próxima, el
 * final y el medio, y al final la lista de cuotas.
 *
 * Presentacional: todo el copy y el cálculo vienen de `buildInstallmentsDetail`.
 * Lo comparten el detalle personal y el de un gasto compartido; cada pantalla
 * pone el encabezado (título, audiencia, cerrar) y las acciones.
 */
export function InstallmentsDetail({
  detail,
  footnote,
}: {
  detail: InstallmentsDetailModel;
  /** Lo que aclara la lista: las cuotas no se editan de a una. */
  footnote: string;
}) {
  const theme = useTheme();

  return (
    <Stack gap="7">
      <Stack gap="2">
        {/* 15 · "−": es plata que sale. En un compartido, TU parte (K9). */}
        <Money
          amount={detail.figure.amount}
          variant="display"
          sign="out"
          accessibilityLabel={amountSpeech('expense', detail.figure.amount, formatPesos)}
        />
        {detail.figure.ofTotal != null && (
          <Text variant="caption" tone="muted" tabular>
            de {formatPesos(detail.figure.ofTotal)}
          </Text>
        )}
        <Text variant="small" tone="secondary">
          {detail.purchaseLine}
        </Text>
      </Stack>

      <Card>
        <Stack gap="4">
          {detail.cycle.remaining != null && (
            <Text variant="bodyMedium">{detail.cycle.remaining}</Text>
          )}

          <Stack gap="2">
            <CycleBar segments={detail.cycle.segments} />
            <Row justify="space-between" align="baseline" gap="3">
              <Text variant="caption" tone="muted">
                {detail.cycle.firstMonth}
              </Text>
              <Text variant="caption" tone="muted">
                {detail.cycle.lastMonth}
              </Text>
            </Row>
          </Stack>

          {/* G-06 · lo único que la app sabe es que la fecha ya pasó. */}
          <Text variant="small" tone="secondary">
            {detail.cycle.passed}
          </Text>

          {detail.facts.length > 0 && (
            <View style={{ gap: theme.space['3'] }}>
              <Divider />
              {detail.facts.map((fact) => (
                <Row key={fact.label} justify="space-between" align="baseline" gap="3">
                  <Text variant="small" tone="secondary">
                    {fact.label}
                  </Text>
                  <Text variant="smallMedium" style={{ flexShrink: 1 }} align="right">
                    {fact.value}
                  </Text>
                </Row>
              ))}
            </View>
          )}
        </Stack>
      </Card>

      {/* X-05 · el cronograma se ve, pero una cuota no se edita. */}
      <Stack gap="4">
        <SectionHeader title="Sus cuotas" />
        <Card>
          <Stack gap="0">
            {detail.rows.map((item, index) => (
              <View key={item.label}>
                <Row
                  justify="space-between"
                  align="baseline"
                  style={{ paddingVertical: theme.space['3'] }}
                >
                  <View style={{ flex: 1, minWidth: 0, gap: 2 }}>
                    <Text variant="smallMedium" tone={item.past ? 'muted' : 'default'}>
                      {item.label}
                    </Text>
                    <Text variant="caption" tone="muted">
                      {item.when}
                    </Text>
                  </View>
                  <Money
                    amount={item.amount}
                    variant="smallMedium"
                    tone={item.past ? 'muted' : 'default'}
                  />
                </Row>
                {index < detail.rows.length - 1 && <Divider />}
              </View>
            ))}
          </Stack>
        </Card>
        <Text variant="caption" tone="muted">
          {footnote}
        </Text>
      </Stack>
    </Stack>
  );
}

/**
 * Una línea de N segmentos: los pasados llenos, el próximo con contorno (no solo
 * otro color) y los que vienen vacíos. Decorativa para el lector de pantalla:
 * "Ya pasaron 3 de 6 cuotas" lo dice con palabras.
 */
function CycleBar({ segments }: { segments: readonly SegmentState[] }) {
  const theme = useTheme();

  return (
    <View
      accessible={false}
      importantForAccessibility="no-hide-descendants"
      accessibilityElementsHidden
      style={{ flexDirection: 'row', gap: 4 }}
    >
      {segments.map((state, index) => (
        <View
          // eslint-disable-next-line react/no-array-index-key
          key={index}
          testID={`cycle-${state}`}
          style={{
            flex: 1,
            height: 10,
            borderRadius: 5,
            borderWidth: state === 'next' ? 2 : 0,
            borderColor: theme.colors.committed,
            backgroundColor:
              state === 'passed'
                ? theme.colors.committed
                : state === 'future'
                  ? theme.colors.surfaceSunken
                  : 'transparent',
          }}
        />
      ))}
    </View>
  );
}
