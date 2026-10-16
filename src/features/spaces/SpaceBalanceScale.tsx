import type { SharedBalance } from '@domain/shared-balance';
import type { MemberStatus } from '@domain/types';
import { BalanceScale } from '@/ui/primitives';
import { balanceScaleState } from './balanceScaleState';

/**
 * La balanza de un espacio: la forma visual del saldo. Une el estado puro
 * (`balanceScaleState`) con la primitiva de dibujo. Se usa grande en el N1 del
 * espacio y en miniatura en cada tarjeta de la lista de Compartidos.
 */
export function SpaceBalanceScale({
  spaceId,
  balance,
  myName,
  other,
  size = 'full',
}: {
  spaceId: string;
  balance: SharedBalance;
  myName: string;
  other: { displayName: string; status: MemberStatus };
  size?: 'full' | 'mini';
}) {
  const state = balanceScaleState({ balance, myName, other });

  return (
    <BalanceScale
      size={size}
      direction={state.direction}
      showCheck={state.showCheck}
      me={state.me}
      other={state.other}
      accessibilityLabel={state.accessibilityLabel}
      // La misma balanza en la lista y adentro: al volver, gira desde el estado anterior.
      memoryKey={spaceId}
    />
  );
}
