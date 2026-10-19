import { useLocalSearchParams, useRouter } from 'expo-router';
import { prettyLabel } from '@/features/add/categories';
import { buildFormerHistoryDetail } from '@/features/detail/formerHistoryDetail';
import { FormerHistoryView } from '@/features/detail/FormerHistoryView';
import { useGoBackWhenGone } from '@/features/detail/useGoBackWhenGone';
import { goBack } from '@/features/shared/navigation';
import { usePersonalFacts } from '@/features/shared/usePersonalFacts';
import { Button, Screen, Stack, Text } from '@/ui/primitives';

/**
 * SA-02 · SA-05 · lo que quedó en la foto de un espacio del que saliste (P6).
 * Solo lectura: sin Editar ni Eliminar.
 */
export default function HistorialDetalle() {
  const router = useRouter();
  const { spaceId, id } = useLocalSearchParams<{ spaceId: string; id: string }>();
  const { facts, today, isSuccess, isFetching } = usePersonalFacts();

  const membership = facts.spaces.find((item) => item.facts.space.id === spaceId);
  // Si quitaste el espacio de tu historial con esta pantalla abierta, ya no
  // hay nada que mostrar: se vuelve. Con la consulta sin leer, no se sabe.
  useGoBackWhenGone(isSuccess && !isFetching && membership == null);
  const detail =
    membership == null
      ? null
      : buildFormerHistoryDetail({
          membership,
          sourceId: id ?? '',
          paymentMethods: facts.paymentMethods,
          today,
          labelOf: prettyLabel,
        });

  if (detail == null) {
    return (
      <Screen>
        <Stack gap="5">
          <Text variant="body" tone="secondary">
            Este registro ya no está en tu historial.
          </Text>
          <Button label="Volver" variant="secondary" onPress={() => goBack(router)} />
        </Stack>
      </Screen>
    );
  }

  return (
    <Screen>
      <FormerHistoryView detail={detail} onClose={() => goBack(router)} />
    </Screen>
  );
}
