-- ───────────────────────────────────────────────────────────────────────────
-- Revisión de lo que carga el otro (opción B, decidida el 14/10)
--
-- Lo que carga Martina cuenta enseguida y es igual para los dos (un solo
-- saldo), pero Renzo lo ve marcado "Lo cargó Martina · para revisar" hasta
-- que lo mira. Complementa K3 (los dos crean, editan y eliminan): no es un
-- permiso, es visibilidad. Se descartó "solo cuenta si lo aceptás": inflaba
-- Sin asignar y partía el saldo en dos verdades.
--
-- 1. recurrences.created_by_slot · los fijos compartidos no guardaban quién
--    los cargó. Lo pone un trigger del servidor, no la app.
-- 2. record_reviews · qué revisó cada uno y cuándo. Asimétrica, como
--    shared_payment_details: cada uno ve SOLO las suyas, y se escribe solo
--    por app_mark_reviewed, así nadie marca revisado en nombre del otro.
--
-- "Pendiente" lo calcula la app: un registro del otro (o editado por el otro)
-- que no revisé desde su último cambio. Comparar contra updated_at funciona
-- porque las dos fechas las pone el servidor.
-- ───────────────────────────────────────────────────────────────────────────

alter table recurrences
  add column created_by_slot smallint check (created_by_slot in (1, 2));

create or replace function app_set_recurrence_creator()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  -- Solo los compartidos. El servidor lo deduce de la sesión: un cliente no
  -- puede decir que lo cargó el otro.
  if new.space_id is not null then
    new.created_by_slot := app_my_slot(new.space_id);
  end if;
  return new;
end;
$$;

revoke all on function app_set_recurrence_creator() from public, anon, authenticated;

create trigger recurrences_set_creator
  before insert on recurrences
  for each row execute function app_set_recurrence_creator();


create table record_reviews (
  space_id uuid not null references spaces on delete cascade,
  -- Un gasto, un fijo o un pago del espacio. Sin FK: son tres tablas.
  source_id uuid not null,
  slot smallint not null check (slot in (1, 2)),
  reviewed_at timestamptz not null default now(),
  primary key (source_id, slot)
);

alter table record_reviews enable row level security;

-- Cada uno lee las suyas. Sin políticas de escritura: solo la función.
create policy "record_reviews: cada uno las suyas" on record_reviews
  for select using (slot = app_my_slot(space_id));


-- "Está bien": marca como revisados uno o varios registros del espacio.
create or replace function app_mark_reviewed(target_space_id uuid, source_ids uuid[])
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  my_slot_value smallint;
begin
  my_slot_value := app_my_slot(target_space_id);
  if my_slot_value is null then
    raise exception 'No sos miembro de este espacio' using errcode = 'insufficient_privilege';
  end if;

  insert into record_reviews (space_id, source_id, slot)
  select target_space_id, source_id, my_slot_value
  from unnest(source_ids) as source_id
  on conflict (source_id, slot) do update set reviewed_at = now();
end;
$$;

-- Nacen cerradas (0012): se abre solo para quien tiene sesión.
grant execute on function app_mark_reviewed(uuid, uuid[]) to authenticated;
