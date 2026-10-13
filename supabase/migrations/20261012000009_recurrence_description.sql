-- ───────────────────────────────────────────────────────────────────────────
-- Descripción de los fijos (12/10)
--
-- Los gastos ya tenían descripción; los fijos no. Sin ella, "Luz" y "Gas"
-- se guardaban los dos como "Servicios" y después no había forma de
-- distinguirlos, y un fijo propio ("Monotributo") quedaba como "Impuestos".
--
-- No toca RLS: la descripción de un fijo compartido la ven los dos miembros,
-- igual que la de un gasto compartido (§12). La de uno personal, solo su
-- dueño, porque la fila entera ya es solo suya.
--
-- Nullable: los fijos que ya existen siguen mostrándose por su categoría.
-- ───────────────────────────────────────────────────────────────────────────

alter table recurrences
  add column description text
  check (description is null or char_length(description) between 1 and 140);
