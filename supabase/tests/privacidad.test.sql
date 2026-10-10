-- ───────────────────────────────────────────────────────────────────────────
-- Nivel 2 de testing · autorización
--
-- Estos tests son la razón por la que el backend es Postgres. §34 dice que
-- solo se promete lo que se pueda cumplir Y VERIFICAR: acá se verifica.
--
-- Cada test actúa como un usuario real cambiando el claim del JWT, con el rol
-- `authenticated`, igual que un cliente de la app. No hay atajos: si una
-- política está mal, el test lo ve.
--
-- 46 asserts. Cubre: PR-01, PR-02, CA-05, CA-11, CA-12, CA-13, CA-22, CA-40,
-- CA-47, CA-48, C-02, C-05, D-01, E-01, E-02, I-02, I-04, I-07, K1, K3, K4,
-- P5, P7, SA-02, SA-06, SY-02, X-02, §26 quitar acceso, la asimetría de
-- shared_payment_details y el usuario anónimo de O2 sin email.
--
-- Se corre de dos formas, y las dos funcionan sobre este mismo archivo:
--   npm run test:rls      (pgTAP vía Docker, con salida TAP)
--   npm run test:rls:api  (Management API, sin Docker)
--
-- Por eso no usa meta-comandos de psql como \set: la Management API ejecuta
-- SQL, no es un cliente psql.
-- ───────────────────────────────────────────────────────────────────────────

begin;

create extension if not exists pgtap with schema extensions;
set local search_path = public, extensions, pg_temp;

select plan(46);

-- ───────────────────────────────────────────────────────────────────────────
-- Montaje: Renzo (con cuenta personal), Martina (invitada, Estado B) y Juan.
-- ───────────────────────────────────────────────────────────────────────────

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

