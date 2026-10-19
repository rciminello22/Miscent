import { useMemo, useState } from 'react';
import { usePersonalFacts } from '@/features/shared/usePersonalFacts';
import { FormerSpacesList } from './FormerSpacesList';
import { listFormerSpaces, removalCopy } from './formerSpaces';
import { RemoveFormerSpaceSheet } from './RemoveFormerSpaceSheet';
import { useRemoveFormerSpace } from './useRemoveFormerSpace';

/**
 * Perfil · "Espacios que dejaste" y quitarlos del historial. Container: conecta
 * los hechos de la cuenta personal con la lista (`FormerSpacesList`), la hoja de
 * confirmación (`RemoveFormerSpaceSheet`) y la llamada al servidor.
 *
 * Sirve a los dos perfiles (con cuenta personal y de invitado): no pinta nada si
 * no dejaste ningún espacio.
 */
export function FormerSpacesSection() {
  const { facts, today } = usePersonalFacts();
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
    <>
      <FormerSpacesList rows={rows} onRemove={setPendingId} />
      <RemoveFormerSpaceSheet
        copy={copy?.sheet ?? null}
        loading={remove.isPending}
        onConfirm={confirm}
        // A mitad de la llamada no se cierra: el resultado se avisa por toast.
        onClose={() => {
          if (!remove.isPending) setPendingId(null);
        }}
      />
    </>
  );
}
