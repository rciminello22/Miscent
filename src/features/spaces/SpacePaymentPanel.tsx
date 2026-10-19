import { Alert } from 'react-native';
import { calculateSharedBalance } from '@domain/shared-balance';
import type { MemberPayment } from '@domain/types';
import { spaceAudience, useFeedback } from '@/features/shared/useFeedback';
import { balanceSentence, paymentSentence } from './balanceCopy';
import { PaymentDetail } from './PaymentDetail';
import { reviewTag } from './reviewCopy';
import { paymentDirectionOf, paymentRowTitle } from './spaceMovements';
import { useSpaceReview } from './useSpaceActions';
import { useDeleteMemberPayment, type useSpace } from './useSpaces';

type Derived = NonNullable<ReturnType<typeof useSpace>['derived']>;

/**
 * §25 · el detalle de un pago con sus acciones (revisar, eliminar). Lo comparten
 * la hoja del espacio y la pantalla `/space/[id]/pagos/[pid]` que abre
 * Movimientos: un solo lugar sabe qué se puede hacer con un pago.
 *
 * `onDone` cierra donde esté abierto (la hoja o la pantalla).
 */
export function SpacePaymentPanel({
  spaceId,
  derived,
  today,
  payment,
  onDone,
}: {
  spaceId: string;
  derived: Derived;
  today: string;
  payment: MemberPayment;
  onDone: () => void;
}) {
  const deletePayment = useDeleteMemberPayment(spaceId);
  const feedback = useFeedback();
  const { reviewIds } = useSpaceReview(spaceId, derived);

  /** §25 · "confirmación al eliminar con el nuevo saldo y 'Martina también lo va a dejar de ver'". */
  function confirmDelete(target: MemberPayment) {
    const after = calculateSharedBalance(
      {
        ...derived.facts,
        payments: derived.facts.payments.filter((item) => item.id !== target.id),
      },
      derived.mySlot,
      today,
    );
    Alert.alert(
      `¿Eliminar este pago?`,
      `${paymentSentence(target, derived.mySlot, derived.other.displayName)}. ${derived.other.displayName} también lo va a dejar de ver. El saldo pasa a: ${balanceSentence(after).toLowerCase()}.`,
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Eliminar',
          style: 'destructive',
          onPress: () => {
            onDone();
            deletePayment
              .mutateAsync(target.id)
              .then(() =>
                feedback.deleted(
                  spaceAudience(derived.facts.space.name, derived.other),
                  `${balanceSentence(after)}.`,
                ),
              )
              .catch((cause: unknown) => feedback.error('No pudimos eliminar el pago', cause));
          },
        },
      ],
    );
  }

  return (
    <PaymentDetail
      sentence={paymentRowTitle(payment, derived.mySlot, derived.other.displayName)}
      amount={payment.amount}
      direction={paymentDirectionOf(payment, derived.mySlot)}
      date={payment.date}
      recordedBy={{
        isMe: payment.recordedBySlot === derived.mySlot,
        name:
          derived.facts.space.members.find((member) => member.slot === payment.recordedBySlot)
            ?.displayName ?? derived.other.displayName,
      }}
      // La confirmación sale sobre la hoja abierta: cerrar un Modal y
      // abrir un Alert a la vez puede perder el Alert en iOS. Cancelar
      // vuelve al detalle; eliminar cierra la hoja.
      review={
        derived.pendingReview.has(payment.id)
          ? {
              // Los pagos no se editan: siempre los cargó el otro.
              label: reviewTag(derived.other.displayName, 'created'),
              onReviewed: () => {
                onDone();
                reviewIds([payment.id]);
              },
            }
          : undefined
      }
      onDelete={() => confirmDelete(payment)}
    />
  );
}
