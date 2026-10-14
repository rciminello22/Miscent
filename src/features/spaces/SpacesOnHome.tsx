import { View } from 'react-native';
import { pendingStoppedFixed } from '@domain/departure';
import type { SpaceSummary } from '@/data/repositories/spaces';
import { paidByMeWithoutMethod } from '@domain/paidByMe';
import { usePersonalFacts } from '@/features/shared/usePersonalFacts';
import { pendingFixedLine } from './departureCopy';
import { toCompleteLine } from './paidByMeCopy';
import { toReviewLine } from './reviewCopy';
import { Pressable, Row, SectionHeader, Skeleton, Stack, Text } from '@/ui/primitives';
import { useTheme } from '@/ui/theme';
import { balanceSentence } from './balanceCopy';
import { useOpenSpace } from './useOpenSpace';
import { useSpace, useSpaces } from './useSpaces';

/**
 * §15 · "Tus espacios: una línea por espacio con su saldo (máximo 3); si no
 * hay espacios, el bloque no aparece."
 *
 *   Casa     Martina te debe $20.000
 *   Viaje    Están a mano
 *
 * Es la lente del espacio dentro de Inicio: el saldo compartido, que es el
 * ÚNICO "saldo" que existe en la app (§7.2). Nunca se suma entre espacios
 * (Caso 17).
 */
const MAX_SPACES = 3;

export function SpacesOnHome() {
  const { data: spaces } = useSpaces();
  if (spaces == null || spaces.length === 0) return null;

  return (
    <Stack gap="3">
      <SectionHeader title="Tus espacios" />
      <Stack gap="1">
        {spaces.slice(0, MAX_SPACES).map((space) => (
          <SpaceLine key={space.id} space={space} />
        ))}
      </Stack>
    </Stack>
  );
}

function SpaceLine({ space }: { space: SpaceSummary }) {
  const theme = useTheme();
  const openSpace = useOpenSpace();
  // El mismo cálculo que adentro del espacio: una sola fuente para la cifra.
  const { derived, isLoading } = useSpace(space.id);
  // SA-04 · la pista de por qué bajó el radar: la pregunta vive en el espacio.
  const pending = derived == null ? 0 : pendingStoppedFixed(derived.facts, derived.mySlot).length;
  // §5 1º Should · lo que te cargaron como pagado por vos, sin medio.
  const { facts: personalFacts, today } = usePersonalFacts();
  const membership = personalFacts.spaces.find((item) => item.facts.space.id === space.id);
  const toComplete =
    membership == null ? 0 : paidByMeWithoutMethod(membership, today, { includeOwn: false }).length;
  // Opción B · sutil: el detalle está en el espacio.
  const toReview = (derived?.pendingReview.size ?? 0) + (derived?.pendingDeletions.length ?? 0);
  const hints = [
    pending > 0 ? pendingFixedLine(pending) : null,
    toComplete > 0 ? toCompleteLine(toComplete) : null,
    toReview > 0 ? toReviewLine(toReview) : null,
  ].filter((hint): hint is string => hint != null);

  return (
    <Pressable
      onPress={() => openSpace(space.id)}
      haptic="none"
      scaleOnPress={false}
      accessibilityRole="button"
      accessibilityLabel={[space.name, ...hints].join('. ')}
      style={{ paddingVertical: theme.space['2'] }}
    >
      <Row justify="space-between" align="center" gap="3">
        <View style={{ flexShrink: 1 }}>
          <Text variant="bodyMedium" numberOfLines={1}>
            {space.name}
          </Text>
          {hints.map((hint) => (
            <Text key={hint} variant="caption" tone="shared">
              {hint}
            </Text>
          ))}
        </View>
        {isLoading ? (
          <Skeleton width={120} height={13} />
        ) : derived != null ? (
          <Text variant="small" tone={derived.balance.settled ? 'muted' : 'shared'}>
            {balanceSentence(derived.balance)}
          </Text>
        ) : null}
      </Row>
    </Pressable>
  );
}
