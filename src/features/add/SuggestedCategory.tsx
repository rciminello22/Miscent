import type { Category } from '@domain/types';
import { Pressable, Row, Text } from '@/ui/primitives';
import { prettyLabel } from './categories';

/**
 * Should 8 · "¿Es Supermercado? · Usar", debajo de la descripción.
 *
 * Sugiere, nunca cambia la categoría sola: si el usuario ya eligió otra, es
 * porque sabe algo que la descripción no dice. Si coincide con la elegida,
 * no aparece.
 */
export function SuggestedCategory({
  suggestion,
  current,
  onUse,
}: {
  suggestion: Category | null;
  current: Category | null;
  onUse: (category: Category) => void;
}) {
  if (suggestion == null || suggestion === current) return null;

  return (
    <Row gap="2" align="center">
      <Text variant="caption" tone="muted">
        ¿Es {prettyLabel(suggestion)}?
      </Text>
      <Pressable
        onPress={() => onUse(suggestion)}
        haptic="light"
        accessibilityRole="button"
        accessibilityLabel={`Usar la categoría ${prettyLabel(suggestion)}`}
      >
        <Text variant="smallMedium" tone="brand">
          Usar
        </Text>
      </Pressable>
    </Row>
  );
}
