import { Button, Sheet, Stack, Text } from '@/ui/primitives';

export type CardDeleteState =
  | { kind: 'retained'; lines: readonly string[] }
  | { kind: 'confirm'; title: string; message: string }
  | null;

/**
 * P24 · eliminar una tarjeta (§22). Con pagos por venir, la hoja dice qué la
 * retiene y hasta cuándo, y solo ofrece "Entendido". Sin ellos, la confirmación
 * dice qué pasa con lo pasado: "Eliminar" es `destructive`, "Cancelar" es
 * `ghost` (nunca texto suelto). Presentacional.
 */
export function CardDeleteSheet({
  state,
  onClose,
  onConfirm,
  loading = false,
}: {
  state: CardDeleteState;
  onClose: () => void;
  onConfirm: () => void;
  loading?: boolean;
}) {
  const title =
    state == null
      ? ''
      : state.kind === 'retained'
        ? 'No se puede eliminar todavía'
        : state.title;

  return (
    <Sheet visible={state != null} onClose={onClose} title={title}>
      {state?.kind === 'retained' && (
        <Stack gap="5">
          <Stack gap="2">
            {state.lines.map((line) => (
              <Text key={line} variant="body">
                {line}
              </Text>
            ))}
          </Stack>
          <Text variant="small" tone="secondary">
            Cuando terminen la vas a poder eliminar.
          </Text>
          <Button label="Entendido" fullWidth onPress={onClose} />
        </Stack>
      )}

      {state?.kind === 'confirm' && (
        <Stack gap="5">
          <Text variant="body" tone="secondary">
            {state.message}
          </Text>
          <Stack gap="2">
            <Button
              label="Eliminar"
              variant="destructive"
              fullWidth
              loading={loading}
              haptic="none"
              onPress={onConfirm}
            />
            <Button label="Cancelar" variant="ghost" fullWidth haptic="none" onPress={onClose} />
          </Stack>
        </Stack>
      )}
    </Sheet>
  );
}
