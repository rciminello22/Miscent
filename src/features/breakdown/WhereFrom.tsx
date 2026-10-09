import { ScrollView, View } from 'react-native';
import Animated, { FadeInDown } from 'react-native-reanimated';
import type { Month } from '@domain/calendar';
import type { PersonalExpansion, PersonalOccurrence } from '@domain/occurrences';
import { calculateRadar } from '@domain/radar';
import type { Pesos } from '@domain/money';
import { formatDayMonth, formatMonth, formatPaymentWhen } from '@/lib/format';
import { prettyLabel } from '@/features/add/categories';
import { AudienceIcon, Divider, Money, Row, Sheet, Stack, Text } from '@/ui/primitives';
import { duration, stagger } from '@/ui/motion';
import { useTheme } from '@/ui/theme';

/**
 * M18 · "¿De dónde sale?" · §33 U8 · CA-04 y CA-52.
 *
 * §4.10 · "Cada número se puede abrir y muestra de qué está hecho, como ver la
 * fórmula de una celda."
 *
 * Esta pantalla es la mitigación principal del riesgo número uno del producto
 * (§39): que "Sin asignar" se lea como plata disponible. La defensa no es un
 * disclaimer al pie; es que el usuario pueda ABRIR la cifra y ver la resta,
 * con la aclaración explícita de que no es plata en sus cuentas.
 *
 * La cascada al abrir tampoco es adorno: hace que la cifra se descomponga
 * ante los ojos, que es precisamente lo que se quiere comunicar.
 */

export type BreakdownTarget = 'spent' | 'committed' | 'unassigned' | null;

export function WhereFrom({
  target,
  onClose,
  expansion,
  month,
}: {
  target: BreakdownTarget;
  onClose: () => void;
  expansion: PersonalExpansion;
  month: Month;
}) {
  const radar = calculateRadar(expansion, month);

  const inMonth = expansion.occurrences.filter((occurrence) => occurrence.month === month);
  const spent = inMonth.filter((occurrence) => occurrence.bucket === 'spent');
  const committed = inMonth.filter((occurrence) => occurrence.bucket === 'committed');
  const incomes = expansion.incomes.filter((income) => income.month === month);

  const title = {
    spent: 'Gastado',
    committed: 'Comprometido',
    unassigned: 'Sin asignar',
  }[target ?? 'spent'];

  return (
    <Sheet visible={target != null} onClose={onClose} title={`${title} · ¿de dónde sale?`}>
      <ScrollView showsVerticalScrollIndicator={false}>
        {target === 'unassigned' ? (
          <UnassignedBreakdown
            registeredIncome={radar.registeredIncome}
            spent={radar.spent}
            committed={radar.committed}
            unassigned={radar.unassigned}
          />
        ) : target === 'spent' ? (
          <OccurrenceList
            occurrences={spent}
            total={radar.spent}
            explanation="Tu parte de los gastos del día a día que registraste como pagados al contado este mes."
          />
        ) : (
          <OccurrenceList
            occurrences={committed}
            total={radar.committed}
            explanation="Tu parte de los fijos, las cuotas y los resúmenes de tarjeta que se pagan este mes, ya haya pasado la fecha o esté por venir."
            showWhen
          />
        )}

        {target === 'unassigned' && incomes.length > 0 && (
          <View style={{ marginTop: 24 }}>
            <Text variant="overline" tone="muted">
              Ingresos registrados de {formatMonth(month, month)}
            </Text>
            <View style={{ height: 12 }} />
            {incomes.map((income, index) => (
              <Animated.View
                key={income.id}
                entering={FadeInDown.delay(stagger(index, 50)).duration(duration.base)}
              >
                <Row justify="space-between" align="baseline" style={{ paddingVertical: 8 }}>
                  <Text variant="small" tone="secondary">
                    {prettyLabel(income.label)}
                    {income.isRecurrence ? ' · fijo' : ''}
                  </Text>
                  <Money amount={income.amount} variant="smallMedium" />
                </Row>
              </Animated.View>
            ))}
          </View>
        )}
      </ScrollView>
    </Sheet>
  );
}

/**
 * CA-04 / CA-52 · la fórmula de Sin asignar, con la aclaración obligatoria.
 *
 * El texto de la última línea es, palabra por palabra, el de §33 U8 y la
 * definición de D1. No es una paráfrasis: es la definición que la spec declara
 * obligatoria.
 */
