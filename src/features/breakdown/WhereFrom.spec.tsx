import { expandPersonalOccurrences } from '@domain/occurrences';
import type { PersonalFacts } from '@domain/types';
import { renderWithTheme } from '@/test/render';
import { WhereFrom } from './WhereFrom';

/**
 * Nivel 3 · M18 "¿De dónde sale?".
 *
 * §39 declara el riesgo número uno del producto: que "Sin asignar" se lea como
 * plata disponible. Esta pantalla es su mitigación principal, y la mitigación
 * depende de DOS textos que la spec declara obligatorios:
 *
 *   CA-04 · "explica la fórmula y aclara que no es plata en cuentas"
 *   CA-52 · dice "ingresos registrados que todavía no tienen un gasto o
 *            compromiso registrado asociado"
 *
 * Si alguien reescribe esa aclaración "para que quede más corta", la
 * mitigación se cae y el riesgo vuelve. De ahí que esté testeada palabra por
 * palabra.
 */

const MONTH = '2026-10';

const FACTS: PersonalFacts = {
  userId: 'test',
  paymentMethods: [
    { id: 'debito', kind: 'debit', name: 'Débito', closingDay: null, dueDay: null },
  ],
  movements: [
    {
      id: 'ingreso',
      kind: 'income',
      amount: 1_200_000,
      date: '2026-10-05',
      category: 'sueldo',
      description: null,
      paymentMethodId: null,
      installments: null,
    },
    {
      id: 'super',
      kind: 'expense',
      amount: 320_000,
      date: '2026-10-10',
      category: 'supermercado',
      description: 'Supermercado',
      paymentMethodId: 'debito',
      installments: null,
    },
  ],
  recurrences: [
    {
      id: 'alquiler',
      kind: 'expense',
      amount: 480_000,
      category: 'alquiler',
      dayOfMonth: 1,
      startMonth: '2026-01',
      endMonth: null,
      ownerUserId: 'test',
      spaceId: null,
      paymentMethodId: 'debito',
      payerSlot: null,
      split: null,
    },
  ],
  overrides: [],
  declaredStatements: [],
  spaces: [],
};

const EXPANSION = expandPersonalOccurrences(FACTS, { from: MONTH, to: MONTH });

describe('M18 · "¿De dónde sale?" en Sin asignar', () => {
  it('CA-04 · muestra la fórmula completa, con las tres cifras', async () => {
    const view = await renderWithTheme(
      <WhereFrom target="unassigned" onClose={() => {}} expansion={EXPANSION} month={MONTH} />,
    );

    // Los números de §15: 1.200.000 − 320.000 − 480.000 = 400.000.
    expect(view.getByText('Ingresos registrados')).toBeTruthy();
    // Aparece en la fórmula y en el detalle de ingresos de abajo.
    expect(view.getAllByText('$1.200.000').length).toBeGreaterThan(0);
    expect(view.getByText('Gastado')).toBeTruthy();
    expect(view.getByText('$320.000')).toBeTruthy();
    expect(view.getByText('Comprometido')).toBeTruthy();
    expect(view.getByText('$480.000')).toBeTruthy();
    expect(view.getByText('Sin asignar')).toBeTruthy();
    expect(view.getByText('$400.000')).toBeTruthy();
  });

  it('CA-04 · aclara explícitamente que NO es plata en las cuentas', async () => {
    const view = await renderWithTheme(
      <WhereFrom target="unassigned" onClose={() => {}} expansion={EXPANSION} month={MONTH} />,
    );

    expect(view.getByText(/No es la plata que tenés en tus cuentas/)).toBeTruthy();
  });

  it('CA-52 · usa la definición obligatoria de D1, palabra por palabra', async () => {
    const view = await renderWithTheme(
      <WhereFrom target="unassigned" onClose={() => {}} expansion={EXPANSION} month={MONTH} />,
    );

    expect(
      view.getByText(
        /la parte de tus ingresos registrados que todavía no tiene un gasto o un compromiso registrado asociado/,
      ),
    ).toBeTruthy();
  });

  it('CA-03 · sin ingresos registrados, explica que no se calcula', async () => {
    const sinIngresos = expandPersonalOccurrences(
      { ...FACTS, movements: FACTS.movements.filter((m) => m.kind !== 'income') },
      { from: MONTH, to: MONTH },
    );

    const view = await renderWithTheme(
      <WhereFrom target="unassigned" onClose={() => {}} expansion={sinIngresos} month={MONTH} />,
    );

    expect(view.getByText(/no se calcula/)).toBeTruthy();
  });
});

describe('M18 · "¿De dónde sale?" en Gastado y Comprometido', () => {
  it('Gastado lista los registros que lo componen, con su total', async () => {
    const view = await renderWithTheme(
      <WhereFrom target="spent" onClose={() => {}} expansion={EXPANSION} month={MONTH} />,
    );

    expect(view.getByText('Supermercado')).toBeTruthy();
    expect(view.getByText('Total')).toBeTruthy();
    // En la fila del gasto y en el total: es un solo gasto.
    expect(view.getAllByText('$320.000').length).toBe(2);
  });

  it('N-03 · explica que Gastado es lo registrado como pagado al contado', async () => {
    const view = await renderWithTheme(
      <WhereFrom target="spent" onClose={() => {}} expansion={EXPANSION} month={MONTH} />,
    );

    expect(view.getByText(/pagados al contado/)).toBeTruthy();
  });

  it('N-02 · Comprometido aclara que incluye lo que ya pasó y lo que viene', async () => {
    const view = await renderWithTheme(
      <WhereFrom target="committed" onClose={() => {}} expansion={EXPANSION} month={MONTH} />,
    );

    expect(view.getByText('Alquiler')).toBeTruthy();
    expect(view.getByText(/ya haya pasado la fecha o esté por venir/)).toBeTruthy();
  });

  it('CA-00 · ningún término prohibido en el desglose', async () => {
    const view = await renderWithTheme(
      <WhereFrom target="unassigned" onClose={() => {}} expansion={EXPANSION} month={MONTH} />,
    );

    for (const forbidden of [/disponible/i, /te qued/i, /dinero libre/i, /podés gastar/i]) {
      expect(view.queryByText(forbidden)).toBeNull();
    }
  });
});
