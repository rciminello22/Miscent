import { View } from 'react-native';
import { Divider, Row, Text } from '@/ui/primitives';
import { useTheme } from '@/ui/theme';
import type { Fact } from './installmentsCycle';

/**
 * Filas de "etiqueta · valor" de un detalle: la etiqueta a la izquierda en
 * secundario y el valor a la derecha. Las comparten el detalle de una compra en
 * cuotas y el de un ingreso, para que se lean igual.
 */
export function FactRows({
  facts,
  divided = false,
}: {
  facts: readonly Fact[];
  /** Una línea fina arriba, cuando las filas siguen a otro contenido de la tarjeta. */
  divided?: boolean;
}) {
  const theme = useTheme();

  return (
    <View style={{ gap: theme.space['3'] }}>
      {divided && <Divider />}
      {facts.map((fact) => (
        <Row key={fact.label} justify="space-between" align="baseline" gap="3">
          <Text variant="small" tone="secondary">
            {fact.label}
          </Text>
          <Text variant="smallMedium" style={{ flexShrink: 1 }} align="right">
            {fact.value}
          </Text>
        </Row>
      ))}
    </View>
  );
}
