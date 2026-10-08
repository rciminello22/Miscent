-- ───────────────────────────────────────────────────────────────────────────
-- Radar · esquema base
--
-- Principio rector (§7.4): la app guarda HECHOS y calcula todo lo demás.
-- Acá no hay ninguna tabla de ocurrencias, de radar, de resúmenes ni de
-- saldos: todo eso se calcula en el dominio a partir de estos hechos.
--
-- G-02 · los montos son enteros de pesos. Nunca numeric, nunca centavos.
-- G-01 · las fechas de negocio son DATE, no timestamptz: el mes es el mes
--        calendario del usuario y una hora de más haría que dos miembros
--        vieran saldos distintos. Los timestamps de auditoría sí llevan zona.
-- ───────────────────────────────────────────────────────────────────────────

create extension if not exists "pgcrypto";

-- Un mes se guarda como 'YYYY-MM', igual que en el dominio TypeScript.
create domain month_text as text check (value ~ '^\d{4}-(0[1-9]|1[0-2])$');

-- P13 · categorías fijas.
create type category as enum (
  'supermercado', 'alquiler', 'expensas', 'servicios', 'internet', 'celular',
  'transporte', 'salud', 'farmacia', 'educacion', 'hogar', 'gastronomia',
  'ocio', 'suscripciones', 'gimnasio', 'ropa', 'mascotas', 'impuestos',
  'regalos', 'otros', 'sueldo', 'extra'
);

create type payment_method_kind as enum ('cash', 'debit', 'wallet', 'transfer', 'other', 'card');
create type movement_kind as enum ('expense', 'income');
create type split_mode as enum ('even', 'custom');
create type member_status as enum ('no_access', 'active', 'former');
create type invitation_status as enum ('active', 'used', 'expired', 'revoked');


-- ───────────────────────────────────────────────────────────────────────────
-- Usuario y cuenta personal
-- ───────────────────────────────────────────────────────────────────────────

-- §7.4 · un usuario tiene identidad propia; la cuenta personal es opcional
-- y se activa explícitamente (A-02, K0).
create table profiles (
  id uuid primary key references auth.users on delete cascade,
  display_name text not null check (length(trim(display_name)) between 1 and 60),
  -- A-02 · false mientras sea un invitado sin cuenta personal (Estado B).
  has_personal_account boolean not null default false,
  timezone text not null default 'America/Argentina/Buenos_Aires',
  created_at timestamptz not null default now()
);

comment on column profiles.display_name is
  'K7 · lo único que ve el otro miembro. El email NUNCA se expone.';


-- §7.4 · Medio de pago. T-01: sin saldo, sin límite, sin crédito disponible.
create table payment_methods (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references profiles on delete cascade,
  kind payment_method_kind not null,
  name text not null check (length(trim(name)) between 1 and 60),
  -- T-02 · solo tarjetas. NULL significa "No sé" → modo aproximado (T-05).
  closing_day smallint check (closing_day between 1 and 31),
  due_day smallint check (due_day between 1 and 31),
  archived boolean not null default false,
  created_at timestamptz not null default now(),
  -- Solo una tarjeta puede tener días de cierre o vencimiento.
  constraint days_only_on_cards check (
    kind = 'card' or (closing_day is null and due_day is null)
  )
);

create index payment_methods_user_idx on payment_methods (user_id);


-- T-07 · resumen pendiente declarado al activar la cuenta personal.
create table declared_statements (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references profiles on delete cascade,
  payment_method_id uuid not null references payment_methods on delete cascade,
  amount integer not null check (amount > 0),
  due_date date not null,
  created_at timestamptz not null default now()
);

create index declared_statements_user_idx on declared_statements (user_id);


-- ───────────────────────────────────────────────────────────────────────────
-- Espacios compartidos
-- ───────────────────────────────────────────────────────────────────────────

-- §7.4 · E-01: exactamente dos miembros. Nunca más, nunca grupos.
create table spaces (
  id uuid primary key default gen_random_uuid(),
  name text not null check (length(trim(name)) between 1 and 60),
  -- E-07 · saldo inicial opcional, expresado siempre a favor del slot 1.
  initial_balance integer not null default 0,
  created_at timestamptz not null default now()
);


-- §7.2 · "Miembro: cada uno de los dos lugares de un espacio".
-- Modelamos los dos lugares como slots 1 y 2 en vez de una tabla genérica de
-- participantes: la spec cierra el número en dos (K0) y con slots el saldo es
-- un escalar con signo y las partes son dos columnas con un CHECK.
create table space_members (
  space_id uuid not null references spaces on delete cascade,
  slot smallint not null check (slot in (1, 2)),
  -- E-02 · NULL mientras el lugar no fue ocupado (miembro sin acceso).
  user_id uuid references profiles on delete set null,
  display_name text not null check (length(trim(display_name)) between 1 and 60),
  status member_status not null default 'no_access',
  is_creator boolean not null default false,
  joined_at timestamptz,
  left_at timestamptz,
  primary key (space_id, slot)
);

