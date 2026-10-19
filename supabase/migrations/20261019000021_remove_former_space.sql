-- ───────────────────────────────────────────────────────────────────────────
-- Quitar un espacio de tu historial (19/10)
--
-- SA-05 · P6 · P8 · al salir de un espacio, el servidor guarda una foto privada
-- (former_memberships, 0018) para que la cuenta personal de quien salió no
-- pierda el espacio: sus meses pasados no cambian, sus cuotas siguen en Futuro y
-- los gastos aparecen en Movimientos como "Con gonzalo · ya no sos miembro".
-- Esa foto no se podía sacar de la cuenta. Ahora se puede, de una vez y entera:
-- Perfil → "Espacios que dejaste" → Quitar.
--
-- Lo que cambia para quien la quita: su radar de los meses en que estuvo en el
-- espacio deja de contar su parte, las filas del espacio desaparecen de
-- Movimientos y el resumen "Al salir, X te debía $Y" deja de verse. La hoja de
-- confirmación de la app lo dice antes, con los meses y la suma. Para el otro
-- miembro y para cualquier otra persona NO cambia nada: es la foto de UNA
-- persona y la función solo toca la fila de quien la llama.
--
-- Por qué una función y no una política de borrado:
--   former_memberships no tiene políticas de escritura A PROPÓSITO (0018):
--   nadie se arma ni se edita una foto a mano. Borrar su propia fila es otra
--   cosa, pero abrir un DELETE por RLS dejaría borrar con cualquier filtro. La
--   función corre como definer y borra UNA fila, la de auth.uid() y el espacio
--   que se pide: no hay forma de alcanzar la de otro.
--
-- La regla "solo si no quedan cuotas por venir" NO se repite acá. La calcula el
-- dominio de la app sobre la foto (leftOn) y decide si se ofrece el botón: lo
-- único que puede perder el usuario con esta función es lo suyo, y son hechos
-- que la app ya tiene.
--
-- Sin deshacer: la foto no se puede rearmar, porque el espacio ya no le llega a
-- quien salió (SA-02). Por eso la confirmación avisa "No se puede deshacer".
--
-- Seguridad (HANDOFF §6): security definer con search_path = public, sin
-- ampliarlo. Desde la 0014 una función nueva nace cerrada; igual se revoca y se
-- da el grant de forma explícita, para que la migración se lea sola. Sin
-- sesión (auth.uid() es null) falla con un error claro y, además, anon no tiene
-- EXECUTE: lo mira el test "Sin sesión no se ejecuta ninguna función de la app".
-- ───────────────────────────────────────────────────────────────────────────

create or replace function app_remove_former_space(target_space_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if auth.uid() is null then
    raise exception 'Necesitás iniciar sesión' using errcode = 'insufficient_privilege';
  end if;

  -- Solo la propia. Si no hay foto de ese espacio (o es de otro), no pasa nada.
  delete from former_memberships
  where user_id = auth.uid()
    and space_id = target_space_id;
end;
$$;

comment on function app_remove_former_space(uuid) is
  'Quitar un espacio del historial: borra la foto propia de former_memberships. '
  'Solo la fila de quien llama; la regla de las cuotas por venir la aplica la app.';

revoke all on function app_remove_former_space(uuid) from public, anon;
grant execute on function app_remove_former_space(uuid) to authenticated;
