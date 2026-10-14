-- ───────────────────────────────────────────────────────────────────────────
-- F-03 · "Cambiar desde este mes" no reescribe el pasado (14/10)
--
-- El fijo guardaba un solo monto y el dominio lo usaba para todos los meses:
-- subir el alquiler en octubre cambiaba también enero..septiembre. El radar
-- de un mes cerrado dejaba de coincidir con lo que el usuario vio y, en un
-- fijo compartido, el saldo cambiaba por todos los meses anteriores.
--
-- past_terms guarda los tramos de antes de cada cambio:
--   [{ "until": "2026-09", "amount": 500000, "split": {...} | null }, ...]
-- Lo escribe la app junto con el monto nuevo, en el MISMO update: o cambian
-- los dos o ninguno. El dominio elige el tramo de cada mes al expandir.
-- ───────────────────────────────────────────────────────────────────────────

alter table recurrences
  add column past_terms jsonb not null default '[]'::jsonb
    check (jsonb_typeof(past_terms) = 'array');

comment on column recurrences.past_terms is
  'F-03 · montos (y reparto) de antes de cada "Cambiar desde este mes". '
  'Cada tramo vale hasta su mes "until", inclusive.';
