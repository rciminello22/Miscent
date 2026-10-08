-- ───────────────────────────────────────────────────────────────────────────
-- Radar · operaciones transaccionales
--
-- Lo que está acá y no en el cliente son las operaciones que tienen que ser
-- ATÓMICAS o que validan una regla que un cliente podría saltearse:
--
--   P5  · crear un espacio requiere cuenta personal
--   P4  · dos usuarios no pueden compartir más de un espacio activo
--   I-02· invitación de un solo uso, 7 días, regenerable
--   SA  · la salida de un espacio toca tres cosas a la vez
--
-- El resto (gastos, ingresos, cuotas, pagos) son escrituras simples que van
-- directo por la API con RLS. No hay una capa de servicios por gusto.
-- ───────────────────────────────────────────────────────────────────────────


-- A-02 / K0 · activar la cuenta personal.
-- A-04 · no cambia identidad, nombre, historial compartido ni se comunica al
-- otro miembro. Es solo un interruptor.
create or replace function app_activate_personal_account()
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  update profiles set has_personal_account = true where id = auth.uid();
end;
$$;


-- ───────────────────────────────────────────────────────────────────────────
-- E · Crear un espacio
-- ───────────────────────────────────────────────────────────────────────────

-- A-06 / P5 / CA-47 · un usuario sin cuenta personal no puede crear espacios.
-- E-02 · el segundo miembro arranca sin acceso; el creador carga por los dos.
create or replace function app_create_space(
  space_name text,
  other_member_name text,
  initial_balance integer default 0,
  -- E-07 · a favor de quién viene el saldo inicial: 'me' o 'other'.
  initial_balance_favors text default 'me'
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  new_space_id uuid;
  my_name text;
  signed_balance integer;
begin
  if not app_has_personal_account() then
    raise exception 'P5: para crear un espacio necesitás tu cuenta personal'
      using errcode = 'check_violation';
  end if;

  select display_name into my_name from profiles where id = auth.uid();
  if my_name is null then
    raise exception 'El usuario no tiene un perfil' using errcode = 'no_data_found';
  end if;

  -- El saldo inicial se guarda siempre a favor del slot 1, que es el creador.
  signed_balance := case
    when initial_balance_favors = 'other' then -abs(initial_balance)
    else abs(initial_balance)
  end;

  insert into spaces (name, initial_balance)
  values (space_name, signed_balance)
  returning id into new_space_id;

  insert into space_members (space_id, slot, user_id, display_name, status, is_creator, joined_at)
  values (new_space_id, 1, auth.uid(), my_name, 'active', true, now());

  -- E-02 · el lugar del otro existe solo como nombre hasta que acepte.
  insert into space_members (space_id, slot, user_id, display_name, status, is_creator)
  values (new_space_id, 2, null, other_member_name, 'no_access', false);

  return new_space_id;
end;
$$;


-- ───────────────────────────────────────────────────────────────────────────
-- I · Invitaciones
-- ───────────────────────────────────────────────────────────────────────────

-- I-01 · solo se invita al lugar de un miembro sin acceso.
-- I-02 / K6 · un solo uso, 7 días, regenerable; la nueva anula la anterior.
--
-- Devuelve el token EN CLARO una única vez: en la base solo queda su hash,
-- así que ni un volcado de la base permite entrar a un espacio ajeno.
create or replace function app_create_invitation(target_space_id uuid)
returns text
language plpgsql
security definer
set search_path = public
as $$
declare
  raw_token text;
  free_slot smallint;
begin
  if app_my_slot(target_space_id) is null then
    raise exception 'No sos miembro de este espacio' using errcode = 'insufficient_privilege';
  end if;

  -- I-01 · el lugar tiene que estar sin acceso.
  select slot into free_slot
  from space_members
  where space_id = target_space_id and status = 'no_access'
  limit 1;

  if free_slot is null then
    raise exception 'I-01: no hay un lugar libre para invitar en este espacio'
      using errcode = 'check_violation';
  end if;

  -- K6 · la nueva anula la anterior.
  update invitations
  set status = 'revoked'
  where space_id = target_space_id and target_slot = free_slot and status = 'active';

  raw_token := replace(encode(gen_random_bytes(32), 'base64'), '/', '_');

  insert into invitations (space_id, target_slot, token_hash, expires_at, created_by)
  values (
    target_space_id,
    free_slot,
    encode(digest(raw_token, 'sha256'), 'hex'),
    now() + interval '7 days',
    auth.uid()
  );

  return raw_token;
end;
$$;


-- I-04 a I-07 · aceptar una invitación.
--
-- Es una función y no un insert con RLS porque quien acepta TODAVÍA no es
-- miembro —no podría ver nada— y porque tres validaciones tienen que pasar de
-- forma atómica: que la invitación sirva (I-05), que no compartan ya un
-- espacio (I-06/P4) y que ocupar el lugar no active una cuenta personal
-- (I-07/A-03).
create or replace function app_accept_invitation(raw_token text, confirmed_name text default null)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  invitation invitations;
  inviter_user_id uuid;
  my_name text;
  shared_space_name text;
begin
  select * into invitation
  from invitations
  where token_hash = encode(digest(raw_token, 'sha256'), 'hex')
  -- Serializa dos aceptaciones del mismo enlace: I-02, un solo uso.
  for update;

  if invitation.id is null then
    raise exception 'INVITATION_NOT_FOUND' using errcode = 'no_data_found';
  end if;

  -- I-05 · una invitación vencida, usada o anulada no da acceso.
  if invitation.status <> 'active' then
    raise exception 'INVITATION_%', upper(invitation.status::text)
      using errcode = 'check_violation';
  end if;

  if invitation.expires_at < now() then
    update invitations set status = 'expired' where id = invitation.id;
    raise exception 'INVITATION_EXPIRED' using errcode = 'check_violation';
  end if;

  -- El lugar sigue libre.
  if not exists (
    select 1 from space_members
    where space_id = invitation.space_id
      and slot = invitation.target_slot
      and status = 'no_access'
  ) then
    raise exception 'INVITATION_SLOT_TAKEN' using errcode = 'check_violation';
  end if;

  -- I-06 / P4 / CA-48 · si ya comparte un espacio activo con quien invita, no
  -- puede aceptar: "Ya compartís Casa con Renzo".
  select user_id into inviter_user_id
  from space_members
  where space_id = invitation.space_id
    and slot <> invitation.target_slot;

  if inviter_user_id is not null then
    select s.name into shared_space_name
    from spaces s
    join space_members mine on mine.space_id = s.id
    join space_members theirs on theirs.space_id = s.id
    where mine.user_id = auth.uid() and mine.status = 'active'
      and theirs.user_id = inviter_user_id and theirs.status = 'active'
      and s.id <> invitation.space_id
    limit 1;

    if shared_space_name is not null then
      raise exception 'ALREADY_SHARING:%', shared_space_name
        using errcode = 'check_violation';
    end if;
  end if;

  -- §26 · el nombre visible se puede confirmar o cambiar al aceptar.
  select display_name into my_name from profiles where id = auth.uid();

  -- I-04 / K8 · ocupa el lugar y ve TODO el historial del espacio.
  update space_members
  set user_id = auth.uid(),
      display_name = coalesce(nullif(trim(coalesce(confirmed_name, '')), ''), my_name, display_name),
      status = 'active',
      joined_at = now()
  where space_id = invitation.space_id and slot = invitation.target_slot;

  update invitations
  set status = 'used', used_at = now()
  where id = invitation.id;

  -- I-07 / A-03 · aceptar NUNCA activa una cuenta personal. El invitado queda
  -- en Estado B, que es una forma completa y válida de usar la app (§10).
  return invitation.space_id;
end;
$$;


-- ───────────────────────────────────────────────────────────────────────────
-- SA · Salir de un espacio
-- ───────────────────────────────────────────────────────────────────────────

-- SA-02 · pierde el acceso; el historial queda para el otro y su nombre
--         permanece como "ex miembro" (K4).
-- SA-03 · las cuotas compartidas ya generadas siguen y suman al saldo (K5).
--         Por eso NO se toca shared_expenses.
-- SA-04 · los fijos compartidos se detienen desde la salida.
-- SA-06 · sin miembros con acceso, el espacio se elimina.
create or replace function app_leave_space(target_space_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  my_slot_value smallint;
  current_month text;
  remaining integer;
begin
  my_slot_value := app_my_slot(target_space_id);
  if my_slot_value is null then
    raise exception 'No sos miembro de este espacio' using errcode = 'insufficient_privilege';
  end if;

  current_month := to_char(now(), 'YYYY-MM');

  -- SA-04 · los fijos compartidos se detienen desde la salida.
  update recurrences
  set end_month = least(coalesce(end_month, current_month), current_month)
  where space_id = target_space_id
    and (end_month is null or end_month > current_month);

  update space_members
  set status = 'former', user_id = null, left_at = now()
  where space_id = target_space_id and slot = my_slot_value;

  -- SA-06 · si no queda nadie con acceso, el espacio se elimina.
  select count(*) into remaining
  from space_members
  where space_id = target_space_id and status = 'active';

  if remaining = 0 then
    delete from spaces where id = target_space_id;
  end if;
end;
$$;


-- ───────────────────────────────────────────────────────────────────────────
-- D · Eliminación de cuenta
-- ───────────────────────────────────────────────────────────────────────────

-- D-01 · eliminar el usuario sale de todos sus espacios y borra su identidad
--        y su cuenta personal.
-- D-02 / K4 · en los espacios queda su nombre como "ex miembro", porque esos
--        registros también son del otro miembro.
create or replace function app_delete_account()
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  space_row record;
begin
  for space_row in select space_id from space_members where user_id = auth.uid() and status = 'active'
  loop
    perform app_leave_space(space_row.space_id);
  end loop;

  -- El borrado en cascada de profiles se lleva tarjetas, movimientos,
  -- recurrentes personales y resúmenes declarados.
  delete from auth.users where id = auth.uid();
end;
$$;


revoke all on function app_activate_personal_account() from public;
revoke all on function app_create_space(text, text, integer, text) from public;
revoke all on function app_create_invitation(uuid) from public;
revoke all on function app_accept_invitation(text, text) from public;
revoke all on function app_leave_space(uuid) from public;
revoke all on function app_delete_account() from public;

grant execute on function app_activate_personal_account() to authenticated;
grant execute on function app_create_space(text, text, integer, text) to authenticated;
grant execute on function app_create_invitation(uuid) to authenticated;
grant execute on function app_accept_invitation(text, text) to authenticated;
grant execute on function app_leave_space(uuid) to authenticated;
grant execute on function app_delete_account() to authenticated;
