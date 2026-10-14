-- ───────────────────────────────────────────────────────────────────────────
-- SA-04 · los fijos compartidos se detienen DESDE LA SALIDA (arreglo, 14/10)
--
-- app_member_departs (0007) cortaba por mes: end_month = mes actual. Si
-- Martina salía el 13/10 y el alquiler era el 28, la ocurrencia del 28/10
-- seguía siendo compartida, y Martina quedaba debiendo la mitad de un
-- alquiler que vencía después de irse.
--
-- Ahora se corta por fecha: si este mes el fijo ya ocurrió (su día llegó,
-- Q-05), se corta en este mes; si todavía no, en el mes anterior. Un fijo que
-- todavía no empezó queda cortado antes de su inicio: no ocurre nunca.
--
-- "Hoy" es la fecha en Argentina, no en UTC (G-01: el mes del usuario).
-- ───────────────────────────────────────────────────────────────────────────

-- El último mes en que un fijo del día `day_of_month` sigue siendo compartido,
-- si alguien sale en `as_of`. Separada para poder testearla con fechas fijas.
-- T-04 · un día inexistente es el último del mes.
create or replace function app_departure_end_month(day_of_month smallint, as_of date)
returns month_text
language sql
immutable
set search_path = public
as $$
  select to_char(
    case
      when make_date(
             extract(year from as_of)::int,
             extract(month from as_of)::int,
             least(
               day_of_month::int,
               extract(day from (date_trunc('month', as_of) + interval '1 month - 1 day'))::int
             )
           ) <= as_of
        then as_of
      else (date_trunc('month', as_of) - interval '1 day')::date
    end,
    'YYYY-MM'
  )::month_text;
$$;

-- Interna. Nace cerrada (default privileges de la 0008); se deja explícito.
revoke all on function app_departure_end_month(smallint, date) from public, anon, authenticated;


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
  -- SA-04 · solo los que todavía tenían ocurrencias por delante.
  update recurrences
  set end_month = app_departure_end_month(day_of_month, today)
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
