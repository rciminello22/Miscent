import { RefreshControl, ScrollView, View } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { ArrowLeft, CalendarRange } from 'lucide-react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { goBack } from '@/features/shared/navigation';
import { useHideFab } from '@/features/shared/fabVisibility';
import { IconButton, Row, Skeleton, Stack, Text } from '@/ui/primitives';
import { useTheme } from '@/ui/theme';
import { useBottomPadding } from '@/ui/useBottomPadding';
import { FilterSegmented } from './FilterSegmented';
import { MovementDayList } from './MovementRowView';
import { useMovementActions, useMovementsMonth } from './useMovements';

/** `AAAA-MM`, lo único que se acepta como mes en la ruta. */
const MONTH_PARAM = /^\d{4}-(0[1-9]|1[0-2])$/;

/**
 * §16 · Movimientos, el N3: la lista del mes con el filtro ya aplicado. El
 * control segmentado se repite acá: como cambiar de filtro volviendo atrás es
 * incómodo, las puertas pasan a ser atajos.
 */
export function MovementsListScreen() {
  const theme = useTheme();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const params = useLocalSearchParams<{ mes?: string; filtro?: string }>();
  const movements = useMovementsMonth({
    month: params.mes != null && MONTH_PARAM.test(params.mes) ? params.mes : undefined,
    filter: params.filtro,
  });
  const actions = useMovementActions();
  const bottomPad = useBottomPadding({ tabs: true, fab: false });

  // La lista no tiene Agregar: se vuelve a la pestaña para eso.
  useHideFab(true);

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
      <Stack gap="4">
        <Row justify="space-between" align="center">
          <IconButton
            label="Volver"
            size={28}
            filled={false}
            onPress={() => goBack(router)}
            style={{ marginLeft: -theme.space['1'] }}
            icon={<ArrowLeft size={20} color={theme.colors.textSecondary} />}
          />
          <Row gap="1" align="center">
            <CalendarRange size={14} color={theme.colors.textSecondary} />
            <Text variant="smallMedium" tone="secondary">
              {movements.monthLabel}
            </Text>
          </Row>
        </Row>

        <Text variant="title">Movimientos</Text>

        <FilterSegmented
          segments={movements.segments}
          value={movements.filter}
          onChange={movements.setFilter}
        />

        <View>
          {movements.isLoading ? (
            <Stack gap="4">
              <Skeleton height={56} />
              <Skeleton height={56} />
            </Stack>
          ) : movements.visible.length === 0 ? (
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
      </Stack>
    </ScrollView>
  );
}
