import { addDays, type IsoDate } from '@domain/calendar';
import { formatDayMonth } from '@/lib/format';

/**
 * Los valores por defecto del formulario Agregar, y cómo se resumen.
 * TS puro: se testea en node.
 */

/**
 * §17 campo 7 · "Medio de pago: Último usado". El del gasto más reciente que
 * tenga medio, si ese medio sigue existiendo (uno archivado no se propone).
 */
export function lastUsedPaymentMethodId(
  movements: readonly { kind: string; date: IsoDate; paymentMethodId: string | null }[],
  methods: readonly { id: string }[],
): string | null {
  const available = new Set(methods.map((method) => method.id));

  const latest = movements
    .filter(
      (movement) =>
        movement.kind === 'expense' &&
        movement.paymentMethodId != null &&
        available.has(movement.paymentMethodId),
    )
    .reduce<{ date: IsoDate; paymentMethodId: string | null } | null>(
      (best, movement) => (best == null || movement.date > best.date ? movement : best),
      null,
    );

  return latest?.paymentMethodId ?? null;
}

/**
 * UX-21 · "Agregar un fijo" desde Perfil abre Agregar con `?fijo=1`: "Se repite
 * cada mes" ya prendido y "Más opciones" abierto, que es donde está.
 */
export function startsAsFixed(param: string | undefined): boolean {
  return param === '1';
}

/**
 * La fila colapsada de "Más opciones" dice lo que tiene elegido: "Hoy",
 * "Ayer · 6 cuotas", "3 oct · se repite cada mes · "Netflix"".
 */
export function moreOptionsSummary(args: {
  date: IsoDate;
  today: IsoDate;
  installmentCount: number | null;
  repeats: boolean;
  description: string;
}): string {
  const when =
    args.date === args.today
      ? 'Hoy'
      : args.date === addDays(args.today, -1)
        ? 'Ayer'
        : formatDayMonth(args.date);

  // Sin cuotas no se dice nada: "en 1 pago" es lenguaje de tarjeta de crédito,
  // y con transferencia o efectivo se leía como si fuera con tarjeta.
  const how = args.repeats
    ? 'se repite cada mes'
    : args.installmentCount != null && args.installmentCount >= 2
      ? `${args.installmentCount} cuotas`
      : null;

  const description = args.description.trim();
  return [when, how, description === '' ? null : `"${description}"`]
    .filter((part) => part != null)
    .join(' · ');
}
