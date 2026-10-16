import { RefreshControl, ScrollView, View } from 'react-native';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Skeleton, Stack, Text } from '@/ui/primitives';
import { useTheme } from '@/ui/theme';
import { useBottomPadding } from '@/ui/useBottomPadding';
import { useHideFab } from '@/features/shared/fabVisibility';
import { FilterSegmented } from './FilterSegmented';
import { MovementDayList } from './MovementRowView';
import { MovementsHeader } from './MovementsHeader';
import { useMovementActions, useMovementsMonth } from './useMovements';

/**
 * §16 · Movimientos, variante A: la pestaña ES la lista.
 *
 * El N1 (el mes, "12 registros" y la tira de días) se va con el scroll; el
 * control segmentado queda pegado arriba. La lista, agrupada por día, es un N3
 * con pestaña propia: la excepción declarada para las listas que son la
 * pantalla (la tarea de la pestaña es encontrar un registro y corregirlo, y
 * eso queda a un toque).
 */
export function MovementsScreenA() {
  const theme = useTheme();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const movements = useMovementsMonth();
  const actions = useMovementActions();
  const bottomPad = useBottomPadding({ tabs: true, fab: !movements.fabHidden });

  // Un mes que ya pasó, o el mes en curso vacío (el N1 trae su Agregar).
  useHideFab(movements.fabHidden);

  const gutter = theme.space['5'];

  return (
    // El marco empieza bajo la barra de estado: lo pegado queda a ras de ella.
    <View style={{ flex: 1, backgroundColor: theme.colors.background, paddingTop: insets.top }}>
      <ScrollView
        stickyHeaderIndices={[1]}
        contentContainerStyle={{ paddingBottom: bottomPad }}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={movements.refreshing}
            onRefresh={() => void movements.refresh()}
            tintColor={theme.colors.brand}
          />
        }
      >
        <View style={{ paddingHorizontal: gutter, paddingTop: theme.space['3'] }}>
          <MovementsHeader
            monthLabel={movements.monthLabel}
            headline={movements.headline}
            strip={movements.strip}
            onPrevious={movements.goToPrevious}
            onNext={movements.goToNext}
            onAdd={movements.canAdd && movements.count === 0 ? () => router.push('/agregar') : null}
          />
        </View>

        <View style={{ paddingHorizontal: gutter }}>
          <FilterSegmented
            segments={movements.segments}
            value={movements.filter}
            onChange={movements.setFilter}
          />
        </View>

        <View style={{ paddingHorizontal: gutter, paddingTop: theme.space['3'] }}>
          {movements.isLoading ? (
            <Stack gap="4">
              <Skeleton height={56} />
              <Skeleton height={56} />
              <Skeleton height={56} />
            </Stack>
          ) : movements.count > 0 && movements.visible.length === 0 ? (
            <Text variant="small" tone="muted">
              Sin registros acá este mes.
            </Text>
          ) : (
            <MovementDayList
              groups={movements.groups}
              showSpace={movements.filter === 'all' || movements.filter === 'shared'}
              onOpen={actions.open}
              onLongPress={actions.confirmDelete}
            />
          )}
        </View>
      </ScrollView>
    </View>
  );
}
