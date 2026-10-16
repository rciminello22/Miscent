import { useMemo } from 'react';
import { pendingStoppedFixed } from '@domain/departure';
import { paidByMeWithoutMethod } from '@domain/paidByMe';
import { useSession } from '@/features/auth/SessionProvider';
import { usePersonalFacts } from '@/features/shared/usePersonalFacts';
import { pendingTotal, type PendingCounts } from './spaceListCopy';
import type { useSpace } from './useSpaces';

type Derived = NonNullable<ReturnType<typeof useSpace>['derived']>;

/**
 * Todo lo que un espacio le pide a quien lo mira, en un solo lugar: lo usan la
 * tarjeta de la lista de Compartidos, la puerta de Pendientes del espacio y su
 * pantalla de Pendientes. Una sola fuente para que la cuenta sea la misma.
 */
export function useSpacePendings(spaceId: string, derived: Derived | null, today: string) {
  const { accountState } = useSession();
  // Con el detalle privado de pago, que solo está en los hechos personales.
  const { facts: personalFacts } = usePersonalFacts();
  const myMembership = personalFacts.spaces.find(
    (membership) => membership.facts.space.id === spaceId,
  );

  // Lo que el otro cargó como pagado por vos, sin medio: solo con cuenta personal.
  const paidByOther = useMemo(
    () =>
      accountState === 'personal' && myMembership != null
        ? paidByMeWithoutMethod(myMembership, today, { includeOwn: false }).length
        : 0,
    [accountState, myMembership, today],
  );

  // SA-04 · los fijos que detuvo una salida y que quien queda todavía no decidió.
  const stopped = useMemo(
    () => (derived == null ? [] : pendingStoppedFixed(derived.facts, derived.mySlot)),
    [derived],
  );

  const toReview = derived == null ? 0 : derived.pendingReview.size + derived.pendingDeletions.length;

  const counts: PendingCounts = { stoppedFixed: stopped.length, paidByOther, toReview };

  return {
    stopped,
    counts,
    total: pendingTotal(counts),
    myMembership,
    personalFacts,
    accountState,
  };
}
