-- ───────────────────────────────────────────────────────────────────────────
-- Nivel 2 de testing · autorización
--
-- Estos tests son la razón por la que el backend es Postgres. §34 dice que
-- solo se promete lo que se puede cumplir Y VERIFICAR: acá se verifica.
--
-- Cada test actúa como un usuario real cambiando el claim del JWT, con el rol
-- `authenticated`, igual que un cliente de la app. No hay atajos: si una
-- política está mal, el test lo ve.
--
-- Cubre: PR-01, PR-02, CA-11, CA-12, CA-13, CA-47, CA-48 y la asimetría de
-- shared_payment_details.
--
--   npx supabase test db
-- ───────────────────────────────────────────────────────────────────────────

begin;

create extension if not exists pgtap with schema extensions;

select plan(24);

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

create or replace function tests.as_service()
returns void language plpgsql as $$
begin
  perform set_config('role', 'postgres', true);
  perform set_config('request.jwt.claims', null, true);
end;
$$;

\set renzo_id '''11111111-1111-1111-1111-111111111111'''
\set martina_id '''22222222-2222-2222-2222-222222222222'''
\set juan_id '''33333333-3333-3333-3333-333333333333'''

insert into auth.users (id, email, instance_id, aud, role)
values
  (:renzo_id,   'renzo@example.com',   '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated'),
  (:martina_id, 'martina@example.com', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated'),
  (:juan_id,    'juan@example.com',    '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated');

insert into profiles (id, display_name, has_personal_account)
values
  (:renzo_id,   'Renzo',   true),
  (:martina_id, 'Martina', false),   -- Estado B: invitada sin cuenta personal
  (:juan_id,    'Juan',    true);

-- La Visa de Renzo y la cuenta personal que Martina no debe poder ver.
insert into payment_methods (id, user_id, kind, name, closing_day, due_day)
values ('aaaaaaaa-0000-0000-0000-000000000001', :renzo_id, 'card', 'Visa Galicia', 25, 5);

insert into personal_movements (user_id, kind, amount, date, category)
values
  (:renzo_id, 'income',  1200000, '2026-10-05', 'sueldo'),
  (:renzo_id, 'expense',   80000, '2026-10-15', 'otros');

insert into declared_statements (user_id, payment_method_id, amount, due_date)
values (:renzo_id, 'aaaaaaaa-0000-0000-0000-000000000001', 180000, '2026-10-05');


-- ───────────────────────────────────────────────────────────────────────────
-- P5 / CA-47 · crear un espacio requiere cuenta personal
-- ───────────────────────────────────────────────────────────────────────────

select tests.authenticate_as(:martina_id);

select throws_ok(
  $$ select app_create_space('Mi espacio', 'Alguien') $$,
  'P5: para crear un espacio necesitás tu cuenta personal',
  'CA-47 · un usuario sin cuenta personal NO puede crear espacios'
);

select tests.authenticate_as(:renzo_id);

select lives_ok(
  $$ select app_create_space('Casa', 'Martina') $$,
  'P5 · un usuario con cuenta personal sí puede crear un espacio'
);

select tests.as_service();

-- Guardamos el id del espacio para el resto de los tests.
create temporary table ctx as
select id as casa_id from spaces where name = 'Casa';

select is(
  (select count(*)::int from space_members where space_id = (select casa_id from ctx)),
  2,
  'E-01 · el espacio se crea con exactamente dos miembros'
);

select is(
  (select status::text from space_members where space_id = (select casa_id from ctx) and slot = 2),
  'no_access',
  'E-02 · el segundo miembro arranca sin acceso'
);


-- ───────────────────────────────────────────────────────────────────────────
-- CA-13 · nadie ve el email, ni si el otro tiene cuenta personal
-- ───────────────────────────────────────────────────────────────────────────

select tests.authenticate_as(:martina_id);

select is(
  (select count(*)::int from profiles),
  1,
  'CA-13 · un usuario solo lee su propio perfil (ni email ni has_personal_account del otro)'
);

select is(
  (select count(*)::int from profiles where id = :renzo_id),
  0,
  'CA-13 · el perfil del otro miembro es invisible'
);


-- ───────────────────────────────────────────────────────────────────────────
-- CA-11 / PR-02 · la cuenta personal de Renzo es invisible para Martina
-- ───────────────────────────────────────────────────────────────────────────

select is(
  (select count(*)::int from payment_methods),
  0,
  'T-01 / CA-12 · las tarjetas de Renzo no existen para Martina'
);

select is(
  (select count(*)::int from personal_movements),
  0,
  'CA-11 · los gastos e ingresos personales de Renzo no existen para Martina'
);

select is(
  (select count(*)::int from declared_statements),
  0,
  'T-07 / PR-02 · el resumen pendiente declarado de Renzo es privado'
);

select is(
  (select coalesce(sum(amount), 0)::int from personal_movements),
  0,
  'CA-11 · tampoco aparece en ningún total del otro miembro'
);


-- ───────────────────────────────────────────────────────────────────────────
-- I-02 / I-05 · la invitación es de un solo uso y 7 días
-- ───────────────────────────────────────────────────────────────────────────

select tests.authenticate_as(:renzo_id);

create temporary table invite as
select app_create_invitation((select casa_id from ctx)) as token;

select ok(
  (select length(token) > 20 from invite),
  'I-02 · la invitación devuelve un token en claro una sola vez'
);

select tests.as_service();

select is(
  (select count(*)::int from invitations where token_hash = (select token from invite)),
  0,
  'I-02 · en la base queda el hash, nunca el token en claro'
);


-- Martina acepta.
select tests.authenticate_as(:martina_id);

select lives_ok(
  $$ select app_accept_invitation((select token from invite)) $$,
  'I-04 / K8 · al aceptar, ocupa el lugar y ve el historial del espacio'
);

select throws_ok(
  $$ select app_accept_invitation((select token from invite)) $$,
  'INVITATION_USED',
  'I-02 / CA-22 · el mismo enlace no sirve dos veces'
);

select tests.as_service();

select is(
  (select has_personal_account from profiles where id = :martina_id),
  false,
  'I-07 / A-03 / CA-05 · aceptar una invitación NUNCA activa una cuenta personal'
);


-- ───────────────────────────────────────────────────────────────────────────
-- PR-01 · dentro del espacio, los dos ven lo cargado ahí
-- ───────────────────────────────────────────────────────────────────────────

select tests.authenticate_as(:renzo_id);

-- Supermercado $100.000, pagó Renzo (slot 1), 50/50, con la Visa.
insert into shared_expenses (
  id, space_id, amount, date, category, description,
  payer_slot, split_mode, share_slot_1, share_slot_2,
  created_by_slot, updated_by_slot
) values (
  'bbbbbbbb-0000-0000-0000-000000000001',
  (select casa_id from ctx), 100000, '2026-10-20', 'supermercado', 'Supermercado',
  1, 'even', 50000, 50000, 1, 1
);

-- C-05 · con qué pagó: detalle PRIVADO de Renzo.
insert into shared_payment_details (source_id, space_id, slot, payment_method_id)
values (
  'bbbbbbbb-0000-0000-0000-000000000001',
  (select casa_id from ctx), 1,
  'aaaaaaaa-0000-0000-0000-000000000001'
);

select is(
  (select count(*)::int from shared_payment_details),
  1,
  'C-05 · quien pagó ve con qué pagó'
);

select tests.authenticate_as(:martina_id);

select is(
  (select count(*)::int from shared_expenses),
  1,
  'PR-01 · Martina ve el gasto compartido: monto, fecha, quién pagó y el reparto'
);

-- Acá está el test más fino de todo el esquema: dos personas con acceso al
-- MISMO espacio, visibilidad asimétrica sobre filas hermanas.
select is(
  (select count(*)::int from shared_payment_details),
  0,
  'CA-12 / PR-02 · Martina ve "pagó Renzo" y NUNCA la tarjeta'
);

select is(
  (select count(*)::int from payment_methods),
  0,
  'CA-12 · la Visa de Renzo sigue siendo invisible aunque pagó un gasto compartido'
);

-- K3 / X-02 · los dos miembros editan cualquier registro del espacio.
select lives_ok(
  $$ update shared_expenses
     set amount = 120000, share_slot_1 = 60000, share_slot_2 = 60000, updated_by_slot = 2
     where id = 'bbbbbbbb-0000-0000-0000-000000000001' $$,
  'K3 / X-02 · los dos miembros con acceso editan los registros del espacio'
);

-- C-02 · la base rechaza un reparto que no suma el total.
select throws_ok(
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

select tests.authenticate_as(:renzo_id);

create temporary table viaje as
select app_create_space('Viaje', 'Martina') as viaje_id;

create temporary table invite2 as
select app_create_invitation((select viaje_id from viaje)) as token;

select tests.authenticate_as(:martina_id);

select throws_like(
  $$ select app_accept_invitation((select token from invite2)) $$,
  'ALREADY_SHARING:Casa%',
  'CA-48 · "Ya compartís Casa con Renzo": la invitación no se acepta'
);

-- Caso 17 · Juan sí puede, porque no comparte ningún espacio con Renzo.
select tests.authenticate_as(:juan_id);

select lives_ok(
  $$ select app_accept_invitation((select token from invite2)) $$,
  'K1 / Caso 17 · un usuario puede tener varios espacios, con personas distintas'
);

-- PR-02 · Martina no ve Viaje, ni que existe.
select tests.authenticate_as(:martina_id);

select is(
  (select count(*)::int from spaces),
  1,
  'PR-02 / CA-13 · Martina no ve los otros espacios de Renzo, ni que existen'
);


-- ───────────────────────────────────────────────────────────────────────────
-- SA-02 / CA-40 · al salir se pierde el acceso y el historial queda
-- ───────────────────────────────────────────────────────────────────────────

select tests.authenticate_as(:martina_id);
select app_leave_space((select casa_id from ctx));

select is(
  (select count(*)::int from shared_expenses),
  0,
  'SA-02 / CA-40 · quien sale pierde el acceso al espacio'
);

select tests.authenticate_as(:renzo_id);

select is(
  (select display_name from space_members
   where space_id = (select casa_id from ctx) and slot = 2),
  'Martina',
  'K4 / CA-40 · el nombre de quien salió queda en el historial como ex miembro'
);

select * from finish();

rollback;
