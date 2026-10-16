import { View } from 'react-native';
import { CalendarDays, CircleDashed, Waves } from 'lucide-react-native';
import { Chip } from '@/features/add/fields';
import { Segmented, Text } from '@/ui/primitives';
import { useTheme } from '@/ui/theme';
import { DayNote, DayPicker } from './DayPicker';
import {
  APPROX_PRESETS,
  approxNote,
  chooseDay,
  chooseMode,
  type DayAnswer,
  type DayMode,
} from './dayAnswer';

const OPTIONS: readonly { key: DayMode; label: string; icon: typeof CalendarDays }[] = [
  { key: 'exact', label: 'Sé el día', icon: CalendarDays },
  { key: 'approx', label: 'Más o menos', icon: Waves },
  { key: 'unknown', label: 'No sé', icon: CircleDashed },
];

/**
 * T-02 · T-05 · tres respuestas honestas para un día: lo sé, más o menos, no lo
 * sé. El mismo selector para el cierre y el vencimiento de una tarjeta y el día
 * de cobro de un ingreso.
 *
 *   Sé el día    abre los días (el selector de siempre)
 *   Más o menos  Principio (2), Mediados (15) o Fin de mes (28), marcado aproximado
 *   No sé        no pide nada más y no ofrece un día "por las dudas"
 *
 * Controlado y sin respuesta de antemano: nadie queda con un día que no eligió.
 * La lógica de qué se guarda vive en `dayAnswer.ts`.
 */
export function DayAnswerField({
  label,
  value,
  onChange,
  unknownHelp,
}: {
  /** Qué día se pregunta, para el lector de pantalla. */
  label: string;
  value: DayAnswer;
  onChange: (next: DayAnswer) => void;
  /** Lo que se dice con "No sé". */
  unknownHelp?: string;
}) {
  const theme = useTheme();
  const note = value.mode === 'approx' ? approxNote(value.day) : null;

  return (
    <View style={{ gap: theme.space['3'] }}>
      <Segmented
        label={label}
        options={OPTIONS}
        value={value.mode}
        onChange={(mode) => onChange(chooseMode(value, mode))}
      />

      {value.mode === 'exact' && (
        <View style={{ gap: theme.space['2'] }}>
          <DayPicker value={value.day} onChange={(day) => onChange(chooseDay(value, day ?? 1))} />
          <DayNote day={value.day} />
        </View>
      )}

      {value.mode === 'approx' && (
        <View style={{ gap: theme.space['2'] }}>
          <View style={{ flexDirection: 'row', gap: theme.space['2'], flexWrap: 'wrap' }}>
            {APPROX_PRESETS.map((preset) => (
              <Chip
                key={preset.day}
                label={preset.label}
                selected={value.day === preset.day}
                onPress={() => onChange(chooseDay(value, preset.day))}
              />
            ))}
          </View>
          {note != null && (
            <Text variant="caption" tone="muted">
              {note}
            </Text>
          )}
        </View>
      )}

      {value.mode === 'unknown' && unknownHelp != null && (
        <Text variant="caption" tone="muted">
          {unknownHelp}
        </Text>
      )}
    </View>
  );
}
