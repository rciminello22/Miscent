/**
 * Integración de los repositorios con la base REAL de Supabase local (0022).
 *
 * Las funciones nuevas se llaman con `rpcWithNulls`, sin tipos generados: un
 * parámetro mal escrito solo lo caza la base. Por eso esto corre el código de
 * la app de punta a punta, como el usuario: con sesión, con la anon key y con
 * la RLS de siempre.
 *
 * Solo corre con `npm run test:integracion` (Supabase local, con Docker). En
 * `npm run test` se saltea: no hay variables de entorno.
 */

import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import { afterAll, beforeAll, describe, expect, it, vi } from 'vitest';
import { planExistingInstallments } from '@domain/installments';
import { fitSplitToTotal } from '@domain/split';
import type { PaymentMethod } from '@domain/types';
import type { Database } from '../database.types';
import { newId } from '../ids';
import { toPaymentMethod, toPersonalMovement, toSharedExpense } from '../mappers';

const URL = process.env.SUPABASE_LOCAL_URL;
const ANON = process.env.SUPABASE_LOCAL_ANON_KEY;
const SERVICE = process.env.SUPABASE_LOCAL_SERVICE_KEY;
const enabled = URL != null && ANON != null && SERVICE != null;

// El cliente de la app, apuntado a la base local.
vi.mock('../supabase', () => ({
  supabase: createClient<Database>(
    process.env.SUPABASE_LOCAL_URL ?? 'http://127.0.0.1:1',
    process.env.SUPABASE_LOCAL_ANON_KEY ?? 'x',
    { auth: { persistSession: false, autoRefreshToken: false } },
  ),
}));

const { supabase } = await import('../supabase');
const { createPersonalMovement, saveCardDebt } = await import('./mutations');
const {
  createMemberPayment,
  createSharedExpense,
  leaveSpace,
  LeaveChangedError,
  moveSharedExpenseToPersonal,
} = await import('./spaces');
const { endSharedInstallmentsNow, movePersonalToSpace, updateSharedExpense } = await import('./edits');

const TODAY = '2026-10-21';
const PASSWORD = 'integracion-local-1234';
const run = Math.random().toString(36).slice(2, 8);

let admin: SupabaseClient<Database>;
const users: Record<'ana' | 'bruno', { id: string; email: string }> = {
  ana: { id: '', email: `ana-${run}@integracion.test` },
  bruno: { id: '', email: `bruno-${run}@integracion.test` },
};
let anaCard: PaymentMethod;
let brunoCardId: string;
let modo1: string;
let dos: string;

async function signInAs(who: 'ana' | 'bruno') {
  await supabase.auth.signOut();
  const { error } = await supabase.auth.signInWithPassword({ email: users[who].email, password: PASSWORD });
  if (error != null) throw error;
}

async function count(table: 'shared_expenses' | 'personal_movements' | 'member_payments', id: string) {
  const { count: total } = await admin.from(table).select('id', { count: 'exact', head: true }).eq('id', id);
  return total ?? 0;
}

