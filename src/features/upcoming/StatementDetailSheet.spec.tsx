import { expandPersonalOccurrences } from '@domain/occurrences';
import type { PersonalFacts } from '@domain/types';
import { calculateUpcomingPayments, type UpcomingPayment } from '@domain/upcoming';
import { renderWithTheme, fireEvent } from '@/test/render';
import { StatementDetailSheet } from './StatementDetailSheet';
import { UpcomingPaymentRow } from './UpcomingPaymentRow';

/**
 * Nivel 3 · UX-08 · §23.2 · el detalle del resumen estimado.
 *
 * Tres cosas que no se pueden perder: el rótulo "Estimado según lo que
 * registraste" (N-10), que el total sea el de la fila (§7.3: lente "lo que vas
 * a pagar") y que la parte del otro se diga con su nombre.
 */

const VISA = {
  id: 'visa-uuid',
  kind: 'card' as const,
  name: 'Visa Galicia',
  closingDay: 25,
  dueDay: 5,
};

const FACTS: PersonalFacts = {
  userId: 'test',
  paymentMethods: [VISA],
  movements: [
    {
      id: 'super',
      kind: 'expense',
      amount: 70_000,
      date: '2026-10-20',
      category: 'supermercado',
      description: 'Supermercado',
      paymentMethodId: VISA.id,
      installments: null,
    },
    {
      id: 'zapatillas',
      kind: 'expense',
      amount: 150_000,
      date: '2026-10-20',
      category: 'ropa',
      description: 'Zapatillas',
      paymentMethodId: VISA.id,
      installments: { count: 3, firstMonth: '2026-11', impactDay: 5, approximate: false },
    },
  ],
  recurrences: [],
  overrides: [],
  declaredStatements: [],
  spaces: [],
};

function visaStatement(): UpcomingPayment {
  const expansion = expandPersonalOccurrences(FACTS, { from: '2026-10', to: '2026-12' });
  return calculateUpcomingPayments(expansion, '2026-10-21', FACTS.paymentMethods).find(
    (payment) => payment.kind === 'card-statement' && payment.month === '2026-11',
  )!;
}

describe('UX-08 · StatementDetailSheet', () => {
  it('título con tarjeta y vencimiento, rótulo de estimado, compras y cuotas', async () => {
    const payment = visaStatement();
    expect(payment.amount).toBe(120_000);

    const view = await renderWithTheme(
      <StatementDetailSheet payment={payment} onClose={() => {}} />,
    );

    expect(view.getByText('Visa Galicia · vence 5 nov')).toBeTruthy();
    expect(view.getByText('Estimado según lo que registraste')).toBeTruthy();
    expect(view.getByText('Compras')).toBeTruthy();
    expect(view.getByText('Cuotas')).toBeTruthy();
    expect(view.getByText('Supermercado')).toBeTruthy();
    expect(view.getByText('Zapatillas')).toBeTruthy();
    expect(view.getByText('cuota 1 de 3')).toBeTruthy();
  });

  it('el total es el de la fila', async () => {
    const payment = visaStatement();
    const view = await renderWithTheme(
      <StatementDetailSheet payment={payment} onClose={() => {}} />,
    );

    expect(view.getByText('Total')).toBeTruthy();
    // El total y la línea de la compra al contado: $70.000 una vez; el total, $120.000.
    expect(view.getAllByText('$120.000').length).toBeGreaterThan(0);
  });

  it('§7.3 · "incluye $X de Martina" cuando hay parte de otro', async () => {
    const payment: UpcomingPayment = {
      ...visaStatement(),
      items: visaStatement().items.map((item, index) =>
        index === 0 ? { ...item, otherShare: 35_000, otherMemberName: 'Martina' } : item,
      ),
    };
    const view = await renderWithTheme(
      <StatementDetailSheet payment={payment} onClose={() => {}} />,
    );

    expect(view.getAllByText(/incluye\s*\$35\.000\s*de Martina/).length).toBeGreaterThan(0);
  });

  it('T-05 · sin día conocido avisa "Fechas aproximadas"', async () => {
    const payment: UpcomingPayment = { ...visaStatement(), date: null, approximate: true };
    const view = await renderWithTheme(
      <StatementDetailSheet payment={payment} onClose={() => {}} />,
    );

    expect(view.getByText('Fechas aproximadas')).toBeTruthy();
    expect(view.getByText('Visa Galicia · se paga en noviembre')).toBeTruthy();
  });

  it('sin pago elegido no muestra nada', async () => {
    const view = await renderWithTheme(
      <StatementDetailSheet payment={null} onClose={() => {}} />,
    );

    expect(view.queryByText('Estimado según lo que registraste')).toBeNull();
  });

  it('CA-00 · ningún término prohibido en el detalle', async () => {
    const view = await renderWithTheme(
      <StatementDetailSheet payment={visaStatement()} onClose={() => {}} />,
    );

    for (const forbidden of [/disponible/i, /te qued/i, /\bsaldo\b/i, /\bpagado\b/i, /corresponde/i]) {
      expect(view.queryByText(forbidden)).toBeNull();
    }
  });
});

describe('UX-08 · UpcomingPaymentRow tocable', () => {
  it('con onPress es un botón y se puede tocar', async () => {
    const onPress = jest.fn();
    const view = await renderWithTheme(
      <UpcomingPaymentRow payment={visaStatement()} onPress={onPress} />,
    );

    const button = view.getByRole('button');
    await fireEvent.press(button);

    expect(onPress).toHaveBeenCalledTimes(1);
    // El texto de la fila no cambia: el rótulo de estimado sigue ahí.
    expect(view.getByText('Estimado según lo que registraste')).toBeTruthy();
  });

  it('sin onPress es informativa: no es un botón', async () => {
    const view = await renderWithTheme(
      <UpcomingPaymentRow payment={visaStatement()} />,
    );

    expect(view.queryByRole('button')).toBeNull();
  });
});
