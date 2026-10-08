import { useRef } from 'react';
import { Pressable, TextInput, View } from 'react-native';
import { formatNumber } from '@/lib/format';
import type { Pesos } from '@domain/money';
import { Text } from '@/ui/primitives';
import { useTheme } from '@/ui/theme';

/**
 * §17 campo 2 · "Monto: teclado abierto; obligatorio, mayor a cero".
 *
 * El teclado se abre solo, y es numérico. Eso es más de la mitad de la promesa
 * de §4.4: "más fácil que una fila de planilla". Un gasto cotidiano tiene que
 * ser monto + categoría + guardar, y si el primer paso exige tocar un campo
 * para que aparezca el teclado, ya perdimos un toque.
 *
 * G-02 · se escriben pesos enteros. No hay coma decimal en el teclado porque
 * no hay centavos en el producto.
 */
export function AmountInput({
  value,
  onChange,
  autoFocus = true,
}: {
  value: Pesos;
  onChange: (next: Pesos) => void;
  autoFocus?: boolean;
}) {
  const theme = useTheme();
  const input = useRef<TextInput>(null);

  function handleChange(raw: string) {
    const digits = raw.replace(/\D/g, '').slice(0, 12);
    onChange(digits === '' ? 0 : Number(digits));
  }

  return (
    <Pressable onPress={() => input.current?.focus()} accessibilityLabel="Monto">
      <View style={{ flexDirection: 'row', alignItems: 'baseline', gap: theme.space['1'] }}>
        <Text variant="display" tone={value > 0 ? 'default' : 'muted'}>
          $
        </Text>

        <TextInput
          ref={input}
          value={value > 0 ? formatNumber(value) : ''}
          onChangeText={handleChange}
          placeholder="0"
          placeholderTextColor={theme.colors.textMuted}
          keyboardType="number-pad"
          autoFocus={autoFocus}
          accessibilityLabel="Monto en pesos"
          style={[
            theme.typography.display,
            {
              color: theme.colors.text,
              fontVariant: ['tabular-nums'],
              minWidth: 120,
              padding: 0,
            },
          ]}
        />
      </View>
    </Pressable>
  );
}
