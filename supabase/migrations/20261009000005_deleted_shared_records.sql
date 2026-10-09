-- ───────────────────────────────────────────────────────────────────────────
-- SY-02 · "Si el otro eliminó un registro mientras se edita: 'Martina eliminó
-- este gasto. ¿Querés volver a crearlo?'"
--
-- Un DELETE no deja rastro de quién lo hizo. Para nombrar a quien eliminó sin
-- inventarlo (§4 principio 2, "nunca afirmar lo que no se puede saber"), cada
-- borrado de un gasto compartido deja un registro mínimo: qué, dónde, quién y
-- cuándo. Sin montos ni descripciones: no repite el gasto, solo su ausencia.
--
-- De paso resuelve un huérfano: shared_payment_details no tiene FK a su
-- source_id (puede ser un gasto o un fijo), así que al borrar un gasto su
-- detalle de pago quedaba suelto. Y si lo borraba el otro miembro, ni siquiera
-- podía limpiarlo: C-05 no le deja tocar el detalle ajeno.
-- ───────────────────────────────────────────────────────────────────────────

create table deleted_shared_records (
  source_id uuid primary key,
  space_id uuid not null references spaces on delete cascade,
  deleted_by_slot smallint not null check (deleted_by_slot in (1, 2)),
  deleted_at timestamptz not null default now()
);

comment on table deleted_shared_records is
  'SY-02 · quién eliminó un gasto compartido. Lo escribe SOLO el trigger de '
  'shared_expenses: nadie puede registrar un borrado a nombre del otro.';

alter table deleted_shared_records enable row level security;

-- Lo leen los miembros con acceso del espacio, igual que el gasto que fue.
-- No hay políticas de escritura: insert, update y delete quedan cerrados.
create policy "deleted_shared_records: los miembros leen" on deleted_shared_records
  for select using (space_id in (select app_my_space_ids()));


create or replace function app_on_shared_expense_deleted()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  deleter smallint;
begin
  -- C-05 · el detalle privado de pago se va con el gasto, también el del
  -- otro miembro, que la RLS no le deja borrar a quien elimina.
  delete from shared_payment_details where source_id = old.id;

  deleter := app_my_slot(old.space_id);

  -- Sin slot, el borrado no lo hizo un miembro con acceso: viene de eliminar
  -- el espacio entero (SA-06) o de una cuenta que se va (D-01). No queda
  -- nadie a quien avisarle, y el espacio puede estar desapareciendo.
  if deleter is not null then
    insert into deleted_shared_records (source_id, space_id, deleted_by_slot)
    values (old.id, old.space_id, deleter)
    on conflict (source_id) do update
      set deleted_by_slot = excluded.deleted_by_slot,
          deleted_at = now();
  end if;

  return old;
end;
$$;

revoke all on function app_on_shared_expense_deleted() from public;

create trigger shared_expenses_record_deletion
  after delete on shared_expenses
  for each row execute function app_on_shared_expense_deleted();
