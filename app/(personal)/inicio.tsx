import { useMemo, useState } from 'react';
import { RefreshControl, ScrollView, View } from 'react-native';
import { useRouter } from 'expo-router';
import { ChevronRight, UserRound } from 'lucide-react-native';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { addMonths, monthOf } from '@domain/calendar';
import { calculateRadar } from '@domain/radar';
import { calculateFuture } from '@domain/future';
import {
  calculateUpcomingPayments,
  upcomingForHome,
  type UpcomingPayment,
} from '@domain/upcoming';
import { formatMonth } from '@/lib/format';
import { StatementDetailSheet } from '@/features/upcoming/StatementDetailSheet';
import { UpcomingPaymentRow } from '@/features/upcoming/UpcomingPaymentRow';
import { canOpenPayment, paymentLabel } from '@/features/upcoming/statementDetail';
import { CURRENT_MONTH_PARAM } from '@/features/future/paymentsMonth';
import { usePersonalFacts } from '@/features/shared/usePersonalFacts';
import { WhereFrom, type BreakdownTarget } from '@/features/breakdown/WhereFrom';
import { CardPurchasesThisMonth, RadarSummary } from '@/features/radar/RadarSummary';
import {
  AudienceBadge,
  EmptyState,
  ErrorState,
  Money,
  MonthBar,
  Pressable,
  RadarBar,
  RadarLegendDot,
  RadarSkeleton,
  Row,
  SectionHeader,
  Stack,
  Text,
} from '@/ui/primitives';
import { duration, stagger } from '@/ui/motion';
import { useTheme } from '@/ui/theme';
import { SpacesOnHome } from '@/features/spaces/SpacesOnHome';

/**
 * §15 · Inicio.
 *
 * Responde cuatro preguntas en un vistazo: qué pasó con mi plata este mes, qué
 * tengo comprometido, qué tengo que pagar próximamente y cómo vienen los
 * próximos meses.
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
  const { facts, expansion, today, isLoading, isError, refetch } = usePersonalFacts();
  const [refreshing, setRefreshing] = useState(false);
  // M18 · cada cifra del radar se puede abrir y ver de qué está hecha.
  const [breakdown, setBreakdown] = useState<BreakdownTarget>(null);
  // UX-08 · el resumen estimado abierto en la hoja de detalle.
  const [openPayment, setOpenPayment] = useState<UpcomingPayment | null>(null);

  const month = monthOf(today);

  const radar = useMemo(() => calculateRadar(expansion, month), [expansion, month]);

  // §15 · P18 · los 3 primeros pagos de los próximos 30 días.
  const upcoming = useMemo(
    () => upcomingForHome(calculateUpcomingPayments(expansion, today), today),
    [expansion, today],
  );

  // §15 · 3 meses con comprometido y una barra proporcional.
  const nextMonths = useMemo(
    () => calculateFuture(expansion, addMonths(month, 1), 3).months,
    [expansion, month],
  );
  const maxCommitted = Math.max(...nextMonths.map((item) => item.committed), 1);

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
        paddingBottom: insets.bottom + 140,
        paddingHorizontal: theme.space['5'],
      }}
      showsVerticalScrollIndicator={false}
      refreshControl={
        <RefreshControl refreshing={refreshing} onRefresh={() => void onRefresh()} tintColor={theme.colors.brand} />
      }
    >
      <Stack gap="7">
        <Row justify="space-between" align="center">
          <Text variant="overline" tone="muted">
            {formatMonth(month, month)}
          </Text>

          <Row gap="3" align="center">
            <AudienceBadge audience={{ kind: 'private' }} />
            {/* §14 · Perfil es un ícono, no una sección. */}
            <Pressable
              onPress={() => router.push('/(personal)/perfil')}
              accessibilityRole="button"
              accessibilityLabel="Perfil"
              style={{
                width: 32,
                height: 32,
                borderRadius: theme.radius.pill,
                backgroundColor: theme.colors.surfaceSunken,
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <UserRound size={16} color={theme.colors.textSecondary} />
            </Pressable>
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
            {/* §15 · el radar del mes, extraído para poder testear su lenguaje. */}
            <RadarSummary radar={radar} month={month} onOpenBreakdown={setBreakdown} />

            {/* §15 · "Con tarjeta este mes: $X → se paga en noviembre". */}
            <CardPurchasesThisMonth entries={radar.cardPurchasesThisMonth} month={month} />

            {/* ── §23.2 · Próximos pagos ───────────────────────────────── */}
            {upcoming.length > 0 && (
              <Animated.View entering={FadeInDown.delay(stagger(1, 80)).duration(duration.base)}>
                <Stack gap="4">
                  <SectionHeader
                    title="Próximos pagos"
                    action={
                      <Pressable
                        // UX-07 · abre Futuro en el mes en curso, donde está la lista completa.
                        onPress={() =>
                          router.push({
                            pathname: '/(personal)/futuro',
                            params: { mes: CURRENT_MONTH_PARAM, n: String(Date.now()) },
                          })
                        }
                        haptic="none"
                      >
                        <Row gap="1">
                          <Text variant="small" tone="brand">
                            Ver todos
                          </Text>
                          <ChevronRight size={14} color={theme.colors.brand} />
                        </Row>
                      </Pressable>
                    }
                  />

                  <Stack gap="3">
                    {upcoming.map((payment, index) => (
                      <Animated.View
                        key={payment.id}
                        entering={FadeInDown.delay(stagger(index, 60)).duration(duration.base)}
                      >
                        {/* UX-08 · el resumen estimado se abre (§23.2, §4.10). */}
                        <UpcomingPaymentRow
                          payment={payment}
                          label={paymentLabel(payment, facts.paymentMethods)}
                          size="body"
                          onPress={canOpenPayment(payment) ? () => setOpenPayment(payment) : undefined}
                        />
                      </Animated.View>
                    ))}
                  </Stack>
                </Stack>
              </Animated.View>
            )}

            {/* ── §15 · Próximos meses ─────────────────────────────────── */}
            {nextMonths.some((item) => item.committed > 0) && (
              <Animated.View entering={FadeInDown.delay(stagger(2, 80)).duration(duration.base)}>
                <Stack gap="4">
                  <SectionHeader
                    title="Próximos meses"
                    action={
                      <Pressable onPress={() => router.push('/(personal)/futuro')} haptic="none">
                        <Row gap="1">
                          <Text variant="small" tone="brand">
                            Futuro
                          </Text>
                          <ChevronRight size={14} color={theme.colors.brand} />
                        </Row>
                      </Pressable>
                    }
                  />

                  <Stack gap="3">
                    {nextMonths.map((item, index) => (
                      <MonthBar
                        key={item.month}
                        month={item.month}
                        committed={item.committed}
                        maxCommitted={maxCommitted}
                        index={index}
                      />
                    ))}
                  </Stack>

                  <Text variant="caption" tone="muted">
                    Comprometido de cada mes, según lo que registraste.
                  </Text>
                </Stack>
              </Animated.View>
            )}

            {/* §15 · Tus espacios. Si no hay ninguno, el bloque no aparece. */}
            <SpacesOnHome />
          </>
        )}
      </Stack>

      <StatementDetailSheet
        payment={openPayment}
        methods={facts.paymentMethods}
        onClose={() => setOpenPayment(null)}
      />

      <WhereFrom
        target={breakdown}
        onClose={() => setBreakdown(null)}
        expansion={expansion}
        month={month}
      />
    </ScrollView>
  );
}