function UnassignedBreakdown({
  registeredIncome,
  spent,
  committed,
  unassigned,
}: {
  registeredIncome: Pesos;
  spent: Pesos;
  committed: Pesos;
  unassigned: Pesos | null;
}) {
  const theme = useTheme();

  if (unassigned == null) {
    return (
      <Text variant="body" tone="secondary">
        Todavía no registraste ingresos para este mes, así que no se calcula.
      </Text>
    );
  }

  const rows = [
    { label: 'Ingresos registrados', amount: registeredIncome, operator: '' },
    { label: 'Gastado', amount: spent, operator: '−' },
    { label: 'Comprometido', amount: committed, operator: '−' },
  ];

  return (
    <Stack gap="5">
      <Stack gap="3">
        {rows.map((row, index) => (
          <Animated.View
            key={row.label}
            entering={FadeInDown.delay(stagger(index, 70)).duration(duration.base)}
          >
            <Row gap="3" align="baseline">
              <Text variant="body" tone="muted" style={{ width: 16 }}>
                {row.operator}
              </Text>
              <Text variant="body" tone="secondary" style={{ flex: 1 }}>
                {row.label}
              </Text>
              <Money amount={row.amount} variant="bodyMedium" />
            </Row>
          </Animated.View>
        ))}

        <Divider />

        <Animated.View entering={FadeInDown.delay(stagger(3, 70)).duration(duration.base)}>
          <Row gap="3" align="baseline">
            <Text variant="body" tone="muted" style={{ width: 16 }}>
              =
            </Text>
            <Text variant="bodyMedium" style={{ flex: 1 }}>
              Sin asignar
            </Text>
            <Money amount={unassigned} variant="heading" />
          </Row>
        </Animated.View>
      </Stack>

      {/* CA-04 · la aclaración de que NO es plata en cuentas. Obligatoria. */}
      <Animated.View entering={FadeInDown.delay(stagger(4, 70)).duration(duration.base)}>
        <View
          style={{
            padding: theme.space['4'],
            borderRadius: theme.radius.md,
            backgroundColor: theme.colors.surfaceSunken,
          }}
        >
          <Text variant="small" tone="secondary">
            No es la plata que tenés en tus cuentas. Es la parte de tus ingresos
            registrados que todavía no tiene un gasto o un compromiso registrado
            asociado.
          </Text>
        </View>
      </Animated.View>
    </Stack>
  );
}

function OccurrenceList({
  occurrences,
  total,
  explanation,
  showWhen = false,
}: {
  occurrences: readonly PersonalOccurrence[];
  total: Pesos;
  explanation: string;
  showWhen?: boolean;
}) {
  const theme = useTheme();

  if (occurrences.length === 0) {
    return (
      <Text variant="body" tone="secondary">
        {explanation} Todavía no hay nada registrado.
      </Text>
    );
  }

  return (
    <Stack gap="5">
      <Text variant="small" tone="secondary">
        {explanation}
      </Text>

      <Stack gap="0">
        {occurrences.map((occurrence, index) => (
          <Animated.View
            key={occurrence.id}
            entering={FadeInDown.delay(stagger(index, 45)).duration(duration.base)}
          >
            <Row gap="3" align="flex-start" style={{ paddingVertical: theme.space['3'] }}>
              <View style={{ flex: 1, gap: 2 }}>
                <Row gap="2" align="center">
                  <Text variant="smallMedium" numberOfLines={1} style={{ flexShrink: 1 }}>
                    {prettyLabel(occurrence.label)}
                  </Text>
                  {/* §12 · el ícono de audiencia en cada fila. */}
                  <AudienceIcon
                    audience={
                      occurrence.spaceId == null
                        ? { kind: 'private' }
                        : {
                            kind: 'shared',
                            otherMemberName: occurrence.otherMemberName ?? '',
                          }
                    }
                    size={11}
                  />
                </Row>

                <Text variant="caption" tone="muted">
                  {[
                    occurrence.spaceName != null ? `${occurrence.spaceName} · tu parte` : null,
                    occurrence.installment != null
                      ? `cuota ${occurrence.installment.index} de ${occurrence.installment.count}`
                      : null,
                    occurrence.isRecurrence ? 'fijo' : null,
                    showWhen && occurrence.paymentDate != null
                      ? formatPaymentWhen({
                          date: occurrence.paymentDate,
                          month: occurrence.month,
                        })
                      : !showWhen && occurrence.paymentDate != null
                        ? formatDayMonth(occurrence.paymentDate)
                        : null,
                  ]
                    .filter((part) => part != null)
                    .join(' · ')}
                </Text>
              </View>

              {/* K9 · en el radar siempre se cuenta la parte del usuario. */}
              <Money amount={occurrence.myShare} variant="smallMedium" />
            </Row>
            {index < occurrences.length - 1 && <Divider />}
          </Animated.View>
        ))}
      </Stack>

      <Divider />

      <Row justify="space-between" align="baseline">
        <Text variant="bodyMedium">Total</Text>
        <Money amount={total} variant="heading" />
      </Row>
    </Stack>
  );
}
