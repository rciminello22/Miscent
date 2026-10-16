import { View } from 'react-native';
import { Text } from '@/ui/primitives';
import { useTheme } from '@/ui/theme';
import { stripAccessibilityLabel, type StripDay } from './movementsView';

/**
 * La forma visual del N1 de Movimientos (§16): un cuadradito por día del mes.
 * Lleno si ese día tiene registros, vacío si no, hoy con contorno y los días
 * que todavía no llegaron, atenuados. Cuenta REGISTROS, nunca montos: "cifras
 * por día" está prohibido.
 *
 * Nada se distingue solo por color: lo lleno es otra forma que lo vacío, y hoy
 * lleva borde.
 */
export function DayStrip({ days }: { days: readonly StripDay[] }) {
  const theme = useTheme();
  const last = days.length;

  return (
    <View
      accessible
      accessibilityRole="image"
      accessibilityLabel={stripAccessibilityLabel(days)}
      style={{ gap: theme.space['1'] }}
    >
      <View testID="day-strip" style={{ flexDirection: 'row', gap: 2, height: 22 }}>
        {days.map((day) => {
          const filled = day.count > 0;
          return (
            <View
              key={day.date}
              testID={`day-${day.day}-${day.state}`}
              style={{
                flex: 1,
                borderRadius: 2,
                borderWidth: day.state === 'today' ? 2 : 0,
                borderColor: theme.colors.brand,
                backgroundColor: filled ? theme.colors.brand : theme.colors.border,
                opacity: day.state === 'future' ? 0.35 : 1,
              }}
            />
          );
        })}
      </View>
      <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
        <Text variant="caption" tone="muted">
          1
        </Text>
        <Text variant="caption" tone="muted">
          15
        </Text>
        <Text variant="caption" tone="muted">
          {last}
        </Text>
      </View>
    </View>
  );
}
