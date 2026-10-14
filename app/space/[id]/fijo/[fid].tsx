import { useLocalSearchParams } from 'expo-router';
import { useQueryClient } from '@tanstack/react-query';
import { queryKeys } from '@/data/queryClient';
import { useSession } from '@/features/auth/SessionProvider';
import { FixedDetail } from '@/features/fixed/FixedDetail';
import { spaceAudience, useFeedback } from '@/features/shared/useFeedback';
import { reviewTag } from '@/features/spaces/reviewCopy';
import { fixedAuthorLine } from '@/features/fixed/fixedCopy';
import { useMarkReviewed, useSpace } from '@/features/spaces/useSpaces';

/**
 * §21 · un fijo compartido: "Lo crean, editan y detienen los dos miembros".
 *
 * La misma pantalla que la de un fijo personal (F-03, las cuatro formas de
 * cambiarlo), con lo que cambia por ser de dos:
 *   - la audiencia es el espacio (§12)
 *   - quién lo cargó y quién lo paga (K3, autoría visible)
 *   - "para revisar" si lo cambió el otro (opción B)
 *   - detenerlo o eliminarlo cambia también el saldo con el otro, y se dice
 *
 * Vive bajo /space para que el invitado sin cuenta personal (Estado B) también
 * pueda editarlo (P5).
 */
export default function FijoCompartido() {
  const queryClient = useQueryClient();
  const { id, fid } = useLocalSearchParams<{ id: string; fid: string }>();
  const spaceId = id ?? '';
  const { session } = useSession();
  const feedback = useFeedback();
  const { derived, today } = useSpace(spaceId);
  const markReviewed = useMarkReviewed(spaceId);

  const recurrence = derived?.facts.recurrences.find((item) => item.id === fid) ?? null;

  if (derived == null) return null;
  const { other, mySlot } = derived;

  return (
    <FixedDetail
      recurrence={recurrence}
      overrides={derived.facts.overrides}
      today={today}
      audience={{ kind: 'shared', otherMemberName: other.displayName }}
      feedbackAudience={spaceAudience(derived.facts.space.name, other)}
      invalidate={async () => {
        await Promise.all([
          queryClient.invalidateQueries({ queryKey: queryKeys.spaceFacts(spaceId) }),
          queryClient.invalidateQueries({ queryKey: queryKeys.spaces }),
          // K9 · cambia la parte que llega al radar de los dos.
          queryClient.invalidateQueries({
            queryKey: queryKeys.personalFacts(session?.user.id ?? 'anon'),
          }),
        ]);
      }}
      shared={
        recurrence == null
          ? undefined
          : {
              otherName: other.displayName,
              spaceName: derived.facts.space.name,
              authorLine: fixedAuthorLine(recurrence, mySlot, other.displayName),
              review: derived.pendingReview.has(recurrence.id)
                ? {
                    label: reviewTag(other.displayName),
                    loading: markReviewed.isPending,
                    onReviewed: () =>
                      markReviewed
                        .mutateAsync([recurrence.id])
                        .then(() => feedback.updated('Listo, ya lo revisaste.'))
                        .catch((cause: unknown) => feedback.error('No pudimos marcarlo', cause)),
                  }
                : undefined,
            }
      }
    />
  );
}
