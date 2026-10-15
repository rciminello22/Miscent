import { ScrollView, View } from 'react-native';
import { Chip } from '@/features/add/fields';
import { COMMON_DAYS, otherDays } from './dayOptions';
import { Text } from '@/ui/primitives';
import { useTheme } from '@/ui/theme';

/**
 * Elige un día del mes.
 *
 * Los días más comunes van primero, como atajos, y una raya los separa del
 * resto, que sigue en orden ascendente (UX-22): un sueldo se cobra el 1, el 5 o
 * fin de mes; una tarjeta cierra el 20 o el 25. Sin la raya, la lista corrida
 * (1, 5, 10 ... 31, 2, 3 ...) parecía desordenada.
 *
 * T-04 · un día que no existe en el mes (el 31 en febrero) lo resuelve el
 * dominio al expandir las ocurrencias, así que acá se puede elegir libremente.
 */

const REST = otherDays();

export function DayPicker({
  value,
  onChange,
  nullable = false,
  nullLabel = 'No sé',
}: {
  value: number | null;
  onChange: (next: number | null) => void;
  /** T-02 · las tarjetas permiten "No sé", que activa el modo aproximado. */
  nullable?: boolean;
  nullLabel?: string;
}) {
  const theme = useTheme();

  return (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      contentContainerStyle={{ gap: theme.space['2'], paddingRight: theme.space['5'] }}
    >
      {nullable && (
        <Chip label={nullLabel} selected={value == null} onPress={() => onChange(null)} />
      )}

      {COMMON_DAYS.map((day) => (
        <Chip
          key={day}
          label={`${day}`}
          selected={value === day}
          onPress={() => onChange(day)}
        />
      ))}

      {/* UX-22 · hasta acá los atajos; después, todos los días en orden. */}
      <View
        accessibilityElementsHidden
        importantForAccessibility="no-hide-descendants"
        style={{
          width: 1,
          alignSelf: 'stretch',
          marginVertical: theme.space['1'],
          backgroundColor: theme.colors.border,
        }}
      />

      {REST.map((day) => (
        <Chip
          key={day}
          label={`${day}`}
          selected={value === day}
          onPress={() => onChange(day)}
        />
      ))}
    </ScrollView>
  );
}

/** T-04 · el aviso de que un día puede no existir en todos los meses. */
export function DayNote({ day }: { day: number | null }) {
  if (day == null || day <= 28) return null;
  return (
    <Text variant="caption" tone="muted">
      En los meses que no tienen día {day}, se usa el último día del mes.
    </Text>
  );
}
