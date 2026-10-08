import { ScrollView } from 'react-native';
import { Chip } from '@/features/add/fields';
import { useTheme } from '@/ui/theme';

/**
 * Un número chico, elegido de una fila en vez de escrito.
 *
 * Para "vas por la cuota 3 de 6", abrir el teclado numérico y volver a
 * cerrarlo cuesta más que tocar un chip. Y el rango real es corto: nadie tiene
 * una compra en 40 cuotas.
 */
export function NumberField({
  value,
  onChange,
  max = 24,
  from = 1,
}: {
  value: number | null;
  onChange: (next: number | null) => void;
  max?: number;
  from?: number;
}) {
  const theme = useTheme();
  const numbers = Array.from({ length: max - from + 1 }, (_, index) => from + index);

  return (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      contentContainerStyle={{ gap: theme.space['2'], paddingRight: theme.space['5'] }}
    >
      {numbers.map((number) => (
        <Chip
          key={number}
          label={`${number}`}
          selected={value === number}
          onPress={() => onChange(value === number ? null : number)}
        />
      ))}
    </ScrollView>
  );
}
