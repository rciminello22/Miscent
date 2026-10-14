-- ───────────────────────────────────────────────────────────────────────────
-- SA-05 · P8 · P6 · lo que conserva quien sale de un espacio (14/10)
--
-- El hueco: al salir, app_member_departs pone user_id = null en su lugar, y
-- la RLS le saca toda lectura del espacio. Su cuenta personal perdía el
-- espacio entero:
--   - el radar de los meses pasados cambiaba (SA-05: "meses pasados sin
--     cambios")
--   - su Futuro dejaba de mostrar su parte de las cuotas que siguen (K5,
--     SA-03, P8, Caso 14: "$50.000/mes en Futuro como 'Casa · ya no sos
--     miembro'")
--   - y no veía nada del saldo (P6: "resumen fijo del saldo al momento de
--     salir")
--
-- La solución: al salir, el servidor guarda para quien sale una FOTO de los
-- hechos del espacio tal como estaban, más su propio medio de pago (C-05:
-- nunca el del otro). Es privada: la lee solo él. La app la suma a su cuenta
-- personal con la fecha de salida, y el dominio ya sabe qué hacer con eso
-- (leftOn): el pasado queda igual, las cuotas siguen, los fijos se cortan.
-- El saldo al salir lo calcula el dominio sobre la foto: no se guarda un
-- número (§7.4).
--
-- La arma el servidor desde las tablas, no la app: nadie se puede inventar
-- una foto. Lo que el otro cargue después ya no le llega (pierde el acceso,
-- SA-02); por eso es un resumen FIJO.
-- ───────────────────────────────────────────────────────────────────────────

create table former_memberships (
  user_id uuid not null references profiles on delete cascade,
  -- Sin FK: el espacio puede eliminarse después (SA-06) y la foto sigue.
  space_id uuid not null,
  slot smallint not null check (slot in (1, 2)),
  left_at timestamptz not null default now(),
  snapshot jsonb not null check (jsonb_typeof(snapshot) = 'object'),
  -- P7 · si vuelve y sale otra vez, la foto nueva reemplaza a la vieja.
  primary key (user_id, space_id)
);

comment on table former_memberships is
  'SA-05 · P6 · la foto de un espacio para quien salió. Solo la lee su dueño; '
  'la escribe solo app_leave_space.';

alter table former_memberships enable row level security;

-- Cada uno lee las suyas. Sin políticas de escritura: solo la función.
create policy "former_memberships: cada uno las suyas" on former_memberships
  for select using (user_id = auth.uid());


-- La foto: las mismas filas que lee la app, para mapearlas igual. Sin el
-- user_id de nadie (no hace falta y no es suyo) y con SOLO sus detalles de
-- pago.
create or replace function app_space_snapshot(target_space_id uuid, my_slot_value smallint)
returns jsonb
language sql
security definer
stable
set search_path = public
as $$
  select jsonb_build_object(
    'space', (select to_jsonb(s) from spaces s where s.id = target_space_id),
    'members', coalesce(
      (select jsonb_agg(to_jsonb(m) - 'user_id') from space_members m
       where m.space_id = target_space_id), '[]'::jsonb),
    'expenses', coalesce(
      (select jsonb_agg(to_jsonb(e)) from shared_expenses e
       where e.space_id = target_space_id), '[]'::jsonb),
    'recurrences', coalesce(
      (select jsonb_agg(to_jsonb(r)) from recurrences r
       where r.space_id = target_space_id), '[]'::jsonb),
    'overrides', coalesce(
      (select jsonb_agg(to_jsonb(o)) from recurrence_overrides o
       where o.recurrence_id in (select id from recurrences where space_id = target_space_id)),
      '[]'::jsonb),
    'payments', coalesce(
      (select jsonb_agg(to_jsonb(p)) from member_payments p
       where p.space_id = target_space_id), '[]'::jsonb),
    'payment_details', coalesce(
      (select jsonb_agg(to_jsonb(d)) from shared_payment_details d
       where d.space_id = target_space_id and d.slot = my_slot_value), '[]'::jsonb)
  );
$$;

revoke all on function app_space_snapshot(uuid, smallint) from public, anon, authenticated;


-- La misma salida de la 0007, que antes saca la foto. ANTES de salir: si es
-- el último, el espacio se elimina (SA-06) y ya no habría de dónde sacarla.
create or replace function app_leave_space(target_space_id uuid)
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

  insert into former_memberships (user_id, space_id, slot, snapshot)
  values (auth.uid(), target_space_id, my_slot_value,
          app_space_snapshot(target_space_id, my_slot_value))
  on conflict (user_id, space_id) do update
    set slot = excluded.slot,
        left_at = now(),
        snapshot = excluded.snapshot;

  perform app_member_departs(target_space_id, my_slot_value);
end;
$$;
