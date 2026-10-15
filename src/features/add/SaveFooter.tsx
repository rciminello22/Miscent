import type { ReactNode } from 'react';
import { Stack, Text } from '@/ui/primitives';

/**
 * El pie fijo de los formularios de carga: el botón Guardar y, bajo él, por
 * qué está apagado (UX-16). Presentacional: quien lo usa decide el motivo con
 * `saveBlockReason`.
 */
export function SaveFooter({
  reason,
  children,
}: {
  /** Lo que falta para poder guardar; `null` si no hay nada que decir. */
  reason: string | null;
  /** El botón. */
  children: ReactNode;
}) {
  return (
    <Stack gap="2">
      {children}
      {reason != null && (
        <Text variant="caption" tone="muted" align="center" accessibilityLiveRegion="polite">
          {reason}
        </Text>
      )}
    </Stack>
  );
}
