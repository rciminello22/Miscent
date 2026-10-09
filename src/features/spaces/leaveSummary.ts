import type { IsoDate, Month } from '@domain/calendar';
import { monthOf } from '@domain/calendar';
import { expandSpaceOccurrences, spaceHorizon } from '@domain/occurrences';
import type { Pesos } from '@domain/money';
import { shareOf } from '@domain/split';
import type { Slot, SpaceFacts } from '@domain/types';
import type { SharedBalance } from '@domain/shared-balance';

/**
 * §27 paso 2 · "Antes de salir".
 *
 * La spec es muy precisa sobre qué hay que mostrar ANTES de que alguien salga,
 * y el motivo es que salir no se puede deshacer:
 *
 *   - el saldo ("Le debés $10.000 a Renzo")
 *   - las cuotas compartidas que SIGUEN ("Heladera: quedan 4 cuotas; tu parte
 *     $200.000") — SA-03 / K5
 *   - los fijos compartidos que se DETIENEN — SA-04 / K5
 *   - "Tu nombre queda en el historial como ex miembro" — K4
 *
 * La asimetría entre cuotas y fijos es la decisión K5, y tiene lógica: una
 * cuota es un compromiso ya contraído (la heladera ya se compró), un fijo es
 * un acuerdo a futuro (el alquiler se sigue pagando o no). Salir corta lo que
 * todavía no empezó, no lo que ya está.
 */

export type ContinuingInstallment = {
  label: string;
  remainingCount: number;
  /** Tu parte de lo que queda. */
  myRemaining: Pesos;
  endsOn: Month;
};

export type StoppingRecurrence = {
  id: string;
  label: string;
  monthlyAmount: Pesos;
  /** Tu parte de cada mes. */
  myShare: Pesos;
  /** Quién lo paga, para la pregunta de SA-04 a quien queda. */
  payerIsMe: boolean;
};

export type LeaveSummary = {
  balance: SharedBalance;
  /** SA-03 · siguen con el mismo reparto y siguen sumando al saldo. */
  continuingInstallments: ContinuingInstallment[];
  /** SA-04 · se detienen desde la salida. */
  stoppingRecurrences: StoppingRecurrence[];
  otherMemberName: string;
};

export function buildLeaveSummary(args: {
  facts: SpaceFacts;
  mySlot: Slot;
  balance: SharedBalance;
  today: IsoDate;
}): LeaveSummary {
  const { facts, mySlot, balance, today } = args;
  const occurrences = expandSpaceOccurrences(facts, spaceHorizon(facts, today));
  const other = facts.space.members.find((member) => member.slot !== mySlot)!;

  /* SA-03 · cuotas que todavía no vencieron, agrupadas por compra. */
  const byPurchase = new Map<string, ContinuingInstallment>();

  for (const occurrence of occurrences) {
    if (occurrence.installment == null) continue;
    if (occurrence.balanceDate <= today) continue;

    const current = byPurchase.get(occurrence.sourceId);
    const myShare = shareOf(occurrence.shares, mySlot);

    if (current == null) {
      byPurchase.set(occurrence.sourceId, {
        label: occurrence.label,
        remainingCount: 1,
        myRemaining: myShare,
        endsOn: occurrence.month,
      });
      continue;
    }

    current.remainingCount += 1;
    current.myRemaining += myShare;
    if (occurrence.month > current.endsOn) current.endsOn = occurrence.month;
  }

  /* SA-04 · fijos compartidos que siguen activos y se van a detener. */
  const currentMonth = monthOf(today);

  const stoppingRecurrences = facts.recurrences
    .filter((recurrence) => recurrence.spaceId != null)
    .filter(
      (recurrence) => recurrence.endMonth == null || recurrence.endMonth >= currentMonth,
    )
    .map((recurrence) => {
      const split = recurrence.split ?? { mode: 'even' as const };
      const shares =
        split.mode === 'even'
          ? { slot1: Math.round(recurrence.amount / 2), slot2: recurrence.amount - Math.round(recurrence.amount / 2) }
          : { slot1: split.shareSlot1, slot2: split.shareSlot2 };

      return {
        id: recurrence.id,
        label: recurrence.category,
        monthlyAmount: recurrence.amount,
        myShare: shareOf(shares, mySlot),
        payerIsMe: recurrence.payerSlot === mySlot,
      };
    });

  return {
    balance,
    continuingInstallments: [...byPurchase.values()],
    stoppingRecurrences,
    otherMemberName: other.displayName,
  };
}
