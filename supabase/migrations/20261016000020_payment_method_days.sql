-- ───────────────────────────────────────────────────────────────────────────
-- Historia de los días de una tarjeta · corregir el cierre o el vencimiento no
-- cambia un mes pasado (16/10)
--
-- T-03 · el mes en que se paga una compra en 1 pago (y cada ocurrencia de un fijo
-- con tarjeta, F-01) NO se guarda: se calcula con el cierre y el vencimiento de la
-- tarjeta. Si el usuario corrige esos días, lo ya pagado se recalculaba con los
-- días nuevos y un mes pasado cambiaba. Las cuotas no tenían el problema: su plan
-- (primer mes, cantidad, día de impacto) ya se guarda en cada compra.
--
-- Esta tabla guarda los días que tuvo la tarjeta ANTES de cada corrección:
--
--   payment_method_days   una fila por corrección: los días de antes y hasta qué
--                         fecha valieron (valid_until, sin incluirla)
--
-- Los días VIGENTES siguen en payment_methods, como siempre. Elegí guardar solo las
-- versiones anteriores y no todas, porque así una tarjeta que nunca se corrigió no
-- tiene filas en esta tabla y lo que ya existe no necesita ninguna migración de
-- datos. Si la tabla no existe o viene vacía, la app calcula todo con los días de
-- payment_methods, como antes.
--
-- Cómo se usa (lo decide el dominio, no la base): ver `resolveCardStatement`. Una
-- corrección, con su fecha, vale para lo que con los días de antes Y con los nuevos
-- se paga en el mes de la corrección o después. Lo que se pagó en un mes anterior
-- conserva los días de antes.
--
-- RLS: la tarjeta es de su dueño y nadie más la ve (T-01, PR-02), y sus días
-- tampoco. La política es la de payment_methods: solo las filas de las tarjetas
-- del usuario. El otro miembro de un espacio no ve esta tabla, y sin sesión
-- tampoco (auth.uid() es null).
--
-- El saldo compartido NO depende de estos días (P19, F2): un gasto puntual mueve
-- el saldo en su fecha de compra, una cuota en la fecha de impacto que guarda su
-- plan, un fijo en su día del mes. shared_payment_details solo dice QUÉ tarjeta se
-- usó. Las políticas de esas tablas no se tocan.
--
-- Sin funciones nuevas: no hay nada que cerrar con grant.
-- ───────────────────────────────────────────────────────────────────────────

create table payment_method_days (
  id uuid primary key default gen_random_uuid(),
  payment_method_id uuid not null references payment_methods on delete cascade,
  -- Estos días valieron hasta esta fecha, sin incluirla (la de la corrección).
  valid_until date not null,
  -- NULL significa "No sé" (T-05), igual que en payment_methods.
  closing_day smallint check (closing_day between 1 and 31),
  due_day smallint check (due_day between 1 and 31),
  closing_day_approx boolean not null default false,
  due_day_approx boolean not null default false,
  created_at timestamptz not null default now(),
  -- Corregir dos veces el mismo día no guarda dos versiones: la del medio duró cero días.
  constraint payment_method_days_one_per_cut unique (payment_method_id, valid_until),
  -- Un día "aproximado" sin día no dice nada: "No sé" es NULL sin marca (como la 0019).
  constraint payment_method_days_approx_need_a_day check (
    (not closing_day_approx or closing_day is not null)
    and (not due_day_approx or due_day is not null)
  )
);

comment on table payment_method_days is
  'T-03 · los días que tuvo una tarjeta antes de cada corrección, para que corregirlos no cambie un mes pasado. Los vigentes viven en payment_methods.';
comment on column payment_method_days.valid_until is
  'Estos días valieron hasta esta fecha, sin incluirla: la fecha en que se corrigieron.';

alter table payment_method_days enable row level security;

create policy "payment_method_days: solo el dueño de la tarjeta" on payment_method_days
  for all
  using (payment_method_id in (select id from payment_methods where user_id = auth.uid()))
  with check (payment_method_id in (select id from payment_methods where user_id = auth.uid()));
