-- ───────────────────────────────────────────────────────────────────────────
-- El ciclo de vida de un miembro, borre quien borre (decisiones del 10/10)
--
-- 1. D-01 por fuera de la app. El 10/10 se borró una usuaria desde el
--    dashboard: auth.users en cascada → profiles, y space_members.user_id
--    quedó en null con status 'active'. Un lugar "activo" sin nadie: no
--    figuraba como ex miembro y no se lo podía volver a invitar (I-01).
--    app_delete_account sale de los espacios antes de borrar, pero cualquier
--    otro camino (dashboard, Admin API) se salteaba las reglas de salida.
--
-- 2. P7 · se puede volver a invitar al lugar de un ex miembro. Quien acepta
--    ocupa ese lugar, con el historial y el saldo.
--
-- 3. §26 (Should) · el creador puede quitar el acceso de quien entró por un
--    enlace reenviado. El lugar vuelve a 'no_access'. No es un rol de
--    administrador: §6 los deja afuera, y nadie más puede sacar a nadie.
-- ───────────────────────────────────────────────────────────────────────────


-- Las reglas de salida, en un solo lugar. La usan salir de un espacio,
-- eliminar la cuenta y el borrado de un perfil por cualquier camino.
--   SA-02 · el lugar queda como ex miembro, sin usuario
--   SA-04 · los fijos compartidos se detienen desde la salida
--   SA-06 · sin miembros con acceso, el espacio se elimina
create or replace function app_member_departs(target_space_id uuid, departing_slot smallint)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  current_month text := to_char(now(), 'YYYY-MM');
  remaining integer;
begin
  update recurrences
  set end_month = least(coalesce(end_month, current_month), current_month)
  where space_id = target_space_id
    and (end_month is null or end_month > current_month);

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

-- Interna: nadie la llama directo desde la app.
revoke all on function app_member_departs(uuid, smallint) from public;


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

  perform app_member_departs(target_space_id, my_slot_value);
end;
$$;


-- 1 · Borre quien borre un perfil, sus espacios lo ven salir (D-01, D-02).
-- BEFORE: el user_id todavía está, y después la FK lo pone en null.
create or replace function app_on_profile_deleted()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  membership record;
begin
  for membership in
    select space_id, slot from space_members
    where user_id = old.id and status = 'active'
  loop
    perform app_member_departs(membership.space_id, membership.slot);
  end loop;
  return old;
end;
$$;

revoke all on function app_on_profile_deleted() from public;

create trigger profiles_member_departs
  before delete on profiles
  for each row execute function app_on_profile_deleted();

-- Corrección única: los lugares que ya quedaron "activos sin nadie" (el del
-- 10/10) pasan por las mismas reglas de salida.
do $$
declare
  zombie record;
begin
  for zombie in
    select space_id, slot from space_members
    where status = 'active' and user_id is null
  loop
    perform app_member_departs(zombie.space_id, zombie.slot);
  end loop;
end;
$$;


-- 2 · P7 · invitar también al lugar de un ex miembro.
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

  -- I-01 + P7 · un lugar sin acceso o de un ex miembro.
  select slot into free_slot
  from space_members
  where space_id = target_space_id and status in ('no_access', 'former')
  limit 1;

  if free_slot is null then
    raise exception 'I-01: no hay un lugar libre para invitar en este espacio'
      using errcode = 'check_violation';
  end if;

  -- K6 · la nueva anula la anterior.
  update invitations
  set status = 'revoked'
  where space_id = target_space_id and target_slot = free_slot and status = 'active';

  raw_token := replace(
    replace(encode(extensions.gen_random_bytes(32), 'base64'), '/', '_'),
    '+', '-'
  );

  insert into invitations (space_id, target_slot, token_hash, expires_at, created_by)
  values (
    target_space_id,
    free_slot,
    encode(extensions.digest(raw_token, 'sha256'), 'hex'),
    now() + interval '7 days',
    auth.uid()
  );

  return raw_token;
end;
$$;


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
  where token_hash = encode(extensions.digest(raw_token, 'sha256'), 'hex')
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

  -- I-01 + P7 · el lugar tiene que estar sin acceso o ser de un ex miembro.
  if not exists (
    select 1 from space_members
    where space_id = invitation.space_id
      and slot = invitation.target_slot
      and status in ('no_access', 'former')
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

  select display_name into my_name from profiles where id = auth.uid();

  -- I-04 / K8 · ocupa el lugar y ve TODO el historial del espacio.
  update space_members
  set user_id = auth.uid(),
      display_name = coalesce(nullif(trim(coalesce(confirmed_name, '')), ''), my_name, display_name),
      status = 'active',
      joined_at = now(),
      left_at = null
  where space_id = invitation.space_id and slot = invitation.target_slot;

  update invitations
  set status = 'used', used_at = now()
  where id = invitation.id;

  -- I-07 / A-03 · aceptar NUNCA activa una cuenta personal.
  return invitation.space_id;
end;
$$;


-- 3 · §26 (Should) · el creador quita el acceso de quien entró por error.
--
-- El lugar vuelve a 'no_access' (no 'former'): esa persona no tenía que
-- estar, así que el lugar sigue esperando a quien sí. Lo que cargó queda con
-- su autoría (K3) y los fijos siguen: el lugar no se fue, cambia quién lo
-- ocupa.
create or replace function app_remove_member_access(target_space_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  my_slot_value smallint;
begin
  select slot into my_slot_value
  from space_members
  where space_id = target_space_id
    and user_id = auth.uid()
    and status = 'active'
    and is_creator;

  if my_slot_value is null then
    raise exception '§26: solo quien creó el espacio puede quitar el acceso del otro'
      using errcode = 'insufficient_privilege';
  end if;

  update space_members
  set user_id = null, status = 'no_access', joined_at = null
  where space_id = target_space_id
    and slot <> my_slot_value
    and status = 'active';
end;
$$;

revoke all on function app_remove_member_access(uuid) from public;
grant execute on function app_remove_member_access(uuid) to authenticated;
