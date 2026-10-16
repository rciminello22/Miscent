import { useMemo } from 'react';
import { pendingStoppedFixed } from '@domain/departure';
import { paidByMeWithoutMethod } from '@domain/paidByMe';
import { useSession } from '@/features/auth/SessionProvider';
import { usePersonalFacts } from '@/features/shared/usePersonalFacts';
import { pendingTotal, type PendingCounts } from './spaceListCopy';
import type { deriveSpace } from './useSpaces';

type Derived = ReturnType<typeof deriveSpace>;
type PersonalFacts = ReturnType<typeof usePersonalFacts>['facts'];
export type SpaceMembership = PersonalFacts['spaces'][number];

/**
 * Lo que un espacio le pide a quien lo mira, calculado sin hooks: lo usan el
 * hook de abajo (una puerta) y la lista de Compartidos (todos los espacios, para
 * ordenar y filtrar). Una sola cuenta.
 */
export function countSpacePendings(args: {
  derived: Derived | null;
  /** El espacio visto desde los hechos personales, con el detalle privado de pago. */
  membership: SpaceMembership | undefined;
  accountState: string;
  today: string;
}) {
  const { derived, membership, accountState, today } = args;

  // Lo que el otro cargó como pagado por vos, sin medio: solo con cuenta personal.
  const paidByOther =
    accountState === 'personal' && membership != null
      ? paidByMeWithoutMethod(membership, today, { includeOwn: false }).length
      : 0;

  // SA-04 · los fijos que detuvo una salida y que quien queda todavía no decidió.
  const stopped = derived == null ? [] : pendingStoppedFixed(derived.facts, derived.mySlot);

  const toReview = derived == null ? 0 : derived.pendingReview.size + derived.pendingDeletions.length;

  const counts: PendingCounts = { stoppedFixed: stopped.length, paidByOther, toReview };
  return { stopped, counts, total: pendingTotal(counts) };
}

/**
 * Todo lo que un espacio le pide a quien lo mira, en un solo lugar: lo usan la
 * puerta de Pendientes del espacio y su pantalla de Pendientes. Una sola fuente
 * para que la cuenta sea la misma.
 */
export function useSpacePendings(spaceId: string, derived: Derived | null, today: string) {
  const { accountState } = useSession();
  // Con el detalle privado de pago, que solo está en los hechos personales.
  const { facts: personalFacts } = usePersonalFacts();
  const myMembership = personalFacts.spaces.find(
    (membership) => membership.facts.space.id === spaceId,
  );

  const pendings = useMemo(
    () => countSpacePendings({ derived, membership: myMembership, accountState, today }),
    [derived, myMembership, accountState, today],
  );

  return {
    ...pendings,
    myMembership,
    personalFacts,
    accountState,
  };
}