-- Un usuario no puede ocupar los dos lugares del mismo espacio.
create unique index space_members_unique_user
  on space_members (space_id, user_id)
  where user_id is not null;

create index space_members_user_idx on space_members (user_id) where user_id is not null;

comment on table space_members is
  'E-01 · exactamente dos lugares por espacio. SA-02 · al salir, status pasa a '
  '"former" y el display_name queda en el historial (K4).';


-- §7.4 · Gasto compartido. C-01: pertenece al espacio, no a quien lo cargó.
create table shared_expenses (
  id uuid primary key default gen_random_uuid(),
  space_id uuid not null references spaces on delete cascade,
  amount integer not null check (amount > 0),
  date date not null,
  category category not null,
  description text check (length(description) <= 140),

  -- G-06 · quién fue DECLARADO como pagador. La app no lo verifica.
  payer_slot smallint not null check (payer_slot in (1, 2)),

  -- P3 · 50/50 o personalizado por monto. Sin porcentajes.
  split_mode split_mode not null default 'even',
  share_slot_1 integer not null check (share_slot_1 >= 0),
  share_slot_2 integer not null check (share_slot_2 >= 0),

  -- Q · plan de cuotas. NULL si es de un solo pago.
  installments_count smallint check (installments_count >= 2),
  -- La fecha de impacto de una cuota deriva del vencimiento de la tarjeta de
  -- quien pagó, que el otro miembro NO puede ver (PR-02). Por eso el
  -- cronograma se persiste como hecho compartido: así los dos llegan al mismo
  -- saldo sin que nadie vea la tarjeta ajena. Q-04 ya lo trata como editable.
  first_installment_month month_text,
  installment_impact_day smallint check (installment_impact_day between 1 and 31),
  installments_approximate boolean not null default false,

  -- K3 · autoría visible.
  created_by_slot smallint not null check (created_by_slot in (1, 2)),
  updated_by_slot smallint not null check (updated_by_slot in (1, 2)),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),

  -- C-02 · las partes suman EXACTAMENTE el total. Un reparto mal calculado
  -- no puede llegar a la base: en una app de plata, eso sería un saldo falso.
  constraint shares_sum_total check (share_slot_1 + share_slot_2 = amount),
  -- Si hay cuotas, hay cronograma.
  constraint installment_plan_complete check (
    installments_count is null
    or first_installment_month is not null
  )
);

create index shared_expenses_space_idx on shared_expenses (space_id, date);


-- §7.4 · Detalle privado de pago: con qué pagó un miembro.
-- Tabla separada porque lleva su propia política de RLS: es el único dato que
-- dos personas con acceso al mismo espacio ven de forma asimétrica (C-05).
create table shared_payment_details (
  -- Id del gasto compartido o del recurrente compartido.
  source_id uuid not null,
  space_id uuid not null references spaces on delete cascade,
  slot smallint not null check (slot in (1, 2)),
  payment_method_id uuid not null references payment_methods on delete cascade,
  primary key (source_id, slot)
);

comment on table shared_payment_details is
  'PR-02 · "Con qué medio o tarjeta pagó un gasto compartido" lo ve SOLO quien '
  'pagó. CA-12: el otro ve "pagó [nombre]" y nunca la tarjeta.';


-- §7.4 · Gasto recurrente ("Fijo"). Personal o compartido, nunca las dos cosas.
create table recurrences (
  id uuid primary key default gen_random_uuid(),
  kind movement_kind not null,
  amount integer not null check (amount > 0),
  category category not null,
  day_of_month smallint not null check (day_of_month between 1 and 31),
  start_month month_text not null,
  -- F-03 · "Dejar de pagarlo desde…". SA-04 lo usa al salir de un espacio.
  end_month month_text,

  -- Exactamente uno de los dos.
  owner_user_id uuid references profiles on delete cascade,
  space_id uuid references spaces on delete cascade,

  -- Medio de pago. En un recurrente compartido es un detalle PRIVADO de quien
  -- paga (ver shared_payment_details): §21 no lo menciona, pero F-01 exige que
  -- una ocurrencia con tarjeta entre en el resumen que corresponde.
  payment_method_id uuid references payment_methods on delete set null,

  -- Solo si es compartido.
  payer_slot smallint check (payer_slot in (1, 2)),
  split_mode split_mode,
  share_slot_1 integer check (share_slot_1 >= 0),
  share_slot_2 integer check (share_slot_2 >= 0),

  created_at timestamptz not null default now(),

  constraint personal_xor_shared check (
    (owner_user_id is not null and space_id is null)
    or (owner_user_id is null and space_id is not null)
  ),
  constraint shared_needs_payer check (
    space_id is null or (payer_slot is not null and split_mode is not null)
  ),
  -- §18 · no existen ingresos compartidos.
  constraint no_shared_income check (space_id is null or kind = 'expense'),
  constraint custom_shares_sum_total check (
    split_mode is distinct from 'custom'
    or share_slot_1 + share_slot_2 = amount
  ),
  constraint end_after_start check (end_month is null or end_month >= start_month)
);

