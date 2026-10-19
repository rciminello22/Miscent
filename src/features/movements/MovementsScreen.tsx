import { RefreshControl, ScrollView } from 'react-native';
import { useLocalSearchParams } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useHideFab } from '@/features/shared/fabVisibility';
import { useTheme } from '@/ui/theme';
import { useBottomPadding } from '@/ui/useBottomPadding';
import { parseDayParam } from './calendarGrid';
import { MovementsTabView } from './MovementsTabView';
import { useMovementActions, useMovementsMonth } from './useMovements';

/**
 * §16 · Movimientos: UNA pantalla. Arriba lo de hoy y el mes (cifras de
 * registros, nunca de plata), después los filtros, la franja de una semana y la
 * lista del día elegido. Elegir otro día o "Todo el mes" cambia la lista de
 * abajo, sin navegar.
 *
 * Acepta por la ruta el mes (`mes=AAAA-MM`), el filtro (`filtro=`) y el día
 * (`dia=AAAA-MM-DD`), para abrirla ya en un mes, un filtro y un día.
 */
export function MovementsScreen() {
  const theme = useTheme();
  const insets = useSafeAreaInsets();
  const params = useLocalSearchParams<{ mes?: string; filtro?: string; dia?: string }>();
  const movements = useMovementsMonth({ month: params.mes, filter: params.filtro });
  const actions = useMovementActions();
  const bottomPad = useBottomPadding({ tabs: true, fab: !movements.fabHidden });

  // "Agregar" es el botón flotante, solo en el mes en curso.
  useHideFab(movements.fabHidden);

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
          refreshing={movements.refreshing}
          onRefresh={() => void movements.refresh()}
          tintColor={theme.colors.brand}
        />
      }
    >
      {/* Al cambiar de mes el día y la semana se reinician. */}
      <MovementsTabView
        key={movements.month}
        month={movements.month}
        monthLabel={movements.monthLabel}
        today={movements.today}
        rows={movements.rows}
        segments={movements.segments}
        filter={movements.filter}
        initialDay={parseDayParam(params.dia, movements.month)}
        isLoading={movements.isLoading}
        onFilterChange={movements.setFilter}
        onPreviousMonth={movements.goToPrevious}
        onNextMonth={movements.goToNext}
        onOpenRow={actions.open}
        onLongPressRow={actions.confirmDelete}
      />
    </ScrollView>
  );
}
