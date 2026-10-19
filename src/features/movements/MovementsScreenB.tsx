import { RefreshControl, ScrollView } from 'react-native';
import { useRouter } from 'expo-router';
import { ReceiptText, User, Users, type LucideIcon } from 'lucide-react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { formatPesos } from '@/lib/format';
import { prettyLabel } from '@/features/add/categories';
import { useHideFab } from '@/features/shared/fabVisibility';
import { Door, Skeleton, Stack, Text } from '@/ui/primitives';
import { useTheme } from '@/ui/theme';
import { useBottomPadding } from '@/ui/useBottomPadding';
import { MovementsHeader } from './MovementsHeader';
import { movementDoors, type MovementDoor } from './movementsView';
import { useMovementsMonth } from './useMovements';

const DOOR_ICON: Record<MovementDoor['kind'], LucideIcon> = {
  all: ReceiptText,
  personal: User,
  space: Users,
  spaces: Users,
};

/**
 * §16 · Movimientos: la pestaña es el N1 y hasta tres puertas; la
 * lista, agrupada por día y con el control segmentado repetido, vive en su
 * propia pantalla (N3). Las puertas son los mismos filtros, como atajos.
 */
export function MovementsScreenB() {
  const theme = useTheme();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const movements = useMovementsMonth();
  const bottomPad = useBottomPadding({ tabs: true, fab: !movements.fabHidden });

  useHideFab(movements.fabHidden);

  const doors = movementDoors({
    rows: movements.rows,
    spaces: movements.spaces,
    today: movements.today,
    rowLabel: (row) => prettyLabel(row.label),
    formatAmount: formatPesos,
  });

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
        <MovementsHeader
          monthLabel={movements.monthLabel}
          headline={movements.headline}
          strip={movements.strip}
          onPrevious={movements.goToPrevious}
          onNext={movements.goToNext}
          onAdd={movements.canAdd && movements.count === 0 ? () => router.push('/agregar') : null}
        />

        {movements.isLoading && <Skeleton height={72} />}

        {doors.map((door) => (
          <Door
            key={door.key}
            icon={DOOR_ICON[door.kind]}
            title={door.title}
            caption={door.caption}
            attention={door.attention ? 'attention' : 'none'}
            accessibilityLabel={[door.title, door.caption, door.extra]
              .filter((part) => part != null)
              .join('. ')}
            onPress={() =>
              router.push({
                pathname: '/(personal)/movimientos/lista',
                params: { mes: movements.month, filtro: door.key },
              })
            }
          >
            {door.extra != null && (
              <Text variant="caption" tone="shared">
                {door.extra}
              </Text>
            )}
          </Door>
        ))}
      </Stack>
    </ScrollView>
  );
}
