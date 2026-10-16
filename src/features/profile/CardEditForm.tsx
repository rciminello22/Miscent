import { Field } from '@/features/add/fields';
import { DayAnswerField } from '@/features/onboarding/DayAnswerField';
import type { DayAnswer } from '@/features/onboarding/dayAnswer';
import { Card, Stack, Text, TextField } from '@/ui/primitives';

export type CardEditFormProps = {
  name: string;
  onNameChange: (name: string) => void;
  closing: DayAnswer;
  due: DayAnswer;
  onClosingChange: (next: DayAnswer) => void;
  onDueChange: (next: DayAnswer) => void;
  /** "Antes: ~15", debajo del día que cambió. */
  closingBefore: string | null;
  dueBefore: string | null;
  /** Qué pasa con lo que ya está registrado (`editNote`). */
  note: string;
};

/**
 * §22, T-06 · corregir una tarjeta: el nombre, el cierre y el vencimiento, con
 * el mismo patrón de tres respuestas del onboarding y "Antes: …" debajo de cada
 * día que cambió. Presentacional.
 */
export function CardEditForm({
  name,
  onNameChange,
  closing,
  due,
  onClosingChange,
  onDueChange,
  closingBefore,
  dueBefore,
  note,
}: Readonly<CardEditFormProps>) {
  return (
    <Stack gap="5">
      <Field label="Nombre">
        <TextField
          value={name}
          onChangeText={onNameChange}
          maxLength={60}
          accessibilityLabel="Nombre de la tarjeta"
        />
      </Field>

      <Field label="Día de cierre" hint={closingBefore ?? undefined}>
        <DayAnswerField label="Día de cierre" value={closing} onChange={onClosingChange} />
      </Field>

      <Field label="Día de vencimiento" hint={dueBefore ?? undefined}>
        <DayAnswerField label="Día de vencimiento" value={due} onChange={onDueChange} />
      </Field>

      <Card tone="sunken">
        <Text variant="small" tone="secondary">
          {note}
        </Text>
      </Card>
    </Stack>
  );
}