create index recurrences_owner_idx on recurrences (owner_user_id) where owner_user_id is not null;
create index recurrences_space_idx on recurrences (space_id) where space_id is not null;


-- F-03 · "Este mes fue distinto": ajuste de un mes de un recurrente.
create table recurrence_overrides (
  recurrence_id uuid not null references recurrences on delete cascade,
  month month_text not null,
  amount integer not null check (amount > 0),
  primary key (recurrence_id, month)
);


-- §7.4 · Movimiento personal: gasto o ingreso con destino "Solo yo".
create table personal_movements (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references profiles on delete cascade,
  kind movement_kind not null,
  amount integer not null check (amount > 0),
  date date not null,
  category category not null,
  description text check (length(description) <= 140),
  payment_method_id uuid references payment_methods on delete set null,

  installments_count smallint check (installments_count >= 2),
  first_installment_month month_text,
  installment_impact_day smallint check (installment_impact_day between 1 and 31),
  installments_approximate boolean not null default false,

  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),

  -- Los ingresos no tienen medio de pago ni cuotas.
  constraint income_is_simple check (
    kind = 'expense'
    or (payment_method_id is null and installments_count is null)
  ),
  constraint installment_plan_complete check (
    installments_count is null or first_installment_month is not null
  )
);

create index personal_movements_user_idx on personal_movements (user_id, date);


-- §7.4 · Pago entre miembros. P-04: solo mueve el saldo compartido.
create table member_payments (
  id uuid primary key default gen_random_uuid(),
  space_id uuid not null references spaces on delete cascade,
  from_slot smallint not null check (from_slot in (1, 2)),
  to_slot smallint not null check (to_slot in (1, 2)),
  amount integer not null check (amount > 0),
  date date not null,
  recorded_by_slot smallint not null check (recorded_by_slot in (1, 2)),
  created_at timestamptz not null default now(),
  constraint different_members check (from_slot <> to_slot)
);

create index member_payments_space_idx on member_payments (space_id, date);


-- I-02 · invitación de un solo uso, 7 días, regenerable.
create table invitations (
  id uuid primary key default gen_random_uuid(),
  space_id uuid not null references spaces on delete cascade,
  target_slot smallint not null check (target_slot in (1, 2)),
  -- Solo el hash: el token vive únicamente en el enlace que el usuario comparte.
  token_hash text not null unique,
  status invitation_status not null default 'active',
  expires_at timestamptz not null,
  created_by uuid not null references profiles on delete cascade,
  created_at timestamptz not null default now(),
  used_at timestamptz
);

-- K6 · a lo sumo una invitación activa por lugar: la nueva anula la anterior.
create unique index invitations_one_active
  on invitations (space_id, target_slot)
  where status = 'active';


-- ───────────────────────────────────────────────────────────────────────────
-- Invariantes que no pueden expresarse con un CHECK de columna
-- ───────────────────────────────────────────────────────────────────────────

-- E-01 · un espacio nunca tiene más de dos miembros.
create or replace function enforce_two_members() returns trigger
language plpgsql as $$
begin
  if (select count(*) from space_members where space_id = new.space_id) > 2 then
    raise exception 'E-01: un espacio tiene exactamente dos miembros';
  end if;
  return new;
end;
$$;

create constraint trigger space_members_max_two
  after insert on space_members
  deferrable initially deferred
  for each row execute function enforce_two_members();


-- X-01 · editar un hecho recalcula lo que depende de él. Acá solo registramos
-- cuándo cambió; el recálculo es del dominio, que nunca persiste resultados.
create or replace function touch_updated_at() returns trigger
language plpgsql as $$
begin
  new.updated_at := now();
  return new;
end;
$$;

create trigger shared_expenses_touch
  before update on shared_expenses
  for each row execute function touch_updated_at();

create trigger personal_movements_touch
  before update on personal_movements
  for each row execute function touch_updated_at();
