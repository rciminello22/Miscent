-- ───────────────────────────────────────────────────────────────────────────
-- Diagnóstico de duplicados históricos (21/10) · SOLO LECTURA
--
-- Antes de la 0022, cuatro caminos podían duplicar registros (auditoría del
-- 20/10): el paso "deuda" del onboarding (H-01), los fijos del onboarding
-- (H-16), mover un gasto entre personal y un espacio (H-12) y el alta
-- compartida con su detalle de pago (H-14).
--
-- Estas consultas NO borran nada. Listan CANDIDATOS: dos gastos iguales el
-- mismo día pueden ser legítimos (dos cafés de $2.000). Lo que separa un
-- duplicado de un registro legítimo es la combinación de señales que lleva
-- cada consulta: mismo usuario, mismos datos y creados con segundos o
-- minutos de diferencia, o una descripción que solo crea el onboarding.
--
-- Cómo correrlo (no está en migrations/, así que `db push` no lo toca):
--   npx supabase db query --linked -f supabase/diagnostics/duplicados_historicos.sql
-- O pegarlo en el SQL Editor del dashboard.
--
-- Si aparece algo, la reparación es manual y con respaldo (ver HANDOFF §5,
-- "Integridad de escrituras (0022)"): nunca un DELETE masivo.
-- ───────────────────────────────────────────────────────────────────────────


-- 1 · H-01 · más de un resumen pendiente declarado para la misma tarjeta.
--     T-07: el onboarding declara UNO por tarjeta. Dos con el mismo monto y
--     vencimiento son casi seguro el mismo, guardado dos veces.
select
  'resumen_declarado' as tipo,
  d.user_id,
  d.payment_method_id,
  d.amount,
  d.due_date,
  count(*) as veces,
  array_agg(d.id order by d.created_at) as ids,
  min(d.created_at) as primero,
  max(d.created_at) as ultimo
from declared_statements d
group by d.user_id, d.payment_method_id, d.amount, d.due_date
having count(*) > 1
order by ultimo desc;


-- 2 · H-01 · cuotas en curso y "Consumos previos (aprox.)" del onboarding
--     guardados más de una vez: mismos datos, misma tarjeta, creados con
--     menos de 30 minutos de diferencia.
select
  'onboarding_deuda' as tipo,
  m.user_id,
  m.payment_method_id,
  m.amount,
  m.description,
  m.installments_count,
  m.first_installment_month,
  count(*) as veces,
  array_agg(m.id order by m.created_at) as ids,
  max(m.created_at) - min(m.created_at) as ventana
from personal_movements m
where m.category = 'otros'
  and m.payment_method_id is not null
  and (m.installments_count is not null or m.description = 'Consumos previos (aprox.)')
group by m.user_id, m.payment_method_id, m.amount, m.description, m.date,
         m.installments_count, m.first_installment_month
having count(*) > 1 and max(m.created_at) - min(m.created_at) < interval '30 minutes'
order by max(m.created_at) desc;


-- 3 · H-16 · fijos personales iguales creados con minutos de diferencia
--     (reintento del paso "Fijos").
select
  'fijo_personal' as tipo,
  r.owner_user_id,
  r.category,
  r.description,
  r.amount,
  r.day_of_month,
  r.start_month,
  count(*) as veces,
  array_agg(r.id order by r.created_at) as ids,
  max(r.created_at) - min(r.created_at) as ventana
from recurrences r
where r.owner_user_id is not null and r.end_month is null
group by r.owner_user_id, r.category, r.description, r.amount, r.day_of_month, r.start_month
having count(*) > 1 and max(r.created_at) - min(r.created_at) < interval '30 minutes'
order by max(r.created_at) desc;


-- 4 · H-12 · un gasto que quedó en los DOS lados: un personal y un compartido
--     con los mismos datos, cargado por la misma persona. Cuenta dos veces
--     en su radar.
select
  'en_los_dos_lados' as tipo,
  m.user_id,
  m.id as personal_id,
  e.id as compartido_id,
  e.space_id,
  m.amount,
  m.date,
  m.category,
  m.description,
  m.created_at as personal_creado,
  e.created_at as compartido_creado
from personal_movements m
join space_members sm on sm.user_id = m.user_id and sm.status = 'active'
join shared_expenses e
  on e.space_id = sm.space_id
 and e.created_by_slot = sm.slot
 and e.amount = m.amount
 and e.date = m.date
 and e.category = m.category
 and e.description is not distinct from m.description
where m.kind = 'expense'
  and abs(extract(epoch from (e.created_at - m.created_at))) < 3600
order by e.created_at desc;


-- 5 · H-14 · gastos compartidos iguales, del mismo autor, con segundos de
--     diferencia (doble toque o reintento después de una respuesta perdida).
select
  'compartido_repetido' as tipo,
  e.space_id,
  e.created_by_slot,
  e.amount,
  e.date,
  e.category,
  e.description,
  count(*) as veces,
  array_agg(e.id order by e.created_at) as ids,
  max(e.created_at) - min(e.created_at) as ventana
from shared_expenses e
group by e.space_id, e.created_by_slot, e.amount, e.date, e.category, e.description,
         e.installments_count
having count(*) > 1 and max(e.created_at) - min(e.created_at) < interval '2 minutes'
order by max(e.created_at) desc;


-- 6 · H-14 · detalles de pago huérfanos: su gasto o fijo ya no existe (quedan
--     de un borrado compensatorio o de un movimiento a medias). No cambian
--     ninguna cifra, pero son basura.
select
  'detalle_huerfano' as tipo,
  d.source_id,
  d.space_id,
  d.slot
from shared_payment_details d
where not exists (select 1 from shared_expenses e where e.id = d.source_id)
  and not exists (select 1 from recurrences r where r.id = d.source_id);
