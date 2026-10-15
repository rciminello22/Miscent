import { useMemo, useState } from 'react';
import { RefreshControl, ScrollView, View } from 'react-native';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { addMonths, monthOf, type Month } from '@domain/calendar';
import { activeInstallmentPlans, calculateFuture } from '@domain/future';
import { calculateUpcomingPayments, type UpcomingPayment } from '@domain/upcoming';
import { formatInstallment, formatMonth } from '@/lib/format';
import { StatementDetailSheet } from '@/features/upcoming/StatementDetailSheet';
import { UpcomingPaymentRow } from '@/features/upcoming/UpcomingPaymentRow';
import { canOpenPayment } from '@/features/upcoming/statementDetail';
import { prettyLabel } from '@/features/add/categories';
import { FutureMonthDetail } from '@/features/future/FutureMonthDetail';
import { futurePaymentsView, initialPaymentsMonth } from '@/features/future/paymentsMonth';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { usePersonalFacts } from '@/features/shared/usePersonalFacts';
import {
  AudienceBadge,
  AudienceIcon,
  Card,
  Divider,
  EmptyState,
  Money,
  MonthBar,
  Pressable,
  Row,
  RowChevron,
  SectionHeader,
  Skeleton,
  Stack,
  Text,
} from '@/ui/primitives';
import { duration, stagger } from '@/ui/motion';
import { useTheme } from '@/ui/theme';
import { MIN_TARGET, hitSlopFor } from '@/ui/touch';
import { spaceContext } from '@/features/spaces/departureCopy';

/** UX-12 · 8 + 20 + 8 + borde de 1,5 × 2: ~39pt de alto, se toca con 44. */
const SELECTABLE_HIT_SLOP = hitSlopFor(MIN_TARGET, 39);

/**
 * §23 · Futuro. "Futuro es el corazón del producto."
 *
 * Responde: si sigo con lo que ya tengo registrado, ¿cómo vienen mis próximos
 * meses y qué tengo que pagar? No necesita saber cuánta plata va a tener el
 * usuario, y no lo pretende.
 *
 * Tres bloques, los de la spec:
 *   §23.1 · los próximos 6 meses, con comprometido, ingreso previsto y sin
 *           asignar, más la línea de cuotas que terminan
 *   §23.2 · Próximos pagos del mes elegido, con el resumen estimado de cada
 *           tarjeta y la parte de otros miembros aclarada
 *   §23.3 · Tus cuotas y tus fijos
 */
