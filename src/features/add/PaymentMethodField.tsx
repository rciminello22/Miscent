import { useMemo } from 'react';
import type { PaymentMethod } from '@domain/types';
import { useCreatePaymentMethod } from '@/features/shared/usePersonalFacts';
import { Text } from '@/ui/primitives';
import { PaymentMethodPicker } from './fields';
import { paymentOptions, type PaymentOption } from './paymentOptions';

/**
 * §17 campo 7 · el selector de medio de pago que usan las pantallas.
 *
 * - Ofrece siempre efectivo, débito, billetera y transferencia, además de las
 *   tarjetas. El que todavía no existe se crea la primera vez que se elige.
 * - Tocar el elegido lo destilda: sin medio es al contado (C-05, G-03). Sin
 *   historial no se preselecciona nada (decidido con Renzo el 11/10).
 *
 * Solo para Estado A: sin cuenta personal no hay medios de pago (A-05).
 */
export function PaymentMethodField({
  methods,
  value,
  onChange,
}: {
  methods: readonly PaymentMethod[];
  value: string | null;
  onChange: (next: string | null) => void;
}) {
  const create = useCreatePaymentMethod();
  const options = useMemo(() => paymentOptions(methods), [methods]);

  async function choose(option: PaymentOption) {
    if (create.isPending) return;
    if (option.methodId != null) {
      onChange(option.methodId === value ? null : option.methodId);
      return;
    }
    try {
      const id = await create.mutateAsync({
        kind: option.kind,
        name: option.name,
        closingDay: null,
        dueDay: null,
      });
      onChange(id);
    } catch {
      // El error queda en `create.error` y se muestra abajo.
    }
  }

  return (
    <>
      <PaymentMethodPicker options={options} value={value} onPress={(option) => void choose(option)} />
      {create.error != null && (
        <Text variant="caption" tone="danger">
          {create.error.message}
        </Text>
      )}
    </>
  );
}
