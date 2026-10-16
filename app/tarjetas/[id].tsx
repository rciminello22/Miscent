import { useMemo, useState } from 'react';
import { ScrollView } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { monthOf } from '@domain/calendar';
import { calculateUpcomingPayments } from '@domain/upcoming';
import { formatPesos } from '@/lib/format';
import { queryKeys } from '@/data/queryClient';
import { deletePaymentMethod, updatePaymentMethod } from '@/data/repositories/mutations';
import { useSession } from '@/features/auth/SessionProvider';
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
 * próximo resumen, las barras y las puertas con el dominio; edita el nombre y
 * elimina con las reglas de §22.
 *
 * El cierre y el vencimiento se muestran pero NO se editan acá: cambiarlos
 * obligaría a rearmar los planes de cuotas ya guardados (son hechos
 * persistidos, y no hay forma de saber cuáles se fijaron a mano), y eso hoy
 * necesita lógica de servidor. Está en la lista de decisiones pendientes.
 */
export default function TarjetaDetalle() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const feedback = useFeedback();
  const { session } = useSession();
  const { id } = useLocalSearchParams<{ id: string }>();
  const { facts, expansion, today } = usePersonalFacts();

  const card = facts.paymentMethods.find((method) => method.id === id && method.kind === 'card');

  const [editing, setEditing] = useState(false);
  const [name, setName] = useState('');
  const [statementOpen, setStatementOpen] = useState(false);
  const [openKind, setOpenKind] = useState<DetailGroupKind | null>(null);
  const [deleteState, setDeleteState] = useState<CardDeleteState>(null);

  const payments = useMemo(
    () => calculateUpcomingPayments(expansion, today, facts.paymentMethods),
    [expansion, today, facts.paymentMethods],
  );
  const statements = useMemo(() => cardStatements(payments, id, today), [payments, id, today]);
  const next = statements[0] ?? null;

  async function invalidate() {
    await queryClient.invalidateQueries({
      queryKey: queryKeys.personalFacts(session?.user.id ?? 'anon'),
    });
  }

  const save = useMutation({
    mutationFn: () => updatePaymentMethod(id, { name }),
    onSuccess: async () => {
      await invalidate();
      feedback.updated();
      setEditing(false);
    },
    onError: (error: Error) => feedback.error('No pudimos guardar los cambios', error),
  });

  const remove = useMutation({
    mutationFn: () => deletePaymentMethod(id),
    onSuccess: async () => {
      setDeleteState(null);
      await invalidate();
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
        editing={editing}
        name={name}
        canSave={name.trim().length > 0 && name.trim() !== card.name}
        saving={save.isPending}
        onNameChange={setName}
        onEdit={() => {
          setName(card.name);
          setEditing(true);
        }}
        onCancelEdit={() => setEditing(false)}
        onSave={() => save.mutate()}
        onOpenStatement={() => setStatementOpen(true)}
        onOpenDoor={setOpenKind}
        onDelete={askDelete}
        onClose={() => goBack(router)}
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
