-- ───────────────────────────────────────────────────────────────────────────
-- Escrituras atómicas e idempotentes (21/10)
--
-- La auditoría del 20/10 encontró operaciones de varios pasos sin
-- transacción, donde una falla a mitad de camino o un reintento duplicaba
-- plata en el radar o en el saldo:
--
--   H-01 · onboarding, "lo que ya debés" de una tarjeta: resumen pendiente,
--          cuotas en curso y consumos en tres escrituras. Volver atrás y
--          continuar, o reintentar después de una falla, lo duplicaba todo.
--   H-06 · un plan de UNA cuota (Q-06 "5 de 6", Q-07 "Terminar ahora") lo
--          rechazaba el CHECK installments_count >= 2.
--   H-07 · salir de un espacio en Modo 1 lo elimina (SA-06) y la pantalla
--          decía que el otro lo conservaba.
--   H-12 · mover un gasto entre lo personal y un espacio: crear, detalle de
--          pago y borrar, en tres pasos. Si fallaba el último, quedaba en los
--          dos lados.
--   H-14 · el alta de un gasto o fijo compartido con su detalle de pago, en
--          dos pasos con un borrado compensatorio que no se verificaba.
--
-- Qué hace esta migración:
--   1. El mínimo de cuotas de un plan GUARDADO pasa a 1. El de una compra
--      nueva sigue siendo 2: lo exige el formulario (§17).
--   2. personal_movements.origin marca lo que cargó el paso "deuda" del
--      onboarding, para poder reemplazarlo en vez de sumarlo.
--   3. Funciones que hacen cada operación en UNA transacción.
--
-- Por qué SECURITY INVOKER: estas funciones no necesitan ningún privilegio
-- que el usuario no tenga. Corren con su rol y con TODA la RLS de siempre;
-- lo único que agregan es que las escrituras van juntas. Solo la salida de un
-- espacio sigue siendo definer, porque reutiliza app_leave_space (0018).
--
-- Idempotencia sin restricciones únicas nuevas: el id de cada registro nuevo
-- lo genera la app UNA vez por formulario y lo reenvía en cada reintento. Un
-- reintento choca con su propio id y actualiza la misma fila. Dos gastos
-- legítimos iguales tienen ids distintos: nada impide registrarlos.
--
-- Nace cerrado (0014): cada función tiene su revoke y su grant explícitos.
-- ───────────────────────────────────────────────────────────────────────────


-- ── 1 · H-06 · planes de una cuota ─────────────────────────────────────────

alter table personal_movements
  drop constraint personal_movements_installments_count_check,
  add constraint personal_movements_installments_count_check
    check (installments_count >= 1);

alter table shared_expenses
  drop constraint shared_expenses_installments_count_check,
  add constraint shared_expenses_installments_count_check
    check (installments_count >= 1);


-- ── 2 · H-01 · de dónde salió un movimiento personal ──────────────────────

alter table personal_movements
  add column origin text check (origin in ('onboarding_debt'));

comment on column personal_movements.origin is
  'onboarding_debt · lo cargó el paso "deuda" de O3 (Q-06 y T-08). Guardar ese '
  'paso otra vez para la misma tarjeta reemplaza lo anterior en vez de sumarlo.';


