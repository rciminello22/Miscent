import { View } from 'react-native';
import { useTheme } from '../theme';
import { Pressable } from './Pressable';
import { Text } from './Text';

/**
 * Un control segmentado: pocas opciones excluyentes en una sola tira, con la
 * elegida levantada (fondo y borde, no solo color). Lo usan los filtros de
 * lista que no se desplazan de costado. Misma estética que `FilterSegmented` de
 * Movimientos, que además lleva íconos por audiencia.
 */
export function Segmented<K extends string>({
  label,
  options,
  value,
  onChange,
}: {
  /** Qué elige el control, para el lector de pantalla. */
  label: string;
  options: readonly { key: K; label: string }[];
  value: K;
  onChange: (next: K) => void;
}) {
  const theme = useTheme();

  return (
    <View
      accessibilityRole="radiogroup"
      accessibilityLabel={label}
      style={{
        flexDirection: 'row',
        backgroundColor: theme.colors.surfaceSunken,
        borderRadius: theme.radius.md,
        padding: 3,
        gap: 2,
      }}
    >
      {options.map((option) => {
        const selected = option.key === value;
        const color = selected ? theme.colors.text : theme.colors.textSecondary;
        return (
          <Pressable
            key={option.key}
            onPress={() => onChange(option.key)}
            haptic="none"
            scaleOnPress={false}
            accessibilityRole="radio"
            accessibilityLabel={option.label}
            accessibilityState={{ selected }}
            style={{
              flex: 1,
              minHeight: 38,
              alignItems: 'center',
              justifyContent: 'center',
              paddingHorizontal: theme.space['2'],
              borderRadius: theme.radius.sm + 1,
              borderWidth: 1,
              borderColor: selected ? theme.colors.border : 'transparent',
              backgroundColor: selected ? theme.colors.surface : 'transparent',
            }}
          >
            <Text variant={selected ? 'smallMedium' : 'small'} numberOfLines={1} style={{ color }}>
              {option.label}
            </Text>
          </Pressable>
        );
      })}
    </View>
  );
}
