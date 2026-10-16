/**
 * Should 4 · "exportar mis datos (CSV)". §28 lo ofrece también antes de
 * eliminar la cuenta.
 *
 * Una sola tabla con una columna "Tipo": se abre en Excel o Sheets y se
 * filtra. Lo que es del usuario y nada más:
 *   - lo personal: movimientos, fijos y tarjetas (nombre y días; el número
 *     nunca se guardó, T-01)
 *   - de cada espacio, lo que los dos ven, más SU medio de pago. El del otro
 *     no lo conoce nadie más que el otro (C-05)
 *
 * Separado por ";" y con BOM: así lo abre bien Excel en español, sin partir
 * columnas ni romper los acentos. Montos enteros, sin separador de miles.
 *
 * TS puro: se testea en node. Escribir el archivo y compartirlo es de la
 * pantalla.
 */

import { resolveShares, shareOf } from '@domain/split';
import type { PersonalFacts, Slot } from '@domain/types';

const HEADER = [
  'Tipo', 'Fecha', 'Descripción', 'Categoría', 'Monto', 'Tu parte', 'Espacio', 'Pagó', 'Medio de pago', 'Cuotas', 'Notas',
];

type Row = [string, string, string, string, string, string, string, string, string, string, string];

function cell(value: string): string {
  return /[;"\r\n]/.test(value) ? `"${value.replace(/"/g, '""')}"` : value;
}

export function buildExportCsv(
  facts: PersonalFacts,
  options: { categoryLabel: (category: string) => string },
): string {
  const { categoryLabel } = options;
  const methodName = (id: string | null | undefined) =>
    facts.paymentMethods.find((method) => method.id === id)?.name ?? '';
  const rows: Row[] = [];

  /* ── Personal ─────────────────────────────────────────────────────────── */

  for (const movement of facts.movements) {
    const amount = String(movement.amount);
    rows.push([
      movement.kind === 'income' ? 'Ingreso' : 'Gasto',
      movement.date,
      movement.description ?? '',
      categoryLabel(movement.category),
      amount,
      amount,
      '',
      '',
      methodName(movement.paymentMethodId),
      movement.installments != null ? String(movement.installments.count) : '',
      '',
    ]);
  }

  for (const recurrence of facts.recurrences) {
    const amount = String(recurrence.amount);
    rows.push([
      recurrence.kind === 'income' ? 'Ingreso fijo' : 'Fijo',
      recurrence.startMonth,
      recurrence.description ?? '',
      categoryLabel(recurrence.category),
      amount,
      amount,
      '',
      '',
      methodName(recurrence.paymentMethodId),
      '',
      [
        recurrence.dayOfMonth == null
          ? null
          : `día ${recurrence.dayApprox ? '~' : ''}${recurrence.dayOfMonth}`,
        recurrence.endMonth != null ? `hasta ${recurrence.endMonth}` : null,
      ]
        .filter((part) => part != null)
        .join(' · '),
    ]);
  }

  for (const method of facts.paymentMethods) {
    if (method.kind !== 'card') continue;
    rows.push([
      'Tarjeta',
      '',
      method.name,
      '',
      '',
      '',
      '',
      '',
      '',
      '',
      [
        method.closingDay != null ? `cierre ${method.closingDay}` : 'cierre sin dato',
        method.dueDay != null ? `vence ${method.dueDay}` : 'vencimiento sin dato',
      ].join(' · '),
    ]);
  }

  /* ── Espacios ─────────────────────────────────────────────────────────── */

  for (const membership of facts.spaces) {
    const { facts: space, mySlot } = membership;
    const spaceName = space.space.name;
    const nameOf = (slot: Slot) => space.space.members.find((member) => member.slot === slot)?.displayName ?? '';
    // C-05 · el medio solo si lo pagué yo, y solo el mío.
    const myMethod = (sourceId: string, payerSlot: Slot | null) =>
      payerSlot === mySlot
        ? methodName(
            membership.paymentDetails.find((detail) => detail.sourceId === sourceId && detail.slot === mySlot)
              ?.paymentMethodId,
          )
        : '';

    for (const expense of space.expenses) {
      rows.push([
        'Gasto compartido',
        expense.date,
        expense.description ?? '',
        categoryLabel(expense.category),
        String(expense.amount),
        String(shareOf(resolveShares(expense.amount, expense.split), mySlot)),
        spaceName,
        nameOf(expense.payerSlot),
        myMethod(expense.id, expense.payerSlot),
        expense.installments != null ? String(expense.installments.count) : '',
        '',
      ]);
    }

    for (const recurrence of space.recurrences) {
      const split = recurrence.split ?? { mode: 'even' as const };
      rows.push([
        'Fijo compartido',
        recurrence.startMonth,
        recurrence.description ?? '',
        categoryLabel(recurrence.category),
        String(recurrence.amount),
        String(shareOf(resolveShares(recurrence.amount, split), mySlot)),
        spaceName,
        recurrence.payerSlot != null ? nameOf(recurrence.payerSlot) : '',
        myMethod(recurrence.id, recurrence.payerSlot),
        '',
        [`día ${recurrence.dayOfMonth}`, recurrence.endMonth != null ? `hasta ${recurrence.endMonth}` : null]
          .filter((part) => part != null)
          .join(' · '),
      ]);
    }

    for (const payment of space.payments) {
      rows.push([
        'Pago entre miembros',
        payment.date,
        '',
        '',
        String(payment.amount),
        '',
        spaceName,
        nameOf(payment.fromSlot),
        '',
        '',
        `a ${nameOf(payment.toSlot)}`,
      ]);
    }
  }

  const lines = [HEADER, ...rows].map((row) => row.map(cell).join(';'));
  return `﻿${lines.join('\r\n')}\r\n`;
}
