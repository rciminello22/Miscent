import type { ReactNode } from 'react';
import { Card, Divider, Stack, Text } from '@/ui/primitives';

/**
 * §5 1º Should · §11 paso 4 · "¿Con qué lo pagaste?". Presentacional: el
 * selector lo pone quien la usa (`renderPicker`), porque crear un medio nuevo
 * necesita sesión y queries.
 *
 * Elegir un medio guarda en el momento, y el gasto sale de la lista.
 */
export function PaidByMeCard({
  title,
  items,
  renderPicker,
}: {
  title: string;
  items: readonly { expenseId: string; line: string }[];
  renderPicker: (expenseId: string) => ReactNode;
}) {
  return (
    <Card tone="shared">
      <Stack gap="4">
        <Text variant="bodyMedium">{title}</Text>

        {items.map((item, index) => (
          <Stack key={item.expenseId} gap="2">
            {index > 0 && <Divider />}
            <Text variant="small">{item.line}</Text>
            {renderPicker(item.expenseId)}
          </Stack>
        ))}

        {/* C-05 · PR-02 · el medio es un detalle privado de quien pagó. */}
        <Text variant="caption" tone="muted">
          Solo vos ves con qué pagaste. Si fue con tarjeta, entra en su resumen estimado.
        </Text>
      </Stack>
    </Card>
  );
}
