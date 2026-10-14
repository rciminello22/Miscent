import { describe, it, expect } from 'vitest';
import {
  MARTINA,
  RENZO,
  memberPayment,
  membership,
  movement,
  paidWith,
  personalFacts,
  personalRecurrence,
  sharedExpense,
  sharedRecurrence,
  spaceFacts,
  visa,
} from '@domain/__tests__/fixtures';
import { buildExportCsv } from './exportCsv';

/**
 * Should 4 · "exportar mis datos (CSV)". Lo que es del usuario: lo personal,
 * y de cada espacio lo que los dos ven más SU medio de pago (nunca el del
 * otro, C-05).
 */
const label = (category: string) => category.charAt(0).toUpperCase() + category.slice(1);

function rows(csv: string) {
  return csv.replace(/^﻿/, '').trim().split('\r\n').map((line) => line.split(';'));
}

describe('exportar mis datos', () => {
  const casa = spaceFacts({
    expenses: [
      sharedExpense({ id: 'super', amount: 100_000, date: '2026-10-05', payerSlot: RENZO, description: 'Super' }),
      sharedExpense({ id: 'luz', amount: 40_000, date: '2026-10-06', payerSlot: MARTINA }),
    ],
    recurrences: [sharedRecurrence({ amount: 500_000, dayOfMonth: 1, startMonth: '2026-01', payerSlot: RENZO })],
    payments: [memberPayment({ fromSlot: MARTINA, toSlot: RENZO, amount: 20_000, date: '2026-10-10' })],
  });
  const facts = personalFacts({
    movements: [movement({ amount: 80_000, date: '2026-10-20', paymentMethodId: visa.id, description: 'Zapatillas' })],
    recurrences: [personalRecurrence({ kind: 'income', amount: 1_200_000, dayOfMonth: 5, startMonth: '2026-01', category: 'sueldo' })],
    spaces: [membership({ facts: casa, mySlot: RENZO, paymentDetails: [paidWith('super', RENZO, visa.id)] })],
  });
  const csv = buildExportCsv(facts, { categoryLabel: label });
  const table = rows(csv);

  it('empieza con BOM y encabezado, separado por ";" (Excel en español)', () => {
    expect(csv.startsWith('﻿')).toBe(true);
    expect(table[0]).toEqual([
      'Tipo', 'Fecha', 'Descripción', 'Categoría', 'Monto', 'Tu parte', 'Espacio', 'Pagó', 'Medio de pago', 'Cuotas', 'Notas',
    ]);
  });

  it('un gasto personal, con su medio', () => {
    expect(table).toContainEqual(['Gasto', '2026-10-20', 'Zapatillas', 'Otros', '80000', '80000', '', '', 'Visa Galicia', '', '']);
  });

  it('un gasto compartido que pagué: total, mi parte y MI medio', () => {
    expect(table).toContainEqual(['Gasto compartido', '2026-10-05', 'Super', 'Supermercado', '100000', '50000', 'Casa', 'Renzo', 'Visa Galicia', '', '']);
  });

  it('C-05 · uno que pagó el otro: sin medio', () => {
    const row = table.find((line) => line[1] === '2026-10-06');
    expect(row?.[7]).toBe('Martina');
    expect(row?.[8]).toBe('');
  });

  it('los fijos, con desde cuándo y qué día', () => {
    expect(table.find((line) => line[0] === 'Ingreso fijo')?.[10]).toBe('día 5');
    expect(table.find((line) => line[0] === 'Fijo compartido')?.[5]).toBe('250000');
  });

  it('un pago entre miembros', () => {
    expect(table).toContainEqual(['Pago entre miembros', '2026-10-10', '', '', '20000', '', 'Casa', 'Martina', '', '', 'a Renzo']);
  });

  it('las tarjetas, sin número (nunca lo guardamos)', () => {
    expect(table.find((line) => line[0] === 'Tarjeta')?.[10]).toBe('cierre 25 · vence 5');
  });

  it('escapa lo que rompería una columna', () => {
    const tricky = buildExportCsv(
      personalFacts({ movements: [movement({ amount: 1_000, date: '2026-10-01', description: 'Pan; "rico"' })] }),
      { categoryLabel: label },
    );
    expect(tricky).toContain('"Pan; ""rico"""');
  });
});
