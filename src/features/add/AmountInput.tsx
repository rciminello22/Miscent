import { useRef, useState } from 'react';
import { Pressable, TextInput, View } from 'react-native';
import { formatNumber, formatPesos } from '@/lib/format';
import { MAX_AMOUNT, typeAmount, type Pesos } from '@domain/money';
import { Text } from '@/ui/primitives';
import { useTheme } from '@/ui/theme';

/** La línea que explica por qué un dígito de más no entra. */
export const AMOUNT_LIMIT_NOTICE = `El monto máximo es ${formatPesos(MAX_AMOUNT)}`;

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
 *
 * Tope de MAX_AMOUNT: un dígito de más se ignora (no se borra lo escrito) y
 * aparece el aviso bajo el monto. Borrar sigue andando.
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
  const [capped, setCapped] = useState(false);

  function handleChange(raw: string) {
    const typed = typeAmount(raw, value);
    setCapped(typed.capped);
    onChange(typed.amount);
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
              flexShrink: 1,
              padding: 0,
            },
          ]}
        />
      </View>

      {capped && (
        <Text
          variant="caption"
          tone="secondary"
          accessibilityLiveRegion="polite"
          style={{ marginTop: theme.space['1'] }}
        >
          {AMOUNT_LIMIT_NOTICE}
        </Text>
      )}
    </Pressable>
  );
}
