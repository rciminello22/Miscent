import { Pressable, Button, Card, Stack, Text } from '@/ui/primitives';

/**
 * SY-02 · el gasto que se estaba editando ya no existe.
 *
 * Aparece ARRIBA del formulario, que sigue lleno: lo que el usuario escribió
 * es justamente lo que se vuelve a crear. Una alerta lo taparía y, al
 * cerrarla, ya no habría forma de volver a la pregunta.
 *
 * `deletedBy` sale del registro de borrados (deleted_shared_records), nunca
 * de una suposición.
 */
export type DeletedBy = 'other' | 'me' | 'unknown';

function deletionSentence(deletedBy: DeletedBy, otherName: string, spaceName: string): string {
  switch (deletedBy) {
    case 'other':
      return `${otherName} eliminó este gasto. ¿Querés volver a crearlo?`;
    case 'me':
      return 'Eliminaste este gasto desde otro dispositivo. ¿Querés volver a crearlo?';
    case 'unknown':
      return `Este gasto ya no está en ${spaceName}. ¿Querés volver a crearlo?`;
  }
}

export function DeletedWhileEditing({
  deletedBy,
  otherName,
  spaceName,
  recreating,
  onRecreate,
  onDiscard,
}: {
  deletedBy: DeletedBy;
  otherName: string;
  spaceName: string;
  recreating: boolean;
  onRecreate: () => void;
  onDiscard: () => void;
}) {
  return (
    <Card tone="sunken">
      <Stack gap="4">
        <Text variant="bodyMedium">{deletionSentence(deletedBy, otherName, spaceName)}</Text>
        {/* PR-03 · toda acción dice quién la va a ver. */}
        <Text variant="small" tone="secondary">
          Se crea de nuevo con lo que estabas editando. {otherName} lo va a ver.
        </Text>
        <Stack gap="2">
          <Button
            label="Volver a crearlo"
            variant="shared"
            fullWidth
            haptic="success"
            loading={recreating}
            onPress={onRecreate}
          />
          <Pressable
            onPress={onDiscard}
            haptic="none"
            accessibilityRole="button"
            accessibilityLabel="Descartar"
          >
            <Text variant="small" tone="muted" align="center">
              Descartar
            </Text>
          </Pressable>
        </Stack>
      </Stack>
    </Card>
  );
}
