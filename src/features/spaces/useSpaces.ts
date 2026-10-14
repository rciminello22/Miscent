import { useMemo } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { monthOf } from '@domain/calendar';
import { expandSpaceOccurrences, spaceHorizon } from '@domain/occurrences';
import { pendingReview } from '@domain/review';
import {
  calculateSharedBalance,
  calculateSpaceMonth,
  pendingSharedInstallments,
  proposeSettlementPayment,
} from '@domain/shared-balance';
import { queryKeys } from '@/data/queryClient';
import {
  createMemberPayment,
  createSharedExpense,
  createSharedRecurrence,
  createSpace,
  deleteMemberPayment,
  deleteSharedExpense,
  fetchMySpaces,
  fetchSpaceFacts,
  markReviewed,
  removeMemberAccess,
  renameSpace,
  resolveStoppedRecurrence,
  type NewSharedExpense,
} from '@/data/repositories/spaces';
import { useSession } from '@/features/auth/SessionProvider';
import { useToday } from '@/features/shared/useToday';

/** §14 · la lista de espacios del usuario. */
export function useSpaces() {
  const { session } = useSession();

  return useQuery({
    queryKey: queryKeys.spaces,
    queryFn: fetchMySpaces,
    enabled: session != null,
  });
}

/**
 * Un espacio, con todo lo que §24 necesita mostrar.
 *
 * El saldo, el mes y las ocurrencias los calcula el dominio: ninguna de esas
 * cifras se guarda (§7.4). Y como el cálculo es determinista sobre los mismos
 * hechos, los dos miembros ven exactamente el mismo número.
 */
export function useSpace(spaceId: string) {
  const today = useToday();

  const query = useQuery({
    queryKey: queryKeys.spaceFacts(spaceId),
    queryFn: () => fetchSpaceFacts(spaceId),
    enabled: spaceId !== '',
  });

  const derived = useMemo(() => {
    if (query.data == null) return null;
    const { facts, mySlot, reviews } = query.data;

    const balance = calculateSharedBalance(facts, mySlot, today);

    return {
      facts,
      mySlot,
      balance,
      month: calculateSpaceMonth(facts, mySlot, monthOf(today), today),
      occurrences: expandSpaceOccurrences(facts, spaceHorizon(facts, today)),
      /** P-03 · el monto y la dirección que dejan el saldo en cero. */
      settlement: proposeSettlementPayment(balance),
      /** §25 · "adelantó $X de cuotas que todavía no vencieron". */
      pendingInstallments: pendingSharedInstallments(facts, mySlot, today),
      other: facts.space.members.find((member) => member.slot !== mySlot)!,
      me: facts.space.members.find((member) => member.slot === mySlot)!,
      /** Opción B · los ids de lo que cargó el otro y todavía no revisé. */
      pendingReview: pendingReview(facts, mySlot, reviews),
    };
  }, [query.data, today]);

  return { ...query, derived, today };
}

/* ────────────────────────────────────────────────────────────────────────── */

function useInvalidateSpace(spaceId?: string) {
  const queryClient = useQueryClient();
  const { session } = useSession();

  return async () => {
    await Promise.all([
      queryClient.invalidateQueries({ queryKey: queryKeys.spaces }),
      spaceId != null
        ? queryClient.invalidateQueries({ queryKey: queryKeys.spaceFacts(spaceId) })
        : Promise.resolve(),
      // K9 · un gasto compartido cambia la parte que llega al radar personal.
      queryClient.invalidateQueries({
        queryKey: queryKeys.personalFacts(session?.user.id ?? 'anon'),
      }),
    ]);
  };
}

export function useCreateSpace() {
  const invalidate = useInvalidateSpace();

  return useMutation({
    mutationFn: createSpace,
    onSuccess: () => void invalidate(),
  });
}

export function useRenameSpace(spaceId: string) {
  const invalidate = useInvalidateSpace(spaceId);

  return useMutation({
    mutationFn: (name: string) => renameSpace(spaceId, name),
    onSuccess: () => void invalidate(),
  });
}

export function useCreateSharedExpense(spaceId: string) {
  const invalidate = useInvalidateSpace(spaceId);

  return useMutation({
    mutationFn: (input: NewSharedExpense) => createSharedExpense(input),
    onSuccess: () => void invalidate(),
  });
}

export function useDeleteSharedExpense(spaceId: string) {
  const invalidate = useInvalidateSpace(spaceId);

  return useMutation({
    mutationFn: (id: string) => deleteSharedExpense(id),
    onSuccess: () => void invalidate(),
  });
}

/** Opción B · "Está bien" sobre uno o varios registros del otro. */
export function useMarkReviewed(spaceId: string) {
  const invalidate = useInvalidateSpace(spaceId);

  return useMutation({
    mutationFn: (sourceIds: readonly string[]) => markReviewed(spaceId, sourceIds),
    onSuccess: () => invalidate(),
  });
}

/** SA-04 · decide sobre un fijo detenido por una salida. */
export function useResolveStoppedRecurrence(spaceId: string) {
  const invalidate = useInvalidateSpace(spaceId);

  return useMutation({
    mutationFn: (input: { recurrenceId: string; keep: boolean }) =>
      resolveStoppedRecurrence(input.recurrenceId, input.keep),
    // Cambia el espacio (la pregunta se va) y el radar (el fijo pasa a ser suyo).
    onSuccess: () => invalidate(),
  });
}

export function useCreateSharedRecurrence(spaceId: string) {
  const invalidate = useInvalidateSpace(spaceId);

  return useMutation({
    mutationFn: (input: Parameters<typeof createSharedRecurrence>[0]) =>
      createSharedRecurrence(input),
    onSuccess: () => void invalidate(),
  });
}

export function useCreateMemberPayment(spaceId: string) {
  const invalidate = useInvalidateSpace(spaceId);

  return useMutation({
    mutationFn: (input: Parameters<typeof createMemberPayment>[0]) => createMemberPayment(input),
    onSuccess: () => void invalidate(),
  });
}

export function useRemoveMemberAccess(spaceId: string) {
  const invalidate = useInvalidateSpace(spaceId);

  return useMutation({
    mutationFn: () => removeMemberAccess(spaceId),
    onSuccess: () => void invalidate(),
  });
}

export function useDeleteMemberPayment(spaceId: string) {
  const invalidate = useInvalidateSpace(spaceId);

  return useMutation({
    mutationFn: (id: string) => deleteMemberPayment(id),
    onSuccess: () => void invalidate(),
  });
}