export default function Futuro() {
  const theme = useTheme();
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { facts, expansion, today, isLoading, refetch } = usePersonalFacts();

  // §23.1 · las barras siguen arrancando en el mes que viene.
  const from = addMonths(monthOf(today), 1);
  const currentMonth = monthOf(today);

  // UX-07 · "Ver todos" de Inicio abre este mes (param `mes`); `n` cambia en cada
  // toque para que volver a pedirlo vuelva a elegirlo aunque `mes` sea el mismo.
  const { mes, n } = useLocalSearchParams<{ mes?: string; n?: string }>();
  const [selectedMonth, setSelectedMonth] = useState<Month>(() =>
    initialPaymentsMonth(mes, today),
  );
  // Un pedido nuevo de Inicio re-elige el mes (se ajusta durante el render, sin efecto).
  const request = `${mes ?? ''}|${n ?? ''}`;
  const [handledRequest, setHandledRequest] = useState(request);
  if (request !== handledRequest) {
    setHandledRequest(request);
    if (mes != null) setSelectedMonth(initialPaymentsMonth(mes, today));
  }
  const [refreshing, setRefreshing] = useState(false);
  // UX-08 · el resumen estimado abierto en la hoja de detalle.
  const [openPayment, setOpenPayment] = useState<UpcomingPayment | null>(null);

  const future = useMemo(() => calculateFuture(expansion, from, 6), [expansion, from]);
  const maxCommitted = Math.max(...future.months.map((month) => month.committed), 1);
  const hasCommitments = future.months.some((month) => month.committed > 0);

  // §23.2 · "en Futuro, todos los del mes elegido"; UX-07 · el mes en curso, desde hoy.
  const allPayments = useMemo(
    () => calculateUpcomingPayments(expansion, today, facts.paymentMethods),
    [expansion, today, facts.paymentMethods],
  );
  const paymentsView = useMemo(
    () => futurePaymentsView({ payments: allPayments, today, selectedMonth }),
    [allPayments, today, selectedMonth],
  );
  const payments = paymentsView.payments;
  const hasPaymentsThisMonth = useMemo(
    () => futurePaymentsView({ payments: allPayments, today, selectedMonth: currentMonth }).payments.length > 0,
    [allPayments, today, currentMonth],
  );

  // §23.3 · cada compra en cuotas activa, con lo que falta.
  const plans = useMemo(() => activeInstallmentPlans(expansion, today), [expansion, today]);

  const fixed = facts.recurrences.filter(
    (recurrence) => recurrence.kind === 'expense' && recurrence.spaceId == null,
  );

  // UX-07 · el desglose es de los meses futuros: con el mes en curso elegido no hay.
  const selected = paymentsView.showMonthDetail
    ? future.months.find((month) => month.month === selectedMonth)
    : undefined;

  async function onRefresh() {
    setRefreshing(true);
    await refetch();
    setRefreshing(false);
  }

  return (
    <ScrollView
      style={{ flex: 1, backgroundColor: theme.colors.background }}
      contentContainerStyle={{
        paddingTop: insets.top + theme.space['3'],
        paddingBottom: insets.bottom + 140,
        paddingHorizontal: theme.space['5'],
      }}
      showsVerticalScrollIndicator={false}
      refreshControl={
        <RefreshControl
          refreshing={refreshing}
          onRefresh={() => void onRefresh()}
          tintColor={theme.colors.brand}
        />
      }
    >
      <Stack gap="7">
        <Row justify="space-between" align="center">
          <Text variant="overline" tone="muted">
            Futuro
          </Text>
          <AudienceBadge audience={{ kind: 'private' }} />
        </Row>

        {isLoading ? (
          <Stack gap="3">
            <Skeleton width={200} height={26} />
            {[0, 1, 2, 3, 4, 5].map((index) => (
              <Skeleton key={index} height={14} />
            ))}
          </Stack>
        ) : !hasCommitments && !hasPaymentsThisMonth ? (
          <EmptyState
            title="No tenés nada comprometido todavía."
            description="Cargá tus fijos y cuotas."
          />
        ) : (
          <>
            {/* ── §23.1 · los próximos 6 meses ─────────────────────────── */}
            <Animated.View entering={FadeInDown.duration(duration.deliberate)}>
              <Stack gap="4">
                <Text variant="title">Tus próximos 6 meses</Text>

                <Stack gap="3">
                  {/* UX-07 · el mes en curso: solo para la lista de pagos, no es una barra. */}
                  <CurrentMonthChip
                    label="Este mes"
                    hint="pagos desde hoy"
                    selected={paymentsView.isCurrentMonth}
                    onPress={() => setSelectedMonth(currentMonth)}
                  />

                  {future.months.map((month, index) => (
                    <Pressable
                      key={month.month}
                      onPress={() => setSelectedMonth(month.month)}
                      scaleOnPress={false}
                      haptic="none"
                      accessibilityRole="button"
                      accessibilityLabel={formatMonth(month.month, from)}
                      accessibilityState={{ selected: month.month === selectedMonth }}
                      // UX-12 · la barra elegible mide ~39; el toque llega a 44.
                      hitSlop={SELECTABLE_HIT_SLOP}
                    >
                      <MonthBar
                        month={month.month}
                        committed={month.committed}
                        maxCommitted={maxCommitted}
                        index={index}
                        highlighted={month.month === selectedMonth}
                        selectable
                      />
                    </Pressable>
                  ))}
                </Stack>

                <Text variant="caption" tone="muted">
                  Tu parte de fijos, cuotas y tarjetas que se pagan cada mes. Tocá un mes
                  para ver su detalle. Este mes solo muestra los pagos que faltan.
                </Text>
              </Stack>
            </Animated.View>

            {/* §23.1 · "tu comprometido baja $X por mes" */}
            {future.endingInstallments.map((ending) => (
              <Animated.View key={ending.month} entering={FadeInDown.duration(duration.base)}>
                <Card tone="brand">
                  <Text variant="small">
                    En {formatMonth(ending.month, from)} termina
                    {ending.count === 1 ? '' : 'n'} {ending.count} cuota
                    {ending.count === 1 ? '' : 's'}: tu comprometido baja{' '}
                    <Money amount={ending.monthlyDrop} variant="smallMedium" /> por mes.
                  </Text>
                </Card>
              </Animated.View>
            ))}

            {/* ── El mes elegido ───────────────────────────────────────── */}
            {selected != null && (
              // UX-10 · la ayuda de Sin asignar y el negativo (N-08) viven en el componente.
              <FutureMonthDetail
                title={formatMonth(selected.month, from)}
                committed={selected.committed}
                expectedIncome={selected.expectedIncome}
                unassigned={selected.unassigned}
              />
            )}

            {/* ── §23.2 · Próximos pagos del mes elegido ───────────────── */}
            {paymentsView.showBlock && (
              <Stack gap="4">
                {/* UX-24 · el bloque dice de qué mes es. */}
                <SectionHeader title={paymentsView.title} />

                {payments.length === 0 && (
                  <Text variant="small" tone="secondary">
                    No tenés más pagos este mes.
                  </Text>
                )}

                <Stack gap="0">
                  {payments.map((payment, index) => (
                    <Animated.View
                      key={payment.id}
                      entering={FadeInDown.delay(stagger(index, 50)).duration(duration.base)}
                    >
                      {/* UX-08 · el resumen estimado se abre (§23.2, §4.10). */}
                      <View style={{ paddingVertical: theme.space['3'] }}>
                        <UpcomingPaymentRow
                          payment={payment}
                          onPress={canOpenPayment(payment) ? () => setOpenPayment(payment) : undefined}
                        />
                      </View>
                      {index < payments.length - 1 && <Divider />}
                    </Animated.View>
                  ))}
                </Stack>

                <Text variant="caption" tone="muted">
                  Son los pagos que hacés vos. Lo que paga otra persona, aunque tengas
                  una parte, se ve en el espacio compartido.
                </Text>
              </Stack>
            )}

            {/* ── §23.3 · Tus cuotas ───────────────────────────────────── */}
            {plans.length > 0 && (
              <Stack gap="4">
                <SectionHeader title="Tus cuotas" />

                <Stack gap="3">
                  {plans.map((plan, index) => (
                    <Animated.View
                      key={plan.purchaseId}
                      entering={FadeInDown.delay(stagger(index, 50)).duration(duration.base)}
                    >
                      <Card>
                        <Stack gap="2">
                          <Row justify="space-between" align="baseline">
                            <Row gap="2" align="center" style={{ flexShrink: 1 }}>
                              <Text variant="bodyMedium" numberOfLines={1}>
                                {prettyLabel(plan.label)}
                              </Text>
                              {plan.spaceName != null && (
                                <AudienceIcon
                                  audience={{ kind: 'shared', otherMemberName: '' }}
                                  size={12}
                                />
                              )}
                            </Row>
                            <Text variant="smallMedium" tone="secondary" tabular>
                              {formatInstallment(plan.current, plan.count)}
                            </Text>
                          </Row>

                          <Row justify="space-between" align="baseline">
                            <Text variant="caption" tone="muted">
                              {plan.spaceName != null
                                ? `${spaceContext(plan.spaceName, plan.fromFormerMembership)} · tu parte · `
                                : ''}
                              termina en {formatMonth(plan.endsOn, from)}
                            </Text>
                            {/* UX-24 · el número de la derecha dice qué es. */}
                            <Row gap="1" align="baseline">
                              <Text variant="caption" tone="muted">
                                faltan
                              </Text>
                              <Money amount={plan.remaining} variant="small" tone="secondary" />
                            </Row>
                          </Row>
                        </Stack>
                      </Card>
                    </Animated.View>
                  ))}
                </Stack>

              </Stack>
            )}

            {/* ── §23.3 · Tus fijos ────────────────────────────────────── */}
            {fixed.length > 0 && (
              <Stack gap="4">
                <SectionHeader title="Tus fijos" />

                <Stack gap="0">
                  {fixed.map((recurrence, index) => (
                    <View key={recurrence.id}>
                      <Pressable
                        onPress={() => router.push(`/fijo/${recurrence.id}`)}
                        haptic="none"
                        scaleOnPress={false}
                        accessibilityRole="button"
                        accessibilityHint="Cambiar o dejar de pagar este fijo"
                      >
                      <Row
                        justify="space-between"
                        align="baseline"
                        style={{ paddingVertical: theme.space['3'] }}
                      >
                        <View style={{ flex: 1, gap: 2 }}>
                          <Text variant="smallMedium">
                            {recurrence.description ?? prettyLabel(recurrence.category)}
                          </Text>
                          <Text variant="caption" tone="muted">
                            cada día {recurrence.dayOfMonth}
                            {recurrence.endMonth != null
                              ? ` · hasta ${formatMonth(recurrence.endMonth, from)}`
                              : ''}
                          </Text>
                        </View>
                        <Money amount={recurrence.amount} variant="smallMedium" />
                        {/* UX-11 · la fila abre el fijo (F-03). */}
                        <View style={{ alignSelf: 'center' }}>
                          <RowChevron />
                        </View>
                      </Row>
                      </Pressable>
                      {index < fixed.length - 1 && <Divider />}
                    </View>
                  ))}
                </Stack>
              </Stack>
            )}
          </>
        )}
      </Stack>

      <StatementDetailSheet
        payment={openPayment}
        onClose={() => setOpenPayment(null)}
      />
    </ScrollView>
  );
}

