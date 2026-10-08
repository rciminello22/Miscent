-- ───────────────────────────────────────────────────────────────────────────
-- Fix · pgcrypto vive en el schema `extensions`, no en `public`
--
-- Las funciones de invitación son SECURITY DEFINER con `set search_path =
-- public`, que es lo correcto desde el lado de seguridad: un search_path
-- mutable en una función SECURITY DEFINER es un vector de escalada de
-- privilegios. Pero justamente por eso no encontraban gen_random_bytes() ni
-- digest(), que en Supabase están en `extensions`.
--
-- La solución no es ampliar el search_path: es calificar las funciones. Queda
-- explícito y no depende de la configuración del entorno.
--
-- Lo encontró el test de autorización. Es exactamente para eso que existe.
-- ───────────────────────────────────────────────────────────────────────────

-- I-01 · solo se invita al lugar de un miembro sin acceso.
-- I-02 / K6 · un solo uso, 7 días, regenerable; la nueva anula la anterior.
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


-- I-04 a I-07 · aceptar una invitación.
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

  -- I-07 / A-03 · aceptar NUNCA activa una cuenta personal.
  return invitation.space_id;
end;
$$;
