import { calculateSharedBalance } from '@domain/shared-balance';
import { formatDayMonth } from '@/lib/format';
import { useSession } from '@/features/auth/SessionProvider';
import { usePersonalFacts } from '@/features/shared/usePersonalFacts';
import { Card, SectionHeader, Stack, Text } from '@/ui/primitives';
import { departureBalanceSentence } from './balanceCopy';
import { spaceContext } from './departureCopy';

/**
 * P6 · "Qué ve un ex miembro después de salir · Resumen fijo del saldo al
 * momento de salir".
 *
 * Sale de la foto que guardó el servidor al salir (0018), y el saldo lo
 * calcula el dominio sobre esa foto a la fecha de salida: no hay un número
 * guardado. Es FIJO a propósito: perdió el acceso (SA-02), así que lo que pasó
 * después (las cuotas que siguen, un pago) lo ve quien se quedó.
 */
export function FormerSpaces() {
  const { facts } = usePersonalFacts();
  const { accountState } = useSession();

  const former = facts.spaces.filter((membership) => membership.leftOn != null);
  if (former.length === 0) return null;

  return (
    <Stack gap="4">
      <SectionHeader title="Espacios de los que saliste" />
      {former.map((membership) => {
        const leftOn = membership.leftOn!;
        const other = membership.facts.space.members.find((member) => member.slot !== membership.mySlot)!;
        const balance = calculateSharedBalance(membership.facts, membership.mySlot, leftOn);

        return (
          <Card key={membership.facts.space.id} tone="sunken">
            <Stack gap="2">
              <Text variant="bodyMedium">{spaceContext(membership.facts.space.name, true)}</Text>
              <Text variant="caption" tone="muted">
                Saliste el {formatDayMonth(leftOn)}
              </Text>
              <Text variant="small">{departureBalanceSentence(balance)}</Text>
              <Text variant="caption" tone="muted">
                {accountState === 'personal'
                  ? `Tu parte de las cuotas que quedaban sigue en tu Futuro. Lo que cambie después lo ve ${other.displayName}.`
                  : `Lo que cambie después lo ve ${other.displayName}.`}
              </Text>
            </Stack>
          </Card>
        );
      })}
    </Stack>
  );
}
