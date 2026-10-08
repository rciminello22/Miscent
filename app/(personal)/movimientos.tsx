import { useMemo, useState } from 'react';
import { Alert, RefreshControl, ScrollView, View } from 'react-native';
import { useRouter } from 'expo-router';
import { ChevronLeft, ChevronRight } from 'lucide-react-native';
import Animated, { FadeInDown, LinearTransition } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { addMonths, isSameMonth, monthOf } from '@domain/calendar';
import { resolveCardPayment } from '@domain/cards';
import { installmentAmounts } from '@domain/installments';
import type { PersonalMovement } from '@domain/types';
import { formatDayMonth, formatMonth, formatPesos } from '@/lib/format';
import { categoryLabel } from '@/features/add/categories';
import { useDeleteMovement, usePersonalFacts } from '@/features/shared/usePersonalFacts';
import {
  AudienceIcon,
  Divider,
  EmptyState,
  Money,
  Pressable,
  Row,
  Skeleton,
  Stack,
  Text,
} from '@/ui/primitives';
import { duration, stagger } from '@/ui/motion';
import { useTheme } from '@/ui/theme';

/**
 * §16 · Movimientos. "Ver qué se registró en un mes y corregir errores."
 *
 * Un detalle que la diferencia del radar: acá se listan los HECHOS, no las
 * ocurrencias. §16 es explícita — "Compra en cuotas: una sola vez, en su fecha
 * de compra". Las cuotas se ven mes a mes en Futuro, no repetidas acá.
 *
 * §39 declara el riesgo de esta pantalla: puede empujar a "registrar por
 * registrar". Se mitiga mostrando el EFECTO de cada movimiento ("se paga en
 * noviembre", "6 cuotas de $30.000"), que es lo que lo vuelve útil.
 */
export default function Movimientos() {
  const theme = useTheme();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { facts, today, isLoading, refetch } = usePersonalFacts();
  const deleteMovement = useDeleteMovement();

  const [month, setMonth] = useState(() => monthOf(today));
  const [refreshing, setRefreshing] = useState(false);

  const movements = useMemo(
    () =>
      facts.movements
        .filter((movement) => isSameMonth(movement.date, month))
        .sort((a, b) => (a.date < b.date ? 1 : -1)),
    [facts.movements, month],
  );

  async function onRefresh() {
    setRefreshing(true);
    await refetch();
    setRefreshing(false);
  }

  function confirmDelete(movement: PersonalMovement) {
    // X-01 · eliminar un hecho recalcula todo lo que depende de él.
    Alert.alert(
      '¿Eliminar este movimiento?',
      'Tu radar y tu Futuro se recalculan sin él.',
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Eliminar',
          style: 'destructive',
          onPress: () => void deleteMovement.mutateAsync(movement.id),
        },
      ],
    );
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
      <Stack gap="6">
        {/* §16 · selector de mes, con el actual por defecto. */}
        <Row justify="space-between" align="center">
          <Pressable
            onPress={() => setMonth(addMonths(month, -1))}
            accessibilityLabel="Mes anterior"
            style={{ padding: theme.space['2'] }}
          >
            <ChevronLeft size={20} color={theme.colors.textSecondary} />
          </Pressable>

          <Text variant="heading">{formatMonth(month, monthOf(today))}</Text>

          <Pressable
            onPress={() => setMonth(addMonths(month, 1))}
            accessibilityLabel="Mes siguiente"
            style={{ padding: theme.space['2'] }}
          >
            <ChevronRight size={20} color={theme.colors.textSecondary} />
          </Pressable>
        </Row>

        {isLoading ? (
          <Stack gap="4">
            <Skeleton height={56} />
            <Skeleton height={56} />
            <Skeleton height={56} />
          </Stack>
        ) : movements.length === 0 ? (
          <EmptyState
            title={`Todavía no registraste nada en ${formatMonth(month, monthOf(today))}.`}
            actionLabel="Agregar"
            onAction={() => router.push('/agregar')}
          />
        ) : (
          <Stack gap="0">
            {movements.map((movement, index) => (
              <Animated.View
                key={movement.id}
                layout={LinearTransition}
                entering={FadeInDown.delay(stagger(index, 40)).duration(duration.base)}
              >
                <MovementRow
                  movement={movement}
                  paymentMethods={facts.paymentMethods}
                  onLongPress={() => confirmDelete(movement)}
                />
                {index < movements.length - 1 && <Divider />}
              </Animated.View>
            ))}
          </Stack>
        )}

        {movements.length > 0 && (
          <Text variant="caption" tone="muted">
            Mantené presionado un movimiento para eliminarlo. Los gastos compartidos
            aparecen acá a partir de la Fase 6.
          </Text>
        )}
      </Stack>
    </ScrollView>
  );
}

function MovementRow({
  movement,
  paymentMethods,
  onLongPress,
}: {
  movement: PersonalMovement;
  paymentMethods: ReturnType<typeof usePersonalFacts>['facts']['paymentMethods'];
  onLongPress: () => void;
}) {
  const theme = useTheme();
  const method = paymentMethods.find((item) => item.id === movement.paymentMethodId) ?? null;

  /** §16 · las etiquetas que muestran el efecto del movimiento. */
  const label = useMemo(() => {
    if (movement.kind === 'income') return 'Ingreso registrado';

    if (movement.installments != null) {
      const [first] = installmentAmounts(movement.amount, movement.installments.count);
      return `${movement.installments.count} cuotas de ${formatPesos(first ?? 0)}`;
    }

    if (method?.kind === 'card') {
      const schedule = resolveCardPayment(method, movement.date);
      return `Se paga en ${formatMonth(schedule.month, monthOf(movement.date))}`;
    }

    return method?.name ?? null;
  }, [movement, method]);

  return (
    <Pressable
      onLongPress={onLongPress}
      haptic="none"
      scaleOnPress={false}
      accessibilityLabel={`${movement.description ?? categoryLabel(movement.category)}`}
      style={{ paddingVertical: theme.space['4'] }}
    >
      <Row gap="3" align="center">
        <View style={{ flex: 1, gap: 3 }}>
          <Row gap="2" align="center">
            <Text variant="bodyMedium" numberOfLines={1} style={{ flexShrink: 1 }}>
              {movement.description ?? categoryLabel(movement.category)}
            </Text>
            {/* §12 · el ícono de audiencia en cada fila de las listas. */}
            <AudienceIcon audience={{ kind: 'private' }} size={12} />
          </Row>

          <Row gap="2" align="baseline">
            <Text variant="caption" tone="muted">
              {formatDayMonth(movement.date)}
            </Text>
            {label != null && (
              <>
                <Text variant="caption" tone="muted">
                  ·
                </Text>
                <Text variant="caption" tone="muted">
                  {label}
                </Text>
              </>
            )}
          </Row>
        </View>

        <Money
          amount={movement.amount}
          variant="bodyMedium"
          tone={movement.kind === 'income' ? 'brand' : 'default'}
        />
      </Row>
    </Pressable>
  );
}

