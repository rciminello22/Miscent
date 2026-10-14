import { useLocalSearchParams } from 'expo-router';
import { useQueryClient } from '@tanstack/react-query';
import { queryKeys } from '@/data/queryClient';
import { useSession } from '@/features/auth/SessionProvider';
import { usePersonalFacts } from '@/features/shared/usePersonalFacts';
import { FixedDetail } from '@/features/fixed/FixedDetail';

/** §21 · F-03 · un fijo personal. La pantalla es la misma que la del espacio. */
export default function FijoDetalle() {
  const queryClient = useQueryClient();
  const { id } = useLocalSearchParams<{ id: string }>();
  const { session } = useSession();
  const { facts, today } = usePersonalFacts();

  const recurrence = facts.recurrences.find((item) => item.id === id) ?? null;
  const method = facts.paymentMethods.find((item) => item.id === recurrence?.paymentMethodId);

  return (
    <FixedDetail
      recurrence={recurrence}
      overrides={facts.overrides}
      today={today}
      audience={{ kind: 'private' }}
      feedbackAudience={{ kind: 'private' }}
      methodName={method?.name}
      invalidate={async () => {
        await queryClient.invalidateQueries({
          queryKey: queryKeys.personalFacts(session?.user.id ?? 'anon'),
        });
      }}
    />
  );
}
