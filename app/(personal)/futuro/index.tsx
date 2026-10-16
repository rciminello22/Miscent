import { useMemo, useState } from 'react';
import { RefreshControl, ScrollView } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { CalendarClock, Layers, Repeat } from 'lucide-react-native';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { addMonths, monthOf, type Month } from '@domain/calendar';
import { paymentMethodName } from '@domain/cards';
import { activeInstallmentPlans, calculateFuture } from '@domain/future';
import { calculateUpcomingPayments } from '@domain/upcoming';
import { formatMonth, formatPesos } from '@/lib/format';
import { selectFixedExpenses } from '@/features/fixed/fixedExpenses';
import { FutureHero, type FutureHeroContent } from '@/features/future/FutureHero';
import { FutureMonthDetail } from '@/features/future/FutureMonthDetail';
import { FutureMonthSelector } from '@/features/future/FutureMonthSelector';
import {
  currentMonthHeadline,
  endingInstallmentsLine,
  fixedDoor,
  futureHeroLine,
  installmentsDoor,
  paymentsDoor,
} from '@/features/future/futureView';
import {
  CURRENT_MONTH_PARAM,
  futurePaymentsView,
  initialPaymentsMonth,
} from '@/features/future/paymentsMonth';
import { usePersonalFacts } from '@/features/shared/usePersonalFacts';
import {
  AudienceBadge,
  Door,
  EmptyState,
  Row,
  Sheet,
  Skeleton,
  Stack,
  Text,
} from '@/ui/primitives';
import { duration, stagger } from '@/ui/motion';
import { useTheme } from '@/ui/theme';
import { useBottomPadding } from '@/ui/useBottomPadding';

/**
 * §23 · Futuro. "Futuro es el corazón del producto."
 *
 * Responde: si sigo con lo que ya tengo registrado, ¿cómo vienen mis próximos
 * meses? No necesita saber cuánta plata va a tener el usuario, y no lo pretende.
 *
 * El N1 es el mes elegido: su comprometido, Sin asignar según los ingresos
 * previstos, las seis barras como selector y la línea de cuotas que terminan.
 * Debajo, hasta tres puertas —Próximos pagos del mes, Tus cuotas y Tus fijos—
 * que abren su detalle en su propia pantalla.
 */
