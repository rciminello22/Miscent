import type { MemberPayment } from '@domain/types';
import { Sheet } from '@/ui/primitives';
import { SpacePaymentPanel } from './SpacePaymentPanel';
import type { useSpace } from './useSpaces';

type Derived = NonNullable<ReturnType<typeof useSpace>['derived']>;

/**
 * §25 · tocar un pago lo muestra; eliminar queda adentro. Es una hoja porque
 * solo sirve para decidir algo corto (revisar o eliminar), no para leer.
 */
export function SpacePaymentSheet({
  spaceId,
  derived,
  today,
  payment,
  onClose,
}: {
  spaceId: string;
  derived: Derived;
  today: string;
  payment: MemberPayment | null;
  onClose: () => void;
}) {
  return (
    <Sheet visible={payment != null} onClose={onClose} title="Pago entre ustedes">
      {payment != null && (
        <SpacePaymentPanel
          spaceId={spaceId}
          derived={derived}
          today={today}
          payment={payment}
          onDone={onClose}
        />
      )}
    </Sheet>
  );
}
