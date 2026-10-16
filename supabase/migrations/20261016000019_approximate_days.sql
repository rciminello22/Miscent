-- ───────────────────────────────────────────────────────────────────────────
-- Días aproximados · "Sé el día", "Más o menos" y "No sé" (16/10)
--
-- T-02 · el cierre y el vencimiento de una tarjeta pueden no saberse. Hasta
-- ahora solo existían dos respuestas: un día, o NULL ("No sé", T-05). Falta la
-- del medio, que es la más común: "por el 15". "Más o menos" guarda 2, 15 o 28
-- (principio, mediados, fin de mes) y, además, que ese día es APROXIMADO, para
-- que la app lo muestre como "~15 nov" y no como una fecha firme.
--
-- Lo mismo para el día de cobro de un ingreso: hoy se elegía un "1" de
-- antemano y nadie sabía que no lo había elegido.
--
--   payment_methods.closing_day_approx / due_day_approx
--   recurrences.day_approx
--
-- Los tres son un hecho más del dominio, no una columna calculada: default
-- false, así que las filas que ya existen siguen siendo "día exacto" o "No sé",
-- como eran.
--
-- "No sé" en un ingreso: el día de cobro NO mueve ningún total (el radar y
-- Futuro cuentan los ingresos por mes), así que no hace falta una regla de
-- aproximación como la de T-05. Por eso day_of_month admite NULL, pero SOLO en
-- un ingreso personal: un gasto fijo, y todo lo compartido, necesita su día
-- (S-02: un fijo compartido mueve el saldo en su día del mes).
--
-- RLS: no cambia. Las políticas de payment_methods y de recurrences son de FILA
-- ("solo su dueño"; "propios o de mis espacios"), no de columna, así que las
-- columnas nuevas quedan cubiertas igual que las de siempre. Una tarjeta, y por
-- lo tanto si su día es aproximado, la sigue viendo solo su dueño (T-01, PR-02).
--
-- Sin funciones nuevas: no hay nada que cerrar con grant.
--
-- Tarjetas (P24): NO se toca ninguna FK. Al eliminar una tarjeta, las compras y
-- los fijos que la usaban ya quedan sin tarjeta (personal_movements y
-- recurrences: on delete set null); su resumen declarado y el detalle privado de
-- pago de un gasto compartido se van con ella (on delete cascade).
-- ───────────────────────────────────────────────────────────────────────────

alter table payment_methods
  add column closing_day_approx boolean not null default false,
  add column due_day_approx boolean not null default false;

-- Un día "aproximado" sin día no dice nada: "No sé" es NULL sin marca.
alter table payment_methods
  add constraint approx_days_need_a_day check (
    (not closing_day_approx or closing_day is not null)
    and (not due_day_approx or due_day is not null)
  );

alter table recurrences
  add column day_approx boolean not null default false;

alter table recurrences
  alter column day_of_month drop not null;

-- Solo un ingreso personal puede quedar sin día ("No sé").
alter table recurrences
  add constraint day_known_unless_personal_income check (
    day_of_month is not null
    or (kind = 'income' and owner_user_id is not null and space_id is null)
  );

alter table recurrences
  add constraint approx_day_needs_a_day check (not day_approx or day_of_month is not null);

comment on column payment_methods.closing_day_approx is
  'T-02 · el día de cierre salió de un "Más o menos" (2, 15 o 28): la app lo muestra como aproximado.';
comment on column payment_methods.due_day_approx is
  'T-02 · el día de vencimiento salió de un "Más o menos" (2, 15 o 28): la app lo muestra como aproximado.';
comment on column recurrences.day_approx is
  'El día salió de un "Más o menos" (2, 15 o 28): la app lo muestra como aproximado.';
