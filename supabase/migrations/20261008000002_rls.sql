-- ───────────────────────────────────────────────────────────────────────────
-- Radar · Row Level Security
--
-- Esta migración es la implementación de PR-01 y PR-02, y la razón por la que
-- el backend es Postgres: §34 pide que la privacidad sea una promesa que se
-- pueda cumplir y verificar. Acá la autorización vive en la base, no en la
-- interfaz. Si un cliente pide `select * from payment_methods`, Postgres le
-- devuelve solo las suyas.
--
-- PR-01 · ningún dato personal pasa a un espacio salvo lo cargado ahí.
-- PR-02 · nunca se muestran al otro miembro tarjetas, medios, ingresos,
--         gastos personales, otros espacios, si tiene cuenta personal ni
--         cifras de su radar.
-- ───────────────────────────────────────────────────────────────────────────

alter table profiles              enable row level security;
alter table payment_methods       enable row level security;
alter table declared_statements   enable row level security;
alter table personal_movements    enable row level security;
alter table recurrences           enable row level security;
alter table recurrence_overrides  enable row level security;
alter table spaces                enable row level security;
alter table space_members         enable row level security;
alter table shared_expenses       enable row level security;
alter table shared_payment_details enable row level security;
alter table member_payments       enable row level security;
alter table invitations           enable row level security;


-- ───────────────────────────────────────────────────────────────────────────
-- Funciones de acceso
--
-- SECURITY DEFINER es obligatorio: sin eso, la política de space_members que
-- consulta space_members entraría en recursión infinita.
-- ───────────────────────────────────────────────────────────────────────────

-- Espacios donde el usuario actual es miembro CON ACCESO.
-- SA-02 · un ex miembro (status 'former') no aparece: perdió el acceso.
create or replace function app_my_space_ids()
returns setof uuid
language sql
security definer
stable
set search_path = public
as $$
  select space_id
  from space_members
  where user_id = auth.uid()
    and status = 'active';
$$;

-- El slot que ocupa el usuario actual en un espacio.
create or replace function app_my_slot(target_space_id uuid)
returns smallint
language sql
security definer
stable
set search_path = public
as $$
  select slot
  from space_members
  where space_id = target_space_id
    and user_id = auth.uid()
    and status = 'active';
$$;

-- A-06 / P5 · crear un espacio requiere cuenta personal.
create or replace function app_has_personal_account()
returns boolean
language sql
security definer
stable
set search_path = public
as $$
  select coalesce((select has_personal_account from profiles where id = auth.uid()), false);
$$;

revoke all on function app_my_space_ids() from public;
revoke all on function app_my_slot(uuid) from public;
revoke all on function app_has_personal_account() from public;
grant execute on function app_my_space_ids() to authenticated;
grant execute on function app_my_slot(uuid) to authenticated;
grant execute on function app_has_personal_account() to authenticated;


-- ───────────────────────────────────────────────────────────────────────────
-- profiles
--
-- CA-13 · ningún miembro ve el email, los ingresos, las tarjetas, otros
-- espacios, las cifras del radar NI SI EL OTRO TIENE CUENTA PERSONAL.
--
-- Por eso un usuario solo lee su propio profile: `has_personal_account` vive
-- acá y exponer la fila del otro lo filtraría. El nombre visible del otro
-- miembro no hace falta buscarlo acá: vive en space_members.display_name,
-- que es justamente el dato que §7.2 define como compartido (K7).
-- ───────────────────────────────────────────────────────────────────────────

create policy "profiles: solo el propio" on profiles
  for select using (id = auth.uid());

create policy "profiles: cada uno crea el suyo" on profiles
  for insert with check (id = auth.uid());

create policy "profiles: cada uno edita el suyo" on profiles
  for update using (id = auth.uid()) with check (id = auth.uid());

create policy "profiles: cada uno borra el suyo" on profiles
  for delete using (id = auth.uid());


-- ───────────────────────────────────────────────────────────────────────────
-- Cuenta personal · privada por defecto (K2)
--
-- T-01 · las tarjetas pertenecen a la cuenta personal y NUNCA se muestran al
-- otro miembro. CA-11 · un gasto personal no aparece en ninguna pantalla ni
-- total del otro miembro.
-- ───────────────────────────────────────────────────────────────────────────

create policy "payment_methods: solo su dueño" on payment_methods
  for all using (user_id = auth.uid()) with check (user_id = auth.uid());

create policy "declared_statements: solo su dueño" on declared_statements
  for all using (user_id = auth.uid()) with check (user_id = auth.uid());

create policy "personal_movements: solo su dueño" on personal_movements
  for all using (user_id = auth.uid()) with check (user_id = auth.uid());


-- ───────────────────────────────────────────────────────────────────────────
-- Espacios compartidos · solo lo cargado ahí (PR-01)
-- ───────────────────────────────────────────────────────────────────────────

create policy "spaces: solo los míos" on spaces
  for select using (id in (select app_my_space_ids()));

-- E-03 · el nombre lo cambia cualquier miembro con acceso.
create policy "spaces: los miembros renombran" on spaces
  for update using (id in (select app_my_space_ids()))
  with check (id in (select app_my_space_ids()));

-- Los espacios se crean con app_create_space(), que valida P5. Sin política
-- de insert, nadie puede crear uno salteándose esa validación.


create policy "space_members: solo los de mis espacios" on space_members
  for select using (space_id in (select app_my_space_ids()));

