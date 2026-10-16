import { View } from 'react-native';
import type { Month } from '@domain/calendar';
import type { FutureMonth } from '@domain/future';
import { formatMonth } from '@/lib/format';
import { Chip } from '@/features/add/fields';
import { MonthBar, Pressable, Stack } from '@/ui/primitives';
import { MIN_TARGET, hitSlopFor } from '@/ui/touch';

/** UX-12 · la barra elegible mide ~39pt; el toque llega a 44. */
const SELECTABLE_HIT_SLOP = hitSlopFor(MIN_TARGET, 39);

/**
 * El selector de mes de Futuro: las seis barras (§23.1), que son la forma
 * visual del N1, y una pastilla más para el mes en curso. El mes en curso no es
 * una barra: su lista es "desde hoy" y no tiene comprometido de mes completo.
 *
 * Lo elegido se distingue por el borde y el fondo, no solo por el color (UX-24).
 */
export function FutureMonthSelector({
  months,
  selected,
  currentSelected,
  reference,
  onSelectCurrent,
  onSelectMonth,
}: {
  months: readonly FutureMonth[];
  /** El mes de las barras elegido (ninguno si está elegido el mes en curso). */
  selected: Month | null;
  currentSelected: boolean;
  /** Para decir el mes sin año cuando es de este año. */
  reference: Month;
  onSelectCurrent: () => void;
  onSelectMonth: (month: Month) => void;
}) {
  const maxCommitted = Math.max(...months.map((item) => item.committed), 1);

  return (
    <Stack gap="3">
      {/* UX-07 · el mes en curso: la lista de pagos es desde hoy, sin desglose. */}
      <View style={{ alignSelf: 'flex-start' }}>
        <Chip label="Este mes" selected={currentSelected} onPress={onSelectCurrent} />
      </View>

      <Stack gap="2">
        {months.map((item, index) => (
          <Pressable
            key={item.month}
            onPress={() => onSelectMonth(item.month)}
            scaleOnPress={false}
            haptic="none"
            accessibilityRole="button"
            accessibilityLabel={formatMonth(item.month, reference)}
            accessibilityState={{ selected: item.month === selected }}
            hitSlop={SELECTABLE_HIT_SLOP}
          >
            <MonthBar
              month={item.month}
              committed={item.committed}
              maxCommitted={maxCommitted}
              index={index}
              highlighted={item.month === selected}
              selectable
            />
          </Pressable>
        ))}
      </Stack>
    </Stack>
  );
}