export default function Futuro() {
  const theme = useTheme();
  const insets = useSafeAreaInsets();
  const bottomPad = useBottomPadding({ tabs: true, fab: true });
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
  // Un pedido nuevo de Inicio o de un aviso re-elige el mes (se ajusta durante el render, sin efecto).
  const request = `${mes ?? ''}|${n ?? ''}`;
  const [handledRequest, setHandledRequest] = useState(request);
  if (request !== handledRequest) {
    setHandledRequest(request);
    if (mes != null) setSelectedMonth(initialPaymentsMonth(mes, today));
  }
  const [refreshing, setRefreshing] = useState(false);
  // §23.1 · el desglose del mes (comprometido, ingreso previsto, sin asignar), al tocar la cifra.
  const [detailOpen, setDetailOpen] = useState(false);

  const future = useMemo(() => calculateFuture(expansion, from, 6), [expansion, from]);
  // §23.1 · el desglose rotula el resumen estimado de cada tarjeta por su nombre.
  const cardNames = useMemo(
    () => new Map(facts.paymentMethods.map((method) => [method.id, paymentMethodName(method)])),
    [facts.paymentMethods],
  );
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
  const hasPaymentsThisMonth = useMemo(
    () => futurePaymentsView({ payments: allPayments, today, selectedMonth: currentMonth }).payments.length > 0,
    [allPayments, today, currentMonth],
  );

  // §23.3 · cada compra en cuotas activa, con lo que falta.
  const plans = useMemo(() => activeInstallmentPlans(expansion, today), [expansion, today]);
  const fixedCount = useMemo(
    () => selectFixedExpenses(facts.recurrences, currentMonth).length,
    [facts.recurrences, currentMonth],
  );

  // UX-07 · el desglose es de los meses futuros: con el mes en curso elegido no hay.
  const selected = paymentsView.showMonthDetail
    ? future.months.find((month) => month.month === selectedMonth)
    : undefined;

  const hero: FutureHeroContent =
    selected != null
      ? {
          kind: 'month',
          committed: selected.committed,
          line: futureHeroLine(selected.unassigned, selected.expectedIncome, formatPesos),
        }
      : { kind: 'current', headline: currentMonthHeadline(paymentsView.payments.length) };

  const doors = {
    payments: paymentsDoor({
      payments: paymentsView.payments,
      month: selectedMonth,
      today,
      isCurrentMonth: paymentsView.isCurrentMonth,
    }),
    installments: installmentsDoor(plans, today),
    fixed: fixedDoor(fixedCount),
  };

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
        paddingBottom: bottomPad,
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
      <Stack gap="4">
        <Row justify="space-between" align="center">
          <Text variant="overline" tone="muted">
            Futuro
          </Text>
          <AudienceBadge audience={{ kind: 'private' }} />
        </Row>

        {isLoading ? (
          <Stack gap="3">
            <Skeleton height={160} />
            <Skeleton height={72} />
          </Stack>
        ) : !hasCommitments && !hasPaymentsThisMonth ? (
          <EmptyState
            title="No tenés nada comprometido todavía."
            description="Cargá tus fijos y cuotas."
          />
        ) : (
          <>
            {/* N1 · el mes que elegís manda; las barras son el selector. */}
            <Animated.View entering={FadeInDown.duration(duration.deliberate)}>
              <FutureHero
                monthLabel={capitalize(formatMonth(selectedMonth, currentMonth))}
                hero={hero}
                onOpenDetail={selected != null ? () => setDetailOpen(true) : null}
                endings={future.endingInstallments.map((ending) =>
                  endingInstallmentsLine(ending, from, formatPesos),
                )}
                selector={
                  <FutureMonthSelector
                    months={future.months}
                    selected={paymentsView.isCurrentMonth ? null : selectedMonth}
                    currentSelected={paymentsView.isCurrentMonth}
                    reference={from}
                    onSelectCurrent={() => setSelectedMonth(currentMonth)}
                    onSelectMonth={setSelectedMonth}
                  />
                }
              />
            </Animated.View>

            {/* N2 · como mucho tres puertas; lo que no aplica no ocupa lugar. */}
            {doors.payments != null && (
              <Animated.View entering={FadeInDown.delay(stagger(1, 80)).duration(duration.base)}>
                <Door
                  icon={CalendarClock}
                  title={doors.payments.title}
                  caption={doors.payments.caption}
                  onPress={() =>
                    router.push({
                      pathname: '/(personal)/futuro/pagos',
                      params: {
                        mes: paymentsView.isCurrentMonth ? CURRENT_MONTH_PARAM : selectedMonth,
                      },
                    })
                  }
                />
              </Animated.View>
            )}

            {doors.installments != null && (
              <Animated.View entering={FadeInDown.delay(stagger(2, 80)).duration(duration.base)}>
                <Door
                  icon={Layers}
                  title={doors.installments.title}
                  caption={doors.installments.caption}
                  onPress={() => router.push('/(personal)/futuro/cuotas')}
                />
              </Animated.View>
            )}

            {doors.fixed != null && (
              <Animated.View entering={FadeInDown.delay(stagger(3, 80)).duration(duration.base)}>
                <Door
                  icon={Repeat}
                  title={doors.fixed.title}
                  caption={doors.fixed.caption}
                  // La lista de fijos ya existe (la misma que abre Perfil); cada fila abre su fijo (F-03).
                  onPress={() => router.push('/fijo/gastos')}
                />
              </Animated.View>
            )}
          </>
        )}
      </Stack>

      <Sheet
        visible={detailOpen && selected != null}
        onClose={() => setDetailOpen(false)}
        title={capitalize(formatMonth(selectedMonth, currentMonth))}
      >
        {selected != null && (
          // UX-10 · la ayuda de Sin asignar y el negativo (N-08) viven en el componente.
          <FutureMonthDetail
            title="Lo registrado para ese mes"
            committed={selected.committed}
            expectedIncome={selected.expectedIncome}
            unassigned={selected.unassigned}
            breakdown={selected.breakdown}
            cardNames={cardNames}
          />
        )}
      </Sheet>
    </ScrollView>
  );
}

function capitalize(text: string): string {
  return text.charAt(0).toUpperCase() + text.slice(1);
}
