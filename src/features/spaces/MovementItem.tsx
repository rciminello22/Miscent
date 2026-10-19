import { ArrowRightLeft } from 'lucide-react-native';
import type { SpaceOccurrence } from '@domain/occurrences';
import type { MemberPayment } from '@domain/types';
import { formatInstallment, formatPesos } from '@/lib/format';
import { categoryMeta, prettyLabel } from '@/features/add/categories';
import { amountSpeech, signOf } from '@/features/movements/amountSign';
import { LedgerRow } from './SpaceRows';
import { reviewTag } from './reviewCopy';
import {
  authorshipLine,
  occurrenceFigures,
  PAYMENT_CAPTION,
  paymentAuthorshipLine,
  paymentDirectionOf,
  paymentRowTitle,
  type SpaceMovement,
} from './spaceMovements';
import type { useSpace } from './useSpaces';

type Derived = NonNullable<ReturnType<typeof useSpace>['derived']>;

/** K3 · quién cargó y quién editó el registro del que sale una ocurrencia. */
function occurrenceAuthorship(derived: Derived, occurrence: SpaceOccurrence): string | null {
  const source =
    occurrence.sourceKind === 'expense'
      ? derived.facts.expenses.find((expense) => expense.id === occurrence.sourceId)
      : derived.facts.recurrences.find((recurrence) => recurrence.id === occurrence.sourceId);
  if (source == null) return null;
  return authorshipLine(source, derived.mySlot, derived.other.displayName);
}

/**
 * Un movimiento del espacio como fila de una pantalla de detalle (N3): gasto,
 * cuota, fijo o pago entre ustedes. Une el dominio con la fila de dibujo.
 *
 * El monto principal es el TOTAL (la lente del espacio, §7.3) y "tu parte" va
 * en gris, a la derecha. El pago no repite en cada fila que no cambia lo que
 * cada uno puso (P-04): eso se dice una vez, en el Detalle del mes y en el
 * detalle del pago.
 */
export function MovementItem({
  movement,
  derived,
  tagged,
  onOpenOccurrence,
  onOpenPayment,
}: {
  movement: SpaceMovement;
  derived: Derived;
  /** Opción B · lleva la marca de "para revisar". */
  tagged: boolean;
  onOpenOccurrence: (occurrence: SpaceOccurrence) => void;
  onOpenPayment: (payment: MemberPayment) => void;
}) {
  const otherName = derived.other.displayName;

  if (movement.kind === 'payment') {
    const { payment } = movement;
    // 15 · entra o sale según quien mira; el ⇄ vive en el recuadro, no en el monto.
    const direction = paymentDirectionOf(payment, derived.mySlot);
    const kind = direction === 'received' ? 'payment-received' : 'payment-sent';
    return (
      <LedgerRow
        icon={ArrowRightLeft}
        iconTone="shared"
        title={paymentRowTitle(payment, derived.mySlot, otherName)}
        caption={PAYMENT_CAPTION}
        authorship={paymentAuthorshipLine(payment.recordedBySlot, derived.mySlot, otherName)}
        reviewTag={derived.pendingReview.has(payment.id) ? reviewTag(otherName, 'created') : null}
        amount={payment.amount}
        sign={signOf(kind)}
        speech={amountSpeech(kind, payment.amount, formatPesos)}
        onPress={() => onOpenPayment(payment)}
      />
    );
  }

  const { occurrence } = movement;
  const iPaid = occurrence.payerSlot === derived.mySlot;
  // 15 · tu parte arriba con "−" y el total en gris, como en Movimientos.
  const figures = occurrenceFigures(occurrence, derived.mySlot);
  const reason = derived.pendingReview.get(occurrence.sourceId);

  return (
    <LedgerRow
      icon={categoryMeta(occurrence.category).icon}
      title={prettyLabel(occurrence.label)}
      caption={[
        // G-06 · "pagó X" es una declaración, no una verificación.
        `pagó ${iPaid ? derived.me.displayName : otherName}`,
        occurrence.installment != null
          ? `cuota ${formatInstallment(occurrence.installment.index, occurrence.installment.count)}`
          : null,
        occurrence.isRecurrence ? 'fijo' : null,
      ]
        .filter((part) => part != null)
        .join(' · ')}
      authorship={occurrenceAuthorship(derived, occurrence)}
      reviewTag={tagged && reason != null ? reviewTag(otherName, reason) : null}
      amount={figures.amount}
      sign="out"
      ofTotal={figures.ofTotal}
      speech={amountSpeech('expense', figures.amount, formatPesos)}
      // Un gasto se edita desde su detalle; un fijo, desde el fijo (§21).
      onPress={() => onOpenOccurrence(occurrence)}
    />
  );
}
