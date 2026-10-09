import { useMemo, useState } from 'react';
import { Alert, RefreshControl, ScrollView, View } from 'react-native';
import { useRouter } from 'expo-router';
import { useOpenSpace } from '@/features/spaces/useOpenSpace';
import { ChevronLeft, ChevronRight } from 'lucide-react-native';
import Animated, { FadeInDown, LinearTransition } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { addMonths, monthOf } from '@domain/calendar';
import { formatDayMonth, formatMonth, formatPesos } from '@/lib/format';
import { prettyLabel } from '@/features/add/categories';
import { Chip } from '@/features/add/fields';
import {
  buildMovementList,
  filterMovements,
  spacesInMonth,
  type MovementFilter,
  type MovementRow,
} from '@/features/movements/buildMovementList';
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
 * Dos reglas que ordenan la pantalla:
 *
 * 1. Se listan **hechos**, no ocurrencias: una compra en cuotas aparece una
 *    sola vez, en su fecha de compra. Las cuotas se ven mes a mes en Futuro.
 * 2. De un gasto compartido, la cifra principal es **tu parte** (K9), y el
 *    total va en gris al lado. Son las dos lentes de §7.3, y nunca se mezclan
 *    en el mismo número.
 *
 * §39 declara el riesgo de esta pantalla: puede empujar a "registrar por
 * registrar". Se mitiga mostrando el EFECTO de cada movimiento, que es lo que
 * lo vuelve útil: "se paga en noviembre", "6 cuotas de $30.000".
 */
export default function Movimientos() {
  const theme = useTheme();
  const router = useRouter();
  const openSpace = useOpenSpace();
  const insets = useSafeAreaInsets();
  const { facts, today, isLoading, refetch } = usePersonalFacts();
  const deleteMovement = useDeleteMovement();

  const [month, setMonth] = useState(() => monthOf(today));
  const [filter, setFilter] = useState<MovementFilter>('all');
  const [refreshing, setRefreshing] = useState(false);

  const rows = useMemo(
    () =>
      buildMovementList({
        facts,
        month,
        monthName: (value) => formatMonth(value, month),
        formatAmount: formatPesos,
      }),
    [facts, month],
  );

  const spaces = useMemo(() => spacesInMonth(facts, month), [facts, month]);
  const visible = useMemo(() => filterMovements(rows, filter), [rows, filter]);

  async function onRefresh() {
    setRefreshing(true);
    // SY-01 · deslizar para ver los cambios del otro miembro.
    await refetch();
    setRefreshing(false);
  }

  function confirmDelete(row: MovementRow) {
    if (!row.deletable) return;

    // X-01 · eliminar un hecho recalcula todo lo que depende de él.
    Alert.alert('¿Eliminar este movimiento?', 'Tu radar y tu Futuro se recalculan sin él.', [
      { text: 'Cancelar', style: 'cancel' },
      {
        text: 'Eliminar',
        style: 'destructive',
        onPress: () => void deleteMovement.mutateAsync(row.id.replace('movement:', '')),
      },
    ]);
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

        {/* §16 · "Filtros: Todos · Personales · uno por espacio". */}
        {spaces.length > 0 && (
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={{ gap: theme.space['2'] }}
          >
            <Chip label="Todos" selected={filter === 'all'} onPress={() => setFilter('all')} />
            <Chip
              label="Personales"
              selected={filter === 'personal'}
              onPress={() => setFilter('personal')}
            />
            {spaces.map((space) => (
              <Chip
                key={space.id}
                label={space.name}
                selected={filter === space.id}
                onPress={() => setFilter(space.id)}
              />
            ))}
          </ScrollView>
        )}

        {isLoading ? (
          <Stack gap="4">
            <Skeleton height={56} />
            <Skeleton height={56} />
            <Skeleton height={56} />
          </Stack>
        ) : visible.length === 0 ? (
          <EmptyState
            title={`Todavía no registraste nada en ${formatMonth(month, monthOf(today))}.`}
            actionLabel="Agregar"
            onAction={() => router.push('/agregar')}
          />
        ) : (
          <Stack gap="0">
            {visible.map((row, index) => (
              <Animated.View
                key={row.id}
                layout={LinearTransition}
                entering={FadeInDown.delay(stagger(index, 35)).duration(duration.base)}
              >
                <MovementItem
                  row={row}
                  onPress={() => {
                    // §16 · tocar abre el detalle, con Editar y Eliminar.
                    if (row.spaceId != null) {
                      openSpace(row.spaceId);
                      return;
                    }
                    router.push(`/movimiento/${row.id.replace('movement:', '')}`);
                  }}
                  onLongPress={() => confirmDelete(row)}
                />
                {index < visible.length - 1 && <Divider />}
              </Animated.View>
            ))}
          </Stack>
        )}

        {visible.length > 0 && (
          <Text variant="caption" tone="muted">
            Mantené presionado un movimiento propio para eliminarlo. Los de un espacio se
            editan desde el espacio, para que el otro miembro también lo vea.
          </Text>
        )}
      </Stack>
    </ScrollView>
  );
}

function MovementItem({
  row,
  onPress,
  onLongPress,
}: {
  row: MovementRow;
  onPress: () => void;
  onLongPress: () => void;
}) {
  const theme = useTheme();
  const isPayment = row.kind === 'member-payment';
  const isIncome = row.kind === 'personal-income';

  return (
    <Pressable
      onPress={onPress}
      onLongPress={onLongPress}
      haptic="none"
      scaleOnPress={false}
      accessibilityLabel={prettyLabel(row.label)}
      style={{ paddingVertical: theme.space['4'] }}
    >
      <Row gap="3" align="flex-start">
        <View style={{ flex: 1, gap: 3 }}>
          <Row gap="2" align="center">
            <Text variant="bodyMedium" numberOfLines={1} style={{ flexShrink: 1 }}>
              {prettyLabel(row.label)}
            </Text>
            {/* §12 · el ícono de una o dos personas en cada fila. */}
            <AudienceIcon audience={row.audience} size={12} />
          </Row>

          <Text variant="caption" tone="muted">
            {[formatDayMonth(row.date), row.context, row.effect]
              .filter((part) => part != null && part !== '')
              .join(' · ')}
          </Text>

          {/* P-04 · la nota que evita el malentendido más común. */}
          {row.note != null && (
            <Text variant="caption" tone="muted">
              {row.note}
            </Text>
          )}
        </View>

        <View style={{ alignItems: 'flex-end', gap: 2 }}>
          <Money
            amount={row.amount}
            variant="bodyMedium"
            tone={isIncome ? 'brand' : isPayment ? 'shared' : 'default'}
          />
          {/* §16 · el total del gasto compartido, en gris. */}
          {row.total != null && row.total !== row.amount && (
            <Text variant="caption" tone="muted" tabular>
              de {formatPesos(row.total)}
            </Text>
          )}
        </View>
      </Row>
    </Pressable>
  );
}
