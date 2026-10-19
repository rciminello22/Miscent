import { View } from 'react-native';
import { useTheme } from '@/ui/theme';
import type { ShapeDot } from './movementsTab';

const DOT_HEIGHT = 8;
const TODAY_HEIGHT = 14;

/**
 * §16 · la forma del mes: un punto por día, para mirar de reojo en qué días
 * registraste. NO se toca (no hay nada que abrir) y es un solo elemento para el
 * lector de pantalla, que dice cuántos días tuvieron registros.
 *
 * Cuenta REGISTROS, nunca plata (CA-00): relleno si hubo, borde si no. Nada se
 * distingue solo por color: hoy es más alto, y los días que todavía no llegaron
 * van atenuados.
 */
export function MonthShape({ dots }: { dots: readonly ShapeDot[] }) {
  const theme = useTheme();
  const recordDays = dots.filter((dot) => dot.filled).length;

  return (
    <View
      accessible
      accessibilityRole="image"
      accessibilityLabel={
        recordDays === 1
          ? 'Forma del mes: registraste en 1 día'
          : `Forma del mes: registraste en ${recordDays} días`
      }
      style={{ flexDirection: 'row', alignItems: 'flex-end', gap: 2, height: TODAY_HEIGHT }}
    >
      {dots.map((dot) => (
        <View
          key={dot.date}
          testID={`shape-dot-${dot.day}`}
          style={{
            flex: 1,
            height: dot.isToday ? TODAY_HEIGHT : DOT_HEIGHT,
            borderRadius: 3,
            borderWidth: dot.filled ? 0 : 1,
            borderColor: theme.colors.textMuted,
            backgroundColor: dot.filled ? theme.colors.spent : 'transparent',
            opacity: dot.isFuture ? 0.35 : 1,
          }}
        />
      ))}
    </View>
  );
}
