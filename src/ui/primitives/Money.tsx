import { useEffect, useRef, useState } from 'react';
import { formatPesos, type PesosSign } from '@/lib/format';
import type { Pesos } from '@domain/money';
import { fitPropsFor } from '../amountFit';
import { duration } from '../motion';
import { useTheme } from '../theme';
import { Text, type TextProps } from './Text';

export type MoneyProps = Omit<TextProps, 'children' | 'tabular'> & {
  amount: Pesos;
  /**
   * El signo de la cifra:
   *   - `out` · un movimiento que sale: "−$4.500", en texto normal (nunca rojo)
   *   - `in`  · un movimiento que entra: "+$85.000", en `brand`: solo lo que
   *     entra lleva color
   *   - `never` oculta el signo: el texto de alrededor ya explica el sentido (N-08)
   *   - `auto` (o sin pasar) · solo el negativo lleva "−"
   * `out` e `in` son para los movimientos de plata (filas y detalles); los
   * totales, el saldo y los compromisos no los llevan.
   */
  sign?: PesosSign | null;
  /**
   * Cuenta desde el valor anterior hasta el nuevo.
   *
   * No es decoración: es la respuesta a "¿qué le hizo mi gasto a este número?".
   * Por eso solo se activa donde esa pregunta existe — el radar al guardar, la
   * vista previa de cuotas, el saldo al registrar un pago— y nunca en una
   * lista, donde no habría nada que explicar.
   */
  animate?: boolean;
};

export function Money({ amount, sign, animate = false, ...rest }: MoneyProps) {
  const theme = useTheme();
  const [shown, setShown] = useState(amount);
  const previous = useRef(amount);

  useEffect(() => {
    if (!animate || previous.current === amount) {
      previous.current = amount;
      setShown(amount);
      return;
    }

    const from = previous.current;
    const delta = amount - from;
    const startedAt = Date.now();
    previous.current = amount;

    let frame: ReturnType<typeof setTimeout>;

    const tick = () => {
      const elapsed = Date.now() - startedAt;
      const progress = Math.min(elapsed / duration.base, 1);
      // Misma curva de salida que el resto del movimiento: arranca rápido y frena.
      const eased = 1 - Math.pow(1 - progress, 3);
      setShown(Math.round(from + delta * eased));

      if (progress < 1) frame = setTimeout(tick, 16);
    };

    tick();
    return () => clearTimeout(frame);
  }, [amount, animate]);

  // Montos · 11 · las cifras grandes entran en una línea y se achican solas
  // (hasta 20pt); `flexShrink` les da el ancho al que ajustarse dentro de una fila.
  const variant = rest.variant ?? 'body';
  const fit = fitPropsFor(variant, theme.typography[variant].fontSize);

  return (
    <Text
      {...rest}
      {...fit}
      // Solo lo que entra lleva color: el signo `in` pone `brand`.
      tone={sign === 'in' ? 'brand' : rest.tone}
      style={fit == null ? rest.style : [{ flexShrink: 1 }, rest.style]}
      tabular
    >
      {formatPesos(shown, { sign: sign ?? 'auto' })}
    </Text>
  );
}
