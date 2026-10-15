import type { IsoDate } from '@domain/calendar';
import { formatLongDate } from '@/lib/format';
import { PastDateField } from '@/features/add/DateField';
import { Field } from '@/features/add/fields';
import { Text } from '@/ui/primitives';
import type { DateEditability } from './editForm';

/**
 * UX-18 · la fecha en la edición de un gasto.
 *
 * Editable: el mismo selector de Agregar (Hoy, Ayer, Otra fecha, sin fechas
 * futuras). Solo lectura: la fecha como texto y el motivo, para que no parezca
 * un campo roto (ver `dateEditability`).
 */
export function DateEditField({
  value,
  onChange,
  today,
  editability,
}: {
  value: IsoDate;
  onChange: (next: IsoDate) => void;
  today: IsoDate;
  editability: DateEditability;
}) {
  if (editability.editable) {
    return (
      <Field label="Fecha">
        <PastDateField value={value} onChange={onChange} today={today} />
      </Field>
    );
  }

  return (
    <Field label="Fecha" hint={editability.reason}>
      <Text variant="body">{formatLongDate(value)}</Text>
    </Field>
  );
}
