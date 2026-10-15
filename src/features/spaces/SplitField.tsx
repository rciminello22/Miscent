import { View } from 'react-native';
import type { ComponentProps } from 'react';
import { Field } from '@/features/add/fields';
import { SplitPicker } from './SplitPicker';

/**
 * §17 campo 6 · "¿Cómo lo reparten?" con su rótulo.
 *
 * Depende del destino, no del monto: aparecer al tipear el primer dígito
 * movía todo lo que sigue (UX-15). Mientras no hay monto, el campo ocupa su
 * lugar pero está apagado: con total 0 las partes no se pueden escribir
 * (se recortan al total) y un reparto personalizado quedaría trabado.
 */
export function SplitField(props: ComponentProps<typeof SplitPicker>) {
  const enabled = props.total > 0;

  return (
    <Field label="¿Cómo lo reparten?">
      <View pointerEvents={enabled ? 'auto' : 'none'} style={{ opacity: enabled ? 1 : 0.45 }}>
        <SplitPicker {...props} />
      </View>
    </Field>
  );
}
