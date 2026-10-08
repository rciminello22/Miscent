import { useEffect, useRef, useState } from 'react';
import { formatPesos } from '@/lib/format';
import type { Pesos } from '@domain/money';
import { duration } from '../motion';
import { Text, type TextProps } from './Text';

export type MoneyProps = Omit<TextProps, 'children' | 'tabular'> & {
  amount: Pesos;
  /** `never` oculta el signo: el texto de alrededor ya explica el sentido (N-08). */
  sign?: 'auto' | 'never';
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

export function Money({ amount, sign = 'auto', animate = false, ...rest }: MoneyProps) {
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

  return (
    <Text {...rest} tabular>
      {formatPesos(shown, { sign })}
    </Text>
  );
}