-- ── 3 · H-01 · "lo que ya debés" de una tarjeta, de una vez ───────────────
--
-- Reemplaza el conjunto entero de esa tarjeta: el resumen declarado (T-07),
-- las cuotas en curso (Q-06) y los consumos desde el cierre (T-08). Guardar
-- dos veces lo mismo deja lo mismo, y guardar algo corregido deja lo
-- corregido. Los resúmenes declarados solo los crea este paso (T-07: "al
-- activar la cuenta"), así que la tarjeta tiene a lo sumo el de acá.
--
-- p_purchases: [{ "amount", "description", "count", "first_month",
--                 "impact_day", "approximate" }]

create or replace function app_save_card_debt(
  p_card_id uuid,
  p_pending_amount integer,
  p_pending_due_date date,
  p_purchases jsonb,
  p_recent_amount integer,
  p_today date
)
returns void
language plpgsql
security invoker
set search_path = public
as $$
declare
  uid uuid := auth.uid();
begin
  if uid is null then
    raise exception 'Necesitás iniciar sesión' using errcode = 'insufficient_privilege';
  end if;

  -- La tarjeta tiene que ser propia (la RLS esconde las ajenas). El bloqueo
  -- ordena dos guardados simultáneos de la misma tarjeta: un doble toque
  -- termina en un solo conjunto, no en dos.
  perform 1 from payment_methods
  where id = p_card_id and user_id = uid and kind = 'card'
  for update;
  if not found then
    raise exception 'No encontramos esa tarjeta' using errcode = 'no_data_found';
  end if;

  delete from declared_statements
  where user_id = uid and payment_method_id = p_card_id;

  delete from personal_movements
  where user_id = uid and payment_method_id = p_card_id and origin = 'onboarding_debt';

  if coalesce(p_pending_amount, 0) > 0 then
    insert into declared_statements (user_id, payment_method_id, amount, due_date)
    values (uid, p_card_id, p_pending_amount, p_pending_due_date);
  end if;

  insert into personal_movements (
    user_id, kind, amount, date, category, description, payment_method_id,
    installments_count, first_installment_month, installment_impact_day,
    installments_approximate, origin
  )
  select
    uid, 'expense', (purchase ->> 'amount')::integer, p_today, 'otros',
    nullif(btrim(purchase ->> 'description'), ''), p_card_id,
    (purchase ->> 'count')::smallint, purchase ->> 'first_month',
    (purchase ->> 'impact_day')::smallint,
    coalesce((purchase ->> 'approximate')::boolean, false),
    'onboarding_debt'
  from jsonb_array_elements(coalesce(p_purchases, '[]'::jsonb)) as purchase;

  if coalesce(p_recent_amount, 0) > 0 then
    insert into personal_movements (
      user_id, kind, amount, date, category, description, payment_method_id, origin
    )
    values (
      uid, 'expense', p_recent_amount, p_today, 'otros', 'Consumos previos (aprox.)',
      p_card_id, 'onboarding_debt'
    );
  end if;
end;
$$;

revoke all on function app_save_card_debt(uuid, integer, date, jsonb, integer, date)
  from public, anon;
grant execute on function app_save_card_debt(uuid, integer, date, jsonb, integer, date)
  to authenticated;


-- ── 4 · H-14 · el detalle de pago propio, como parte de otra escritura ────
--
-- Interna: la llaman las funciones de abajo, dentro de su transacción. Deja
-- el detalle del propio lugar como pide el formulario: con medio o sin él.

create or replace function app_set_my_payment_detail(
  p_source_id uuid,
  p_space_id uuid,
  p_my_slot smallint,
  p_payment_method_id uuid
)
returns void
language plpgsql
security invoker
set search_path = public
as $$
begin
  if p_payment_method_id is null then
    delete from shared_payment_details
    where source_id = p_source_id and slot = p_my_slot;
    return;
  end if;

  insert into shared_payment_details (source_id, space_id, slot, payment_method_id)
  values (p_source_id, p_space_id, p_my_slot, p_payment_method_id)
  on conflict (source_id, slot) do update
    set payment_method_id = excluded.payment_method_id;
end;
$$;

-- Las funciones de abajo son invoker: la llaman con el rol del usuario, así
-- que necesita EXECUTE. No da nada nuevo: es invoker y corre con la RLS de
-- shared_payment_details (solo el propio lugar, solo un medio propio).
revoke all on function app_set_my_payment_detail(uuid, uuid, smallint, uuid)
  from public, anon;
grant execute on function app_set_my_payment_detail(uuid, uuid, smallint, uuid)
  to authenticated;


-- ── 5 · H-14 · alta de un gasto compartido con su detalle de pago ─────────
--
-- El gasto y con qué lo pagó (C-05) se guardan juntos o no se guarda nada:
-- ya no hay borrado compensatorio, que además dejaba un rastro de SY-02 y le
-- avisaba al otro una "eliminación" de algo que nunca vio.
--
-- Idempotente por el id que manda la app: un reintento (respuesta perdida,
-- doble toque) actualiza el mismo gasto con lo último del formulario. El id
-- de un gasto de OTRO espacio no se puede pisar.

create or replace function app_save_new_shared_expense(
  p_id uuid,
  p_space_id uuid,
  p_amount integer,
  p_date date,
  p_category category,
  p_description text,
  p_payer_slot smallint,
  p_split_mode split_mode,
  p_share_slot_1 integer,
  p_share_slot_2 integer,
  p_installments_count smallint,
  p_first_installment_month text,
  p_installment_impact_day smallint,
  p_installments_approximate boolean,
  p_my_payment_method_id uuid
)
returns uuid
language plpgsql
security invoker
set search_path = public
as $$
declare
  my_slot_value smallint := app_my_slot(p_space_id);
begin
  if my_slot_value is null then
    raise exception 'No sos miembro de este espacio' using errcode = 'insufficient_privilege';
  end if;
  -- C-05 · nadie declara con qué pagó el otro.
  if p_my_payment_method_id is not null and p_payer_slot <> my_slot_value then
    raise exception 'El medio de pago es de quien pagó' using errcode = 'invalid_parameter_value';
  end if;

  insert into shared_expenses (
    id, space_id, amount, date, category, description, payer_slot,
    split_mode, share_slot_1, share_slot_2,
    installments_count, first_installment_month, installment_impact_day,
    installments_approximate, created_by_slot, updated_by_slot
  )
  values (
    p_id, p_space_id, p_amount, p_date, p_category, p_description, p_payer_slot,
    p_split_mode, p_share_slot_1, p_share_slot_2,
    p_installments_count, p_first_installment_month, p_installment_impact_day,
    coalesce(p_installments_approximate, false), my_slot_value, my_slot_value
  )
  on conflict (id) do update
    set amount = excluded.amount,
        date = excluded.date,
        category = excluded.category,
        description = excluded.description,
        payer_slot = excluded.payer_slot,
        split_mode = excluded.split_mode,
        share_slot_1 = excluded.share_slot_1,
        share_slot_2 = excluded.share_slot_2,
        installments_count = excluded.installments_count,
        first_installment_month = excluded.first_installment_month,
        installment_impact_day = excluded.installment_impact_day,
        installments_approximate = excluded.installments_approximate,
        updated_by_slot = excluded.updated_by_slot
    where shared_expenses.space_id = excluded.space_id;

  if not found then
    raise exception 'Ese id ya es de otro registro' using errcode = 'unique_violation';
  end if;

  perform app_set_my_payment_detail(
    p_id, p_space_id, my_slot_value,
    case when p_payer_slot = my_slot_value then p_my_payment_method_id end
  );

  return p_id;
end;
$$;

revoke all on function app_save_new_shared_expense(
  uuid, uuid, integer, date, category, text, smallint, split_mode, integer, integer,
  smallint, text, smallint, boolean, uuid
) from public, anon;
grant execute on function app_save_new_shared_expense(
  uuid, uuid, integer, date, category, text, smallint, split_mode, integer, integer,
  smallint, text, smallint, boolean, uuid
) to authenticated;


-- ── 6 · H-14 · alta de un fijo compartido con su detalle de pago ──────────

create or replace function app_save_new_shared_recurrence(
  p_id uuid,
  p_space_id uuid,
  p_amount integer,
  p_category category,
  p_description text,
  p_day_of_month smallint,
  p_start_month text,
  p_payer_slot smallint,
  p_split_mode split_mode,
  p_share_slot_1 integer,
  p_share_slot_2 integer,
  p_my_payment_method_id uuid
)
returns uuid
language plpgsql
security invoker
set search_path = public
as $$
declare
  my_slot_value smallint := app_my_slot(p_space_id);
begin
  if my_slot_value is null then
    raise exception 'No sos miembro de este espacio' using errcode = 'insufficient_privilege';
  end if;
  if p_my_payment_method_id is not null and p_payer_slot <> my_slot_value then
    raise exception 'El medio de pago es de quien pagó' using errcode = 'invalid_parameter_value';
  end if;

  insert into recurrences (
    id, kind, amount, category, description, day_of_month, start_month, end_month,
    owner_user_id, space_id, payment_method_id, payer_slot,
    split_mode, share_slot_1, share_slot_2
  )
  values (
    p_id, 'expense', p_amount, p_category, p_description, p_day_of_month, p_start_month, null,
    null, p_space_id, null, p_payer_slot,
    p_split_mode, p_share_slot_1, p_share_slot_2
  )
  on conflict (id) do update
    set amount = excluded.amount,
        category = excluded.category,
        description = excluded.description,
        day_of_month = excluded.day_of_month,
        start_month = excluded.start_month,
        payer_slot = excluded.payer_slot,
        split_mode = excluded.split_mode,
        share_slot_1 = excluded.share_slot_1,
        share_slot_2 = excluded.share_slot_2
    where recurrences.space_id = excluded.space_id;

  if not found then
    raise exception 'Ese id ya es de otro registro' using errcode = 'unique_violation';
  end if;

  perform app_set_my_payment_detail(
    p_id, p_space_id, my_slot_value,
    case when p_payer_slot = my_slot_value then p_my_payment_method_id end
  );

  return p_id;
end;
$$;

revoke all on function app_save_new_shared_recurrence(
  uuid, uuid, integer, category, text, smallint, text, smallint, split_mode,
  integer, integer, uuid
) from public, anon;
grant execute on function app_save_new_shared_recurrence(
  uuid, uuid, integer, category, text, smallint, text, smallint, split_mode,
  integer, integer, uuid
) to authenticated;


-- ── 7 · H-12 · X-07, de personal a un espacio ─────────────────────────────
--
-- Nace el compartido (con el id que manda la app), su detalle de pago si lo
-- pagó con algo propio, y se borra el personal. Todo o nada. Si el personal
-- ya no está y el compartido sí, el movimiento ya se hizo: un reintento
-- después de una respuesta perdida devuelve el mismo id sin duplicar.

create or replace function app_move_personal_to_space(
  p_movement_id uuid,
  p_new_id uuid,
  p_space_id uuid,
  p_split_mode split_mode,
  p_share_slot_1 integer,
  p_share_slot_2 integer,
  p_keep_payment_method boolean
)
returns uuid
language plpgsql
security invoker
set search_path = public
as $$
declare
  my_slot_value smallint := app_my_slot(p_space_id);
  moving personal_movements%rowtype;
begin
  if my_slot_value is null then
    raise exception 'No sos miembro de este espacio' using errcode = 'insufficient_privilege';
  end if;

  -- X-07 · solo quien lo cargó: la RLS ya deja ver únicamente los propios.
  select * into moving from personal_movements
  where id = p_movement_id and user_id = auth.uid()
  for update;

  if not found then
    if exists (select 1 from shared_expenses where id = p_new_id and space_id = p_space_id) then
      return p_new_id;
    end if;
    raise exception 'No encontramos ese movimiento' using errcode = 'no_data_found';
  end if;

  -- §18 · no existen ingresos compartidos.
  if moving.kind <> 'expense' then
    raise exception 'Un ingreso no se comparte' using errcode = 'invalid_parameter_value';
  end if;

  insert into shared_expenses (
    id, space_id, amount, date, category, description, payer_slot,
    split_mode, share_slot_1, share_slot_2,
    installments_count, first_installment_month, installment_impact_day,
    installments_approximate, created_by_slot, updated_by_slot
  )
  values (
    p_new_id, p_space_id, moving.amount, moving.date, moving.category, moving.description,
    -- Quien cambia el destino es quien lo cargó, así que pagó él.
    my_slot_value,
    p_split_mode, p_share_slot_1, p_share_slot_2,
    moving.installments_count, moving.first_installment_month, moving.installment_impact_day,
    moving.installments_approximate, my_slot_value, my_slot_value
  );

  if p_keep_payment_method and moving.payment_method_id is not null then
    perform app_set_my_payment_detail(p_new_id, p_space_id, my_slot_value, moving.payment_method_id);
  end if;

  delete from personal_movements where id = moving.id;

  return p_new_id;
end;
$$;

revoke all on function app_move_personal_to_space(
  uuid, uuid, uuid, split_mode, integer, integer, boolean
) from public, anon;
grant execute on function app_move_personal_to_space(
  uuid, uuid, uuid, split_mode, integer, integer, boolean
) to authenticated;


-- ── 8 · H-12 · X-07, de un espacio a personal ─────────────────────────────
--
-- Los datos del gasto los toma de la base, no del cliente: así no se puede
-- mover una versión vieja si el otro lo editó en el medio. El plan de cuotas
-- lo manda la app, porque depende de la tarjeta propia (Q-02) y esa tarjeta
-- solo la conoce quien la tiene.

create or replace function app_move_shared_to_personal(
  p_expense_id uuid,
  p_new_id uuid,
  p_payment_method_id uuid,
  p_installments_count smallint,
  p_first_installment_month text,
  p_installment_impact_day smallint,
  p_installments_approximate boolean
)
returns uuid
language plpgsql
security invoker
set search_path = public
as $$
declare
  moving shared_expenses%rowtype;
  my_slot_value smallint;
begin
  if auth.uid() is null then
    raise exception 'Necesitás iniciar sesión' using errcode = 'insufficient_privilege';
  end if;

  select * into moving from shared_expenses where id = p_expense_id for update;

  if not found then
    if exists (select 1 from personal_movements where id = p_new_id and user_id = auth.uid()) then
      return p_new_id;
    end if;
    raise exception 'No encontramos ese gasto' using errcode = 'no_data_found';
  end if;

  my_slot_value := app_my_slot(moving.space_id);
  -- X-07 · "solo lo puede hacer quien lo cargó".
  if my_slot_value is null or moving.created_by_slot <> my_slot_value then
    raise exception 'Solo quien lo cargó puede cambiar el destino'
      using errcode = 'insufficient_privilege';
  end if;

  insert into personal_movements (
    id, user_id, kind, amount, date, category, description, payment_method_id,
    installments_count, first_installment_month, installment_impact_day,
    installments_approximate
  )
  values (
    p_new_id, auth.uid(), 'expense', moving.amount, moving.date, moving.category,
    moving.description, p_payment_method_id,
    p_installments_count, p_first_installment_month, p_installment_impact_day,
    coalesce(p_installments_approximate, false)
  );

  -- El detalle propio se va con el gasto. El del otro (si hubiera) no es mío:
  -- la RLS no deja tocarlo, y sin el gasto no se usa.
  delete from shared_payment_details where source_id = moving.id and slot = my_slot_value;
  delete from shared_expenses where id = moving.id;

  return p_new_id;
end;
$$;

revoke all on function app_move_shared_to_personal(
  uuid, uuid, uuid, smallint, text, smallint, boolean
) from public, anon;
grant execute on function app_move_shared_to_personal(
  uuid, uuid, uuid, smallint, text, smallint, boolean
) to authenticated;


-- ── 9 · H-07 · salir de un espacio como lo mostró la pantalla ─────────────
--
-- SA-06 · "Sin miembros con acceso, el espacio se elimina; en Modo 1 el
-- creador puede eliminarlo." Es la regla aprobada, y la pantalla ahora la
-- dice. Pero lo que vio la persona puede quedar viejo: el otro pudo entrar,
-- salir o perder el acceso mientras tanto. Por eso la app manda lo que
-- MOSTRÓ (p_deletes_space) y el servidor sale solo si coincide con lo que va
-- a pasar. Si no coincide, no hace nada y avisa: la pantalla vuelve a leer y
-- muestra las consecuencias reales.
--
-- app_leave_space(uuid) queda como estaba, para app_delete_account, que
-- elimina la cuenta con sus dos confirmaciones (§28).

create or replace function app_leave_space_as_shown(
  target_space_id uuid,
  p_deletes_space boolean
)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  my_slot_value smallint;
  others_active integer;
begin
  my_slot_value := app_my_slot(target_space_id);
  if my_slot_value is null then
    raise exception 'No sos miembro de este espacio' using errcode = 'insufficient_privilege';
  end if;

  -- Bloquea los dos lugares: aceptar una invitación o salir al mismo tiempo
  -- espera a que esto termine.
  perform 1 from space_members where space_id = target_space_id for update;

  select count(*) into others_active
  from space_members
  where space_id = target_space_id and slot <> my_slot_value and status = 'active';

  -- P0001 a propósito, NO serialization_failure (40001): PostgREST reintenta
  -- solo los 40001, y como esto falla igual cada vez, colgaba el pedido
  -- hasta el timeout (probado contra Supabase local).
  if (others_active = 0) is distinct from p_deletes_space then
    raise exception 'LEAVE_CHANGED: lo que pasa al salir cambió' using errcode = 'P0001';
  end if;

  perform app_leave_space(target_space_id);
end;
$$;

revoke all on function app_leave_space_as_shown(uuid, boolean) from public, anon;
grant execute on function app_leave_space_as_shown(uuid, boolean) to authenticated;