describe.skipIf(!enabled)('integridad de las escrituras contra Supabase local', () => {
  beforeAll(async () => {
    admin = createClient<Database>(URL!, SERVICE!, { auth: { persistSession: false } });

    for (const who of ['ana', 'bruno'] as const) {
      const { data, error } = await admin.auth.admin.createUser({
        email: users[who].email,
        password: PASSWORD,
        email_confirm: true,
      });
      if (error != null) throw error;
      users[who].id = data.user.id;
      await admin
        .from('profiles')
        .upsert({ id: data.user.id, display_name: who === 'ana' ? 'Ana' : 'Bruno', has_personal_account: true });
    }

    const card = await admin
      .from('payment_methods')
      .insert({ user_id: users.ana.id, kind: 'card', name: 'Visa', closing_day: 25, due_day: 5 })
      .select('*')
      .single();
    anaCard = toPaymentMethod(card.data!);
    const other = await admin
      .from('payment_methods')
      .insert({ user_id: users.bruno.id, kind: 'card', name: 'Master', closing_day: 20, due_day: 2 })
      .select('id')
      .single();
    brunoCardId = other.data!.id;

    await signInAs('ana');
    modo1 = (await supabase.rpc('app_create_space', { space_name: 'Uno', other_member_name: 'Bruno' })).data!;
    dos = (await supabase.rpc('app_create_space', { space_name: 'Dos', other_member_name: 'Bruno' })).data!;
    const token = (await supabase.rpc('app_create_invitation', { target_space_id: dos })).data!;
    await signInAs('bruno');
    const accepted = await supabase.rpc('app_accept_invitation', { raw_token: token });
    if (accepted.error != null) throw accepted.error;
    await signInAs('ana');
  });

  afterAll(async () => {
    if (!enabled) return;
    await supabase.auth.signOut();
    for (const who of ['ana', 'bruno'] as const) {
      if (users[who].id !== '') await admin.auth.admin.deleteUser(users[who].id);
    }
  });

  it('H-13 · un alta personal reintentada con el mismo id es UN movimiento, con lo último', async () => {
    const id = newId();
    const base = {
      id,
      kind: 'expense' as const,
      date: TODAY,
      category: 'supermercado' as const,
      description: null,
      paymentMethod: null,
      installmentCount: null,
      pinnedFirstMonth: null,
    };
    await createPersonalMovement(users.ana.id, { ...base, amount: 1_000 });
    await createPersonalMovement(users.ana.id, { ...base, amount: 1_500 });

    expect(await count('personal_movements', id)).toBe(1);
    const row = await admin.from('personal_movements').select('amount').eq('id', id).single();
    expect(row.data?.amount).toBe(1_500);
  });

  it('H-01 · guardar dos veces la deuda de una tarjeta no la duplica', async () => {
    const existing = planExistingInstallments({
      installmentAmount: 30_000,
      paidCount: 5,
      totalCount: 6,
      lastStatementMonth: '2026-10',
      impactDay: 5,
    });
    const debt = {
      cardId: anaCard.id,
      pending: { amount: 180_000, dueDate: '2026-11-05' },
      purchases: [{ remainingTotal: existing.remainingTotal, description: 'Heladera', plan: existing.plan }],
      recentSpending: 40_000,
      today: TODAY,
    };
    await saveCardDebt(users.ana.id, debt);
    await saveCardDebt(users.ana.id, debt);

    const statements = await admin.from('declared_statements').select('amount').eq('payment_method_id', anaCard.id);
    const movements = await admin
      .from('personal_movements')
      .select('amount, installments_count, origin')
      .eq('payment_method_id', anaCard.id)
      .eq('origin', 'onboarding_debt');
    expect(statements.data).toHaveLength(1);
    expect(movements.data).toHaveLength(2);
    // H-06 · "5 de 6": un plan de una cuota.
    expect(movements.data?.find((row) => row.installments_count != null)?.installments_count).toBe(1);
  });

  it('H-14 · el alta compartida reintentada es UN gasto con UN detalle de pago', async () => {
    const id = newId();
    const input = {
      id,
      spaceId: dos,
      date: TODAY,
      category: 'supermercado' as const,
      description: null,
      payerSlot: 1 as const,
      mySlot: 1 as const,
      installmentCount: null,
      pinnedFirstMonth: null,
      myPaymentMethod: anaCard,
    };
    await createSharedExpense({ ...input, amount: 100_000, split: { mode: 'custom', shareSlot1: 60_000, shareSlot2: 40_000 } });
    await createSharedExpense({ ...input, amount: 100_000, split: { mode: 'custom', shareSlot1: 60_000, shareSlot2: 40_000 } });

    expect(await count('shared_expenses', id)).toBe(1);
    const details = await admin.from('shared_payment_details').select('slot').eq('source_id', id);
    expect(details.data).toHaveLength(1);
  });

  it('H-14 · con un medio ajeno falla entero: ni gasto ni rastro de eliminación', async () => {
    const id = newId();
    await expect(
      createSharedExpense({
        id,
        spaceId: dos,
        amount: 5_000,
        date: TODAY,
        category: 'otros',
        description: null,
        payerSlot: 1,
        mySlot: 1,
        split: { mode: 'even' },
        installmentCount: null,
        pinnedFirstMonth: null,
        myPaymentMethod: { ...anaCard, id: brunoCardId },
      }),
    ).rejects.toThrow();

    expect(await count('shared_expenses', id)).toBe(0);
    const trace = await admin.from('deleted_shared_records').select('source_id').eq('source_id', id);
    expect(trace.data).toHaveLength(0);
  });

  it('H-05 · editar el total de un gasto personalizado se guarda con el reparto ajustado', async () => {
    const id = newId();
    await createSharedExpense({
      id,
      spaceId: dos,
      amount: 100_000,
      date: TODAY,
      category: 'supermercado',
      description: null,
      payerSlot: 1,
      mySlot: 1,
      split: { mode: 'custom', shareSlot1: 60_000, shareSlot2: 40_000 },
      installmentCount: null,
      pinnedFirstMonth: null,
      myPaymentMethod: null,
    });

    const split = fitSplitToTotal({ mode: 'custom', shareSlot1: 60_000, shareSlot2: 40_000 }, 150_000);
    await updateSharedExpense(id, {
      amount: 150_000,
      date: TODAY,
      category: 'supermercado',
      description: null,
      payerSlot: 1,
      split,
      installmentCount: null,
      mySlot: 1,
      myPaymentMethod: null,
      spaceId: dos,
      before: { date: TODAY, installmentCount: null, payerSlot: 1, payerMethodId: null },
    });

    const row = await admin.from('shared_expenses').select('amount, share_slot_1, share_slot_2').eq('id', id).single();
    expect(row.data).toEqual({ amount: 150_000, share_slot_1: 90_000, share_slot_2: 60_000 });
  });

  it('H-05 / H-06 · "Terminar ahora" compartido y personalizado, dejando una cuota', async () => {
    const id = newId();
    await createSharedExpense({
      id,
      spaceId: dos,
      amount: 600_000,
      date: '2026-09-20',
      category: 'hogar',
      description: 'Heladera',
      payerSlot: 1,
      mySlot: 1,
      split: { mode: 'custom', shareSlot1: 360_000, shareSlot2: 240_000 },
      installmentCount: 6,
      pinnedFirstMonth: null,
      myPaymentMethod: anaCard,
    });
    const row = await admin.from('shared_expenses').select('*').eq('id', id).single();
    // Compra del 20/9 con cierre 25 → primera cuota el 5/10: queda solo la de octubre.
    await endSharedInstallmentsNow(toSharedExpense(row.data!), TODAY, 1);

    const after = await admin
      .from('shared_expenses')
      .select('amount, installments_count, share_slot_1, share_slot_2')
      .eq('id', id)
      .single();
    expect(after.data).toEqual({ amount: 100_000, installments_count: 1, share_slot_1: 60_000, share_slot_2: 40_000 });
  });

  it('H-12 · de personal a un espacio, y el reintento no lo duplica', async () => {
    const movementId = newId();
    await createPersonalMovement(users.ana.id, {
      id: movementId,
      kind: 'expense',
      amount: 80_000,
      date: TODAY,
      category: 'supermercado',
      description: null,
      paymentMethod: anaCard,
      installmentCount: null,
      pinnedFirstMonth: null,
    });
    const row = await admin.from('personal_movements').select('*').eq('id', movementId).single();
    const movement = toPersonalMovement(row.data!);
    const newExpenseId = newId();
    const args = { movement, spaceId: dos, mySlot: 1 as const, split: { mode: 'even' as const }, keepPaymentMethod: true, newExpenseId };

    expect(await movePersonalToSpace(args)).toBe(newExpenseId);
    expect(await movePersonalToSpace(args)).toBe(newExpenseId);

    expect(await count('personal_movements', movementId)).toBe(0);
    expect(await count('shared_expenses', newExpenseId)).toBe(1);
  });

  it('H-12 · de un espacio a personal, y el reintento no lo duplica', async () => {
    const id = newId();
    await createSharedExpense({
      id,
      spaceId: dos,
      amount: 7_000,
      date: TODAY,
      category: 'farmacia',
      description: null,
      payerSlot: 1,
      mySlot: 1,
      split: { mode: 'even' },
      installmentCount: null,
      pinnedFirstMonth: null,
      myPaymentMethod: null,
    });
    const row = await admin.from('shared_expenses').select('*').eq('id', id).single();
    const expense = toSharedExpense(row.data!);
    const movementId = newId();

    await moveSharedExpenseToPersonal(users.ana.id, expense, null, movementId);
    await moveSharedExpenseToPersonal(users.ana.id, expense, null, movementId);

    expect(await count('shared_expenses', id)).toBe(0);
    expect(await count('personal_movements', movementId)).toBe(1);
  });

  it('H-13 · un pago entre miembros reintentado es UN pago', async () => {
    const id = newId();
    const input = { id, spaceId: dos, fromSlot: 2 as const, toSlot: 1 as const, amount: 10_000, date: TODAY, mySlot: 1 as const };
    await createMemberPayment(input);
    await createMemberPayment(input);
    expect(await count('member_payments', id)).toBe(1);
  });

  it('H-07 · salir de un Modo 1 sin haber avisado que se elimina no hace nada', async () => {
    await expect(leaveSpace(modo1, false)).rejects.toBeInstanceOf(LeaveChangedError);
    const space = await admin.from('spaces').select('id').eq('id', modo1);
    expect(space.data).toHaveLength(1);
  });

  it('H-07 · avisado, el Modo 1 se elimina; con dos adentro, el espacio queda', async () => {
    await leaveSpace(modo1, true);
    expect((await admin.from('spaces').select('id').eq('id', modo1)).data).toHaveLength(0);

    await signInAs('bruno');
    await expect(leaveSpace(dos, true)).rejects.toBeInstanceOf(LeaveChangedError);
    await leaveSpace(dos, false);
    expect((await admin.from('spaces').select('id').eq('id', dos)).data).toHaveLength(1);
  });
});
