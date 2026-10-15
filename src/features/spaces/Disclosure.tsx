import type { ReactNode } from 'react';
import { ChevronDown, ChevronUp } from 'lucide-react-native';
import Animated, { FadeIn } from 'react-native-reanimated';
import { Pressable, Row, Stack, Text } from '@/ui/primitives';
import { duration } from '@/ui/motion';
import { useTheme } from '@/ui/theme';

/**
 * UX-05 · una fila que despliega su contenido, inline. Presentacional: quien
 * la usa decide si arranca abierta.
 *
 * Plegado NO es escondido: el título dice cuánto hay adentro.
 */
export function Disclosure({
  title,
  open,
  onToggle,
  children,
}: {
  title: string;
  open: boolean;
  onToggle: () => void;
  children: ReactNode;
}) {
  const theme = useTheme();
  const Chevron = open ? ChevronUp : ChevronDown;

  return (
    <Stack gap="4">
      <Pressable
        onPress={onToggle}
        haptic="none"
        scaleOnPress={false}
        accessibilityRole="button"
        accessibilityLabel={title}
        accessibilityState={{ expanded: open }}
        style={{
          borderRadius: theme.radius.md,
          backgroundColor: theme.colors.surfaceSunken,
          paddingHorizontal: theme.space['4'],
          minHeight: 48,
          justifyContent: 'center',
        }}
      >
        <Row justify="space-between" align="center" gap="3">
          <Text variant="smallMedium" tone="secondary" style={{ flex: 1 }}>
            {title}
          </Text>
          <Chevron size={18} color={theme.colors.textSecondary} />
        </Row>
      </Pressable>

      {open && (
        <Animated.View entering={FadeIn.duration(duration.quick)}>
          <Stack gap="5">{children}</Stack>
        </Animated.View>
      )}
    </Stack>
  );
}
