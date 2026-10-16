import { useMemo, useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { monthOf } from '@domain/calendar';
import { planCardDaysChange, type CardDaysPlan, type PlanWrite } from '@domain/cardDays';
import type { PaymentMethod, PersonalFacts } from '@domain/types';
import { queryKeys } from '@/data/queryClient';
import {
  applyCardDaysChange,
  undoCardDaysChange,
  type CardEdit,
} from '@/data/repositories/cardDays';
import { useSession } from '@/features/auth/SessionProvider';
import { useFeedback } from '@/features/shared/useFeedback';
import { sharedDatesNotes } from '@/features/spaces/sharedDatesNotes';
import type { StoredDay } from '@/features/onboarding/dayAnswer';
import { useToast } from '@/ui/primitives';
import { sheetRows, sheetTitle } from './cardDaysChanges';
import type { CardDaysSheetState } from './CardDaysSheet';
import type { CardEditFormProps } from './CardEditForm';
import {
  canSaveDraft,
  cardEditOf,
  dayBefore,
  daysChanged,
  daysVersionOf,
  draftFromCard,
  editedCard,
  editNote,
  recalculatedDetail,
  updatedTitle,
  type CardDraft,
} from './cardDaysEdit';

const NO_CHANGES: CardDaysPlan = { items: [], writes: [], fromMonth: null };

type Saved = {
  edit: CardEdit;
  previous: CardEdit;
  writes: readonly PlanWrite[];
  recalculated: number;
  /** La versión de días que agregó el cambio, para sacarla al deshacer. */
  versionUntil: string | null;
};

function storedOf(day: number | null, approx: boolean): StoredDay {
  return { day, approx };
}

/**
 * Container de la edición de una tarjeta (§22, T-06): arma el borrador, calcula
 * en vivo qué se mueve con el dominio, pide confirmación si hay algo para mover
 * y guarda. El aviso de después ofrece "Deshacer".
 */
export function useCardDaysEdit(args: {
  card: PaymentMethod | undefined;
  facts: PersonalFacts;
  today: string;
}) {
  const { card, facts, today } = args;
  const queryClient = useQueryClient();
  const feedback = useFeedback();
  const toast = useToast();
  const { session } = useSession();

  const [draft, setDraft] = useState<CardDraft | null>(null);
  const [confirming, setConfirming] = useState(false);

  const next = useMemo(
    () => (card != null && draft != null ? editedCard(card, draft) : null),
    [card, draft],
  );
  const changedDays = card != null && draft != null && daysChanged(card, draft);

  // Qué se mueve, en vivo con cada toque (es una función pura sobre los hechos).
  const plan = useMemo(
    () =>
      card != null && next != null && changedDays
        ? planCardDaysChange({ before: card, after: next, facts, today })
        : NO_CHANGES,
    [card, next, changedDays, facts, today],
  );

  async function invalidate() {
    await queryClient.invalidateQueries({
      queryKey: queryKeys.personalFacts(session?.user.id ?? 'anon'),
    });
  }

  function undo(saved: Saved, cardId: string) {
    undoCardDaysChange({
      cardId,
      previousCard: saved.previous,
      writes: saved.writes,
      versionUntil: saved.versionUntil,
    })
      .then(invalidate)
      .then(() => toast.show({ title: 'Listo, quedó como estaba' }))
      .catch((cause: unknown) => feedback.error('No pudimos deshacerlo', cause));
  }

  const save = useMutation({
    mutationFn: async (): Promise<Saved> => {
      if (card == null || next == null) throw new Error('No hay nada para guardar.');
      const edit = cardEditOf(next);
      // T-06 · los días de antes quedan guardados hasta hoy: lo ya pagado no cambia.
      const { versionUntil } = await applyCardDaysChange({
        cardId: card.id,
        card: edit,
        writes: plan.writes,
        version: changedDays ? daysVersionOf(card, today) : null,
      });
      return {
        edit,
        previous: cardEditOf(card),
        writes: plan.writes,
        recalculated: plan.items.length,
        versionUntil,
      };
    },
    onSuccess: async (saved) => {
      const cardId = card?.id;
      setConfirming(false);
      setDraft(null);
      await invalidate();
      toast.show({
        title: updatedTitle(saved.edit.name),
        detail: recalculatedDetail(saved.recalculated),
        actions:
          cardId == null ? [] : [{ label: 'Deshacer', onPress: () => undo(saved, cardId) }],
      });
    },
    onError: (error: Error) => {
      setConfirming(false);
      feedback.error('No pudimos guardar los cambios', error);
    },
  });

  const form: CardEditFormProps | null =
    card == null || draft == null
      ? null
      : {
          name: draft.name,
          onNameChange: (name) => setDraft({ ...draft, name }),
          closing: draft.closing,
          due: draft.due,
          onClosingChange: (closing) => setDraft({ ...draft, closing }),
          onDueChange: (due) => setDraft({ ...draft, due }),
          closingBefore: dayBefore(storedOf(card.closingDay, card.closingApprox), draft.closing),
          dueBefore: dayBefore(storedOf(card.dueDay, card.dueApprox), draft.due),
          note: editNote({ daysChanged: changedDays, plan }),
        };

  const sheet: CardDaysSheetState = confirming
    ? {
        title: sheetTitle(plan, monthOf(today)),
        rows: sheetRows(plan.items),
        notes: sharedDatesNotes(plan.items),
      }
    : null;

  return {
    editing: draft != null,
    form,
    canSave: card != null && draft != null && canSaveDraft(card, draft),
    saving: save.isPending,
    sheet,
    start: (options?: { knowExactDay?: boolean }) => {
      if (card != null) setDraft(draftFromCard(card, options));
    },
    cancel: () => {
      setDraft(null);
      setConfirming(false);
    },
    /** Con algo para mover, primero la hoja; si no, se guarda directo. */
    requestSave: () => {
      if (plan.items.length > 0) setConfirming(true);
      else save.mutate();
    },
    confirmSave: () => save.mutate(),
    closeSheet: () => setConfirming(false),
  };
}
