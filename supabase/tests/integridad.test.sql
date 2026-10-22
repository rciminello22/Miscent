-- ───────────────────────────────────────────────────────────────────────────
-- Nivel 2 de testing · integridad de las escrituras (migración 0022)
--
-- Lo que verifica la auditoría del 20/10, contra la base y no contra un mock:
--   H-01 · guardar "lo que ya debés" de una tarjeta dos veces no duplica, y
--          una falla a mitad de camino no deja nada a medias
--   H-06 · un plan de una cuota se puede guardar
--   H-07 · salir de un espacio solo pasa si coincide con lo que vio la persona
--   H-12 · mover un gasto entre personal y un espacio es todo o nada, y
--          reintentarlo no lo duplica
--   H-14 · el alta compartida con su detalle de pago es todo o nada, y un
--          reintento con el mismo id no crea un segundo gasto
--
-- Igual que privacidad.test.sql: actúa como cada usuario con el rol
-- `authenticated`, corre en una transacción que termina en ROLLBACK y nunca
-- busca datos por nombre. Usuarios propios (4444…, 5555…, 6666…), distintos
-- de los de privacidad.
--
--   npm run test:rls:docker          (local, con Docker)
--   npm run test:integridad          (base enlazada, con rollback)
-- ───────────────────────────────────────────────────────────────────────────

begin;

create extension if not exists pgtap with schema extensions;
set local search_path = public, extensions, pg_temp;

select plan(46);

create schema if not exists tests;

create or replace function tests.authenticate_as(target_user_id uuid)
returns void language plpgsql as $$
begin
  perform set_config('role', 'authenticated', true);
  perform set_config(
    'request.jwt.claims',
    json_build_object('sub', target_user_id::text, 'role', 'authenticated')::text,
    true
  );
end;
$$;

create or replace function tests.as_service()
returns void language plpgsql as $$
begin
  perform set_config('role', 'postgres', true);
  perform set_config('request.jwt.claims', '', true);
end;
$$;

create table tests.ctx (key text primary key, value text not null);

create or replace function tests.put(k text, v text)
returns void language sql as $$
  insert into tests.ctx (key, value) values (k, v)
  on conflict (key) do update set value = excluded.value;
$$;

create or replace function tests.get(k text)
returns text language sql stable as $$
  select value from tests.ctx where key = k;
$$;

grant usage on schema tests to authenticated;
grant execute on all functions in schema tests to authenticated;
grant select, insert, update on tests.ctx to authenticated;

create table tests.results (id serial primary key, line text not null);
grant select, insert on tests.results to authenticated;
grant usage, select on all sequences in schema tests to authenticated;

