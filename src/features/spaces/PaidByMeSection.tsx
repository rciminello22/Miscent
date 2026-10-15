import { useMemo, useRef } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import type { IsoDate } from '@domain/calendar';
import { paidByMeWithoutMethod } from '@domain/paidByMe';
import type { PaymentMethod, PersonalFacts } from '@domain/types';
import { queryKeys } from '@/data/queryClient';
import { updateSharedExpense } from '@/data/repositories/edits';
import { prettyLabel } from '@/features/add/categories';
import { PaymentMethodField } from '@/features/add/PaymentMethodField';
import { useSession } from '@/features/auth/SessionProvider';
import { useFeedback } from '@/features/shared/useFeedback';
import { PaidByMeCard } from './PaidByMeCard';
import { paidItemLine } from './paidByMeCopy';

/**
 * "¿Con qué lo pagaste?" para los gastos de un espacio que figuran como
 * pagados por el usuario y no tienen medio. Contenedor: decide qué gastos se
 * preguntan y guarda la respuesta.
 *
 * Guardar es una edición del gasto con el medio nuevo: en cuotas, el
 * cronograma se recalcula con la tarjeta (Q-02), igual que al editarlo a mano.
 */
export function PaidByMeSection({
  membership,
  methods,
  today,
  includeOwn,
  title,
}: {
  membership: PersonalFacts['spaces'][number];
  methods: readonly PaymentMethod[];
  today: IsoDate;
  includeOwn: boolean;
  title: (count: number) => string;
}) {
  const queryClient = useQueryClient();
  const { session } = useSession();
  const feedback = useFeedback();

  // El medio recién creado llega después del refetch: el closure de la
  // respuesta tiene la lista vieja, así que se busca en la última.
  const latestMethods = useRef(methods);
  latestMethods.current = methods;

  const items = useMemo(
    () => paidByMeWithoutMethod(membership, today, { includeOwn }),
    [membership, today, includeOwn],
  );

  const spaceId = membership.facts.space.id;

  const complete = useMutation({
    mutationFn: async ({ expenseId, method }: { expenseId: string; method: PaymentMethod }) => {
      const expense = membership.facts.expenses.find((item) => item.id === expenseId);
      if (expense == null) return;
      await updateSharedExpense(expense.id, {
        amount: expense.amount,
        date: expense.date,
        category: expense.category,
        description: expense.description,
        payerSlot: expense.payerSlot,
        split: expense.split,
        installmentCount: expense.installments?.count ?? null,
        mySlot: membership.mySlot,
        myPaymentMethod: method,
        spaceId,
        // Está en esta lista justamente porque no tiene medio: ponerlo rearma
        // las cuotas con la tarjeta (Q-02).
        before: {
          date: expense.date,
          installmentCount: expense.installments?.count ?? null,
          payerSlot: expense.payerSlot,
          payerMethodId: null,
        },
      });
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: queryKeys.spaceFacts(spaceId) }),
        queryClient.invalidateQueries({
          queryKey: queryKeys.personalFacts(session?.user.id ?? 'anon'),
        }),
      ]);
    },
    onSuccess: (_, { method }) =>
      feedback.updated(
        method.kind === 'card'
          ? `Con ${method.name}: ya entra en su resumen estimado.`
          : `Con ${method.name}.`,
      ),
    onError: (error: Error) => feedback.error('No pudimos guardarlo', error),
  });

  if (items.length === 0) return null;

  return (
    <PaidByMeCard
      title={title(items.length)}
      items={items.map((item) => ({
        expenseId: item.expenseId,
        line: paidItemLine({
          label: item.description ?? prettyLabel(item.category),
          date: item.date,
          amount: item.amount,
          installmentCount: item.installmentCount,
        }),
      }))}
      renderPicker={(expenseId) => (
        <PaymentMethodField
          methods={methods}
          value={null}
          onChange={(methodId) => {
            const method = latestMethods.current.find((candidate) => candidate.id === methodId);
            if (method != null && !complete.isPending) complete.mutate({ expenseId, method });
          }}
        />
      )}
    />
  );
}
