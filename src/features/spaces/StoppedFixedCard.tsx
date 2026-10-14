import type { Pesos } from '@domain/money';
import { Button, Card, Divider, Row, Stack, Text } from '@/ui/primitives';
import { keepDetail, stoppedQuestion } from './departureCopy';

/**
 * SA-04 · §27 · la pregunta a quien queda, por cada fijo compartido que
 * detuvo una salida. Presentacional: decide la pantalla del espacio.
 *
 * Va arriba de todo en el espacio y no se puede cerrar sin decidir: es lo
 * que explica por qué cambió el radar.
 */
export function StoppedFixedCard({
  otherName,
  spaceName,
  items,
  canKeep,
  busyId,
  onKeep,
  onEnd,
}: {
  otherName: string;
  spaceName: string;
  items: readonly { recurrenceId: string; label: string; amount: Pesos }[];
  /** A-05 · sin cuenta personal no hay "mis fijos". */
  canKeep: boolean;
  /** El que se está guardando, para no aceptar dos toques. */
  busyId: string | null;
  onKeep: (recurrenceId: string) => void;
  onEnd: (recurrenceId: string) => void;
}) {
  return (
    <Card tone="shared">
      <Stack gap="4">
        <Text variant="bodyMedium">
          {otherName} salió de {spaceName}
        </Text>

        {items.map((item, index) => {
          const busy = busyId === item.recurrenceId;
          return (
            <Stack key={item.recurrenceId} gap="3">
              {index > 0 && <Divider />}
              <Text variant="small">
                {stoppedQuestion({ label: item.label, otherName, canKeep })}
              </Text>

              {canKeep ? (
                <>
                  <Text variant="caption" tone="secondary">
                    {keepDetail(item.amount)}
                  </Text>
                  <Row gap="2">
                    <Button
                      label="Terminarlo"
                      variant="ghost"
                      disabled={busyId != null}
                      onPress={() => onEnd(item.recurrenceId)}
                      style={{ flex: 1 }}
                    />
                    <Button
                      label="Pasarlo a mis fijos"
                      variant="secondary"
                      loading={busy}
                      disabled={busyId != null}
                      onPress={() => onKeep(item.recurrenceId)}
                      style={{ flex: 1 }}
                    />
                  </Row>
                </>
              ) : (
                <Button
                  label="Entendido"
                  variant="secondary"
                  loading={busy}
                  disabled={busyId != null}
                  onPress={() => onEnd(item.recurrenceId)}
                />
              )}
            </Stack>
          );
        })}
      </Stack>
    </Card>
  );
}