-- Ana (cuenta personal), Bruno (cuenta personal) y Carla (ajena a todo).
insert into auth.users (id, email, instance_id, aud, role)
values
  ('44444444-4444-4444-4444-444444444444', 'ana@example.com',   '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated'),
  ('55555555-5555-5555-5555-555555555555', 'bruno@example.com', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated'),
  ('66666666-6666-6666-6666-666666666666', 'carla@example.com', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated');

insert into profiles (id, display_name, has_personal_account)
values
  ('44444444-4444-4444-4444-444444444444', 'Ana',   true),
  ('55555555-5555-5555-5555-555555555555', 'Bruno', true),
  ('66666666-6666-6666-6666-666666666666', 'Carla', true);

insert into payment_methods (id, user_id, kind, name, closing_day, due_day)
values
  ('aaaaaaaa-0000-0000-0000-00000000a001', '44444444-4444-4444-4444-444444444444', 'card', 'Visa de Ana', 25, 5),
  ('aaaaaaaa-0000-0000-0000-00000000b001', '55555555-5555-5555-5555-555555555555', 'card', 'Visa de Bruno', 20, 2);


-- ───────────────────────────────────────────────────────────────────────────
-- H-06 · un plan guardado de una cuota
-- ───────────────────────────────────────────────────────────────────────────

select tests.authenticate_as('44444444-4444-4444-4444-444444444444');

insert into tests.results(line) select lives_ok(
  $$ insert into personal_movements (user_id, kind, amount, date, category,
       installments_count, first_installment_month, installment_impact_day)
     values ('44444444-4444-4444-4444-444444444444', 'expense', 30000, '2026-10-20', 'otros',
             1, '2026-11', 5) $$,
  'H-06 · un plan de 1 cuota se guarda (Q-06 "5 de 6", Q-07 "Terminar ahora")'
);

insert into tests.results(line) select throws_ok(
  $$ insert into personal_movements (user_id, kind, amount, date, category,
       installments_count, first_installment_month, installment_impact_day)
     values ('44444444-4444-4444-4444-444444444444', 'expense', 30000, '2026-10-20', 'otros',
             0, '2026-11', 5) $$,
  '23514',
  null,
  'H-06 · un plan de 0 cuotas sigue sin poder guardarse'
);


-- ───────────────────────────────────────────────────────────────────────────
-- H-01 · "lo que ya debés" de una tarjeta
-- ───────────────────────────────────────────────────────────────────────────

-- Los helpers se crean como servicio; los asserts actúan como cada usuario.
select tests.as_service();

-- Un gasto común con la misma tarjeta: guardar el onboarding no lo toca.
insert into personal_movements (id, user_id, kind, amount, date, category, payment_method_id)
values ('dddddddd-0000-0000-0000-000000000001', '44444444-4444-4444-4444-444444444444',
        'expense', 12345, '2026-10-02', 'otros', 'aaaaaaaa-0000-0000-0000-00000000a001');

create or replace function tests.save_debt(statement_amount integer, recent integer, purchases jsonb)
returns void language sql as $$
  select app_save_card_debt(
    'aaaaaaaa-0000-0000-0000-00000000a001', statement_amount, '2026-11-05', purchases, recent, '2026-10-21'
  );
$$;
grant execute on function tests.save_debt(integer, integer, jsonb) to authenticated;

select tests.authenticate_as('44444444-4444-4444-4444-444444444444');

select tests.save_debt(180000, 40000, '[
  {"amount": 90000, "description": "Heladera", "count": 3, "first_month": "2026-11", "impact_day": 5, "approximate": false},
  {"amount": 20000, "description": null, "count": 1, "first_month": "2026-11", "impact_day": 5, "approximate": false}
]'::jsonb);

select tests.as_service();

create or replace function tests.debt_counts()
returns text language sql stable as $$
  select format('resumenes=%s cuotas=%s consumos=%s total=%s',
    (select count(*) from declared_statements
      where payment_method_id = 'aaaaaaaa-0000-0000-0000-00000000a001'),
    (select count(*) from personal_movements
      where origin = 'onboarding_debt' and installments_count is not null
        and payment_method_id = 'aaaaaaaa-0000-0000-0000-00000000a001'),
    (select count(*) from personal_movements
      where origin = 'onboarding_debt' and installments_count is null
        and payment_method_id = 'aaaaaaaa-0000-0000-0000-00000000a001'),
    (select coalesce(sum(amount), 0) from personal_movements
      where origin = 'onboarding_debt'
        and payment_method_id = 'aaaaaaaa-0000-0000-0000-00000000a001')
    + (select coalesce(sum(amount), 0) from declared_statements
      where payment_method_id = 'aaaaaaaa-0000-0000-0000-00000000a001'));
$$;
grant execute on function tests.debt_counts() to authenticated;

select tests.authenticate_as('44444444-4444-4444-4444-444444444444');

insert into tests.results(line) select is(
  tests.debt_counts(),
  'resumenes=1 cuotas=2 consumos=1 total=330000',
  'H-01 · el primer guardado crea el resumen, las cuotas (una de 1 cuota) y los consumos'
);

-- Continuar otra vez con lo mismo (doble toque, volver atrás y seguir, reintento).
select tests.save_debt(180000, 40000, '[
  {"amount": 90000, "description": "Heladera", "count": 3, "first_month": "2026-11", "impact_day": 5, "approximate": false},
  {"amount": 20000, "description": null, "count": 1, "first_month": "2026-11", "impact_day": 5, "approximate": false}
]'::jsonb);

insert into tests.results(line) select is(
  tests.debt_counts(),
  'resumenes=1 cuotas=2 consumos=1 total=330000',
  'H-01 · guardar dos veces lo mismo no duplica nada'
);

-- Corregir: otro monto de resumen, una sola compra, sin consumos.
select tests.save_debt(150000, 0, '[
  {"amount": 90000, "description": "Heladera", "count": 3, "first_month": "2026-11", "impact_day": 5, "approximate": false}
]'::jsonb);

insert into tests.results(line) select is(
  tests.debt_counts(),
  'resumenes=1 cuotas=1 consumos=0 total=240000',
  'H-01 · guardar lo corregido reemplaza lo anterior, no lo suma'
);

insert into tests.results(line) select is(
  (select count(*)::int from personal_movements where id = 'dddddddd-0000-0000-0000-000000000001'),
  1,
  'H-01 · un gasto común con la misma tarjeta no se toca'
);

-- Una falla a mitad de camino (una cuota con 0 cuotas): no queda nada a medias.
insert into tests.results(line) select throws_ok(
  $$ select tests.save_debt(999999, 1, '[
       {"amount": 1000, "description": null, "count": 0, "first_month": "2026-11", "impact_day": 5, "approximate": false}
     ]'::jsonb) $$,
  '23514',
  null,
  'H-01 · un dato inválido hace fallar el guardado entero'
);

insert into tests.results(line) select is(
  tests.debt_counts(),
  'resumenes=1 cuotas=1 consumos=0 total=240000',
  'H-01 · después de la falla queda lo último que se guardó bien, intacto'
);

-- Con la tarjeta de otro, nada.
select tests.authenticate_as('66666666-6666-6666-6666-666666666666');

insert into tests.results(line) select throws_ok(
  $$ select tests.save_debt(1000, 0, '[]'::jsonb) $$,
  'P0002',
  null,
  'H-01 · nadie guarda una deuda en la tarjeta de otro'
);

select tests.as_service();

insert into tests.results(line) select is(
  tests.debt_counts(),
  'resumenes=1 cuotas=1 consumos=0 total=240000',
  'H-01 · y el intento ajeno no borró nada'
);


-- ───────────────────────────────────────────────────────────────────────────
-- Montaje de espacios: "Uno" en Modo 1 (Bruno nunca entró) y "Dos" con Ana y
-- Bruno adentro.
-- ───────────────────────────────────────────────────────────────────────────

select tests.authenticate_as('44444444-4444-4444-4444-444444444444');
select tests.put('uno', app_create_space('Uno', 'Bruno', 0, 'me')::text);
select tests.put('dos', app_create_space('Dos', 'Bruno', 0, 'me')::text);
select tests.put('token', app_create_invitation(tests.get('dos')::uuid));

select tests.authenticate_as('55555555-5555-5555-5555-555555555555');
select app_accept_invitation(tests.get('token'));


-- ───────────────────────────────────────────────────────────────────────────
-- H-14 · alta de un gasto compartido con su detalle de pago
-- ───────────────────────────────────────────────────────────────────────────

select tests.as_service();

create or replace function tests.save_shared(
  expense_id uuid, space_id uuid, amount integer, share_1 integer, method_id uuid
)
returns uuid language sql as $$
  select app_save_new_shared_expense(
    expense_id, space_id, amount, '2026-10-20', 'supermercado', null, 1::smallint,
    'custom', share_1, amount - share_1, null, null, null, false, method_id
  );
$$;
grant execute on function tests.save_shared(uuid, uuid, integer, integer, uuid) to authenticated;

select tests.authenticate_as('44444444-4444-4444-4444-444444444444');

insert into tests.results(line) select is(
  tests.save_shared('eeeeeeee-0000-0000-0000-000000000001', tests.get('dos')::uuid, 100000, 60000,
                    'aaaaaaaa-0000-0000-0000-00000000a001'),
  'eeeeeeee-0000-0000-0000-000000000001'::uuid,
  'H-14 · el alta devuelve el id que mandó la app'
);

-- Reintento con el mismo id (respuesta perdida), con el monto corregido.
select tests.save_shared('eeeeeeee-0000-0000-0000-000000000001', tests.get('dos')::uuid, 120000, 72000,
                         'aaaaaaaa-0000-0000-0000-00000000a001');

select tests.as_service();

insert into tests.results(line) select is(
  (select format('%s gasto, $%s, partes %s/%s', count(*), max(amount), max(share_slot_1), max(share_slot_2))
   from shared_expenses where id = 'eeeeeeee-0000-0000-0000-000000000001'),
  '1 gasto, $120000, partes 72000/48000',
  'H-14 · reintentar con el mismo id no crea un segundo gasto: queda lo último'
);

insert into tests.results(line) select is(
  (select count(*)::int from shared_payment_details where source_id = 'eeeeeeee-0000-0000-0000-000000000001'),
  1,
  'H-14 · y un solo detalle de pago'
);

insert into tests.results(line) select is(
  (select created_by_slot::int from shared_expenses where id = 'eeeeeeee-0000-0000-0000-000000000001'),
  1,
  'K3 · el reintento no cambia quién lo cargó'
);

-- Un medio que no es suyo: falla el detalle y NO queda el gasto.
select tests.authenticate_as('44444444-4444-4444-4444-444444444444');

insert into tests.results(line) select throws_ok(
  $$ select tests.save_shared('eeeeeeee-0000-0000-0000-000000000002', tests.get('dos')::uuid, 50000, 25000,
                              'aaaaaaaa-0000-0000-0000-00000000b001') $$,
  '42501',
  null,
  'H-14 · con un medio ajeno, el alta falla entera'
);

select tests.as_service();

insert into tests.results(line) select is(
  (select count(*)::int from shared_expenses where id = 'eeeeeeee-0000-0000-0000-000000000002'),
  0,
  'H-14 · todo o nada: no queda un gasto sin su detalle'
);

insert into tests.results(line) select is(
  (select count(*)::int from deleted_shared_records where source_id = 'eeeeeeee-0000-0000-0000-000000000002'),
  0,
  'H-14 · y sin borrado compensatorio, al otro no le aparece una "eliminación"'
);

-- C-05 · nadie declara con qué pagó el otro.
select tests.authenticate_as('55555555-5555-5555-5555-555555555555');

insert into tests.results(line) select throws_ok(
  $$ select app_save_new_shared_expense(
       'eeeeeeee-0000-0000-0000-000000000003', tests.get('dos')::uuid, 1000, '2026-10-20',
       'otros', null, 1::smallint, 'even', 500, 500, null, null, null, false,
       'aaaaaaaa-0000-0000-0000-00000000b001') $$,
  '22023',
  null,
  'C-05 · un medio de pago solo si pagó quien guarda'
);

-- Un id de otro espacio no se puede pisar.
select tests.authenticate_as('44444444-4444-4444-4444-444444444444');

insert into tests.results(line) select throws_ok(
  $$ select tests.save_shared('eeeeeeee-0000-0000-0000-000000000001', tests.get('uno')::uuid, 1000, 500, null) $$,
  '23505',
  null,
  'H-14 · el id de un gasto de otro espacio no se puede reutilizar'
);

-- Quien no es miembro, nada.
select tests.authenticate_as('66666666-6666-6666-6666-666666666666');

insert into tests.results(line) select throws_ok(
  $$ select tests.save_shared('eeeeeeee-0000-0000-0000-000000000004', tests.get('dos')::uuid, 1000, 500, null) $$,
  '42501',
  null,
  'H-14 · quien no es miembro no carga gastos en el espacio'
);


-- ───────────────────────────────────────────────────────────────────────────
-- H-14 · alta de un fijo compartido con su detalle de pago
-- ───────────────────────────────────────────────────────────────────────────

select tests.as_service();

create or replace function tests.save_shared_fixed(amount integer)
returns uuid language sql as $$
  select app_save_new_shared_recurrence(
    'ffffffff-0000-0000-0000-000000000001', tests.get('dos')::uuid, amount, 'alquiler', 'Alquiler',
    1::smallint, '2026-10', 1::smallint, 'even', null, null, 'aaaaaaaa-0000-0000-0000-00000000a001'
  );
$$;
grant execute on function tests.save_shared_fixed(integer) to authenticated;

select tests.authenticate_as('44444444-4444-4444-4444-444444444444');
select tests.save_shared_fixed(500000);
select tests.save_shared_fixed(520000);

select tests.as_service();

insert into tests.results(line) select is(
  (select format('%s fijo, $%s, %s detalle', count(*), max(amount),
     (select count(*) from shared_payment_details where source_id = 'ffffffff-0000-0000-0000-000000000001'))
   from recurrences where id = 'ffffffff-0000-0000-0000-000000000001'),
  '1 fijo, $520000, 1 detalle',
  'H-14 · el fijo compartido tampoco se duplica al reintentar'
);

insert into tests.results(line) select is(
  (select created_by_slot::int from recurrences where id = 'ffffffff-0000-0000-0000-000000000001'),
  1,
  'K3 · el fijo registra quién lo cargó'
);


-- ───────────────────────────────────────────────────────────────────────────
-- H-12 · X-07, de personal a un espacio
-- ───────────────────────────────────────────────────────────────────────────

select tests.authenticate_as('44444444-4444-4444-4444-444444444444');

insert into personal_movements (id, user_id, kind, amount, date, category, payment_method_id)
values ('dddddddd-0000-0000-0000-000000000002', '44444444-4444-4444-4444-444444444444',
        'expense', 80000, '2026-10-18', 'supermercado', 'aaaaaaaa-0000-0000-0000-00000000a001');

-- Un reparto que no suma: falla y no cambia nada.
insert into tests.results(line) select throws_ok(
  $$ select app_move_personal_to_space('dddddddd-0000-0000-0000-000000000002',
       'cccccccc-0000-0000-0000-000000000001', tests.get('dos')::uuid, 'custom', 1, 1, true) $$,
  '23514',
  null,
  'H-12 · un paso inválido hace fallar el movimiento entero'
);

insert into tests.results(line) select is(
  (select count(*)::int from personal_movements where id = 'dddddddd-0000-0000-0000-000000000002'),
  1,
  'H-12 · después de la falla, el personal sigue donde estaba'
);

insert into tests.results(line) select is(
  app_move_personal_to_space('dddddddd-0000-0000-0000-000000000002',
    'cccccccc-0000-0000-0000-000000000001', tests.get('dos')::uuid, 'even', 40000, 40000, true),
  'cccccccc-0000-0000-0000-000000000001'::uuid,
  'H-12 · el movimiento sale bien'
);

-- Reintento después de una respuesta perdida.
insert into tests.results(line) select is(
  app_move_personal_to_space('dddddddd-0000-0000-0000-000000000002',
    'cccccccc-0000-0000-0000-000000000001', tests.get('dos')::uuid, 'even', 40000, 40000, true),
  'cccccccc-0000-0000-0000-000000000001'::uuid,
  'H-12 · reintentarlo devuelve el mismo gasto'
);

select tests.as_service();

insert into tests.results(line) select is(
  (select format('personal=%s compartido=%s detalle=%s',
     (select count(*) from personal_movements where id = 'dddddddd-0000-0000-0000-000000000002'),
     (select count(*) from shared_expenses where id = 'cccccccc-0000-0000-0000-000000000001'),
     (select count(*) from shared_payment_details where source_id = 'cccccccc-0000-0000-0000-000000000001'))),
  'personal=0 compartido=1 detalle=1',
  'H-12 · queda en un solo lado, una sola vez, con su medio de pago'
);


-- ───────────────────────────────────────────────────────────────────────────
-- H-12 · X-07, de un espacio a personal
-- ───────────────────────────────────────────────────────────────────────────

-- Bruno no lo cargó: no puede llevárselo.
select tests.authenticate_as('55555555-5555-5555-5555-555555555555');

insert into tests.results(line) select throws_ok(
  $$ select app_move_shared_to_personal('cccccccc-0000-0000-0000-000000000001',
       'dddddddd-0000-0000-0000-000000000003', null, null, null, null, false) $$,
  '42501',
  null,
  'X-07 · solo quien lo cargó cambia el destino'
);

select tests.authenticate_as('44444444-4444-4444-4444-444444444444');

insert into tests.results(line) select is(
  app_move_shared_to_personal('cccccccc-0000-0000-0000-000000000001',
    'dddddddd-0000-0000-0000-000000000003', 'aaaaaaaa-0000-0000-0000-00000000a001', null, null, null, false),
  'dddddddd-0000-0000-0000-000000000003'::uuid,
  'H-12 · de vuelta a personal'
);

insert into tests.results(line) select is(
  app_move_shared_to_personal('cccccccc-0000-0000-0000-000000000001',
    'dddddddd-0000-0000-0000-000000000003', 'aaaaaaaa-0000-0000-0000-00000000a001', null, null, null, false),
  'dddddddd-0000-0000-0000-000000000003'::uuid,
  'H-12 · reintentarlo no crea un segundo personal'
);

select tests.as_service();

insert into tests.results(line) select is(
  (select format('personal=%s compartido=%s detalle=%s',
     (select count(*) from personal_movements where id = 'dddddddd-0000-0000-0000-000000000003'),
     (select count(*) from shared_expenses where id = 'cccccccc-0000-0000-0000-000000000001'),
     (select count(*) from shared_payment_details where source_id = 'cccccccc-0000-0000-0000-000000000001'))),
  'personal=1 compartido=0 detalle=0',
  'H-12 · queda solo el personal, sin detalle huérfano'
);

insert into tests.results(line) select is(
  (select amount from personal_movements where id = 'dddddddd-0000-0000-0000-000000000003'),
  80000,
  'H-12 · con el monto del gasto guardado, no el que mande el cliente'
);


-- ───────────────────────────────────────────────────────────────────────────
-- H-07 · salir como lo mostró la pantalla
-- ───────────────────────────────────────────────────────────────────────────

select tests.authenticate_as('44444444-4444-4444-4444-444444444444');

-- Modo 1: si la pantalla dijo "se conserva", el servidor no elimina.
insert into tests.results(line) select throws_ok(
  $$ select app_leave_space_as_shown(tests.get('uno')::uuid, false) $$,
  'P0001',
  null,
  'H-07 · en Modo 1, salir sin haber avisado que se elimina no hace nada'
);

select tests.as_service();

insert into tests.results(line) select is(
  (select count(*)::int from spaces where id = tests.get('uno')::uuid),
  1,
  'H-07 · el espacio sigue entero'
);

insert into tests.results(line) select is(
  (select status::text from space_members where space_id = tests.get('uno')::uuid and slot = 1),
  'active',
  'H-07 · y Ana sigue adentro'
);

-- Con dos adentro, si la pantalla dijo "se elimina", tampoco.
select tests.authenticate_as('44444444-4444-4444-4444-444444444444');

insert into tests.results(line) select throws_ok(
  $$ select app_leave_space_as_shown(tests.get('dos')::uuid, true) $$,
  'P0001',
  null,
  'H-07 · con el otro adentro, no se sale con el aviso de eliminar'
);

-- Modo 1 avisado: se elimina (SA-06), y Ana conserva su foto (SA-05).
insert into tests.results(line) select lives_ok(
  $$ select app_leave_space_as_shown(tests.get('uno')::uuid, true) $$,
  'H-07 · en Modo 1, salir avisando que se elimina funciona'
);

select tests.as_service();

insert into tests.results(line) select is(
  (select count(*)::int from spaces where id = tests.get('uno')::uuid),
  0,
  'SA-06 · sin nadie con acceso, el espacio se elimina'
);

insert into tests.results(line) select is(
  (select count(*)::int from former_memberships
   where user_id = '44444444-4444-4444-4444-444444444444' and space_id = tests.get('uno')::uuid),
  1,
  'SA-05 · quien salió conserva la foto de sus meses pasados'
);

-- Con dos adentro: sale, el espacio queda y el historial también.
select tests.authenticate_as('55555555-5555-5555-5555-555555555555');

insert into tests.results(line) select lives_ok(
  $$ select app_leave_space_as_shown(tests.get('dos')::uuid, false) $$,
  'SA-01 · con el otro adentro, sale normalmente'
);

select tests.as_service();

insert into tests.results(line) select is(
  (select format('espacio=%s bruno=%s gastos=%s',
     (select count(*) from spaces where id = tests.get('dos')::uuid),
     (select status from space_members where space_id = tests.get('dos')::uuid and slot = 2),
     (select count(*) from shared_expenses where space_id = tests.get('dos')::uuid))),
  'espacio=1 bruno=former gastos=1',
  'SA-02 · el espacio y su historial quedan para Ana; Bruno, ex miembro'
);

insert into tests.results(line) select is(
  (select count(*)::int from former_memberships
   where user_id = '55555555-5555-5555-5555-555555555555' and space_id = tests.get('dos')::uuid),
  1,
  'SA-05 · Bruno también se lleva su foto'
);

-- Quien no es miembro no sale de nada.
select tests.authenticate_as('66666666-6666-6666-6666-666666666666');

insert into tests.results(line) select throws_ok(
  $$ select app_leave_space_as_shown(tests.get('dos')::uuid, false) $$,
  '42501',
  null,
  'H-07 · quien no es miembro no puede salir por otro'
);


-- ───────────────────────────────────────────────────────────────────────────
-- Permisos · las funciones nuevas nacen cerradas
-- ───────────────────────────────────────────────────────────────────────────

select tests.as_service();

insert into tests.results(line) select is(
  (select count(*)::int from pg_proc p
   where p.pronamespace = 'public'::regnamespace
     and p.proname in ('app_save_card_debt', 'app_save_new_shared_expense',
                       'app_save_new_shared_recurrence', 'app_move_personal_to_space',
                       'app_move_shared_to_personal', 'app_leave_space_as_shown',
                       'app_set_my_payment_detail')
     and has_function_privilege('anon', p.oid, 'execute')),
  0,
  'Sin sesión no se ejecuta ninguna de las funciones nuevas'
);

insert into tests.results(line) select is(
  (select count(*)::int from pg_proc p
   where p.pronamespace = 'public'::regnamespace
     and p.proname in ('app_save_card_debt', 'app_save_new_shared_expense',
                       'app_save_new_shared_recurrence', 'app_move_personal_to_space',
                       'app_move_shared_to_personal', 'app_leave_space_as_shown')
     and has_function_privilege('authenticated', p.oid, 'execute')),
  6,
  'Con sesión se ejecutan las seis'
);

insert into tests.results(line) select is(
  (select count(*)::int from pg_proc p
   where p.pronamespace = 'public'::regnamespace
     and p.proname in ('app_save_card_debt', 'app_save_new_shared_expense',
                       'app_save_new_shared_recurrence', 'app_move_personal_to_space',
                       'app_move_shared_to_personal', 'app_set_my_payment_detail')
     and p.prosecdef),
  0,
  'Las escrituras nuevas son SECURITY INVOKER: corren con la RLS de siempre'
);


-- ───────────────────────────────────────────────────────────────────────────
-- Resultado
-- ───────────────────────────────────────────────────────────────────────────

select tests.as_service();
insert into tests.results(line) select * from finish();

do $$
declare
  fallidos text;
begin
  select string_agg(line, E'\n  ')
  into fallidos
  from tests.results
  where line like 'not ok%';

  if fallidos is not null then
    raise exception E'INTEGRIDAD: hay asserts fallidos\n  %', fallidos;
  end if;
end;
$$;

select line from tests.results order by id;

rollback;