-- SA-01 · salir de un espacio es la única edición que un miembro hace sobre
-- su propia fila; se hace con app_leave_space().


-- K3 / X-02 · los dos miembros con acceso crean, editan y eliminan cualquier
-- registro del espacio.
create policy "shared_expenses: los miembros leen" on shared_expenses
  for select using (space_id in (select app_my_space_ids()));

create policy "shared_expenses: los miembros crean" on shared_expenses
  for insert with check (
    space_id in (select app_my_space_ids())
    -- K3 · la autoría se registra, y no se puede falsear.
    and created_by_slot = app_my_slot(space_id)
    and updated_by_slot = app_my_slot(space_id)
  );

create policy "shared_expenses: los miembros editan" on shared_expenses
  for update using (space_id in (select app_my_space_ids()))
  with check (
    space_id in (select app_my_space_ids())
    and updated_by_slot = app_my_slot(space_id)
  );

create policy "shared_expenses: los miembros eliminan" on shared_expenses
  for delete using (space_id in (select app_my_space_ids()));


-- ───────────────────────────────────────────────────────────────────────────
-- shared_payment_details · la política más fina de todo el esquema
--
-- Es el único lugar donde dos personas con acceso al mismo espacio tienen
-- visibilidad ASIMÉTRICA sobre filas hermanas: cada una ve únicamente con qué
-- pagó ella (C-05, PR-02, CA-12).
-- ───────────────────────────────────────────────────────────────────────────

create policy "shared_payment_details: solo quien pagó" on shared_payment_details
  for select using (
    space_id in (select app_my_space_ids())
    and slot = app_my_slot(space_id)
  );

create policy "shared_payment_details: solo quien pagó lo registra" on shared_payment_details
  for insert with check (
    space_id in (select app_my_space_ids())
    and slot = app_my_slot(space_id)
    -- El medio de pago tiene que ser del propio usuario.
    and payment_method_id in (select id from payment_methods where user_id = auth.uid())
  );

create policy "shared_payment_details: solo quien pagó lo cambia" on shared_payment_details
  for update using (
    space_id in (select app_my_space_ids())
    and slot = app_my_slot(space_id)
  )
  with check (
    slot = app_my_slot(space_id)
    and payment_method_id in (select id from payment_methods where user_id = auth.uid())
  );

create policy "shared_payment_details: solo quien pagó lo borra" on shared_payment_details
  for delete using (
    space_id in (select app_my_space_ids())
    and slot = app_my_slot(space_id)
  );


-- ───────────────────────────────────────────────────────────────────────────
-- recurrences · personales o del espacio, nunca visibles cruzadas
-- ───────────────────────────────────────────────────────────────────────────

create policy "recurrences: propios o de mis espacios" on recurrences
  for select using (
    owner_user_id = auth.uid()
    or space_id in (select app_my_space_ids())
  );

create policy "recurrences: crear propio o en mi espacio" on recurrences
  for insert with check (
    (owner_user_id = auth.uid() and space_id is null)
    or (owner_user_id is null and space_id in (select app_my_space_ids()))
  );

create policy "recurrences: editar propio o de mi espacio" on recurrences
  for update using (
    owner_user_id = auth.uid()
    or space_id in (select app_my_space_ids())
  )
  with check (
    owner_user_id = auth.uid()
    or space_id in (select app_my_space_ids())
  );

create policy "recurrences: eliminar propio o de mi espacio" on recurrences
  for delete using (
    owner_user_id = auth.uid()
    or space_id in (select app_my_space_ids())
  );


create policy "recurrence_overrides: siguen al recurrente" on recurrence_overrides
  for all using (
    recurrence_id in (
      select id from recurrences
      where owner_user_id = auth.uid() or space_id in (select app_my_space_ids())
    )
  )
  with check (
    recurrence_id in (
      select id from recurrences
      where owner_user_id = auth.uid() or space_id in (select app_my_space_ids())
    )
  );


-- ───────────────────────────────────────────────────────────────────────────
-- member_payments · P-02: lo registra cualquier miembro con acceso
-- ───────────────────────────────────────────────────────────────────────────

create policy "member_payments: los miembros leen" on member_payments
  for select using (space_id in (select app_my_space_ids()));

create policy "member_payments: los miembros registran" on member_payments
  for insert with check (
    space_id in (select app_my_space_ids())
    and recorded_by_slot = app_my_slot(space_id)
  );

create policy "member_payments: los miembros editan" on member_payments
  for update using (space_id in (select app_my_space_ids()))
  with check (space_id in (select app_my_space_ids()));

create policy "member_payments: los miembros eliminan" on member_payments
  for delete using (space_id in (select app_my_space_ids()));


-- ───────────────────────────────────────────────────────────────────────────
-- invitations
--
-- Quien acepta todavía NO es miembro, así que no puede leer la invitación por
-- SELECT: la acepta con app_accept_invitation(token), que valida I-02 e I-06.
-- Acá solo se expone lo que el creador necesita ver de las suyas (§26).
-- ───────────────────────────────────────────────────────────────────────────

create policy "invitations: los miembros ven las de su espacio" on invitations
  for select using (space_id in (select app_my_space_ids()));

create policy "invitations: los miembros las anulan" on invitations
  for update using (space_id in (select app_my_space_ids()))
  with check (space_id in (select app_my_space_ids()));
