import type { Category } from '@domain/types';
import { Row, Text, TextLink } from '@/ui/primitives';
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
      <TextLink
        label="Usar"
        variant="smallMedium"
        accessibilityLabel={`Usar la categoría ${prettyLabel(suggestion)}`}
        onPress={() => onUse(suggestion)}
      />
    </Row>
  );
}
