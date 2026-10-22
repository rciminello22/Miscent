import { useRouter } from 'expo-router';
import type { LoadState } from '@/features/shared/loadState';
import { goBack } from '@/features/shared/navigation';
import { Button, ErrorState, Screen, Skeleton, Stack, Text } from '@/ui/primitives';

/**
 * H-03 · lo que muestra una pantalla del espacio mientras no tiene su registro.
 *
 *   loading  la forma de lo que viene, con salida
 *   error    "No pudimos cargar esto" y Probar de nuevo: NUNCA "ya no existe",
 *            que culpaba al otro miembro de un error de red
 *   ready    la lectura salió bien y el registro no está: ahí sí, `missing`
 *
 * Siempre con "Volver": ninguna pantalla queda trabada en "Cargando…".
 */
export function SpaceRecordFallback({
  state,
  onRetry,
  missing,
}: {
  state: LoadState;
  onRetry: () => void;
  /** Qué decir cuando la lectura salió bien y el registro no está. */
  missing: string;
}) {
  const router = useRouter();

  return (
    <Screen>
      <Stack gap="5">
        {state === 'loading' ? (
          <Stack gap="3">
            <Skeleton width={180} height={22} />
            <Skeleton height={56} />
            <Skeleton height={56} />
          </Stack>
        ) : state === 'error' ? (
          <ErrorState onRetry={onRetry} />
        ) : (
          <Text variant="body" tone="secondary">
            {missing}
          </Text>
        )}
        <Button label="Volver" variant="secondary" onPress={() => goBack(router)} />
      </Stack>
    </Screen>
  );
}