/**
 * UX-07 · "Este mes" arriba de las barras: elige el mes en curso para la lista
 * de pagos. Mismo tratamiento que una barra elegida (borde y fondo, UX-24).
 */
function CurrentMonthChip({
  label,
  hint,
  selected,
  onPress,
}: {
  label: string;
  hint: string;
  selected: boolean;
  onPress: () => void;
}) {
  const theme = useTheme();

  return (
    <Pressable
      onPress={onPress}
      scaleOnPress={false}
      haptic="none"
      accessibilityRole="button"
      accessibilityLabel={`${label}, ${hint}`}
      accessibilityState={{ selected }}
      hitSlop={SELECTABLE_HIT_SLOP}
    >
      <Row
        justify="space-between"
        align="center"
        style={{
          paddingHorizontal: theme.space['3'],
          paddingVertical: theme.space['2'],
          borderRadius: theme.radius.md,
          borderWidth: 1.5,
          borderColor: selected ? theme.colors.brand : theme.colors.border,
          backgroundColor: selected ? theme.colors.surface : 'transparent',
        }}
      >
        <Text variant="smallMedium" tone={selected ? 'default' : 'secondary'}>
          {label}
        </Text>
        <Text variant="caption" tone="muted">
          {hint}
        </Text>
      </Row>
    </Pressable>
  );
}
