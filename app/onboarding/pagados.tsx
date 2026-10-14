import { useState } from 'react';
import { Redirect, useRouter } from 'expo-router';
import { paidByMeWithoutMethod } from '@domain/paidByMe';
import { StepShell } from '@/features/onboarding/StepShell';
import { usePersonalFacts } from '@/features/shared/usePersonalFacts';
import { PaidByMeSection } from '@/features/spaces/PaidByMeSection';
import { onboardingPaidTitle } from '@/features/spaces/paidByMeCopy';
import { Stack } from '@/ui/primitives';

/**
 * O3 · §11 paso 4 · "Pagaste estos gastos de Casa. ¿Con qué?" (Should).
 *
 * Para quien activa su cuenta viniendo de invitado: los gastos que pagó los
 * cargó sin medio, porque sin cuenta personal no había medios (A-05). Sin
 * esto quedan al contado y nunca entran al resumen de su tarjeta.
 *
 * Va después de las tarjetas, porque las necesita. Si no hay nada que
 * preguntar (quien se registró por su cuenta), sigue de largo.
 */
export default function Pagados() {
  const router = useRouter();
  const { facts, today, isLoading } = usePersonalFacts();

  // Se decide UNA vez, al cargar: si se recalculara, contestar el último
  // gasto vaciaría la lista y sacaría al usuario de la pantalla de golpe.
  const [hadSomething, setHadSomething] = useState<boolean | null>(null);
  if (hadSomething == null && !isLoading) {
    setHadSomething(
      facts.spaces.some(
        (membership) => paidByMeWithoutMethod(membership, today, { includeOwn: true }).length > 0,
      ),
    );
  }

  if (hadSomething == null) return null;
  if (!hadSomething) return <Redirect href="/onboarding/fijos" />;

  return (
    <StepShell
      step={3}
      total={5}
      title="¿Con qué pagaste estos gastos?"
      description="Los cargaste cuando todavía no tenías tu cuenta personal."
      help="Si fue con tarjeta, entran en su resumen estimado y en tus Próximos pagos."
      onContinue={() => router.push('/onboarding/fijos')}
      onSkip={() => router.push('/onboarding/fijos')}
    >
      <Stack gap="4">
        {facts.spaces.map((membership) => (
          <PaidByMeSection
            key={membership.facts.space.id}
            membership={membership}
            methods={facts.paymentMethods}
            today={today}
            includeOwn
            title={() => onboardingPaidTitle(membership.facts.space.name)}
          />
        ))}
      </Stack>
    </StepShell>
  );
}
