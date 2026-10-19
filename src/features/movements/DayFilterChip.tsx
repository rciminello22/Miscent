import { X } from 'lucide-react-native';
import type { IsoDate } from '@domain/calendar';
import { Pressable, Text } from '@/ui/primitives';
import { MIN_TARGET } from '@/ui/touch';
import { useTheme } from '@/ui/theme';
import { dayChipLabel } from './calendarGrid';

/**
 * El chip "Miércoles 14 ✕" arriba de la lista filtrada por un día (§16). Dice el
 * filtro y lo deshace: tocarlo deja la lista del mes. Es el único lugar donde
 * vive el filtro por día; la pestaña nunca queda filtrada.
 *
 * Mide 44pt (UX-12). Nada se distingue solo por color: lleva la ✕.
 */
export function DayFilterChip({
  date,
  onClear,
}: {
  readonly date: IsoDate;
  readonly onClear: () => void;
}) {
  const theme = useTheme();
  const label = dayChipLabel(date);

  return (
    <Pressable
      onPress={onClear}
      haptic="none"
      accessibilityRole="button"
      accessibilityLabel={`${label}, quitar el filtro de día`}
      style={{
        alignSelf: 'flex-start',
        flexDirection: 'row',
        alignItems: 'center',
        gap: theme.space['2'],
        minHeight: MIN_TARGET,
        paddingHorizontal: theme.space['4'],
        borderRadius: theme.radius.pill,
        backgroundColor: theme.colors.brand,
      }}
    >
      <Text variant="smallMedium" tone="onBrand">
        {label}
      </Text>
      <X size={14} color={theme.colors.textOnBrand} />
    </Pressable>
  );
}
