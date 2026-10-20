import { useMemo, useState } from 'react';
import { useRouter } from 'expo-router';
import { useSession } from '@/features/auth/SessionProvider';
import { goBack } from '@/features/shared/navigation';
import { usePersonalFacts } from '@/features/shared/usePersonalFacts';
import { FormerSpacesList } from './FormerSpacesList';
import { listFormerSpaces, removalCopy } from './formerSpaces';
import { RemoveFormerSpaceSheet } from './RemoveFormerSpaceSheet';
import { SpaceDetailShell } from './SpaceDetailShell';
import { useRemoveFormerSpace } from './useRemoveFormerSpace';

/**
 * "Espacios que dejaste" (N3, P26): la pantalla detrás de la puerta de la lista
 * de Compartidos. Container: conecta los hechos de la cuenta personal con la
 * lista (`FormerSpacesList`), la hoja de confirmación (`RemoveFormerSpaceSheet`)
 * y la llamada al servidor.
 *
 * La muestran los dos árboles, como el detalle de un espacio: dentro de la
 * pestaña Compartidos (Estado A, `inTabs`) y sin pestañas para el invitado
 * (Estado B). Al quitar el último, queda la pantalla vacía y el aviso explica qué
 * cambió; "Volver" sigue funcionando.
 */
export function FormerSpacesScreen({ inTabs }: { inTabs: boolean }) {
  const router = useRouter();
  const { accountState } = useSession();
  const { facts, today, isLoading, isError, refetch } = usePersonalFacts();
  const remove = useRemoveFormerSpace();
  const [pendingId, setPendingId] = useState<string | null>(null);

  const rows = useMemo(() => listFormerSpaces(facts, today), [facts, today]);

  const copy = useMemo(() => {
    const membership =
      pendingId == null
        ? undefined
        : facts.spaces.find((item) => item.leftOn != null && item.facts.space.id === pendingId);
    return membership == null ? null : removalCopy(membership, facts.paymentMethods, today);
  }, [pendingId, facts, today]);

  function confirm() {
    if (pendingId == null || copy == null) return;
    // El aviso se arma ANTES: al refrescarse la consulta, la foto ya no está.
    remove.mutate(
      { spaceId: pendingId, toast: copy.toast },
      { onSettled: () => setPendingId(null) },
    );
  }

  return (
    <SpaceDetailShell
      title="Espacios que dejaste"
      otherName={null}
      inTabs={inTabs}
      loading={isLoading}
      error={isError}
      onBack={() => goBack(router)}
      onRetry={refetch}
    >
      <FormerSpacesList
        rows={rows}
        keepsFuture={accountState === 'personal'}
        onRemove={setPendingId}
      />
      <RemoveFormerSpaceSheet
        copy={copy?.sheet ?? null}
        loading={remove.isPending}
        onConfirm={confirm}
        // A mitad de la llamada no se cierra: el resultado se avisa por toast.
        onClose={() => {
          if (!remove.isPending) setPendingId(null);
        }}
      />
    </SpaceDetailShell>
  );
}
