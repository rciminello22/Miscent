import { ChevronRight } from 'lucide-react-native';
import { useTheme } from '../theme';

/**
 * UX-11 · la pista de que una fila se toca. Toda fila tocable lleva este
 * chevron a la derecha, en `textMuted`; las filas informativas no lo llevan.
 *
 * Es decorativo: el lector de pantalla ya anuncia el rol de botón de la fila.
 */
export function RowChevron({ size = 16 }: { size?: number }) {
  const theme = useTheme();
  return (
    <ChevronRight
      size={size}
      color={theme.colors.textMuted}
      testID="chevron"
      accessibilityElementsHidden
      importantForAccessibility="no-hide-descendants"
    />
  );
}
