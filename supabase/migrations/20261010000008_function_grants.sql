-- ───────────────────────────────────────────────────────────────────────────
-- Permisos de ejecución de las funciones (arreglo de seguridad, 10/10)
--
-- En Supabase, cada función nueva del schema public nace con EXECUTE para
-- anon y authenticated (privilegios por defecto, EXPLÍCITOS por rol). Un
-- `revoke all ... from public` no los saca. Las migraciones anteriores
-- asumían lo contrario.
--
-- Lo grave: app_member_departs (0007) es security definer y no valida quién
-- la llama, porque es interna. Quedó ejecutable por anon y authenticated:
-- con el id de un espacio se podía marcar a cualquier miembro como ex miembro
-- o borrar el espacio. Las demás validan auth.uid() adentro, pero tampoco
-- tienen por qué estar abiertas sin sesión.
-- ───────────────────────────────────────────────────────────────────────────

-- Sin sesión no se ejecuta NINGUNA función de la app. (Las políticas que las
-- usan, consultadas por anon, pasan de "cero filas" a "permiso denegado":
-- siguen cerradas.)
revoke execute on all functions in schema public from anon;

-- Internas: ni siquiera con sesión. Las de trigger tampoco se pueden llamar
-- directo, pero no tienen por qué figurar como ejecutables.
revoke execute on function app_member_departs(uuid, smallint) from authenticated;
revoke execute on function app_on_profile_deleted() from authenticated;
revoke execute on function app_on_shared_expense_deleted() from authenticated;

-- De acá en adelante, una función nueva nace CERRADA y cada migración da el
-- grant que corresponde, explícito (como ya hacían todas las RPC de la app).
alter default privileges in schema public revoke execute on functions from anon, authenticated;
