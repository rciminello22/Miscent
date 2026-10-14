-- ───────────────────────────────────────────────────────────────────────────
-- Revisión de lo que ELIMINA el otro (opción B, 14/10)
--
-- La 0013 marca "para revisar" lo que el otro carga o edita. Faltaba lo que
-- borra: si Martina elimina el super, el saldo de Renzo cambia y él no tenía
-- forma de enterarse. Un registro que ya no existe no puede llevar la marca,
-- así que la lleva su rastro en deleted_shared_records (0005).
--
-- Cambios:
--
-- 1. El rastro guarda QUÉ era, no solo que existió: tipo, monto, fecha,
--    categoría, descripción y quién lo había cargado. La 0005 lo dejaba sin
--    montos a propósito; ahora hacen falta para decir "Martina eliminó
--    Supermercado · $100.000". No es un dato nuevo para nadie: los dos lo
--    veían mientras existía, y el rastro lo leen los mismos (los miembros con
--    acceso) y se va con el espacio.
-- 2. Dejan rastro también los pagos entre miembros y los fijos compartidos.
--    Al borrar un fijo compartido se va también su detalle privado de pago
--    (C-05), que quedaba huérfano igual que el de los gastos en la 0005.
-- ───────────────────────────────────────────────────────────────────────────

alter table deleted_shared_records
  add column kind text not null default 'expense'
    check (kind in ('expense', 'recurrence', 'payment')),
  add column amount integer check (amount > 0),
  -- La fecha del gasto o del pago. Un fijo no tiene una sola: queda null.
  add column occurred_on date,
  add column category category,
  add column description text check (length(description) <= 140),
  -- Solo los pagos: quién le pagó a quién.
  add column from_slot smallint check (from_slot in (1, 2)),
  -- Quién lo había cargado y cuándo: si lo cargó y lo borró enseguida quien
  -- lo eliminó (Deshacer, un error de tipeo), no hay nada que revisar.
  add column created_by_slot smallint check (created_by_slot in (1, 2)),
  add column record_created_at timestamptz;

-- Los rastros de antes son todos de gastos. De acá en más, cada trigger dice
-- el suyo.
alter table deleted_shared_records alter column kind drop default;


-- Un solo lugar que escribe el rastro, para los tres triggers.
create or replace function app_record_shared_deletion(
  p_source_id uuid,
  p_space_id uuid,
  p_kind text,
  p_amount integer,
  p_occurred_on date,
  p_category category,
  p_description text,
  p_from_slot smallint,
  p_created_by_slot smallint,
  p_record_created_at timestamptz
)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  deleter smallint;
begin
  deleter := app_my_slot(p_space_id);

  -- Sin slot, el borrado no lo hizo un miembro con acceso: viene de eliminar
  -- el espacio entero (SA-06) o de una cuenta que se va (D-01). No queda
  -- nadie a quien avisarle, y el espacio puede estar desapareciendo.
  if deleter is null then
    return;
  end if;

  insert into deleted_shared_records (
    source_id, space_id, deleted_by_slot, kind, amount, occurred_on,
    category, description, from_slot, created_by_slot, record_created_at
  )
  values (
    p_source_id, p_space_id, deleter, p_kind, p_amount, p_occurred_on,
    p_category, p_description, p_from_slot, p_created_by_slot, p_record_created_at
  )
  on conflict (source_id) do update
    set deleted_by_slot = excluded.deleted_by_slot,
        deleted_at = now(),
        kind = excluded.kind,
        amount = excluded.amount,
        occurred_on = excluded.occurred_on,
        category = excluded.category,
        description = excluded.description,
        from_slot = excluded.from_slot,
        created_by_slot = excluded.created_by_slot,
        record_created_at = excluded.record_created_at;
end;
$$;

-- Interna: solo la llaman los triggers. Nadie registra un borrado a mano.
revoke all on function app_record_shared_deletion(
  uuid, uuid, text, integer, date, category, text, smallint, smallint, timestamptz
) from public, anon, authenticated;


-- Gastos: la misma función de la 0005, ahora con lo que era.
create or replace function app_on_shared_expense_deleted()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  -- C-05 · el detalle privado de pago se va con el gasto, también el del
  -- otro miembro, que la RLS no le deja borrar a quien elimina.
  delete from shared_payment_details where source_id = old.id;

  perform app_record_shared_deletion(
    old.id, old.space_id, 'expense', old.amount, old.date, old.category,
    old.description, null, old.created_by_slot, old.created_at
  );

  return old;
end;
$$;


create or replace function app_on_member_payment_deleted()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  perform app_record_shared_deletion(
    old.id, old.space_id, 'payment', old.amount, old.date, null,
    null, old.from_slot, old.recorded_by_slot, old.created_at
  );
  return old;
end;
$$;

revoke all on function app_on_member_payment_deleted() from public, anon, authenticated;

create trigger member_payments_record_deletion
  after delete on member_payments
  for each row execute function app_on_member_payment_deleted();


create or replace function app_on_shared_recurrence_deleted()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  -- Los personales no tienen a quién avisarle.
  if old.space_id is null then
    return old;
  end if;

  -- C-05 · igual que con los gastos.
  delete from shared_payment_details where source_id = old.id;

  perform app_record_shared_deletion(
    old.id, old.space_id, 'recurrence', old.amount, null, old.category,
    old.description, null, old.created_by_slot, old.created_at
  );
  return old;
end;
$$;

revoke all on function app_on_shared_recurrence_deleted() from public, anon, authenticated;

create trigger recurrences_record_deletion
  after delete on recurrences
  for each row execute function app_on_shared_recurrence_deleted();
