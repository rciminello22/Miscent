import { useMemo, useState } from 'react';
import { RefreshControl, ScrollView } from 'react-native';
import { useRouter } from 'expo-router';
import { UserRound } from 'lucide-react-native';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useBottomPadding } from '@/ui/useBottomPadding';
import { addMonths, monthOf } from '@domain/calendar';
import { calculateRadar } from '@domain/radar';
import { calculateFuture } from '@domain/future';
import { calculateUpcomingPayments, upcomingForHome } from '@domain/upcoming';
import { formatMonth, formatPesos } from '@/lib/format';
import { CURRENT_MONTH_PARAM, futureMonthRoute } from '@/features/future/paymentsMonth';
import { NextMonthsDoor, UpcomingDoor } from '@/features/home/HomeDoors';
import { nextMonthsDoorContent, upcomingDoorContent } from '@/features/home/homeDoorsCopy';
import { usePersonalFacts } from '@/features/shared/usePersonalFacts';
import { WhereFrom, type BreakdownTarget } from '@/features/breakdown/WhereFrom';
import { RadarSummary } from '@/features/radar/RadarSummary';
import {
  AudienceBadge,
  EmptyState,
  ErrorState,
  IconButton,
  RadarSkeleton,
  Row,
  Stack,
  Text,
} from '@/ui/primitives';
import { duration, stagger } from '@/ui/motion';
import { useTheme } from '@/ui/theme';
import { SpacesOnHome } from '@/features/spaces/SpacesOnHome';

/** Cuántos pagos se cuentan en "y N más": todos los de los próximos 30 días. */
const ALL_UPCOMING = 100;

/**
 * §15 · Inicio.
 *
 * Responde una pregunta: qué parte de mis ingresos de este mes ya tiene
 * destino. Es el N1 (un panel con la barra y las tres cifras) y, debajo, como
 * mucho tres puertas: Próximos pagos, Próximos meses y Tus espacios. El detalle
 * de cada una está en su pantalla.
 *
 * "No parece una cuenta bancaria: no hay saldo ni disponible."
 *
 * Todas las cifras salen del dominio sobre los hechos del usuario. No hay un
 * solo número calculado en esta pantalla: el radar viene de `calculateRadar`
 * (N-01 a N-08) y Próximos pagos de `calculateUpcomingPayments` (N-09), que
 * son los mismos que validan los Casos A–G de §29.1.
 */
export default function Inicio() {
  const theme = useTheme();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const bottomPad = useBottomPadding({ tabs: true, fab: true });
  const { facts, expansion, today, isLoading, isError, refetch } = usePersonalFacts();
  const [refreshing, setRefreshing] = useState(false);
  // M18 · cada cifra del radar se puede abrir y ver de qué está hecha.
  const [breakdown, setBreakdown] = useState<BreakdownTarget>(null);

  const month = monthOf(today);

  const radar = useMemo(() => calculateRadar(expansion, month), [expansion, month]);

  // §15 · P18 · los pagos de los próximos 30 días: la puerta muestra el primero.
  const upcoming = useMemo(
    () =>
      upcomingForHome(
        calculateUpcomingPayments(expansion, today, facts.paymentMethods),
        today,
        ALL_UPCOMING,
      ),
    [expansion, today, facts.paymentMethods],
  );
  const upcomingDoor = upcomingDoorContent(upcoming, formatPesos);

  // §15 · 3 meses con comprometido y una barra proporcional.
  const nextMonths = useMemo(
    () => calculateFuture(expansion, addMonths(month, 1), 3).months,
    [expansion, month],
  );
  const nextMonthsDoor = useMemo(
    () => nextMonthsDoorContent({ months: nextMonths, today, formatAmount: formatPesos }),
    [nextMonths, today],
  );

  const hasAnything =
    facts.movements.length > 0 || facts.recurrences.length > 0 || facts.declaredStatements.length > 0;

  async function onRefresh() {
    setRefreshing(true);
    // SY-01 · deslizar para actualizar.
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
        <RefreshControl refreshing={refreshing} onRefresh={() => void onRefresh()} tintColor={theme.colors.brand} />
      }
    >
      <Stack gap="4">
        <Row justify="space-between" align="center">
          <Text variant="overline" tone="muted">
            {formatMonth(month, month)}
          </Text>

          <Row gap="3" align="center">
            <AudienceBadge audience={{ kind: 'private' }} />
            {/* §14 · Perfil es un ícono, no una sección. */}
            <IconButton
              label="Perfil"
              size={32}
              onPress={() => router.push('/(personal)/perfil')}
              icon={<UserRound size={16} color={theme.colors.textSecondary} />}
            />
          </Row>
        </Row>

        {isLoading ? (
          <RadarSkeleton />
        ) : isError ? (
          <ErrorState onRetry={() => void refetch()} />
        ) : !hasAnything ? (
          <EmptyState
            title="Anotá tus gastos fijos y tus cuotas"
            description="La app te muestra qué se viene, sin que armes ninguna planilla."
            actionLabel="Cargar mis datos"
            onAction={() => router.push('/onboarding/ingreso')}
          />
        ) : (
          <>
            {/* N1 · el radar del mes, extraído para poder testear su lenguaje. */}
            <RadarSummary radar={radar} month={month} onOpenBreakdown={setBreakdown} />

            {/* N2 · como mucho tres puertas. */}
            {upcomingDoor != null && (
              <Animated.View entering={FadeInDown.delay(stagger(1, 80)).duration(duration.base)}>
                <UpcomingDoor
                  content={upcomingDoor}
                  // UX-07 · abre Futuro en el mes en curso, donde está la lista completa.
                  onPress={() =>
                    router.push({
                      pathname: '/(personal)/futuro',
                      params: { mes: CURRENT_MONTH_PARAM, n: String(Date.now()) },
                    })
                  }
                />
              </Animated.View>
            )}

            {nextMonths.some((item) => item.committed > 0) && (
              <Animated.View entering={FadeInDown.delay(stagger(2, 80)).duration(duration.base)}>
                <NextMonthsDoor
                  content={nextMonthsDoor}
                  cardPurchases={radar.cardPurchasesThisMonth}
                  month={month}
                  // Con un mes en exceso abre Futuro en ese mes; si no, en el que viene.
                  onPress={() =>
                    router.push(futureMonthRoute(firstExcessMonth(nextMonthsDoor) ?? nextMonths[0]!.month, Date.now()))
                  }
                />
              </Animated.View>
            )}

            <Animated.View entering={FadeInDown.delay(stagger(3, 80)).duration(duration.base)}>
              <SpacesOnHome />
            </Animated.View>
          </>
        )}
      </Stack>

      <WhereFrom
        target={breakdown}
        onClose={() => setBreakdown(null)}
        expansion={expansion}
        month={month}
      />
    </ScrollView>
  );
}

function firstExcessMonth(content: ReturnType<typeof nextMonthsDoorContent>) {
  return content.bars.find((bar) => bar.exceeds)?.month;
}
