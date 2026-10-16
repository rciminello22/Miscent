// TEMPORAL: variante B en prueba. Se borra junto con movementsVariant.ts.
import { Card, Pressable, Row, Text } from '@/ui/primitives';
import { useTheme } from '@/ui/theme';
import { variantSwitchLabel, type MovementsVariant } from './movementsVariant';

/**
 * El interruptor de prueba de las dos variantes de Movimientos. Solo existe en
 * desarrollo (`__DEV__`): nunca llega a una build de producción.
 */
export function MovementsVariantSwitch({
  variant,
  onToggle,
}: {
  variant: MovementsVariant;
  onToggle: () => void;
}) {
  const theme = useTheme();
  if (!__DEV__) return null;

  const other = variant === 'A' ? 'B' : 'A';

  return (
    <Card tone="sunken">
      <Pressable
        onPress={onToggle}
        haptic="none"
        scaleOnPress={false}
        accessibilityRole="switch"
        accessibilityLabel={variantSwitchLabel(variant)}
        accessibilityHint={`Cambia a la variante ${other}`}
        accessibilityState={{ checked: variant === 'B' }}
      >
        <Row justify="space-between" align="center">
          <Text variant="body">{variantSwitchLabel(variant)}</Text>
          <Text variant="smallMedium" style={{ color: theme.colors.brand }}>
            Cambiar a {other}
          </Text>
        </Row>
      </Pressable>
    </Card>
  );
}
