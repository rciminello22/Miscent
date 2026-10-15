import { View } from 'react-native';
import Animated, { FadeIn } from 'react-native-reanimated';
import type { Category } from '@domain/types';
import { duration } from '@/ui/motion';
import { useTheme } from '@/ui/theme';
import type { CategoryMeta } from './categories';
import { Chip } from './fields';

/**
 * §17 campo 3 · "Categoría: grilla, más usadas primero; obligatoria".
 *
 * Grilla y no desplegable: un desplegable esconde las opciones y obliga a dos
 * toques. La grilla se recorre con la vista y se elige con uno.
 *
 * UX-11 · UX-12 · cada opción es un `Chip`: lo elegido lleva tilde además del
 * color y el área de toque llega a 44pt.
 */
export function CategoryGrid({
  categories,
  value,
  onChange,
}: {
  categories: readonly CategoryMeta[];
  value: Category | null;
  onChange: (next: Category) => void;
}) {
  const theme = useTheme();

  return (
    <View
      accessibilityRole="radiogroup"
      style={{ flexDirection: 'row', flexWrap: 'wrap', gap: theme.space['2'] }}
    >
      {categories.map((meta, index) => {
        const selected = value === meta.value;
        const Icon = meta.icon;

        return (
          <Animated.View
            key={meta.value}
            entering={FadeIn.delay(index * 12).duration(duration.quick)}
          >
            <Chip
              label={meta.label}
              selected={selected}
              onPress={() => onChange(meta.value)}
              icon={
                <Icon
                  size={15}
                  color={selected ? theme.colors.textOnBrand : theme.colors.textSecondary}
                />
              }
            />
          </Animated.View>
        );
      })}
    </View>
  );
}
