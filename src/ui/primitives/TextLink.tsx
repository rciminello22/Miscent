import type { ReactNode } from 'react';
import { ChevronRight } from 'lucide-react-native';
import { useTheme } from '../theme';
import { LINK_HIT_SLOP } from '../touch';
import { Pressable } from './Pressable';
import { Row } from './layout';
import { Text, type TextProps } from './Text';

/**
 * UX-11 · UX-12 · un link de texto dentro de una pantalla ("Ver todos",
 * "Invitar", "Está bien", "Usar", "Quitar").
 *
 * Color `brand`, con chevron cuando navega, y un área de toque de 44pt aunque
 * la línea mida 20 (`hitSlop`). Las acciones secundarias de PANTALLA ("Cancelar",
 * "Ahora no", "Saltear") no son links: son un `Button` ghost.
 */
export function TextLink({
  label,
  onPress,
  tone = 'brand',
  variant = 'small',
  chevron = false,
  leading,
  accessibilityLabel,
}: {
  label: string;
  onPress: () => void;
  tone?: 'brand' | 'muted';
  variant?: TextProps['variant'];
  /** El link lleva a otra pantalla. */
  chevron?: boolean;
  leading?: ReactNode;
  accessibilityLabel?: string;
}) {
  const theme = useTheme();

  return (
    <Pressable
      onPress={onPress}
      haptic="none"
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel ?? label}
      hitSlop={LINK_HIT_SLOP}
    >
      <Row gap="1" align="center">
        {leading}
        <Text variant={variant} tone={tone}>
          {label}
        </Text>
        {chevron && (
          <ChevronRight
            size={14}
            color={tone === 'brand' ? theme.colors.brand : theme.colors.textMuted}
            testID="chevron"
            accessibilityElementsHidden
            importantForAccessibility="no-hide-descendants"
          />
        )}
      </Row>
    </Pressable>
  );
}
