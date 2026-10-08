import { View } from 'react-native';
import Animated, { FadeIn } from 'react-native-reanimated';
import type { Category } from '@domain/types';
import { Pressable, Text } from '@/ui/primitives';
import { duration } from '@/ui/motion';
import { useTheme } from '@/ui/theme';
import type { CategoryMeta } from './categories';

/**
 * §17 campo 3 · "Categoría: grilla, más usadas primero; obligatoria".
 *
 * Grilla y no desplegable: un desplegable esconde las opciones y obliga a dos
 * toques. La grilla se recorre con la vista y se elige con uno.
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
    <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: theme.space['2'] }}>
      {categories.map((meta, index) => {
        const selected = value === meta.value;
        const Icon = meta.icon;

        return (
          <Animated.View
            key={meta.value}
            entering={FadeIn.delay(index * 12).duration(duration.quick)}
          >
            <Pressable
              onPress={() => onChange(meta.value)}
              accessibilityRole="radio"
              accessibilityState={{ selected }}
              accessibilityLabel={meta.label}
              style={{
                flexDirection: 'row',
                alignItems: 'center',
                gap: theme.space['2'],
                paddingVertical: theme.space['2'],
                paddingHorizontal: theme.space['3'],
                borderRadius: theme.radius.pill,
                backgroundColor: selected ? theme.colors.brand : theme.colors.surface,
                borderWidth: 1,
                borderColor: selected ? theme.colors.brand : theme.colors.border,
              }}
            >
              <Icon
                size={15}
                color={selected ? theme.colors.textOnBrand : theme.colors.textSecondary}
              />
              <Text variant="small" tone={selected ? 'onBrand' : 'secondary'}>
                {meta.label}
              </Text>
            </Pressable>
          </Animated.View>
        );
      })}
    </View>
  );
}