-- Un usuario anónimo (O2 sin email, 10/10): mismo rol `authenticated`, pero
-- el JWT lleva is_anonymous = true, igual que lo emite Supabase.
create or replace function tests.authenticate_as_anonymous(target_user_id uuid)
returns void language plpgsql as $$
begin
  perform set_config('role', 'authenticated', true);
  perform set_config(
    'request.jwt.claims',
    json_build_object('sub', target_user_id::text, 'role', 'authenticated', 'is_anonymous', true)::text,
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

-- Contexto compartido entre pasos (ids de espacio, tokens de invitación).
-- Es una tabla normal del schema tests y no una temporal, para poder darle
-- permisos una sola vez: los pasos la leen actuando como `authenticated`.
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

-- Los helpers se llaman mientras actuamos como `authenticated`, así que ese
-- rol necesita poder usarlos. Todo esto se deshace con el rollback final.
grant usage on schema tests to authenticated;
grant execute on all functions in schema tests to authenticated;
grant select, insert, update on tests.ctx to authenticated;

-- Capturamos el output TAP de cada assert en vez de leer los internals de
-- pgTAP: asi el archivo no depende de la version de la extension y, si algo
-- falla, el comando falla en lugar de imprimir "not ok" y seguir.
create table tests.results (id serial primary key, line text not null);
grant select, insert on tests.results to authenticated;
grant usage, select on all sequences in schema tests to authenticated;

insert into auth.users (id, email, instance_id, aud, role)
values
  ('11111111-1111-1111-1111-111111111111', 'renzo@example.com',   '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated'),
  ('22222222-2222-2222-2222-222222222222', 'martina@example.com', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated'),
  ('33333333-3333-3333-3333-333333333333', 'juan@example.com',    '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated');

insert into profiles (id, display_name, has_personal_account)
values
  ('11111111-1111-1111-1111-111111111111', 'Renzo',   true),
  ('22222222-2222-2222-2222-222222222222', 'Martina', false),   -- Estado B
  ('33333333-3333-3333-3333-333333333333', 'Juan',    true);

-- La Visa de Renzo y la cuenta personal que Martina no debe poder ver.
insert into payment_methods (id, user_id, kind, name, closing_day, due_day)
values ('aaaaaaaa-0000-0000-0000-000000000001', '11111111-1111-1111-1111-111111111111',
        'card', 'Visa Galicia', 25, 5);

insert into personal_movements (user_id, kind, amount, date, category)
values
  ('11111111-1111-1111-1111-111111111111', 'income',  1200000, '2026-10-05', 'sueldo'),
  ('11111111-1111-1111-1111-111111111111', 'expense',   80000, '2026-10-15', 'otros');

insert into declared_statements (user_id, payment_method_id, amount, due_date)
values ('11111111-1111-1111-1111-111111111111', 'aaaaaaaa-0000-0000-0000-000000000001',
        180000, '2026-10-05');


-- ───────────────────────────────────────────────────────────────────────────
-- P5 / CA-47 · crear un espacio requiere cuenta personal
-- ───────────────────────────────────────────────────────────────────────────

select tests.authenticate_as('22222222-2222-2222-2222-222222222222');

insert into tests.results(line) select throws_ok(
  $$ select app_create_space('Mi espacio', 'Alguien') $$,
  'P5: para crear un espacio necesitás tu cuenta personal',
  'CA-47 · un usuario sin cuenta personal NO puede crear espacios'
);

select tests.authenticate_as('11111111-1111-1111-1111-111111111111');

insert into tests.results(line) select lives_ok(
  $$ select app_create_space('Casa', 'Martina') $$,
  'P5 · un usuario con cuenta personal sí puede crear un espacio'
);

select tests.as_service();

-- Por el usuario del test, NO solo por el nombre: el test corre contra la base
-- real, y el 10/10 un espacio real también se llamaba "Casa".
select tests.put('casa_id', (
  select s.id::text from spaces s
  join space_members m on m.space_id = s.id
  where s.name = 'Casa' and m.user_id = '11111111-1111-1111-1111-111111111111'
));

insert into tests.results(line) select is(
  (select count(*)::int from space_members where space_id = tests.get('casa_id')::uuid),
  2,
  'E-01 · el espacio se crea con exactamente dos miembros'
);

insert into tests.results(line) select is(
  (select status::text from space_members where space_id = tests.get('casa_id')::uuid and slot = 2),
  'no_access',
  'E-02 · el segundo miembro arranca sin acceso'
);


-- ───────────────────────────────────────────────────────────────────────────
-- CA-13 · nadie ve el email, ni si el otro tiene cuenta personal
-- ───────────────────────────────────────────────────────────────────────────

select tests.authenticate_as('22222222-2222-2222-2222-222222222222');

insert into tests.results(line) select is(
  (select count(*)::int from profiles),
  1,
  'CA-13 · un usuario solo lee su propio perfil (ni email ni has_personal_account del otro)'
);

insert into tests.results(line) select is(
  (select count(*)::int from profiles where id = '11111111-1111-1111-1111-111111111111'),
  0,
  'CA-13 · el perfil del otro miembro es invisible'
);


-- ───────────────────────────────────────────────────────────────────────────
-- CA-11 / PR-02 · la cuenta personal de Renzo es invisible para Martina
-- ───────────────────────────────────────────────────────────────────────────

insert into tests.results(line) select is(
  (select count(*)::int from payment_methods),
  0,
  'T-01 / CA-12 · las tarjetas de Renzo no existen para Martina'
);

insert into tests.results(line) select is(
  (select count(*)::int from personal_movements),
  0,
  'CA-11 · los gastos e ingresos personales de Renzo no existen para Martina'
);

insert into tests.results(line) select is(
  (select count(*)::int from declared_statements),
  0,
  'T-07 / PR-02 · el resumen pendiente declarado de Renzo es privado'
);

insert into tests.results(line) select is(
  (select coalesce(sum(amount), 0)::int from personal_movements),
  0,
  'CA-11 · tampoco aparece en ningún total del otro miembro'
);


-- ───────────────────────────────────────────────────────────────────────────
-- I-02 / I-05 · la invitación es de un solo uso y 7 días
-- ───────────────────────────────────────────────────────────────────────────

select tests.authenticate_as('11111111-1111-1111-1111-111111111111');

select tests.put('token', app_create_invitation(tests.get('casa_id')::uuid));

insert into tests.results(line) select ok(
  (select length(tests.get('token')) > 20),
  'I-02 · la invitación devuelve un token en claro una sola vez'
);

select tests.as_service();

insert into tests.results(line) select is(
  (select count(*)::int from invitations where token_hash = tests.get('token')),
  0,
  'I-02 · en la base queda el hash, nunca el token en claro'
);


-- Martina acepta.
select tests.authenticate_as('22222222-2222-2222-2222-222222222222');

insert into tests.results(line) select lives_ok(
  $$ select app_accept_invitation(tests.get('token')) $$,
  'I-04 / K8 · al aceptar, ocupa el lugar y ve el historial del espacio'
);

insert into tests.results(line) select throws_ok(
  $$ select app_accept_invitation(tests.get('token')) $$,
  'INVITATION_USED',
  'I-02 / CA-22 · el mismo enlace no sirve dos veces'
);

select tests.as_service();

insert into tests.results(line) select is(
  (select has_personal_account from profiles where id = '22222222-2222-2222-2222-222222222222'),
  false,
  'I-07 / A-03 / CA-05 · aceptar una invitación NUNCA activa una cuenta personal'
);


-- ───────────────────────────────────────────────────────────────────────────
-- PR-01 · dentro del espacio, los dos ven lo cargado ahí
-- ───────────────────────────────────────────────────────────────────────────

select tests.authenticate_as('11111111-1111-1111-1111-111111111111');

-- Supermercado $100.000, pagó Renzo (slot 1), 50/50, con la Visa.
insert into shared_expenses (
  id, space_id, amount, date, category, description,
  payer_slot, split_mode, share_slot_1, share_slot_2,
  created_by_slot, updated_by_slot
) values (
  'bbbbbbbb-0000-0000-0000-000000000001',
  tests.get('casa_id')::uuid, 100000, '2026-10-20', 'supermercado', 'Supermercado',
  1, 'even', 50000, 50000, 1, 1
);

-- C-05 · con qué pagó: detalle PRIVADO de Renzo.
insert into shared_payment_details (source_id, space_id, slot, payment_method_id)
values (
  'bbbbbbbb-0000-0000-0000-000000000001',
  tests.get('casa_id')::uuid, 1,
  'aaaaaaaa-0000-0000-0000-000000000001'
);

insert into tests.results(line) select is(
  (select count(*)::int from shared_payment_details),
  1,
  'C-05 · quien pagó ve con qué pagó'
);

select tests.authenticate_as('22222222-2222-2222-2222-222222222222');

insert into tests.results(line) select is(
  (select count(*)::int from shared_expenses),
  1,
  'PR-01 · Martina ve el gasto compartido: monto, fecha, quién pagó y el reparto'
);

-- El test más fino de todo el esquema: dos personas con acceso al MISMO
-- espacio, visibilidad asimétrica sobre filas hermanas.
insert into tests.results(line) select is(
  (select count(*)::int from shared_payment_details),
  0,
  'CA-12 / PR-02 · Martina ve "pagó Renzo" y NUNCA la tarjeta'
);

insert into tests.results(line) select is(
  (select count(*)::int from payment_methods),
  0,
  'CA-12 · la Visa de Renzo sigue siendo invisible aunque pagó un gasto compartido'
);

-- K3 / X-02 · los dos miembros editan cualquier registro del espacio.
insert into tests.results(line) select lives_ok(
  $$ update shared_expenses
     set amount = 120000, share_slot_1 = 60000, share_slot_2 = 60000, updated_by_slot = 2
     where id = 'bbbbbbbb-0000-0000-0000-000000000001' $$,
  'K3 / X-02 · los dos miembros con acceso editan los registros del espacio'
);

-- C-02 · la base rechaza un reparto que no suma el total.
insert into tests.results(line) select throws_ok(
  $$ update shared_expenses
     set share_slot_1 = 10000, share_slot_2 = 10000, updated_by_slot = 2
     where id = 'bbbbbbbb-0000-0000-0000-000000000001' $$,
  '23514',
  null,
  'C-02 · un reparto que no suma el total no puede llegar a la base'
);


-- ───────────────────────────────────────────────────────────────────────────
-- P4 / CA-48 · dos usuarios no comparten más de un espacio activo
-- ───────────────────────────────────────────────────────────────────────────

select tests.authenticate_as('11111111-1111-1111-1111-111111111111');

select tests.put('viaje_id', app_create_space('Viaje', 'Martina')::text);

select tests.put('token2', app_create_invitation(tests.get('viaje_id')::uuid));

select tests.authenticate_as('22222222-2222-2222-2222-222222222222');

insert into tests.results(line) select throws_like(
  $$ select app_accept_invitation(tests.get('token2')) $$,
  'ALREADY_SHARING:Casa%',
  'CA-48 · "Ya compartís Casa con Renzo": la invitación no se acepta'
);

-- Caso 17 · Juan sí puede: no comparte ningún espacio con Renzo.
select tests.authenticate_as('33333333-3333-3333-3333-333333333333');

insert into tests.results(line) select lives_ok(
  $$ select app_accept_invitation(tests.get('token2')) $$,
  'K1 / Caso 17 · un usuario puede tener varios espacios, con personas distintas'
);

-- PR-02 · Martina no ve Viaje, ni que existe.
select tests.authenticate_as('22222222-2222-2222-2222-222222222222');

insert into tests.results(line) select is(
  (select count(*)::int from spaces),
  1,
  'PR-02 / CA-13 · Martina no ve los otros espacios de Renzo, ni que existen'
);


-- ───────────────────────────────────────────────────────────────────────────
-- SY-02 · "Martina eliminó este gasto. ¿Querés volver a crearlo?"
--
-- Para nombrar a quien eliminó hay que saberlo de verdad: si lo borró Renzo
-- desde otro teléfono, culpar a Martina es justo lo que §39 llama "la app
-- como árbitro de la pareja".
-- ───────────────────────────────────────────────────────────────────────────

select tests.authenticate_as('22222222-2222-2222-2222-222222222222');
delete from shared_expenses where id = 'bbbbbbbb-0000-0000-0000-000000000001';

select tests.authenticate_as('11111111-1111-1111-1111-111111111111');

insert into tests.results(line) select is(
  (select deleted_by_slot from deleted_shared_records
   where source_id = 'bbbbbbbb-0000-0000-0000-000000000001'),
  2::smallint,
  'SY-02 · Renzo sabe que el gasto lo eliminó Martina'
);

-- Martina no puede borrar el detalle de pago de Renzo (C-05), así que sin el
-- trigger quedaba huérfano para siempre.
insert into tests.results(line) select is(
  (select count(*)::int from shared_payment_details
   where source_id = 'bbbbbbbb-0000-0000-0000-000000000001'),
  0,
  'C-05 · al eliminar un gasto compartido se va también el detalle privado de pago'
);

insert into tests.results(line) select throws_ok(
  $$ insert into deleted_shared_records (source_id, space_id, deleted_by_slot)
     values (gen_random_uuid(), tests.get('casa_id')::uuid, 2) $$,
  '42501',
  null,
  'SY-02 · nadie puede inventar un borrado a nombre del otro'
);

select tests.authenticate_as('33333333-3333-3333-3333-333333333333');

insert into tests.results(line) select is(
  (select count(*)::int from deleted_shared_records),
  0,
  'PR-02 · Juan no ve lo que se elimina en Casa'
);


-- ───────────────────────────────────────────────────────────────────────────
-- O2 sin email (10/10) · la invitada entra como usuario anónimo
--
-- Un anónimo es un `authenticated` más: tiene que poder hacer lo de una
-- invitada (aceptar, ver su espacio) y NADA que requiera email. Sin email no
-- hay cuenta personal, y sin cuenta personal no se crean espacios (P5).
-- ───────────────────────────────────────────────────────────────────────────

select tests.as_service();
insert into auth.users (id, instance_id, aud, role, is_anonymous)
values ('44444444-4444-4444-4444-444444444444', '00000000-0000-0000-0000-000000000000',
        'authenticated', 'authenticated', true);

select tests.authenticate_as('11111111-1111-1111-1111-111111111111');
select tests.put('prueba_id', app_create_space('Prueba', 'Ana')::text);
select tests.put('token3', app_create_invitation(tests.get('prueba_id')::uuid));

select tests.authenticate_as_anonymous('44444444-4444-4444-4444-444444444444');

insert into tests.results(line) select lives_ok(
  $$ insert into profiles (id, display_name, has_personal_account)
     values ('44444444-4444-4444-4444-444444444444', 'Ana', false) $$,
  'O2 · el usuario anónimo crea su perfil, sin cuenta personal'
);

insert into tests.results(line) select lives_ok(
  $$ select app_accept_invitation(tests.get('token3'), 'Ana') $$,
  'O2 · el usuario anónimo acepta su invitación'
);

insert into tests.results(line) select is(
  (select count(*)::int from spaces),
  1,
  'O2 / PR-02 · el anónimo ve SOLO el espacio al que lo invitaron'
);

insert into tests.results(line) select throws_ok(
  $$ select app_activate_personal_account() $$,
  '42501',
  null,
  'Sin email no hay cuenta personal: el anónimo no la puede activar'
);

insert into tests.results(line) select throws_ok(
  $$ update profiles set has_personal_account = true
     where id = '44444444-4444-4444-4444-444444444444' $$,
  '42501',
  null,
  'Sin email no hay cuenta personal: tampoco tocando su perfil directo'
);


-- ───────────────────────────────────────────────────────────────────────────
-- SA-02 / CA-40 · al salir se pierde el acceso y el historial queda
-- ───────────────────────────────────────────────────────────────────────────

select tests.authenticate_as('22222222-2222-2222-2222-222222222222');
select app_leave_space(tests.get('casa_id')::uuid);

insert into tests.results(line) select is(
  (select count(*)::int from shared_expenses),
  0,
  'SA-02 / CA-40 · quien sale pierde el acceso al espacio'
);

select tests.authenticate_as('11111111-1111-1111-1111-111111111111');

insert into tests.results(line) select is(
  (select display_name from space_members
   where space_id = tests.get('casa_id')::uuid and slot = 2),
  'Martina',
  'K4 / CA-40 · el nombre de quien salió queda en el historial como ex miembro'
);

-- SA-06 · sin miembros con acceso, el espacio se elimina, y con él sus
-- gastos. El trigger de SY-02 se dispara en esa cascada: no tiene que trabar
-- la eliminación ni dejar registros de borrado sueltos.
select tests.authenticate_as('11111111-1111-1111-1111-111111111111');

insert into shared_expenses (
  space_id, amount, date, category,
  payer_slot, split_mode, share_slot_1, share_slot_2,
  created_by_slot, updated_by_slot
) values (
  tests.get('viaje_id')::uuid, 60000, '2026-10-12', 'otros',
  1, 'even', 30000, 30000, 1, 1
);

select tests.authenticate_as('33333333-3333-3333-3333-333333333333');
select app_leave_space(tests.get('viaje_id')::uuid);

select tests.authenticate_as('11111111-1111-1111-1111-111111111111');

insert into tests.results(line) select lives_ok(
  $$ select app_leave_space(tests.get('viaje_id')::uuid) $$,
  'SA-06 · el último en salir elimina el espacio aunque tenga gastos'
);

select tests.as_service();

insert into tests.results(line) select is(
  (select count(*)::int from deleted_shared_records
   where space_id = tests.get('viaje_id')::uuid),
  0,
  'SA-06 · eliminar el espacio entero no deja registros de borrado'
);


-- ───────────────────────────────────────────────────────────────────────────
-- D-01 por fuera de la app · el 10/10 se borró una usuaria desde el dashboard
-- y su lugar quedó 'active' sin nadie: no se la veía como ex miembro y no se
-- podía volver a invitar. Borre quien borre, valen las reglas de salida.
-- ───────────────────────────────────────────────────────────────────────────

select tests.as_service();
delete from auth.users where id = '44444444-4444-4444-4444-444444444444';

insert into tests.results(line) select is(
  (select status::text from space_members
   where space_id = tests.get('prueba_id')::uuid and slot = 2),
  'former',
  'D-01 · un usuario borrado por fuera de la app queda como ex miembro, no como un lugar activo vacío'
);


-- ───────────────────────────────────────────────────────────────────────────
-- P7 · se puede volver a invitar al lugar de un ex miembro (decisión 10/10)
-- §26 · el creador puede quitar el acceso de quien entró por error
-- ───────────────────────────────────────────────────────────────────────────

-- En Casa, Martina salió (SA-02): su lugar es de ex miembro.
select tests.authenticate_as('11111111-1111-1111-1111-111111111111');

insert into tests.results(line) select lives_ok(
  $$ select tests.put('token4', app_create_invitation(tests.get('casa_id')::uuid)) $$,
  'P7 · se puede volver a invitar al lugar de un ex miembro'
);

select tests.as_service();
insert into auth.users (id, email, instance_id, aud, role)
values ('55555555-5555-5555-5555-555555555555', 'sofia@example.com',
        '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated');
insert into profiles (id, display_name, has_personal_account)
values ('55555555-5555-5555-5555-555555555555', 'Sofía', false);

select tests.authenticate_as('55555555-5555-5555-5555-555555555555');

insert into tests.results(line) select lives_ok(
  $$ select app_accept_invitation(tests.get('token4'), 'Sofía') $$,
  'P7 · quien acepta ocupa el lugar del ex miembro'
);

insert into tests.results(line) select throws_ok(
  $$ select app_remove_member_access(tests.get('casa_id')::uuid) $$,
  '42501',
  null,
  '§26 · solo el creador puede quitar el acceso del otro (sin roles, §6)'
);

select tests.authenticate_as('11111111-1111-1111-1111-111111111111');

insert into tests.results(line) select lives_ok(
  $$ select app_remove_member_access(tests.get('casa_id')::uuid) $$,
  '§26 · el creador quita el acceso de quien entró por error'
);

insert into tests.results(line) select is(
  (select status::text from space_members
   where space_id = tests.get('casa_id')::uuid and slot = 2),
  'no_access',
  '§26 · el lugar vuelve a estar sin acceso: se puede invitar de nuevo'
);

select tests.authenticate_as('55555555-5555-5555-5555-555555555555');

insert into tests.results(line) select is(
  (select count(*)::int from spaces),
  0,
  '§26 · quien perdió el acceso deja de ver el espacio'
);


-- ───────────────────────────────────────────────────────────────────────────
-- Funciones internas · el 10/10, app_member_departs quedó ejecutable por anon y
-- authenticated: en Supabase, `revoke ... from public` NO saca los grants por
-- defecto, que van explícitos a esos roles. Siendo security definer, cualquiera
-- con el id de un espacio podía sacar a un miembro o borrar el espacio.
-- ───────────────────────────────────────────────────────────────────────────

select tests.as_service();

insert into tests.results(line) select is(
  (select bool_or(has_function_privilege(r.role, 'public.app_member_departs(uuid, smallint)', 'execute'))
   from (values ('anon'), ('authenticated')) as r(role)),
  false,
  'Interna · nadie desde la app puede ejecutar app_member_departs'
);

insert into tests.results(line) select is(
  (select count(*)::int from pg_proc p
   join pg_namespace n on n.oid = p.pronamespace
   where n.nspname = 'public' and p.proname like 'app\_%'
     and has_function_privilege('anon', p.oid, 'execute')),
  0,
  'Sin sesión no se ejecuta ninguna función de la app'
);


-- ───────────────────────────────────────────────────────────────────────────
-- Resultado
-- ───────────────────────────────────────────────────────────────────────────

select tests.as_service();
insert into tests.results(line) select * from finish();

-- Un assert fallido tiene que hacer FALLAR el comando, no solo imprimir
-- "not ok" y dejar que el build siga en verde.
do $$
declare
  fallidos text;
begin
  select string_agg(line, E'\n  ')
  into fallidos
  from tests.results
  where line like 'not ok%';

  if fallidos is not null then
    raise exception E'PRIVACIDAD: hay asserts fallidos\n  %', fallidos;
  end if;
end;
$$;

-- Output TAP completo, para leer qué se verificó.
select line from tests.results order by id;

rollback;
