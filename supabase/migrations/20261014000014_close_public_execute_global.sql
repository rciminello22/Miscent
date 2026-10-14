-- ───────────────────────────────────────────────────────────────────────────
-- Las funciones nuevas nacen cerradas · ahora sí (arreglo de seguridad, 14/10)
--
-- La 0012 hizo `alter default privileges in schema public revoke execute on
-- functions from public` y no sirvió: los default privileges POR ESQUEMA solo
-- se SUMAN a los globales, no pueden sacar nada (documentación de Postgres,
-- ALTER DEFAULT PRIVILEGES). El EXECUTE de PUBLIC viene del default GLOBAL.
-- app_mark_reviewed (0013) nació abierta sin sesión, y el test "Sin sesión no
-- se ejecuta ninguna función de la app" la cazó otra vez.
--
-- No era explotable (sin sesión, app_my_slot da null y rechaza con 42501).
-- ───────────────────────────────────────────────────────────────────────────

-- La que quedó abierta.
revoke all on function app_mark_reviewed(uuid, uuid[]) from public, anon;
grant execute on function app_mark_reviewed(uuid, uuid[]) to authenticated;

-- La causa: el default GLOBAL del rol que corre las migraciones. Sin
-- `in schema`, que es lo que la 0012 tenía de más.
alter default privileges for role postgres revoke execute on functions from public;
