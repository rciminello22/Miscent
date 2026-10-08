import type { PersonalFacts } from '@domain/types';

/**
 * ⚠️ TEMPORAL · Fase 3.
 *
 * Hechos de muestra para ver las pantallas con forma real antes de que exista
 * la capa de lectura (Fase 4). Son los mismos números del Caso A de §29.1, así
 * que lo que se ve en pantalla tiene que coincidir con el test:
 *
 *   ingresos registrados $1.200.000 · gastado $320.000 · comprometido $480.000
 *   → sin asignar $400.000
 *
 * Se borra en la Fase 4, cuando las pantallas lean los hechos del usuario.
 */

const VISA = 'visa-demo';

export const demoPersonalFacts: PersonalFacts = {
  userId: 'demo',
  paymentMethods: [
    { id: 'debito-demo', kind: 'debit', name: 'Débito', closingDay: null, dueDay: null },
    { id: VISA, kind: 'card', name: 'Visa Galicia', closingDay: 25, dueDay: 5 },
  ],
  movements: [
    {
      id: 'sueldo',
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
      amount: 220_000,
      date: '2026-10-04',
      category: 'supermercado',
      description: 'Supermercado',
      paymentMethodId: 'debito-demo',
      installments: null,
    },
    {
      id: 'gastronomia',
      kind: 'expense',
      amount: 100_000,
      date: '2026-10-06',
      category: 'gastronomia',
      description: null,
      paymentMethodId: 'debito-demo',
      installments: null,
    },
    // Una compra con tarjeta de este mes: no suma a Gastado, se paga después
    // (CA-53). Alimenta el bloque "Con tarjeta este mes" de §15.
    {
      id: 'ropa',
      kind: 'expense',
      amount: 95_000,
      date: '2026-10-07',
      category: 'ropa',
      description: null,
      paymentMethodId: VISA,
      installments: null,
    },
  ],
  recurrences: [
    {
      id: 'alquiler',
      kind: 'expense',
      amount: 300_000,
      category: 'alquiler',
      dayOfMonth: 5,
      startMonth: '2026-01',
      endMonth: null,
      ownerUserId: 'demo',
      spaceId: null,
      paymentMethodId: 'debito-demo',
      payerSlot: null,
      split: null,
    },
    {
      id: 'servicios',
      kind: 'expense',
      amount: 100_000,
      category: 'servicios',
      dayOfMonth: 12,
      startMonth: '2026-01',
      endMonth: null,
      ownerUserId: 'demo',
      spaceId: null,
      paymentMethodId: 'debito-demo',
      payerSlot: null,
      split: null,
    },
    {
      id: 'internet',
      kind: 'expense',
      amount: 30_000,
      category: 'internet',
      dayOfMonth: 15,
      startMonth: '2026-01',
      endMonth: null,
      ownerUserId: 'demo',
      spaceId: null,
      paymentMethodId: 'debito-demo',
      payerSlot: null,
      split: null,
    },
    {
      id: 'gimnasio',
      kind: 'expense',
      amount: 50_000,
      category: 'gimnasio',
      dayOfMonth: 20,
      startMonth: '2026-01',
      endMonth: null,
      ownerUserId: 'demo',
      spaceId: null,
      paymentMethodId: 'debito-demo',
      payerSlot: null,
      split: null,
    },
  ],
  overrides: [],
  declaredStatements: [],
  spaces: [],
};
