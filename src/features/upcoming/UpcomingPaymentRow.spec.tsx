import { expandPersonalOccurrences } from '@domain/occurrences';
import { calculateUpcomingPayments } from '@domain/upcoming';
import type { PersonalFacts } from '@domain/types';
import { renderWithTheme } from '@/test/render';
import { UpcomingPaymentRow } from './UpcomingPaymentRow';

/**
 * Nivel 3 · los textos que §23.2 declara obligatorios en Próximos pagos.
 *
 * Los tres son fáciles de olvidar y los tres tienen consecuencias:
 *   sin "Estimado según lo que registraste", el usuario compara con el resumen
 *     real del banco, no coincide y deja de confiar (§39)
 *   sin "incluye $X de Martina", lee el total como si fuera todo suyo y las
 *     dos lentes de §7.3 se mezclan
 *   con "Pagado" en vez de "Ya pasó", la app afirma algo que no verificó (G-06)
 */

const VISA = {
  id: 'visa',
  kind: 'card' as const,
  name: 'Visa Galicia',
  closingDay: 25,
  dueDay: 5,
  closingApprox: false,
  dueApprox: false,
};

function cardStatementPayment(args: { today: string; purchaseDate: string }) {
  const facts: PersonalFacts = {
    userId: 'test',
    paymentMethods: [VISA],
    movements: [
      {
        id: 'compra',
        kind: 'expense',
        amount: 120_000,
        date: args.purchaseDate,
        category: 'otros',
        description: null,
        paymentMethodId: VISA.id,
        installments: null,
      },
    ],
    recurrences: [],
    overrides: [],
    declaredStatements: [],
    spaces: [],
  };

  const expansion = expandPersonalOccurrences(facts, { from: '2026-10', to: '2026-12' });
  return calculateUpcomingPayments(expansion, args.today, facts.paymentMethods)[0]!;
}

describe('§23.2 · UpcomingPaymentRow', () => {
  it('N-10 / CA-35 · todo resumen de tarjeta se rotula "resumen estimado" en su fila; la frase completa va una vez por bloque', async () => {
    // Caso B de §29.1: compra del 20/10 con Visa (cierre 25, vence 5).
    const payment = cardStatementPayment({ today: '2026-10-21', purchaseDate: '2026-10-20' });

    expect(payment.isEstimate).toBe(true);
    expect(payment.date).toBe('2026-11-05');

    const view = await renderWithTheme(<UpcomingPaymentRow payment={payment} />);

    expect(view.getByText('Visa Galicia · resumen estimado')).toBeTruthy();
    // La frase completa no se repite en cada fila: va al pie de la lista (futureView).
    expect(view.queryByText('Estimado según lo que registraste')).toBeNull();
    expect(view.getByText('5 nov')).toBeTruthy();
    expect(view.getByText('$120.000')).toBeTruthy();
  });

  it('CA-37 / CA-45 · un pago cuya fecha llegó dice "Ya pasó", NUNCA "Pagado"', async () => {
    const payment = cardStatementPayment({ today: '2026-11-10', purchaseDate: '2026-10-20' });

    expect(payment.hasPassed).toBe(true);

    const view = await renderWithTheme(<UpcomingPaymentRow payment={payment} />);

    expect(view.getByText('Ya pasó')).toBeTruthy();
    // G-06 · la app no verifica pagos, así que no puede decir esto.
    expect(view.queryByText(/pagado/i)).toBeNull();
  });

  it('§7.3 · cuando el pago lleva la parte de otro, se aclara con su nombre', async () => {
    // Caso G de §29.1: el resumen incluye la parte de Martina.
    const payment = {
      ...cardStatementPayment({ today: '2026-10-21', purchaseDate: '2026-10-20' }),
      amount: 100_000,
      includesOtherShare: 50_000,
      otherMemberName: 'Martina',
    };

    const view = await renderWithTheme(<UpcomingPaymentRow payment={payment} />);

    // La aclaración es un solo texto con el monto embebido, así que se busca
    // completa: lo que importa es que se lea como una frase, no en pedazos.
    expect(view.getByText(/incluye\s*\$50\.000\s*de Martina/)).toBeTruthy();
    // Y el monto principal es el TOTAL que paga el usuario, no su parte (§7.3).
    expect(view.getByText('$100.000')).toBeTruthy();
  });

  it('T-05 · sin día conocido muestra el MES y avisa que las fechas son aproximadas', async () => {
    const facts: PersonalFacts = {
      userId: 'test',
      // Una tarjeta sin cierre ni vencimiento: modo aproximado.
      paymentMethods: [
        {
          id: 'tarjeta',
          kind: 'card',
          name: 'Tarjeta',
          closingDay: null,
          dueDay: null,
          closingApprox: false,
          dueApprox: false,
        },
      ],
      movements: [
        {
          id: 'compra',
          kind: 'expense',
          amount: 80_000,
          date: '2026-10-20',
          category: 'otros',
          description: null,
          paymentMethodId: 'tarjeta',
          installments: null,
        },
      ],
      recurrences: [],
      overrides: [],
      declaredStatements: [],
      spaces: [],
    };

    const expansion = expandPersonalOccurrences(facts, { from: '2026-10', to: '2026-12' });
    const payment = calculateUpcomingPayments(expansion, '2026-10-21')[0]!;

    // T-05 · nunca se inventa un día.
    expect(payment.date).toBeNull();
    expect(payment.approximate).toBe(true);

    const view = await renderWithTheme(<UpcomingPaymentRow payment={payment} />);

    expect(view.getByText('noviembre')).toBeTruthy();
    // "Fechas aproximadas" se dice UNA vez por pantalla (al pie de la lista), no en cada fila.
    expect(view.queryByText('Fechas aproximadas')).toBeNull();
    expect(view.queryByText('aprox.')).toBeNull();
  });

  it('T-02 · una fecha de "Más o menos" se muestra "~15 nov" con la marca "aprox."', async () => {
    const payment = {
      ...cardStatementPayment({ today: '2026-10-21', purchaseDate: '2026-10-20' }),
      date: '2026-11-15',
      dateApprox: true,
    };

    const view = await renderWithTheme(<UpcomingPaymentRow payment={payment} />);

    expect(view.getByText('~15 nov')).toBeTruthy();
    expect(view.getByText('aprox.')).toBeTruthy();
  });

  it('CA-00 · ningún término prohibido en una fila de pago', async () => {
    const payment = cardStatementPayment({ today: '2026-10-21', purchaseDate: '2026-10-20' });
    const view = await renderWithTheme(<UpcomingPaymentRow payment={payment} />);

    for (const forbidden of [/disponible/i, /te qued/i, /\bsaldo\b/i, /\bpagado\b/i]) {
      expect(view.queryByText(forbidden)).toBeNull();
    }
  });
});
