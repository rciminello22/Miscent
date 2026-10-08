import { useState } from 'react';
import { View } from 'react-native';
import { useRouter } from 'expo-router';
import { monthOf } from '@domain/calendar';
import { AmountInput } from '@/features/add/AmountInput';
import { Field } from '@/features/add/fields';
import { StepShell } from '@/features/onboarding/StepShell';
import { useCreateRecurrence } from '@/features/shared/usePersonalFacts';
import { useToday } from '@/features/shared/useToday';
import { DayPicker } from '@/features/onboarding/DayPicker';
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
  const today = useToday();
  const createRecurrence = useCreateRecurrence();

  const [amount, setAmount] = useState(0);
  const [day, setDay] = useState(1);
  const [saving, setSaving] = useState(false);

  async function save() {
    if (amount <= 0) return;
    setSaving(true);

    try {
      await createRecurrence.mutateAsync({
        kind: 'income',
        amount,
        category: 'sueldo',
        dayOfMonth: day,
        startMonth: monthOf(today),
        endMonth: null,
        paymentMethodId: null,
      });
      router.push('/onboarding/tarjetas');
    } catch {
      setSaving(false);
    }
  }

  return (
    <StepShell
      step={1}
      total={5}
      title="¿Cuánto cobrás por mes?"
      description="Lo usamos para mostrarte qué parte de tus ingresos ya tiene destino."
      help="Si tu ingreso varía, poné un promedio. Después podés ajustar un mes puntual con “Este mes fue distinto”."
      continueDisabled={amount <= 0}
      saving={saving}
      onContinue={() => void save()}
      onSkip={() => router.push('/onboarding/tarjetas')}
    >
      <Stack gap="6">
        <View>
          <AmountInput value={amount} onChange={setAmount} />
        </View>

        <Field label="¿Qué día lo cobrás?">
          <DayPicker value={day} onChange={(next) => setDay(next ?? 1)} />
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
