import { ScrollView, View } from 'react-native';
import { User, Users } from 'lucide-react-native';
import { Pressable, Text } from '@/ui/primitives';
import { useTheme } from '@/ui/theme';
import type { MovementFilter } from './buildMovementList';
import type { FilterSegment } from './movementsView';

/**
 * §16 · "Filtros: Todos · Personales · uno por espacio", como un control
 * segmentado (un control, no un bloque). Cada segmento lleva el ícono de su
 * audiencia: una persona para lo personal, dos para un espacio (§12). Con
 * muchos espacios se desliza de costado.
 *
 * Lo elegido se distingue por el fondo y el borde, no solo por el color.
 */
export function FilterSegmented({
  segments,
  value,
  onChange,
}: {
  segments: readonly FilterSegment[];
  value: MovementFilter;
  onChange: (next: MovementFilter) => void;
}) {
  const theme = useTheme();
  if (segments.length === 0) return null;

  return (
    <View style={{ backgroundColor: theme.colors.background, paddingVertical: theme.space['2'] }}>
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        accessibilityRole="radiogroup"
        contentContainerStyle={{
          backgroundColor: theme.colors.surfaceSunken,
          borderRadius: theme.radius.md,
          padding: 3,
          gap: 2,
          flexGrow: 1,
        }}
      >
        {segments.map((segment) => {
          const selected = segment.key === value;
          const color = selected ? theme.colors.text : theme.colors.textSecondary;
          return (
            <Pressable
              key={segment.key}
              onPress={() => onChange(segment.key)}
              haptic="none"
              scaleOnPress={false}
              accessibilityRole="radio"
              accessibilityLabel={segment.label}
              accessibilityState={{ selected }}
              style={{
                flexGrow: 1,
                minHeight: 38,
                flexDirection: 'row',
                alignItems: 'center',
                justifyContent: 'center',
                gap: theme.space['1'],
                paddingHorizontal: theme.space['3'],
                borderRadius: theme.radius.sm + 1,
                borderWidth: 1,
                borderColor: selected ? theme.colors.border : 'transparent',
                backgroundColor: selected ? theme.colors.surface : 'transparent',
              }}
            >
              {segment.kind === 'personal' && <User size={14} color={color} />}
              {segment.kind === 'space' && <Users size={14} color={color} />}
              <Text variant={selected ? 'smallMedium' : 'small'} numberOfLines={1} style={{ color }}>
                {segment.label}
              </Text>
            </Pressable>
          );
        })}
      </ScrollView>
    </View>
  );
}
