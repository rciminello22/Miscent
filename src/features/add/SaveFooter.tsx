import type { ReactNode } from 'react';
import { AudienceBadge, Stack, Text, type Audience } from '@/ui/primitives';
import { audienceSentence } from '@/ui/primitives/audienceCopy';

/**
 * El pie fijo de los formularios de carga. De arriba abajo:
 *   · quién va a ver lo que se guarda (PR-03, §12): pegado al botón, para que
 *     se lea en el momento de decidir y no se pierda bajo el pliegue ni detrás
 *     del teclado
 *   · el botón Guardar
 *   · por qué está apagado, si lo está (UX-16)
 *
 * Presentacional: quien lo usa decide la audiencia y el motivo
 * (`saveBlockReason`).
 */
export function SaveFooter({
  audience,
  reason,
  children,
}: {
  audience: Audience;
  /** Lo que falta para poder guardar; `null` si no hay nada que decir. */
  reason: string | null;
  /** El botón. */
  children: ReactNode;
}) {
  return (
    <Stack gap="2">
      <AudienceBadge
        audience={audience}
        label={audienceSentence(audience)}
        style={{ alignSelf: 'center' }}
      />
      {children}
      {reason != null && (
        <Text variant="caption" tone="muted" align="center" accessibilityLiveRegion="polite">
          {reason}
        </Text>
      )}
    </Stack>
  );
}
