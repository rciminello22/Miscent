import { useMemo, useState } from 'react';
import { ScrollView } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { monthOf } from '@domain/calendar';
import { activePaymentMethods, hasApproxDay } from '@domain/cards';
import { calculateUpcomingPayments } from '@domain/upcoming';
import { formatPesos } from '@/lib/format';
import { queryKeys } from '@/data/queryClient';
import { deletePaymentMethod } from '@/data/repositories/mutations';
import { useSession } from '@/features/auth/SessionProvider';
import { CardDaysSheet } from '@/features/profile/CardDaysSheet';
import { CardDeleteSheet, type CardDeleteState } from '@/features/profile/CardDeleteSheet';
import { CardDetailView } from '@/features/profile/CardDetailView';
import {
  cardDayPills,
  cardDoorLine,
  cardGroup,
  cardGroupDoors,
  cardRetention,
  cardStatements,
  deleteConfirmation,
  retentionLines,
  statementBars,
} from '@/features/profile/cardOverview';
import { useCardDaysEdit } from '@/features/profile/useCardDaysEdit';
import { goBack } from '@/features/shared/navigation';
import { useFeedback } from '@/features/shared/useFeedback';
import { usePersonalFacts } from '@/features/shared/usePersonalFacts';
import { Group, StatementDetailSheet } from '@/features/upcoming/StatementDetailSheet';
import type { DetailGroupKind } from '@/features/upcoming/statementDetail';
import { Button, Screen, Sheet, Stack, Text } from '@/ui/primitives';

/** Cuántos vencimientos muestran las barras. */
const BARS = 4;

/**
 * P24 · el detalle de una tarjeta (Perfil > Tarjetas). Container: arma el
 * próximo resumen, las barras y las puertas con el dominio; corrige el nombre,
 * el cierre y el vencimiento (T-06) y elimina con las reglas de §22.
 *
 * Cambiar los días recalcula lo que se paga este mes o después: la lógica vive
 * en `@domain/cardDays` y la escritura en `data/repositories/cardDays`.
 */
export default function TarjetaDetalle() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const feedback = useFeedback();
  const { session } = useSession();
  const { id } = useLocalSearchParams<{ id: string }>();
  const { facts, expansion, today } = usePersonalFacts();

  // P24 · una tarjeta eliminada se trata como si no estuviera: vuelve a la lista.
  const card = activePaymentMethods(facts.paymentMethods).find(
    (method) => method.id === id && method.kind === 'card',
  );

  const edit = useCardDaysEdit({ card, facts, today });
  const [statementOpen, setStatementOpen] = useState(false);
  const [openKind, setOpenKind] = useState<DetailGroupKind | null>(null);
  const [deleteState, setDeleteState] = useState<CardDeleteState>(null);

  const payments = useMemo(
    () => calculateUpcomingPayments(expansion, today, facts.paymentMethods),
    [expansion, today, facts.paymentMethods],
  );
  const statements = useMemo(() => cardStatements(payments, id, today), [payments, id, today]);
  const next = statements[0] ?? null;

  const remove = useMutation({
    mutationFn: () => deletePaymentMethod(id),
    onSuccess: async () => {
      setDeleteState(null);
      await queryClient.invalidateQueries({
        queryKey: queryKeys.personalFacts(session?.user.id ?? 'anon'),
      });
      feedback.deleted({ kind: 'private' });
      goBack(router);
    },
    onError: (error: Error) => feedback.error('No pudimos eliminar la tarjeta', error),
  });

  if (card == null) {
    return (
      <Screen>
        <Stack gap="5">
          <Text variant="body" tone="secondary">
            Esta tarjeta ya no existe.
          </Text>
          <Button label="Volver" variant="secondary" onPress={() => goBack(router)} />
        </Stack>
      </Screen>
    );
  }

  function askDelete() {
    if (card == null) return;
    const retention = cardRetention(facts, expansion, card.id, today);
    setDeleteState(
      retention.retained
        ? { kind: 'retained', lines: retentionLines(retention.reasons, monthOf(today)) }
        : { kind: 'confirm', ...deleteConfirmation(card.name) },
    );
  }

  const group = openKind == null ? null : cardGroup(statements, openKind);

  return (
    <>
      <CardDetailView
        card={card}
        pills={cardDayPills(card)}
        nextLine={cardDoorLine(next, formatPesos)}
        next={next}
        bars={statementBars(statements, BARS)}
        doors={cardGroupDoors(statements)}
        editing={edit.editing}
        form={
          edit.form ?? {
            name: card.name,
            onNameChange: () => undefined,
            closing: { mode: null, day: null },
            due: { mode: null, day: null },
            onClosingChange: () => undefined,
            onDueChange: () => undefined,
            closingBefore: null,
            dueBefore: null,
            note: '',
          }
        }
        canSave={edit.canSave}
        saving={edit.saving}
        onKnowExactDay={hasApproxDay(card) ? () => edit.start({ knowExactDay: true }) : undefined}
        onEdit={() => edit.start()}
        onCancelEdit={edit.cancel}
        onSave={edit.requestSave}
        onOpenStatement={() => setStatementOpen(true)}
        onOpenDoor={setOpenKind}
        onDelete={askDelete}
        onClose={() => goBack(router)}
      />

      <CardDaysSheet
        state={edit.sheet}
        onClose={edit.closeSheet}
        onConfirm={edit.confirmSave}
        loading={edit.saving}
      />

      <StatementDetailSheet
        payment={statementOpen ? next : null}
        onClose={() => setStatementOpen(false)}
      />

      <Sheet visible={group != null} onClose={() => setOpenKind(null)} title={group?.title ?? ''}>
        {group != null && (
          <ScrollView showsVerticalScrollIndicator={false}>
            <Group group={group} />
          </ScrollView>
        )}
      </Sheet>

      <CardDeleteSheet
        state={deleteState}
        onClose={() => setDeleteState(null)}
        onConfirm={() => remove.mutate()}
        loading={remove.isPending}
      />
    </>
  );
}
