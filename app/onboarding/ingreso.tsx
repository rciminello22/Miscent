import { useState } from 'react';
import { View } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { goBack } from '@/features/shared/navigation';
import { monthOf } from '@domain/calendar';
import { AmountInput } from '@/features/add/AmountInput';
import { Field } from '@/features/add/fields';
import { StepShell } from '@/features/onboarding/StepShell';
import { onboardingBranches, onboardingProgress } from '@/features/onboarding/onboardingProgress';
import { useCreateRecurrence, usePersonalFacts } from '@/features/shared/usePersonalFacts';
import { useToday } from '@/features/shared/useToday';
import { DayAnswerField } from '@/features/onboarding/DayAnswerField';
import { dayAnswerToStored, emptyAnswer } from '@/features/onboarding/dayAnswer';
import { Card, Stack, Text } from '@/ui/primitives';

/**
 * O3 paso 2 · Ingreso mensual: monto y día de cobro.
 *
 * El ingreso se guarda como un recurrente mensual, no como un movimiento
 * puntual: N-01 dice que "Ingresos registrados del mes = ingresos recurrentes
 * del mes (con ajustes) + ingresos puntuales", y el sueldo es justamente lo
 * recurrente. Eso también lo vuelve la base de "Ingreso previsto" en Futuro
 * (§23.1) sin que el usuario tenga que cargarlo cada mes.
 *
 * §13 · "Mi ingreso varía" → promedio. F-03 permite después ajustar un mes
 * con "Este mes fue distinto", que es exactamente para ese caso.
 */
export default function Ingreso() {
  const router = useRouter();
  // UX-01 · desde Perfil ("Tus ingresos") esta pantalla registra UN ingreso y
  // vuelve: no es el paso 1 de 5, así que no sigue al wizard de tarjetas.
  const { desde } = useLocalSearchParams<{ desde?: string }>();
  const standalone = desde === 'perfil';
  const today = useToday();
  const createRecurrence = useCreateRecurrence();
  const { facts } = usePersonalFacts();
  // UX-22 · la barra cuenta los pasos que de verdad se recorren.
  const progress = onboardingProgress('ingreso', onboardingBranches(facts, today));

  const [amount, setAmount] = useState(0);
  // T-02 · sin respuesta de antemano: nadie queda con un día que no eligió.
  const [dayAnswer, setDayAnswer] = useState(emptyAnswer());
  const [saving, setSaving] = useState(false);

  async function save() {
    if (amount <= 0) return;
    setSaving(true);

    try {
      const stored = dayAnswerToStored(dayAnswer);
      await createRecurrence.mutateAsync({
        kind: 'income',
        amount,
        category: 'sueldo',
        dayOfMonth: stored.day,
        dayApprox: stored.approx,
        startMonth: monthOf(today),
        endMonth: null,
        paymentMethodId: null,
      });
      if (standalone) goBack(router);
      else router.push('/onboarding/tarjetas');
    } catch {
      setSaving(false);
    }
  }

  return (
    <StepShell
      step={progress.step}
      total={standalone ? 0 : progress.total}
      title="¿Cuánto cobrás por mes?"
      description="Lo usamos para mostrarte qué parte de tus ingresos ya tiene destino."
      help="Si tu ingreso varía, poné un promedio. Después podés ajustar un mes puntual con “Este mes fue distinto”."
      continueDisabled={amount <= 0}
      saving={saving}
      onContinue={() => void save()}
      onSkip={() => (standalone ? goBack(router) : router.push('/onboarding/tarjetas'))}
      skipLabel={standalone ? 'Cancelar' : undefined}
      continueLabel={standalone ? 'Guardar' : undefined}
    >
      <Stack gap="6">
        <View>
          <AmountInput value={amount} onChange={setAmount} />
        </View>

        <Field label="¿Qué día lo cobrás?">
          <DayAnswerField
            label="Día de cobro"
            value={dayAnswer}
            onChange={setDayAnswer}
            unknownHelp="Lo contamos en el mes en que cobrás, sin día."
          />
        </Field>

        <Card tone="sunken">
          <Text variant="small" tone="secondary">
            No necesitamos saber cuánta plata tenés. Solo lo que registrás acá.
          </Text>
        </Card>
      </Stack>
    </StepShell>
  );
}
