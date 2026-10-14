-- ───────────────────────────────────────────────────────────────────────────
-- Las funciones nuevas nacen cerradas DE VERDAD (arreglo de seguridad, 14/10)
--
-- La 0008 sacó los privilegios por defecto de anon y authenticated, y se
-- asumió que con eso "una función nueva nace cerrada". No alcanza: Postgres
-- además le da EXECUTE a PUBLIC a toda función nueva, y anon es miembro de
-- PUBLIC. app_resolve_stopped_recurrence (0011) quedó ejecutable sin sesión:
-- el test "Sin sesión no se ejecuta ninguna función de la app" lo cazó.
--
-- No era explotable (sin sesión, app_my_slot da null y la función rechaza
-- con 42501), pero una función abierta de más es un agujero esperando a la
-- próxima que no valide adentro.
-- ───────────────────────────────────────────────────────────────────────────

-- La que quedó abierta: solo para quien tiene sesión.
revoke all on function app_resolve_stopped_recurrence(uuid, boolean) from public, anon;
grant execute on function app_resolve_stopped_recurrence(uuid, boolean) to authenticated;

-- De raíz: desde ahora, ninguna función nueva le da EXECUTE a PUBLIC. Cada
-- migración abre las suyas con un grant explícito, como ya era la regla.
alter default privileges in schema public revoke execute on functions from public;
