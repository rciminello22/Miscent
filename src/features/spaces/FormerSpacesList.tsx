import { Button, Card, Stack, Text } from '@/ui/primitives';
import type { FormerSpaceRow } from './formerSpaces';

/**
 * "Espacios que dejaste" (N3): una tarjeta por espacio del que saliste, el más
 * reciente primero. P6 · "Resumen fijo del saldo al momento de salir": el
 * nombre, "Saliste el …" y la frase del saldo a esa fecha. Es FIJO a propósito:
 * perdiste el acceso (SA-02), así que lo que pasó después lo ve quien se quedó.
 *
 * "Quitar de tu historial" está siempre disponible (P26): lo que desaparece,
 * Futuro incluido, lo dice la hoja de confirmación. Presentacional: la hoja y la
 * llamada las pone el container.
 *
 * `keepsFuture` es la cuenta personal: ahí tu parte de las cuotas que quedaban
 * sigue en Futuro. El invitado no tiene Futuro.
 */
export function FormerSpacesList({
  rows,
  keepsFuture,
  onRemove,
}: {
  rows: readonly FormerSpaceRow[];
  keepsFuture: boolean;
  onRemove: (spaceId: string) => void;
}) {
  if (rows.length === 0) {
    return (
      <Text variant="small" tone="secondary">
        No tenés espacios dejados en tu historial.
      </Text>
    );
  }

  return (
    <Stack gap="4">
      {rows.map((row) => (
        <Card key={row.spaceId} tone="sunken">
          <Stack gap="4">
            <Stack gap="2">
              <Text variant="bodyMedium">{row.name}</Text>
              <Text variant="caption" tone="muted">
                {row.leftLine}
              </Text>
              <Text variant="small">{row.balanceLine}</Text>
              <Text variant="caption" tone="muted">
                {keepsFuture
                  ? `Tu parte de las cuotas que quedaban sigue en tu Futuro. Lo que cambie después lo ve ${row.otherName}.`
                  : `Lo que cambie después lo ve ${row.otherName}.`}
              </Text>
            </Stack>
            <Button
              label="Quitar de tu historial"
              accessibilityLabel={`Quitar ${row.name} de tu historial`}
              variant="secondary"
              size="sm"
              haptic="none"
              onPress={() => onRemove(row.spaceId)}
            />
          </Stack>
        </Card>
      ))}
    </Stack>
  );
}
