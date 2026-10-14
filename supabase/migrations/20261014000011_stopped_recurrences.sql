-- ───────────────────────────────────────────────────────────────────────────
-- SA-04 · quien queda decide qué pasa con cada fijo detenido (14/10)
--
-- §27: "El alquiler era compartido con Martina. ¿Lo seguís pagando vos?" →
-- Pasarlo a mis fijos / Terminarlo. Caso 13: pasa a sus fijos por el TOTAL.
--
-- Dos columnas en el fijo compartido:
--   stopped_by_departure_on · lo detuvo una salida (y cuándo). La pone el
--                             servidor al salir: un fijo que terminó solo no
--                             se pregunta
--   departure_resolution    · null = falta decidir; 'moved' | 'ended'
--
-- La decisión es una función y no dos escrituras desde la app: "pasarlo"
-- crea el fijo personal Y marca la resolución en una sola transacción. Con
-- dos escrituras, si fallaba la segunda, reintentar duplicaba el alquiler
-- en el radar.
-- ───────────────────────────────────────────────────────────────────────────

alter table recurrences
  add column stopped_by_departure_on date,
  add column departure_resolution text
    check (departure_resolution in ('moved', 'ended')),
  add constraint departure_resolution_needs_stop
    check (departure_resolution is null or stopped_by_departure_on is not null);


-- La misma salida de la 0010, que ahora además marca lo que detuvo.
create or replace function app_member_departs(target_space_id uuid, departing_slot smallint)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  today date := (now() at time zone 'America/Argentina/Buenos_Aires')::date;
  remaining integer;
begin
  update recurrences
  set end_month = app_departure_end_month(day_of_month, today),
      stopped_by_departure_on = today
  where space_id = target_space_id
    and (end_month is null or end_month > app_departure_end_month(day_of_month, today));

  update space_members
  set status = 'former', user_id = null, left_at = now()
  where space_id = target_space_id and slot = departing_slot;

  select count(*) into remaining
  from space_members
  where space_id = target_space_id and status = 'active';

  if remaining = 0 then
    delete from spaces where id = target_space_id;
  end if;
end;
$$;


-- SA-04 · "Pasarlo a mis fijos" (keep = true) o "Terminarlo" (keep = false).
-- Devuelve el id del fijo personal nuevo, o null si lo terminó.
create or replace function app_resolve_stopped_recurrence(target_recurrence_id uuid, keep boolean)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  stopped recurrences%rowtype;
  my_slot_value smallint;
  method_id uuid;
  new_id uuid;
begin
  select * into stopped from recurrences where id = target_recurrence_id for update;

  if not found or stopped.space_id is null then
    raise exception 'No encontramos ese fijo' using errcode = 'no_data_found';
  end if;

  -- Solo quien quedó con acceso. Un ex miembro ya no ve el espacio (SA-02).
  my_slot_value := app_my_slot(stopped.space_id);
  if my_slot_value is null then
    raise exception 'No sos miembro de este espacio' using errcode = 'insufficient_privilege';
  end if;

  if stopped.stopped_by_departure_on is null then
    raise exception 'Ese fijo no lo detuvo una salida' using errcode = 'invalid_parameter_value';
  end if;
  if stopped.departure_resolution is not null then
    raise exception 'Ese fijo ya está resuelto' using errcode = 'unique_violation';
  end if;

  if keep then
    -- A-05 · sin cuenta personal no hay fijos personales.
    if not exists (select 1 from profiles where id = auth.uid() and has_personal_account) then
      raise exception 'Para pasarlo a tus fijos necesitás tu cuenta personal'
        using errcode = 'insufficient_privilege';
    end if;

    -- Si lo pagaba con una tarjeta, la conserva (C-05: el medio es suyo).
    select payment_method_id into method_id
    from shared_payment_details
    where source_id = stopped.id and slot = my_slot_value;

    -- Caso 13 · por el TOTAL, el mismo día, desde el mes siguiente al corte.
    insert into recurrences (
      kind, amount, category, description, day_of_month, start_month, end_month,
      owner_user_id, space_id, payment_method_id, payer_slot,
      split_mode, share_slot_1, share_slot_2
    ) values (
      'expense', stopped.amount, stopped.category, stopped.description,
      stopped.day_of_month,
      to_char((stopped.end_month || '-01')::date + interval '1 month', 'YYYY-MM'),
      null,
      auth.uid(), null, method_id, null,
      null, null, null
    )
    returning id into new_id;
  end if;

  update recurrences
  set departure_resolution = case when keep then 'moved' else 'ended' end
  where id = stopped.id;

  return new_id;
end;
$$;

-- Nace cerrada (0008): se abre solo para quien tiene sesión.
grant execute on function app_resolve_stopped_recurrence(uuid, boolean) to authenticated;
