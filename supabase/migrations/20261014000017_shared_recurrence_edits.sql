-- ───────────────────────────────────────────────────────────────────────────
-- §21 · editar un fijo compartido, y que lo vea el otro (14/10)
--
-- "Lo crean, editan y detienen los dos miembros" (§21, K3). Para que una
-- edición de Martina vuelva a poner el fijo "para revisar" en Renzo (opción
-- B), el fijo tiene que saber quién lo cambió y cuándo, igual que un gasto.
--
-- 1. recurrences.updated_by_slot y updated_at. Los pone el servidor: un
--    cliente no puede decir que lo editó el otro.
-- 2. Un ajuste de un mes ("Este mes fue distinto") es una edición del fijo:
--    tocar recurrence_overrides toca al fijo.
-- 3. created_by_slot ya no se puede cambiar en un update.
--
-- Los cambios que hace el sistema (la salida de un miembro detiene sus fijos,
-- SA-04) no tienen un miembro detrás: no cuentan como edición de nadie.
-- ───────────────────────────────────────────────────────────────────────────

alter table recurrences
  add column updated_by_slot smallint check (updated_by_slot in (1, 2)),
  add column updated_at timestamptz not null default now();

-- Los de antes: su último cambio conocido es su alta.
update recurrences
set updated_at = created_at,
    updated_by_slot = created_by_slot;


-- Reemplaza a app_set_recurrence_creator (0013): ahora también en updates.
create or replace function app_track_recurrence_author()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  author smallint;
begin
  -- Solo los compartidos.
  if new.space_id is null then
    return new;
  end if;

  author := app_my_slot(new.space_id);

  if tg_op = 'INSERT' then
    new.created_by_slot := author;
    new.updated_by_slot := author;
    new.updated_at := now();
    return new;
  end if;

  -- Quién lo cargó no se reescribe.
  new.created_by_slot := old.created_by_slot;

  -- Un cambio del sistema no es de nadie. La salida de un miembro detiene sus
  -- fijos ANTES de marcarlo ex miembro (app_member_departs), así que ahí
  -- todavía tiene slot: se reconoce porque es lo que pone la marca de SA-04.
  -- Esa pregunta ya tiene su propia tarjeta; no es "para revisar".
  if author is null
     or new.stopped_by_departure_on is distinct from old.stopped_by_departure_on then
    new.updated_by_slot := old.updated_by_slot;
    new.updated_at := old.updated_at;
  else
    new.updated_by_slot := author;
    new.updated_at := now();
  end if;

  return new;
end;
$$;

revoke all on function app_track_recurrence_author() from public, anon, authenticated;

drop trigger recurrences_set_creator on recurrences;
drop function app_set_recurrence_creator();

create trigger recurrences_track_author
  before insert or update on recurrences
  for each row execute function app_track_recurrence_author();


-- "Este mes fue distinto" sobre un fijo compartido es una edición del fijo.
-- Sin security definer: corre con los permisos de quien ajusta, que ya puede
-- editar el fijo (RLS de recurrences).
create or replace function app_touch_recurrence_from_override()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  update recurrences
  set updated_at = now()
  where id = coalesce(new.recurrence_id, old.recurrence_id)
    and space_id is not null;
  return null;
end;
$$;

revoke all on function app_touch_recurrence_from_override() from public, anon, authenticated;

create trigger recurrence_overrides_touch_recurrence
  after insert or update or delete on recurrence_overrides
  for each row execute function app_touch_recurrence_from_override();
