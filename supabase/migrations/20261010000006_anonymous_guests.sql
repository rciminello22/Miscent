-- ───────────────────────────────────────────────────────────────────────────
-- O2 sin email (decisión del 10/10) · la invitada entra como usuario anónimo
--
-- Un anónimo usa el mismo rol `authenticated` que cualquier usuario, así que
-- las políticas existentes ya lo limitan a SU perfil y a los espacios donde es
-- miembro activo: no ve nada ajeno. Lo que faltaba es la regla de producto:
--
--   Sin email no hay cuenta personal. Si pierde el teléfono, la perdería, y
--   sin cuenta personal tampoco crea espacios (P5).
--
-- Hasta acá la cuidaba solo la app. Un cliente modificado podía llamar a
-- app_activate_personal_account() o escribir has_personal_account = true en
-- su perfil, y crear cuentas y espacios sin identidad: un vector de abuso.
-- ───────────────────────────────────────────────────────────────────────────

-- El claim is_anonymous que Supabase pone en el JWT de un usuario anónimo.
-- Cuando vincula su email y se renueva la sesión, pasa a false.
create or replace function app_is_anonymous()
returns boolean
language sql
stable
set search_path = public
as $$
  select coalesce((auth.jwt() ->> 'is_anonymous')::boolean, false);
$$;

revoke all on function app_is_anonymous() from public;
grant execute on function app_is_anonymous() to authenticated;


-- RESTRICTIVAS: se suman (AND) a las políticas de profiles que ya existen, no
-- las reemplazan. Un anónimo sigue creando y editando su perfil (su nombre),
-- pero nunca con cuenta personal.
create policy "profiles: sin email no hay cuenta personal (alta)" on profiles
  as restrictive
  for insert
  with check (not app_is_anonymous() or has_personal_account = false);

create policy "profiles: sin email no hay cuenta personal (edición)" on profiles
  as restrictive
  for update
  with check (not app_is_anonymous() or has_personal_account = false);


-- A-02 · la cuenta personal se activa explícitamente; desde el 10/10, además,
-- solo con email.
create or replace function app_activate_personal_account()
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if app_is_anonymous() then
    raise exception 'Para crear tu cuenta personal, primero guardá tu acceso con tu email'
      using errcode = 'insufficient_privilege';
  end if;

  update profiles set has_personal_account = true where id = auth.uid();
end;
$$;
