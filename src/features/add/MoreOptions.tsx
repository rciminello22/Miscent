import type { ReactNode } from 'react';
import { View } from 'react-native';
import { ChevronDown, ChevronUp } from 'lucide-react-native';
import Animated, { FadeIn } from 'react-native-reanimated';
import { Pressable, Row, Stack, Text } from '@/ui/primitives';
import { duration } from '@/ui/motion';
import { useTheme } from '@/ui/theme';

/**
 * "Más opciones" del formulario Agregar (10/10).
 *
 * Lo que un gasto cotidiano casi nunca necesita (cuotas, fijo, fecha,
 * descripción) queda plegado: §4.4 pide "monto + categoría + guardar", y
 * mucha información mezclada abruma. Pero NADA queda escondido sin que se
 * sepa: la fila plegada dice lo que tiene elegido ("Ayer · 6 cuotas").
 */
export function MoreOptions({
  open,
  onToggle,
  summary,
  children,
}: {
  open: boolean;
  onToggle: () => void;
  summary: string;
  children: ReactNode;
}) {
  const theme = useTheme();

  return (
    <Stack gap="5">
      <Pressable
        onPress={onToggle}
        haptic="none"
        scaleOnPress={false}
        accessibilityRole="button"
        accessibilityLabel={open ? 'Ocultar más opciones' : 'Más opciones'}
        accessibilityState={{ expanded: open }}
        style={{
          borderRadius: theme.radius.md,
          backgroundColor: theme.colors.surfaceSunken,
          paddingHorizontal: theme.space['4'],
          paddingVertical: theme.space['3'],
        }}
      >
        <Row justify="space-between" align="center" gap="3">
          <View style={{ flex: 1, gap: 2 }}>
            <Text variant="smallMedium" tone="secondary">
              Más opciones
            </Text>
            <Text variant="caption" tone="muted" numberOfLines={1}>
              {summary}
            </Text>
          </View>
          {open ? (
            <ChevronUp size={18} color={theme.colors.textSecondary} />
          ) : (
            <ChevronDown size={18} color={theme.colors.textSecondary} />
          )}
        </Row>
      </Pressable>

      {open && (
        <Animated.View entering={FadeIn.duration(duration.quick)}>
          <Stack gap="7">{children}</Stack>
        </Animated.View>
      )}
    </Stack>
  );
}
