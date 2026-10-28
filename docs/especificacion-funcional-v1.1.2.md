# Especificación funcional V1.1.2 — Radar del sueldo comprometido

**Fecha:** 6 de octubre de 2026 · **Autor:** Renzo Ciminello · **Estado:** V1.1.2 es la fuente de verdad funcional para el MVP

Consolida y reemplaza a la Especificación funcional V1.1.1, a la V1.1, a la V1.0 y al documento "Decisión de producto — Modelo de cuentas y espacio compartido".

**Etiquetas usadas en todo el documento**

- **[DECISIÓN]** cerrada por Renzo.
- **[RECOMENDACIÓN]** propuesta todavía no aprobada.
- **[HIPÓTESIS]** solo se valida con uso real.
- **[PENDIENTE]** requiere una decisión (ver sección 38).

**Regla para la implementación:** lo marcado [RECOMENDACIÓN] se implementa tal como está descrito, salvo que Renzo indique lo contrario (lista en la sección 38). Las [HIPÓTESIS] no cambian el comportamiento: se observan en el piloto.

**Cómo leer este documento:** las secciones 7 (modelo conceptual y glosario), 29 (reglas de negocio) y 29.1 (verificación matemática) son la fuente de verdad para la implementación. Si otra sección las contradice, mandan 7, 29 y 29.1. La sección 31 (casos de uso) y la 36 (criterios de aceptación) sirven como pruebas.

---

## Definición de producto en una frase

> **Una app donde anotás tus ingresos, gastos, cuotas y gastos fijos —y los que compartís con otra persona— y que te muestra qué parte de tus ingresos ya tiene destino, qué pagos se vienen y quién le debe a quién, sin que tengas que armar ninguna planilla.**

Lo que la frase deja afuera a propósito: la app **no** sabe ni dice cuánta plata tenés en tus cuentas.

---

## 1. Resumen ejecutivo

**Qué es.** Una app móvil que convierte lo que una persona llevaría en una planilla, una pizarra o la memoria en una vista visual y automática de sus **egresos** y **compromisos**. Tiene dos pilares de igual importancia:

- **Finanzas personales (privadas):** la persona registra ingresos, gastos, compras en cuotas, tarjetas y gastos fijos. La app le muestra **qué parte de sus ingresos registrados ya tiene destino**, **qué pagos se vienen** y **cómo vienen sus próximos meses**.
- **Finanzas compartidas:** dos personas comparten un **espacio** ("Casa") donde anotan qué pagó cada uno. La app calcula **quién puso más y quién le debe a quién**. Es la pizarra de la heladera, pero hace las cuentas.

**Lo que la app no es [DECISIÓN].** No es una app bancaria ni una billetera. **No conoce ni pretende conocer el dinero real que tiene el usuario** (repartido entre bancos, Mercado Pago, Ualá, Naranja X, efectivo u otras cuentas). No sincroniza saldos, no concilia y no hace contabilidad. Trabaja solo con la información que el usuario decide registrar. **La app registra declaraciones del usuario sobre gastos, compromisos y pagos; no verifica movimientos de dinero reales.**

**El concepto central: Radar del sueldo comprometido.** Una forma simple de ver cuánto de tus ingresos ya tiene destino y qué pagos se vienen. *La app no te dice dónde está tu plata; te muestra qué parte de tus ingresos ya tiene destino.*

**Los tres conceptos que la app separa siempre:**

| | Concepto | ¿La app lo conoce? | Ejemplo |
| --- | --- | --- | --- |
| A | **Dinero real** en cuentas y efectivo | **No.** Fuera del producto | Mercado Pago $50.000 · banco $100.000 · efectivo $20.000 |
| B | **Gastado:** egresos ya registrados | Sí, porque el usuario los carga | "Este mes gastaste $320.000" |
| C | **Comprometido:** pagos que ya tienen destino | Sí, porque el usuario los carga | Cuotas $180.000 · alquiler $300.000 · servicios $100.000 |

El producto tiene que ser excelente mostrando B y C. Nunca afirma nada sobre A.

**Modelo de cuentas [DECISIÓN K0].** Un **usuario** entra a la app con su identidad. Puede activar una **cuenta personal** (sus finanzas privadas) y puede ser **miembro** de uno o varios **espacios compartidos** de exactamente dos personas. Un invitado puede usar el espacio al que fue invitado sin tener cuenta personal (para crear espacios nuevos necesita activarla); si algún día la activa, usa la misma identidad y no se duplica nada. El espacio funciona aunque el segundo miembro nunca instale la app.

**Regla que une los dos pilares [DECISIÓN K9].** De cada gasto compartido, a las finanzas personales de cada miembro llega solo **la parte que le corresponde**. La app distingue siempre **quién pagó**, **a quién le corresponde** y **qué pago tiene que hacer cada uno** (por ejemplo, el resumen completo de su tarjeta).

**El MVP.** Cuatro secciones para quien tiene cuenta personal (Inicio, Movimientos, Futuro, Compartidos), una sola para el invitado (sus espacios); espacios de dos; identidad por email con enlace mágico, sin contraseña; sin conexión bancaria, sin IA, sin notificaciones; en pesos.

**Qué se valida en 1–2 meses con personas cercanas [HIPÓTESIS].** Que personas y parejas que hoy no llevan sus cuentas, o las llevan en una pizarra, notas o una planilla abandonada, reemplacen ese método por la app porque les muestra mejor lo que ya gastaron, lo que ya comprometieron y lo que se viene. La señal más fuerte: **dejaron de usar el método anterior**.

---

## 2. Problema que resuelve

**El problema no es "no sé cuánta plata tengo".** Eso lo responde la app del banco o de la billetera, y esta app no compite ahí.

**El problema es no saber cuánto de lo que cobro ya está comprometido ni qué tengo que pagar próximamente.**

- **Individual:** las cuotas, el resumen de la tarjeta y los gastos fijos van tomando el sueldo de los próximos meses de forma invisible. Para verlo hay que sumar resúmenes, recordar cuotas y armar una planilla con columnas y fórmulas que casi nadie mantiene.
- **Compartido:** dos personas que comparten gastos no saben quién viene poniendo más ni cuánto se deben. La pizarra resuelve "anotar" y "que lo vean los dos", pero no "calcular", no tiene historia y no se conecta con lo que cada uno tiene comprometido.
- **Común a los dos:** Excel o Google Sheets podrían resolverlo, pero el usuario tiene que crear las columnas, las fórmulas, controlar las cuotas, calcular los próximos meses, actualizar todo y hacer las cuentas de lo compartido.

**Usuario objetivo [DECISIÓN].** Personas que quieren ordenar su plata pero no saben o no quieren hacer una planilla; la intentaron y la abandonaron, o usan notas, papel, WhatsApp o una pizarra. No es para usuarios avanzados, negocios ni grupos grandes.

| Perfil | Situación | Pilares |
| --- | --- | --- |
| Individual | Sueldo, 1–2 tarjetas, varias cuotas, gastos fijos | Personal |
| Pareja o convivientes | Gastos de la casa pagados alternadamente; hoy usan una pizarra o la memoria (caso de referencia) | Personal + compartido |
| Hermanos, amigos, roommates de a dos | Comparten algunos gastos | Compartido; personal opcional |

---

## 3. Propuesta de valor

**El diferencial no es "la app registra gastos"; eso lo hacen cientos de apps. El diferencial es: vos cargás tus gastos y la app hace las cuentas y te muestra qué viene después.** Para lo compartido: la pizarra de la heladera, pero que hace las cuentas por ustedes.

Dicho como comparación con una planilla: *es la planilla de tu plata que te gustaría tener, pero sin tener que hacerla.* Lo que en Excel exige columnas, fórmulas y mantenimiento, la app lo hace sola y lo muestra de forma visual.

| Lo que el usuario tendría que hacer en una planilla | Lo que hace la app |
| --- | --- |
| Crear columnas y categorías | Ya están |
| Repartir una compra en cuotas por meses | Lo hace al cargar la compra |
| Saber en qué resumen cae cada compra con tarjeta | Lo calcula con el cierre y el vencimiento |
| Copiar los gastos fijos cada mes | Los repite sola |
| Sumar lo comprometido de cada mes futuro | Lo muestra en Futuro |
| Calcular quién le debe a quién | Lo calcula en cada espacio |

**Preguntas que responde, sin que nadie arme nada:**

| Pregunta | Dónde | Quién la ve |
| --- | --- | --- |
| ¿Qué pasó con mi plata este mes? | Inicio y Movimientos | Usuario con cuenta personal |
| ¿Qué parte de mis ingresos ya tiene destino? | Inicio | Usuario con cuenta personal |
| ¿Qué tengo que pagar próximamente? | Inicio (Próximos pagos) y Futuro | Usuario con cuenta personal |
| ¿Cómo vienen mis próximos meses si sigo con lo que ya tengo? | Futuro | Usuario con cuenta personal |
| ¿Cuánto me ocupan las cuotas y cuándo terminan? | Futuro | Usuario con cuenta personal |
| ¿Cómo cambian mis próximos meses si compro esto en 6 cuotas? | Vista previa al cargar la compra | Usuario con cuenta personal |
| ¿Cuánto gastamos entre los dos? ¿Quién puso más? ¿Quién le debe a quién? | Espacio compartido | Ambos miembros |
| ¿Qué tenemos comprometido en común? | Espacio → Próximos meses del espacio | Ambos miembros |

**Aha moments [HIPÓTESIS]:**

- **Personal:** al terminar la activación, ver los próximos meses ya cargados con cuotas y fijos ("En diciembre ya tenés $610.000 comprometidos").
- **Compartido:** después de anotar 4–5 gastos de la casa, ver sin hacer cuentas "Este mes Renzo puso $35.000 de más" y que coincida con lo que los dos sentían.
- **Invitado:** entrar por primera vez y encontrar la pizarra ya armada, con el saldo calculado.
- **Confianza:** el resumen real de la tarjeta se parece al que la app mostraba como próximo pago.

---

## 4. Principios de producto

1. **Radar, no billetera [DECISIÓN].** La app muestra el destino de los ingresos registrados, los gastos y los compromisos. Nunca afirma cuánto dinero tiene el usuario ni cuánto puede gastar.
2. **Nunca afirmar lo que no se puede saber.** Toda cifra dice de qué está hecha y se apoya en lo registrado ("según lo que registraste").
3. **Declarar, no verificar [DECISIÓN].** La app registra lo que el usuario declara. "Pagó Renzo" significa "Renzo fue declarado como quien pagó"; un pago con fecha pasada se muestra "Ya pasó", nunca "Pagado" como si se hubiera verificado.
4. **Más fácil que una fila de planilla.** Un gasto cotidiano: monto + categoría + guardar.
5. **Más fácil que la pizarra.** Un gasto compartido cuesta un toque más que uno personal.
6. **El usuario cuenta hechos; la app hace las cuentas.** Nunca se pide algo que la app puede deducir.
7. **Lo personal es privado por defecto; lo compartido se comparte intencionalmente [DECISIÓN K2].** Cada pantalla y cada movimiento dicen quién los ve.
8. **Ser miembro de un espacio no es tener cuenta personal [DECISIÓN K0].** El invitado nunca siente que tiene una cuenta incompleta.
9. **Visual, simple y estético.** Una pantalla responde una pregunta; los números se acompañan de una forma visual simple (barra de destino de los ingresos, barras por mes). Sin paneles llenos de gráficos.
10. **Cada número se puede abrir** y muestra de qué está hecho, como ver la fórmula de una celda.
11. **Lenguaje de la casa, no del banco ni del contador:** "gastado", "comprometido", "sin asignar", "próximos pagos", "puso", "te corresponde", "están a mano", "se paga en noviembre".
12. **Sirve aunque no cargues todo.** Con ingreso, fijos y cuotas ya hay un radar útil.
13. **Neutral entre las personas.** Lo compartido es una conversación, no una cobranza.
14. **Privacidad y comprensión antes que simplicidad de implementación [DECISIÓN].**
15. **No es** Splitwise, un sistema contable, una app bancaria, una billetera, un gestor de inversiones ni un ERP [DECISIÓN].

---

## 5. Alcance del MVP

Lista cerrada de **20 funcionalidades Must**. Todo agregado pasa por la sección 38.

| # | Funcionalidad | Pilar | Estado |
| --- | --- | --- | --- |
| M1 | Registro e ingreso con email + enlace mágico, sin contraseña | Ambos | DECISIÓN (P1) |
| M2 | Activación opcional de la cuenta personal, con su onboarding | Personal | DECISIÓN K0 |
| M3 | Formulario único Agregar: gasto o ingreso; destino "Solo yo" por defecto o un espacio | Ambos | DECISIÓN K2 |
| M4 | Compras en cuotas con primera cuota calculada y vista previa del efecto en los próximos meses | Personal + compartido | DECISIÓN; vista previa RECOMENDACIÓN |
| M5 | Lo que ya debe al activar la cuenta personal: resumen pendiente, cuotas existentes ("3 de 6"), consumos desde el último cierre | Personal | DECISIÓN |
| M6 | Tarjetas con día de cierre y de vencimiento; modo aproximado si no se conocen | Personal | DECISIÓN (incluido el modo aproximado) |
| M7 | Gastos recurrentes mensuales (gastos e ingresos), con ajuste de un mes | Ambos | DECISIÓN |
| M8 | Inicio: radar del mes (ingresos registrados, gastado, comprometido, sin asignar), próximos pagos, próximos meses, espacios | Personal | DECISIÓN |
| M9 | Movimientos: lista de lo registrado en el mes, personal y compartido, con su audiencia | Personal | RECOMENDACIÓN |
| M10 | Futuro: 6 meses de compromisos, pagos con fecha, cuotas que terminan, ingreso previsto y sin asignar | Personal | DECISIÓN |
| M11 | Espacios compartidos de exactamente dos miembros; varios por usuario, con personas distintas; segundo miembro sin acceso posible; crear un espacio requiere cuenta personal | Compartido | DECISIÓN K0, K1, P4, P5 |
| M12 | Invitaciones: enlace de un solo uso, 7 días, regenerable | Compartido | DECISIÓN K6 |
| M13 | Gastos compartidos: puntuales, en cuotas y recurrentes; quién pagó; reparto 50/50 o personalizado por monto | Compartido | DECISIÓN (P3) |
| M14 | Vista del espacio: saldo compartido, mes (puso / le corresponde), compromisos del espacio, movimientos con autoría | Compartido | DECISIÓN |
| M15 | Pagos entre miembros | Compartido | DECISIÓN |
| M16 | Salida de un espacio con conservación de historial y compromisos | Compartido | DECISIÓN K4, K5 |
| M17 | Editar y eliminar con reglas claras y confirmación | Ambos | DECISIÓN K3 |
| M18 | "¿De dónde sale?" en Gastado, Comprometido, Sin asignar, Próximos pagos y Saldo | Ambos | RECOMENDACIÓN |
| M19 | Privacidad visible: indicadores de audiencia, pantalla Privacidad y datos, eliminación de cuenta | Ambos | DECISIÓN |
| M20 | Ver los cambios del otro miembro al abrir o refrescar | Compartido | RECOMENDACIÓN |

**Should (si sobra tiempo, en este orden):** completar con qué se pagó un gasto que cargó el otro miembro a tu nombre · aviso de posible duplicado en un espacio · compartir el resumen del espacio como texto · exportar mis datos (CSV) · quitar el acceso de quien entró por un enlace equivocado · actividad reciente del espacio · totales del espacio por categoría · categoría sugerida según la descripción.

**Could:** notificaciones de pagos próximos · bloqueo de la app · recurrentes no mensuales · moneda extranjera · simulador de compra como pantalla propia · "dar por saldado" sin plata · recuperar registros borrados · acceso de solo lectura para ex miembros · desactivar la cuenta personal sin dejar los espacios · declarar a mano un pago próximo como hecho.

**Eliminado respecto de la V1.1:** "≈ $X por día" bajo el número principal. Sugería cuánto se puede gastar por día, una afirmación sobre dinero real que la app no conoce.

---

## 6. Fuera de alcance

**[DECISIÓN] Dinero real y contabilidad:** saldo de cuentas bancarias o billeteras · límite y crédito disponible de tarjetas · deuda bancaria real · pago mínimo, intereses y financiación del resumen · conciliación con el resumen real · verificación de movimientos de dinero · múltiples cuentas bancarias · conciliación bancaria o automática · movimientos bancarios automáticos · conexión bancaria · open banking · Mercado Pago automático · contabilidad de doble partida · balance patrimonial · activos y pasivos · inversiones.

**[DECISIÓN] Otros:** OCR y lectura de PDFs · WhatsApp · chatbot o IA · préstamos · scoring · recomendaciones financieras · gamificación · red social · reportes avanzados · múltiples monedas · presupuestos por categoría.

**[DECISIÓN, por el modelo K0]:** espacios de tres o más miembros · grupos · simplificación de deudas · roles, administradores y permisos · chat o comentarios · cuenta única compartida por la pareja · acceso sin identidad por enlace de solo lectura · ingresos compartidos o "pozo común" · ver finanzas personales del otro, ni siquiera de forma opcional · dos espacios simultáneos entre las mismas dos personas (P4) · repartos por porcentaje o reglas de reparto configurables (P3) · creación de espacios por usuarios sin cuenta personal (P5).

**[RECOMENDACIÓN]:** gráficos de gastos por categoría · reconstrucción del resumen (intereses, impuestos, pago mínimo) · categorías personalizadas · fusión de espacios duplicados · cualquier indicador de "cuánto podés gastar".

---
## 7. Modelo conceptual del producto

### 7.1 Lo que la app sabe y lo que no

| La app sabe (porque el usuario lo registra) | La app no sabe y no pregunta |
| --- | --- |
| Ingresos registrados (sueldo, extras) | Cuánto hay en cada cuenta, billetera o en efectivo |
| Gastos registrados y con qué medio se pagaron | Si el usuario tiene plata suficiente para un pago |
| Compras en cuotas y cuándo vence cada cuota | Gastos que el usuario no registró |
| Fechas de cierre y vencimiento de cada tarjeta | Intereses, impuestos o pago mínimo del resumen real |
| Gastos fijos y sus montos | Si el usuario efectivamente pagó un vencimiento (solo sabe que la fecha pasó) |
| Gastos compartidos, quién fue declarado como pagador y cómo se reparten | Lo que otros miembros hicieron fuera del espacio |
| Pagos entre miembros declarados | Si ese dinero realmente se transfirió |

Toda cifra de la app es un cálculo sobre lo registrado. Por eso el lenguaje habla de "registrado", "comprometido", "sin asignar" y "próximos pagos", nunca de "disponible" o de "saldo" personal.

**Declarar, no verificar [DECISIÓN].** La app registra declaraciones del usuario sobre gastos, compromisos y pagos; no verifica movimientos de dinero reales.

- "Compré $80.000 de supermercado el 15/10" significa que el usuario registró ese egreso.
- "Compré $100.000 con Visa" significa que registró un compromiso asociado a esa tarjeta.
- "Martina → Renzo $20.000" significa que alguien registró ese pago entre miembros.

En toda la app, "pagó", "pago", "pagar" y "cobrado" tienen ese sentido declarado. "Pagó Renzo" sigue existiendo en los gastos compartidos: indica quién fue declarado como pagador.

### 7.2 Glosario (uso obligatorio en el documento y en la implementación)

| Término | Definición | No confundir con |
| --- | --- | --- |
| **Usuario** | Persona que entra a la app con su propia identidad. Puede tener o no cuenta personal | Miembro |
| **Cuenta personal** | Área privada de finanzas de un usuario: ingresos, gastos personales, tarjetas, cuotas, recurrentes; pantallas Inicio, Movimientos y Futuro. Se **activa** de forma opcional | Usuario |
| **Espacio compartido** (o **espacio**) | Lugar con exactamente dos miembros donde viven sus gastos compartidos, pagos y saldo. Tiene un nombre ("Casa") | Grupo (no existe) |
| **Miembro** | Cada uno de los dos lugares de un espacio, con un nombre visible. Estados: sin acceso, con acceso, ex miembro | Usuario |
| **Miembro sin acceso** | Lugar que existe solo como nombre; el otro miembro carga por los dos | Invitado |
| **Invitado** | Usuario que entró a un espacio por invitación y no tiene cuenta personal activa; usa ese espacio pero no puede crear otros | "Cuenta incompleta" (no existe) |
| **Ex miembro** | Miembro que salió o eliminó su cuenta; su nombre queda en el historial | Miembro sin acceso |
| **Dinero real** | Lo que el usuario tiene en cuentas, billeteras y efectivo. **Fuera del producto** | Ingresos registrados, sin asignar |
| **Movimiento** | Cualquier registro: gasto, ingreso o pago entre miembros | — |
| **Ingresos registrados** (de un mes) | Ingresos que el usuario cargó para ese mes (recurrentes, con ajustes, y puntuales) | Dinero real |
| **Ingreso previsto** (mes futuro) | Ingresos recurrentes registrados para ese mes | Dinero real |
| **Gasto personal** | Gasto con destino "Solo yo"; vive en la cuenta personal | Gasto compartido personalizado con $0 para el otro |
| **Gasto compartido** | Gasto que vive en un espacio; lo ven y editan los dos miembros | Gasto personal |
| **Quién pagó** | Miembro declarado como quien puso la plata de un gasto compartido. La app no lo verifica | A quién le corresponde |
| **Parte / te corresponde** | Lo que le toca soportar a cada miembro según el reparto | Quién pagó |
| **Puso** | Lo que un miembro pagó en gastos del espacio | "Gastó" (no se usa en lo compartido) |
| **Reparto** | 50/50 (por defecto) o personalizado por monto: cuánto le corresponde a cada uno; uno puede ser $0 | Porcentajes (no se usan en la interfaz) |
| **Ocurrencia** | Cada salida concreta con fecha: un gasto, una cuota, un mes de un recurrente | — |
| **Fecha / mes de pago** | Cuándo el usuario tiene que pagar: al contado, la fecha del gasto; con tarjeta, el vencimiento del resumen | Fecha de compra |
| **Gastado** (de un mes) | Tu parte de los gastos del día a día registrados al contado (no recurrentes, sin tarjeta de crédito) con fecha en el mes | Dinero que salió de una cuenta concreta (la app no lo verifica) |
| **Comprometido** (de un mes) | Tu parte de lo que ya tiene destino para pagarse en ese mes: gastos fijos, cuotas y resúmenes de tarjeta | Lo que efectivamente vas a pagar (ver Próximos pagos) |
| **Asignado** | Gastado + Comprometido | — |
| **Sin asignar** | Ingresos registrados − Asignado: **ingresos registrados que todavía no tienen un gasto o compromiso registrado asociado** | "Disponible", "te queda", "dinero libre", "saldo" (prohibidos como sinónimos) |
| **Próximos pagos** | Pagos que el propio usuario realiza, con fecha, por el **monto que va a pagar** (por ejemplo, el resumen completo de su tarjeta, aunque incluya partes de otro). Responde "¿qué pagos que yo realizo se vienen?" | Comprometido (tu parte); lo que te deben; cuánta plata tenés; cuánto debés realmente al banco |
| **Resumen estimado** | Lo registrado con una tarjeta para un vencimiento, rotulado "Estimado según lo que registraste" | Resumen real, deuda bancaria real |
| **Compromiso futuro** | Ocurrencia con fecha de pago posterior a hoy | — |
| **Ya pasó** | Estado de un pago u ocurrencia cuya fecha llegó. No significa que la app verificó el pago | "Pagado" como verificación |
| **Resumen pendiente declarado** | Resumen ya cerrado que el usuario declara sin pagar al activar la cuenta personal | Deuda bancaria real |
| **Saldo compartido** | Quién le debe a quién en un espacio, acumulado. Es el único uso permitido de "saldo" | Saldo personal o bancario (no existen en la app) |
| **Pago entre miembros** | Pago declarado de un miembro al otro para saldar; solo mueve el saldo compartido | Gasto, ingreso, transferencia verificada |
| **Gasto recurrente** | Gasto o ingreso mensual con monto conocido; en pantalla, "Fijo" | Cuota |
| **Compra en cuotas / cuota** | Gasto pagado en N pagos mensuales / cada uno de ellos | — |
| **Audiencia** | Quién ve un registro: "Solo vos" o "Vos y [miembro]" | — |

### 7.3 Dos lentes sobre la misma información

La app muestra lo personal con dos lentes que nunca se mezclan en una misma cifra:

| Lente | Pregunta | Qué cuenta de un gasto compartido | Dónde aparece |
| --- | --- | --- | --- |
| **Tu parte** (destino de tus ingresos) | ¿Qué parte de mis ingresos ya tiene destino? | Solo la parte que te corresponde [DECISIÓN K9] | Gastado, Comprometido, Sin asignar, Futuro |
| **Lo que vas a pagar** (pagos) | ¿Qué tengo que pagar y cuándo? | El monto completo que pagás vos, con la parte del otro aclarada | Próximos pagos, detalle de tarjeta |

**Ejemplo.** Supermercado $100.000 en Casa, pagó Renzo con su Visa, 50/50:

- En Casa: "Supermercado $100.000 · pagó Renzo · 50/50" y "Martina le debe $50.000 a Renzo".
- En la cuenta de Renzo, lente "tu parte": "Gasto que te corresponde: $50.000" (en el Comprometido del mes en que vence la Visa).
- En la cuenta de Renzo, lente "lo que vas a pagar": "Visa — vence 5/11 — $100.000 (incluye $50.000 que corresponde a Martina)".
- La app nunca dice "a Renzo le quedan $X".

La diferencia entre las dos lentes (los $50.000 de Martina) es exactamente lo que muestra el saldo compartido.

### 7.4 Entidades conceptuales (sin decisiones técnicas)

| Entidad | Representa | Contiene | Se relaciona con |
| --- | --- | --- | --- |
| Usuario | Una identidad | Nombre visible, acceso, si su cuenta personal está activa | Cuenta personal (0 o 1), Miembros (0..n) |
| Cuenta personal | Finanzas privadas | Preferencias, zona horaria | Medios de pago, movimientos y recurrentes personales |
| Medio de pago | Cómo paga el usuario | Tipo (efectivo, débito, billetera, transferencia, otro, tarjeta); tarjeta: nombre, cierre, vencimiento. **Sin saldo** | Cuenta personal |
| Categoría | En qué se gasta o de dónde entra | Lista fija | Movimientos, recurrentes |
| Espacio | Lugar compartido de dos | Nombre, saldo inicial | Miembros (2), gastos y recurrentes compartidos, pagos, invitaciones |
| Miembro | Uno de los dos lugares | Nombre visible, estado, usuario vinculado | Espacio, Usuario (0 o 1) |
| Movimiento personal | Gasto o ingreso personal | Monto, fecha, categoría, medio, descripción, cuotas opcionales | Cuenta personal |
| Gasto compartido | Gasto de un espacio | Monto, fecha, categoría, descripción, quién pagó, reparto y partes, cuotas opcionales, creador y último editor | Espacio, Detalle privado de pago |
| Detalle privado de pago | Con qué pagó un miembro un gasto compartido | Medio o tarjeta. **Solo lo ve quien pagó** | Gasto compartido, cuenta personal de quien pagó |
| Gasto recurrente | Fijo mensual personal o compartido | Monto, día, inicio, fin, categoría; si es compartido: espacio, quién paga, reparto | Cuenta personal o espacio |
| Ajuste de un mes | Un mes distinto de un recurrente | Mes, monto | Gasto recurrente |
| Resumen pendiente declarado | Resumen cerrado que el usuario declara sin pagar al activar la cuenta | Monto, vencimiento | Tarjeta |
| Pago entre miembros | Pago declarado para saldar | Monto, fecha, quién a quién, quién lo registró | Espacio |
| Invitación | Enlace para ocupar un lugar | Miembro destino, estado, vencimiento | Espacio |

**Se calculan y nunca se guardan:** ocurrencias, radar del mes (ingresos registrados, gastado, comprometido, asignado, sin asignar), próximos pagos, compromisos de tarjeta, mes del espacio, saldo compartido. **Principio:** la app guarda hechos y calcula todo lo demás. **Sin duplicación:** un gasto compartido existe una sola vez, en el espacio; las cuentas personales muestran la parte calculada.

---

## 8. Modelo de cuenta personal

**Qué es [DECISIÓN K0]:** el área privada de finanzas de un usuario. Se activa de forma explícita y opcional.

| Aspecto | Definición |
| --- | --- |
| Contiene | Ingresos registrados, gastos personales, tarjetas, compras en cuotas personales, recurrentes personales, lo que ya debía al activarla; y, calculada, su parte de cada espacio |
| No contiene | Saldos de cuentas, billeteras o efectivo [DECISIÓN] |
| Pantallas | Inicio, Movimientos, Futuro (Compartidos existe también sin ella) |
| Quién la ve | Solo su dueño |
| Cómo se activa | Al registrarse por cuenta propia (O1), o después con "Crear mi cuenta personal" (invitados) |
| Habilita además | Crear espacios compartidos [DECISIÓN P5] |
| Puede estar vacía | Sí; con un ingreso, un fijo o una cuota ya hay un radar útil |

**[DECISIÓN P5]** Crear un espacio requiere cuenta personal. Un invitado sin cuenta personal usa el espacio al que fue invitado y, para crear otros, activa su cuenta personal.

## 9. Modelo de espacio compartido

| Aspecto | Definición | Estado |
| --- | --- | --- |
| Miembros | Exactamente dos | DECISIÓN K0 |
| Quién lo crea | Un usuario con cuenta personal | DECISIÓN P5 |
| Segundo miembro | Puede estar sin acceso y ser invitado después | DECISIÓN K0 |
| Nombre | "Con [nombre]" por defecto; cualquiera lo cambia | RECOMENDACIÓN |
| Reparto | Cada gasto: 50/50 por defecto o "Personalizado" por monto. Sin porcentajes en la interfaz ni reparto habitual configurable | DECISIÓN P3 |
| Saldo inicial | Opcional: "¿Alguien viene poniendo más hasta hoy?" | RECOMENDACIÓN |
| Contenido | Gastos compartidos (puntuales, cuotas, recurrentes), pagos entre miembros, saldo, compromisos del espacio, historial | DECISIÓN |
| Edición | Los dos miembros con acceso crean, editan y eliminan; se registra creador y último editor | DECISIÓN K3 |
| Varios espacios | Un usuario puede tener varios, cada uno con otra persona; poco protagonismo en la UX | DECISIÓN K1 |
| Dos espacios con la misma persona | No permitido en el MVP: dos usuarios no pueden compartir más de un espacio activo | DECISIÓN P4 |
| Identidad | Nombre visible; nunca el email | DECISIÓN K7 |

**Modo 1 y Modo 2.** Con el segundo miembro sin acceso, el creador carga por los dos ("pagó Martina"). Cuando acepta la invitación, los dos cargan y ven lo mismo. Las pantallas son iguales en los dos modos; cambia la etiqueta del miembro y el botón Invitar.

**El espacio no conoce el dinero de nadie.** Muestra lo que cada uno puso, lo que le corresponde y quién le debe a quién; nunca cuánto tiene cada miembro.

## 10. Modelo de invitado sin cuenta personal

**Definición [DECISIÓN K0]:** usuario que entró a un espacio por invitación y no activó su cuenta personal. Es una forma completa y válida de usar la app.

| Puede | No puede (vive en una cuenta personal) |
| --- | --- |
| Ver sus espacios, el saldo y el mes de cada uno | Ver Inicio, Movimientos o Futuro personales |
| Crear, editar y eliminar gastos compartidos (puntuales, cuotas, recurrentes) | Registrar gastos personales o ingresos |
| Indicar quién pagó y el reparto | Crear tarjetas o indicar con qué tarjeta pagó |
| Registrar pagos entre miembros | Ver su parte en un radar personal |
| Ver los compromisos del espacio y su historial | Ver nada personal del otro miembro |
| Renombrar el espacio, cambiar el reparto de un gasto, salir | Crear espacios nuevos [DECISIÓN P5] |
| Activar su cuenta personal cuando quiera | — |

**Cómo lo comunica la app:** sin pestañas bloqueadas ni candados. Ve sus espacios como pantalla principal y una tarjeta fija y discreta: "Casa es lo que compartís con Renzo. Tus ingresos y tus gastos propios son otra cosa: si querés, podés ordenarlos acá, en privado." [Crear mi cuenta personal]. Sin recordatorios insistentes.

**Identidad [DECISIÓN P1]:** se registra con email y enlace mágico, igual que cualquier usuario; esa identidad es la que usa su cuenta personal si la activa.

## 11. Conversión de invitado a usuario con cuenta personal

**Principio [RECOMENDACIÓN]:** no es una migración; es **activar** la cuenta personal del mismo usuario. Miembro, nombre, autoría e historial compartido no cambian.

| Paso | Qué pasa | Qué ve el usuario |
| --- | --- | --- |
| 1 | Toca "Crear mi cuenta personal" | "Vas a tener tus finanzas privadas. Lo de Casa queda igual y Renzo no va a ver nada nuevo." |
| 2 | Onboarding personal (sección 13, O3) | Pasos salteables |
| 3 | Prevención de duplicados: se muestra lo que ya está en sus espacios | "Alquiler ya está en Casa (tu parte $250.000). ¿Es otro alquiler?" |
| 4 | Gastos de Casa que pagó: completar con qué los pagó (Should) | "Pagaste estos gastos de Casa. ¿Con qué?" |
| 5 | Resultado: su radar y su Futuro incluyen su parte de cada espacio, también del historial anterior [DECISIÓN K8]. Desde ahora también puede crear espacios | "Tu cuenta personal está lista. Ya incluye tu parte de Casa." |

**No se comunica al otro miembro [RECOMENDACIÓN].** **No se copia ningún gasto compartido:** la cuenta personal calcula la parte. El único riesgo de duplicado es cargar a mano como personal algo que ya está en un espacio; el paso 3 lo previene.

## 12. Privacidad y límites de visibilidad

**Regla madre [DECISIÓN K2]:** lo personal es privado por defecto; lo compartido se comparte intencionalmente. Un dato pertenece a un espacio solo si alguien lo cargó explícitamente ahí.

| Dato | Su dueño | El otro miembro | Ex miembro |
| --- | --- | --- | --- |
| Ingresos registrados, gastos personales, tarjetas, cuotas y fijos personales | Sí | **No** | No |
| Radar personal (gastado, comprometido, sin asignar), próximos pagos, Futuro | Sí | **No** | No |
| Otros espacios del usuario; si tiene cuenta personal | Sí | **No** | No |
| Con qué medio o tarjeta pagó un gasto compartido | Sí (quien pagó) | **No** | No |
| Gasto compartido: monto, fecha, categoría, descripción, quién pagó, reparto, partes | Sí | Sí | No (desde que salió) |
| Calendario de cuotas y fijos compartidos | Sí | Sí | No |
| Saldo, mes del espacio, pagos entre miembros, autoría | Sí | Sí | No |
| Nombre visible | Sí | Sí | Queda en el historial |
| Email y datos de acceso | Sí | **No** [DECISIÓN K7] | No |

**Indicadores de audiencia obligatorios:** selector de destino con "Solo vos lo ves" / "Lo ven vos y Martina"; "Agregado a Casa · Martina lo ve · Deshacer" al guardar; encabezado de cada espacio "Esto lo ven vos y Martina"; marca "Solo vos" en Inicio, Movimientos y Futuro; ícono de una o dos personas en cada fila de listas mixtas; "Casa · tu parte" en lo personal.

**Filtraciones indirectas declaradas:** de los meses de las cuotas de una compra compartida con tarjeta se puede inferir el ciclo de la tarjeta de quien pagó (aceptado); un gasto compartido que corresponde entero a uno (personalizado con $0 para el otro) lo ven los dos (es una deuda entre ellos, no un gasto personal).

---
## 13. Onboarding

Tres entradas distintas. Cada paso se puede saltear y completar después.

### O1 — Usuario nuevo

| Paso | Pantalla e información | Acción principal | Notas |
| --- | --- | --- | --- |
| 1 | "Anotá tus gastos, cuotas y fijos. La app hace las cuentas y te muestra qué se viene." | Empezar | "Tengo una invitación" lleva a O2 |
| 2 | **¿Qué querés hacer primero?** Ordenar mi plata / Compartir gastos con alguien / Las dos | Elegir | Define los pasos, no las partes de la app |
| 3 | **Tus números son tuyos** (sección 34). Incluye: "La app no se conecta a tus cuentas ni sabe cuánta plata tenés. Trabaja con lo que vos registrás." | Entendido | Cómo cuidamos tus datos |
| 4 | Registro: email → enlace mágico, sin contraseña [DECISIÓN P1] | Enviarme el enlace | "Te mandamos un enlace a tu email para entrar." Ya registrado: mismo flujo. Enlace vencido: "Pedí uno nuevo" |
| 5a | Se activa la cuenta personal en los tres casos, porque crear un espacio la requiere [DECISIÓN P5]. Si eligió "Ordenar mi plata" o "Las dos", sigue O3 desde el paso 2 | — | Si eligió solo "Compartir gastos", la cuenta personal queda vacía: "Tu cuenta personal está vacía; la podés completar cuando quieras" |
| 5b | Si eligió "Compartir gastos" o "Las dos": crear espacio (secciones 9 y 26) | — | Antes: "¿La otra persona ya usa la app? Pedile que te invite" |
| 6 | Resultado: Futuro (si activó cuenta personal) o el espacio | — | — |

### O2 — Invitado

| Paso | Pantalla e información | Acción principal | Errores |
| --- | --- | --- | --- |
| 1 | "Renzo te invitó a **Casa**, un espacio para anotar los gastos que comparten y que la app haga las cuentas." | Ver qué es | Vencida, usada o anulada: mensaje y sin acceso (sección 26) |
| 2 | "Vas a ver los gastos de Casa, quién pagó y cómo están. Renzo va a ver lo que vos cargues en Casa. Nada más: ni tu plata ni la suya son parte de Casa." | Entrar a Casa | — |
| 3 | Email → enlace mágico (o inicio de sesión si ya es usuario) | Enviarme el enlace | Si ya comparte un espacio activo con quien invita: "Ya compartís Casa con Renzo" y la invitación no se acepta [DECISIÓN P4] |
| 4 | Entra a Casa con todo el historial, a su nombre; bienvenida única (sección 33) | — | — |

El invitado no pasa por ningún paso de finanzas personales.

### O3 — Activación de la cuenta personal

| Paso | Qué se pide | Ayuda |
| --- | --- | --- |
| 1 | Explicación (solo si viene de un espacio): qué es la cuenta personal y qué no cambia | — |
| 2 | Ingreso mensual: monto y día de cobro ("Mi ingreso varía" → promedio) | "Es para ver qué parte de tus ingresos ya tiene destino. No necesitamos saber cuánta plata tenés." |
| 3 | Tarjetas: nombre, día de cierre, día de vencimiento ("No sé" → modo aproximado) | "Solo el nombre y los días. Nunca el número." |
| 4 | Por tarjeta: ¿último resumen pagado? (si no: monto y vencimiento) · cuotas del último resumen ("3 de 6, $30.000") · gastos en 1 pago desde ese cierre (aprox.) | "Abrí tu último resumen o la app del banco." Se listan las cuotas compartidas que ya existen en sus espacios para no repetirlas |
| 5 | Gastos fijos: sugerencias tildables (alquiler, expensas, servicios, internet, celular, gimnasio, streaming, prepaga) | Los que ya están en un espacio aparecen como "Ya en Casa" |
| 6 | Resultado: Futuro con los próximos meses y sus pagos | "Esto es lo que ya tiene destino en tus próximos meses." |

---

## 14. Navegación

### Estado A — Usuario con cuenta personal [DECISIÓN]

| Elemento | Responde |
| --- | --- |
| **Inicio** | ¿Qué pasó con mi plata este mes? ¿Qué tengo comprometido? ¿Qué tengo que pagar pronto? (sección 15) |
| **Movimientos** | ¿Qué registré? (sección 16) |
| **Futuro** | ¿Cómo vienen mis próximos meses? (sección 23) |
| **Compartidos** | Lista de espacios → cada espacio; abre siempre en la lista, aunque haya uno solo [P23] |
| **+ Agregar** | Formulario único, siempre visible (sección 17) |
| **Perfil** (ícono) | Nombre visible, ingresos, tarjetas, categorías, Privacidad y datos, cerrar sesión, eliminar cuenta |

**Riesgo conocido [RECOMENDACIÓN]:** Movimientos como pestaña puede empujar a "registrar por registrar". Se mitiga con Inicio primero y con que cada movimiento muestra su efecto ("se paga en noviembre", "tu parte").

### Estado B — Usuario sin cuenta personal [DECISIÓN K0]

| Elemento | Contenido |
| --- | --- |
| Pantalla principal | Su espacio; con varios, lista de espacios |
| Barra inferior | No hay; no se muestran pestañas que no puede usar |
| + Agregar | Destino: sus espacios (Caso 18) |
| Tarjeta fija | "Tu plata personal" con Crear mi cuenta personal |
| Crear espacio | No disponible; se ofrece Crear mi cuenta personal [DECISIÓN P5] |
| Perfil | Nombre visible, Crear mi cuenta personal, Privacidad y datos, cerrar sesión, eliminar usuario |

---

## 15. Inicio (Estado A)

**Objetivo:** responder en un vistazo **¿qué pasó con mi plata este mes?**, **¿qué tengo comprometido?**, **¿qué tengo que pagar próximamente?** y **¿cómo vienen los próximos meses?** No parece una cuenta bancaria: no hay saldo ni "disponible". Audiencia: "Solo vos".

```
OCTUBRE                                                    Solo vos

Tus ingresos de octubre                       $1.200.000 registrados
[██████ gastado ██████████ comprometido ████████ sin asignar ]

Gastado          $320.000   lo que registraste como pagado en el día a día
Comprometido     $480.000   fijos, cuotas y tarjetas de este mes
Sin asignar      $400.000   todavía sin destino, según lo que registraste

Con tarjeta este mes: $95.000 → se paga en noviembre

PRÓXIMOS PAGOS                                              Ver todos
 5 oct   Alquiler                                  $300.000
10 oct   Visa Galicia · resumen estimado           $120.000
15 oct   Cuota Mercado Crédito (3 de 12)            $50.000

PRÓXIMOS MESES                                                Futuro ›
Nov   ███████████████   $620.000 comprometido
Dic   ███████████       $480.000
Ene   ████████          $350.000

TUS ESPACIOS
Casa     Martina te debe $20.000
Viaje    Están a mano

[ + Agregar ]
```

| Bloque | Comportamiento |
| --- | --- |
| **Radar del mes** | Ingresos registrados como total; una barra horizontal dividida en Gastado, Comprometido y Sin asignar. Es la forma visual principal de la pantalla |
| Gastado | Tu parte de lo registrado como pagado al contado en el mes. Tocar → lista |
| Comprometido | Tu parte de fijos, cuotas y resúmenes de tarjeta con fecha de pago en este mes (ya pasada o por venir). Tocar → detalle con "ya pasó" / "por venir" |
| **Sin asignar** | Ingresos registrados − Gastado − Comprometido: ingresos registrados que todavía no tienen un gasto o compromiso registrado asociado. Siempre con "Todavía sin destino, según lo que registraste". **Nunca se presenta como plata disponible** |
| Sin asignar negativo | "Tus gastos y compromisos superan tus ingresos registrados por $35.000." Sin rojo alarmante; la barra se llena entera y muestra el exceso |
| Con tarjeta este mes | Tu parte de compras con tarjeta de este mes que se pagan después; aclara en qué mes |
| **Próximos pagos** | Los 3 primeros pagos con fecha desde hoy (ver sección 23.2). Muestra **el monto que vas a pagar**; si incluye partes de otro miembro: "incluye $X de Martina" |
| Próximos meses | 3 meses con comprometido y una barra proporcional; tocar → Futuro |
| Tus espacios | Una línea por espacio con su saldo (máximo 3); si no hay espacios, el bloque no aparece |
| Sin ingresos registrados | El radar muestra Gastado y Comprometido sin Sin asignar, con "Registrá tu ingreso para ver qué parte ya tiene destino" |

**Por qué no "Te queda":** la app no sabe cuánta plata hay en las cuentas del usuario. "Te quedan $400.000" sugiere un saldo; "Sin asignar $400.000" describe lo que la app sí sabe: qué parte de lo registrado todavía no tiene destino.

---

## 16. Movimientos (Estado A)

**Objetivo:** ver qué se registró en un mes y corregir errores.

| Elemento | Comportamiento |
| --- | --- |
| Selector de mes | Mes actual por defecto |
| Filtros | Todos · Personales · uno por espacio |
| Gasto personal | Descripción o categoría, monto, ícono "solo vos", etiquetas "Se paga en noviembre" o "6 cuotas de $30.000" |
| Gasto compartido | "Casa · pagó Martina", monto principal = **tu parte**, total en gris ("de $100.000"), ícono de dos personas |
| Ingreso | Monto con la etiqueta "Ingreso registrado" |
| Pago entre miembros | "Casa · Martina te pagó $20.000" con la nota "no cambia tu radar" |
| Fijos de meses pasados | Etiqueta "Fijo" |
| Compra en cuotas | Una sola vez, en su fecha de compra |
| Tocar | Detalle con Editar y Eliminar |
| Vacío | "Todavía no registraste nada en octubre." + Agregar |

El usuario sin cuenta personal ve los movimientos dentro de cada espacio.

---

## 17. Creación de gastos (formulario único Agregar)

**Objetivo:** registrar cualquier movimiento en segundos.

| Orden | Campo | Comportamiento | Visible para |
| --- | --- | --- | --- |
| 1 | Tipo | Gasto (defecto) / Ingreso. Los ingresos son siempre personales | Ingreso: solo Estado A |
| 2 | Monto | Teclado abierto; obligatorio, mayor a cero | Todos |
| 3 | Categoría | Grilla, más usadas primero; obligatoria | Todos |
| 4 | **Destino** | "Solo yo" por defecto [DECISIÓN K2] + un chip por espacio; debajo la audiencia | Estado A: Solo yo + espacios. Estado B: espacios |
| 5 | Quién pagó | Yo / [otro miembro]; defecto Yo | Si el destino es un espacio |
| 6 | Reparto | **50/50** (por defecto) / **Personalizado**: dos campos con el monto de cada uno, que se completan entre sí y suman el total (uno puede ser $0) [DECISIÓN P3] | Si el destino es un espacio |
| 7 | Medio de pago | Último usado; efectivo, débito, billetera, transferencia, otro o una tarjeta | Estado A y si pagó el usuario |
| 8 | En cuotas | Cantidad (3, 6, 9, 12, 18, otra); total o valor de cuota; mes de la primera cuota calculado y editable | Todos |
| 9 | Se repite cada mes | Día del mes | Todos |
| 10 | Fecha | Hoy | Todos |
| 11 | Descripción | Opcional | Todos |
| 12 | **Vista previa** | Con cuotas: "Noviembre: comprometido $620.000 → $650.000 · sin asignar $580.000 → $550.000. Suma $30.000 por mes durante 6 meses (tu parte)." | Estado A |

| Situación | Respuesta |
| --- | --- |
| Guardar personal | "Guardado · Solo vos lo ves" |
| Guardar en un espacio | "Agregado a Casa · Martina lo ve · Deshacer" |
| Con tarjeta | "Se paga en noviembre" |
| Con cuotas | "Agregaste $30.000 por mes hasta abril" |
| Compartido | "Con esto, Martina te debe $20.000" |
| Monto vacío o cero | Guardar deshabilitado |
| Cuotas menores a 2 | "Para una sola cuota, desactivá En cuotas" |
| Salir con datos | "¿Descartar este gasto?" |

La vista previa no dice "te alcanza" ni "no te alcanza": muestra cómo cambian comprometido y sin asignar.

---

## 18. Gastos compartidos

**Qué son [DECISIÓN]:** gastos que viven en un espacio y ven y editan los dos miembros. Distinguen **quién pagó** (declarado, no verificado), **a quién le corresponde** y, para quien pagó, **qué pago tiene que hacer** [DECISIÓN K9].

| Caso | Ejemplo | MVP |
| --- | --- | --- |
| Pagué yo, 50/50 | Super $100.000 | Sí |
| Pagó el otro | Internet $40.000, pagó Martina | Sí, aunque no tenga acceso |
| Personalizado por monto | $100.000: Renzo $60.000, Martina $40.000 | Sí [DECISIÓN P3] |
| Todo de una persona | Pagué un remedio de Martina | Sí, como personalizado: yo $0, Martina el total |
| En cuotas | Heladera en 6 cuotas | Sí (sección 20) |
| Recurrente | Alquiler | Sí (sección 21) |
| Pagado por los dos en la misma compra | En caja | No: dos gastos |
| Entre tres o más | Asado | No |
| Ingreso compartido | — | No |

**Efectos de un gasto compartido**

| Dónde | Efecto |
| --- | --- |
| Espacio | Quien pagó suma "puso" por el total; cada uno suma su parte a "le corresponde"; el saldo cambia en (puso − parte) en la fecha del gasto (cuotas y fijos: en la fecha de cada ocurrencia) |
| Radar personal de cada miembro con cuenta personal | Solo su parte: en Gastado si es al contado; en Comprometido si es tarjeta, cuota o fijo, en el mes en que se paga [DECISIÓN K9] |
| Próximos pagos de quien pagó | El monto completo que va a pagar (por ejemplo, su resumen de tarjeta), con "incluye $X de Martina" |
| Próximos pagos de quien no pagó | Nada: lo que debe aparece como saldo del espacio, no como un pago con fecha |

**Ejemplo [verificado].** Supermercado $100.000, pagó Renzo con Visa (cierre 25, vence 5) el 20/10, 50/50.

| Dónde | Qué se ve |
| --- | --- |
| Casa | "Supermercado $100.000 · pagó Renzo · 50/50" · "Martina le debe $50.000 a Renzo" desde el 20/10 |
| Renzo, Movimientos | "Supermercado · Casa · te corresponde $50.000 · Visa, se paga en noviembre" |
| Renzo, radar de noviembre | Comprometido incluye $50.000 |
| Renzo, Próximos pagos | "5 nov · Visa · resumen estimado" incluye $100.000 por esta compra, "incluye $50.000 de Martina" |
| Martina (con cuenta personal) | Gastado de octubre incluye $50.000 ("Casa · pagó Renzo · tu parte") |

---

## 19. Gastos personales

Gastos con destino "Solo yo"; viven en la cuenta personal, solo los ve su dueño y solo existen en Estado A [DECISIÓN K0].

| Medio | Cuenta en | Mes | Próximos pagos |
| --- | --- | --- | --- |
| Al contado (efectivo, débito, billetera, transferencia, otro) | Gastado | Fecha del gasto | No (se registró como ya pagado) |
| Tarjeta, 1 pago | Comprometido | Vencimiento del resumen | Dentro del resumen estimado de la tarjeta |
| Tarjeta, en cuotas | Comprometido | Cada cuota en su mes | Dentro del resumen estimado |
| Crédito sin tarjeta, en cuotas | Comprometido | Cada cuota en su mes | Como pago propio con su fecha |
| Fijo | Comprometido | Cada mes | Como pago propio (o dentro del resumen si es con tarjeta) |

---
## 20. Cuotas

| Aspecto | Definición |
| --- | --- |
| Carga | Total y cantidad (cuota = total / cantidad, redondeo en la primera) o valor de cuota y cantidad (total = cuota × cantidad; cubre compras con interés sin pedir tasas) |
| Primera cuota con tarjeta | En el mes de pago que corresponde a la fecha de compra (sección 22); después, mes a mes. Editable |
| Primera cuota sin tarjeta, o pagada por un miembro sin medio cargado | Un mes después de la compra, el mismo día; editable |
| Estado | Cuando llega su fecha de pago, la cuota pasa a "ya pasó". La app no verifica ni afirma que se pagó; nadie la marca a mano |
| En listas | La compra aparece una vez, en su fecha; cada cuota aparece en su mes en Futuro, dentro del resumen estimado de su tarjeta y en los compromisos del espacio si es compartida |
| Terminar antes | "Terminar ahora": conserva las cuotas pasadas, elimina las futuras |
| Cuotas existentes | Se cargan como en el resumen ("3 de 6, $30.000"); la app genera las que faltan desde el próximo resumen |

**Compra compartida en cuotas [DECISIÓN K9].** Heladera $600.000 en 6 cuotas de $100.000, 50/50, pagó Renzo con su Visa:

| Dónde | Qué se ve cada mes, de noviembre a abril |
| --- | --- |
| Espacio Casa | Compromiso compartido $100.000 ("Heladera · cuota 2 de 6 · pagó Renzo") |
| Renzo, radar y Futuro | Comprometido $50.000 (su parte) |
| Renzo, Próximos pagos | Resumen estimado de la Visa incluye $100.000 por la cuota, "incluye $50.000 de Martina" |
| Martina (si activó cuenta personal), radar y Futuro | Comprometido $50.000 ("Casa · lo paga Renzo · tu parte") |
| Saldo compartido | El día de la compra no cambia. Al llegar la fecha de impacto de cada cuota, Martina debe $50.000 más. Nunca se genera una deuda de $300.000 el día de la compra [DECISIÓN P2] |

**Cuotas compartidas con reparto personalizado [DECISIÓN P3]:** el reparto se indica sobre el total; cada cuota se divide en la misma proporción (cálculo interno). Ejemplo: $600.000 con Renzo $360.000 y Martina $240.000 → cada cuota de $100.000: Renzo $60.000, Martina $40.000.

---

## 21. Gastos recurrentes

| Aspecto | Definición |
| --- | --- |
| Qué son | Gastos o ingresos mensuales con monto conocido; en pantalla, "Fijos" [DECISIÓN] |
| Datos | Monto, categoría, día del mes, inicio, fin opcional; personal: medio; compartido: espacio, quién paga, reparto |
| Ocurrencias | Una por mes. Las de fecha pasada se muestran "Fijo · ya pasó" (la app no verifica el pago); las futuras son compromisos |
| Con tarjeta | Cada ocurrencia entra en el resumen que corresponde |
| Cambios | "Cambiar desde este mes" · "Este mes fue distinto" (ajuste de un mes: luz, gas, ingresos variables) · "Corregir" · "Dejar de pagarlo desde…" · "Eliminar" |
| Compartido | Cada mes es una ocurrencia compartida con reparto 50/50 o personalizado por monto; si un mes cambia el monto ("Este mes fue distinto"), las partes se ajustan en la misma proporción. Lo crean, editan y detienen los dos miembros |
| Ingresos recurrentes | Son la base de "Ingresos registrados" e "Ingreso previsto" |
| Al salir un miembro | Los recurrentes compartidos se detienen desde la salida [DECISIÓN K5] |

**Alquiler $500.000, 50/50, lo paga Renzo por transferencia el día 1:** el espacio muestra el compromiso compartido de $500.000; el radar de cada uno muestra $250.000 comprometidos; en los Próximos pagos de Renzo aparece "1 nov · Alquiler · $500.000 · incluye $250.000 de Martina"; en los de Martina no aparece (no lo paga ella); cada día 1 Martina pasa a deber $250.000 más, salvo compensaciones.

---

## 22. Tarjetas

Solo existen en la cuenta personal; **nunca se muestran a otro miembro**. La tarjeta es un medio para organizar y proyectar compromisos, no una cuenta bancaria. **No modela saldo, límite, crédito disponible, deuda bancaria real, pago mínimo, intereses, financiación del resumen ni conciliación con el resumen real** [DECISIÓN].

| Aspecto | Definición |
| --- | --- |
| Datos | Nombre ("Visa Galicia"), día de cierre, día de vencimiento [DECISIÓN]. Nunca el número |
| Mes de pago | Cierre del resumen = primera fecha con el día de cierre igual o posterior a la compra; vencimiento = primera fecha con el día de vencimiento posterior a ese cierre; mes de pago = mes del vencimiento |
| Ejemplos | Cierre 25, vence 5: compra 20/10 → vence 5/11; compra 27/10 → vence 5/12. Cierre 3, vence 15: compra 2/10 → vence 15/10 |
| Día inexistente | Último día del mes |
| Modo aproximado [DECISIÓN] | Solo cierre: vence el mes siguiente al cierre. Solo vencimiento o ninguno: lo comprado en un mes se paga el mes siguiente. Se muestra "Fechas aproximadas"; nunca se inventa un día. En Próximos pagos, sin día de vencimiento conocido se muestra el mes ("noviembre") en lugar de una fecha |
| **Resumen estimado** | Para cada vencimiento: suma de lo que el usuario registró con esa tarjeta que vence ahí (compras en 1 pago, cuotas, fijos), **por el total pagado**, incluidas partes de otros miembros. Se rotula siempre "Estimado según lo que registraste" |
| Lo que no hace | No reconstruye el resumen real (intereses, impuestos, pago mínimo) ni conoce el límite o el saldo de la tarjeta |
| Cambiar fechas | Recalcula todo lo de esa tarjeta salvo lo fijado a mano, con aviso |
| Eliminar | No con pagos por venir; sin ellos, con confirmación [P24] |

---

## 23. Futuro

**Futuro es el corazón del producto.** Responde: *si sigo con lo que ya tengo registrado, ¿cómo vienen mis próximos meses y qué tengo que pagar?* No necesita saber cuánta plata va a tener el usuario. Audiencia: "Solo vos".

### 23.1 Los próximos 6 meses

```
FUTURO                                                       Solo vos

        Comprometido            Ingreso previsto    Sin asignar
Nov  ███████████████ $620.000     $1.200.000          $580.000
Dic  ███████████     $480.000     $1.200.000          $720.000
Ene  ████████        $350.000     $1.200.000          $850.000
Feb  ███████         $310.000     $1.200.000          $890.000
Mar  █████           $230.000     $1.200.000          $970.000
Abr  █████           $230.000     $1.200.000          $970.000

En marzo terminan 2 cuotas: tu comprometido baja $80.000 por mes.
```

| Por mes | Cálculo |
| --- | --- |
| Comprometido | Tu parte de fijos, cuotas y compras con tarjeta que se pagan ese mes, personales y de espacios |
| Desglose (al tocar) | Fijos · Cuotas · Tarjetas (resumen estimado de cada una) · De tus espacios (tu parte) |
| Ingreso previsto | Ingresos recurrentes registrados para ese mes, con ajustes |
| Sin asignar | Ingreso previsto − Comprometido. Sin ingreso registrado: "Sin ingreso registrado" y no se calcula |
| Visual | Una barra por mes del comprometido; muestra la evolución de un vistazo |
| Cuotas que terminan [RECOMENDACIÓN] | Una línea cuando una o más cuotas terminan: "En marzo terminan 2 cuotas: tu comprometido baja $80.000 por mes" |

### 23.2 Próximos pagos

**Qué es:** la lista de pagos que el propio usuario realiza, con fecha, por el monto que va a pagar. Es la lente "lo que vas a pagar" (sección 7.3). Responde **"¿qué pagos que yo realizo se vienen?"**. No responde cuánto le deben, cuánta plata tiene ni cuánto debe realmente al banco.

| Incluye | Cómo se muestra |
| --- | --- |
| Resumen estimado de cada tarjeta | "10 oct · Visa Galicia · resumen estimado · $120.000"; al tocar, el detalle (compras, cuotas, fijos, partes de otros) |
| Fijos que paga el usuario sin tarjeta | "1 nov · Alquiler · $500.000", con "incluye $250.000 de Martina" si es compartido |
| Cuotas sin tarjeta | "15 oct · Cuota Mercado Crédito (3 de 12) · $50.000" |
| Resumen pendiente declarado al activar la cuenta | Como un resumen más |
| **No incluye** | Lo que paga el otro miembro, aunque el usuario tenga una parte (por ejemplo, el resumen de la Visa de Renzo no aparece en los Próximos pagos de Martina); lo que el usuario debe o le deben en un espacio (se ve como saldo compartido, sin fecha); gastos al contado ya registrados |

| Aspecto | Definición |
| --- | --- |
| Horizonte | En Inicio, los 3 primeros pagos de los próximos 30 días [RECOMENDACIÓN, P18]; en Futuro, todos los del mes elegido |
| Estado | Un pago pasa a "ya pasó" cuando llega su fecha; la app no sabe si el usuario lo pagó y no lo afirma |
| Texto obligatorio | "Estimado según lo que registraste" en los resúmenes de tarjeta |

### 23.3 Tus cuotas y tus fijos

Debajo de los meses: **Tus cuotas** (cada compra activa, "4 de 6", cuánto falta, cuándo termina, si es de un espacio) y **Tus fijos** (lista editable).

### 23.4 Próximos meses del espacio (Estados A y B)

Dentro de cada espacio: los compromisos compartidos de los próximos 6 meses (cuotas y fijos compartidos), con quién paga y la parte de cada uno. Responde "¿qué tenemos comprometido en común?" y lo ven los dos.

---

## 24. Saldo compartido (pantalla del espacio)

**Objetivo:** responder "¿quién le debe a quién?" y "¿quién viene poniendo más?". Igual para los dos miembros, en segunda persona; igual en Estado A y B.

```
CASA                                       Lo ven vos y Martina
Martina te debe $20.000                       [ Registrar pago ]

Octubre · gastos compartidos $700.000
Vos      pusiste $420.000  ████████████│   te corresponden $350.000
Martina  puso    $280.000  ████████    │   le corresponden $350.000
Este mes pusiste $70.000 de más.
Venían de septiembre: Martina había puesto $50.000 de más.

Próximos meses de Casa ›
Movimientos de Casa (con "cargó Renzo" / "editó Martina")

[ + Agregar ]
```

| Elemento | Comportamiento |
| --- | --- |
| Saldo | "Martina te debe $X" / "Le debés $X a Renzo" / "Están a mano". Acumulado (meses anteriores, saldo inicial, pagos) |
| Mes | Total compartido; por miembro, barra de lo que puso con una marca en lo que le corresponde; frase "[Miembro] puso $X de más"; puente con el mes anterior |
| Nunca se muestra | La diferencia entre lo que pusieron como si fuera la deuda; cuánta plata tiene cada uno |
| Miembro sin acceso | "Martina · todavía no entró · Invitar" |
| Ex miembro | "Martina · ex miembro"; el saldo se sigue mostrando |
| Menú | Renombrar · Invitar o ver invitación · Salir del espacio |
| Vacío | "Anoten acá lo que pagan para la casa. La app hace las cuentas." |

**Verificación del ejemplo:** total $700.000, 50/50 → $350.000 a cada uno. Vos pusiste $420.000 → $70.000 de más. Con $50.000 que Martina había puesto de más en septiembre: 70.000 − 50.000 = Martina te debe $20.000.

---

## 25. Pagos entre miembros

**[DECISIÓN] En el MVP.**

| Aspecto | Definición |
| --- | --- |
| Qué significa | Que un miembro declaró ese pago. La app no verifica la transferencia [DECISIÓN] |
| Quién registra | Cualquiera de los dos con acceso; el creador puede registrar pagos de un miembro sin acceso |
| Flujo | Registrar pago → la app propone monto y dirección que dejan el saldo en cero → se puede cambiar (pago parcial o en otra dirección) → fecha → Guardar |
| Efecto en el saldo | Lo reduce; si lo supera, lo invierte con aviso |
| Efecto en "puso" | Ninguno |
| Efecto en el radar personal | Ninguno [DECISIÓN K9]: la parte de cada uno ya estaba contada. No es ingreso ni gasto |
| Dónde se ve | Movimientos del espacio; Movimientos personales con "no cambia tu radar"; en el mes: "Pagos entre ustedes" |
| Editar / eliminar | Recalcula el saldo; confirmación al eliminar con el nuevo saldo y "Martina también lo va a dejar de ver" |
| Adelanto de cuotas | Si el saldo favorece a quien todavía tiene cuotas compartidas por vencer: "Martina adelantó $X de cuotas que todavía no vencieron" |

---

## 26. Invitaciones

| Aspecto | Definición | Estado |
| --- | --- | --- |
| A quién | Solo al lugar de un miembro sin acceso | DECISIÓN |
| Forma | Enlace que el usuario manda por donde quiera; la app no manda mensajes | RECOMENDACIÓN |
| Uso y duración | Un solo uso, 7 días | DECISIÓN K6 |
| Regenerar | Si venció o se perdió; la nueva anula la anterior | DECISIÓN K6 |
| Cancelar | El creador puede anular una invitación activa | RECOMENDACIÓN |
| Al aceptar | Se identifica con email y enlace mágico (o inicia sesión), ocupa el lugar y ve el historial del espacio. No obtiene una cuenta personal | DECISIÓN K8, P1 |
| Si ya tiene cuenta personal | El espacio se suma a Compartidos y su parte aparece en su radar | DECISIÓN K8, K9 |
| Si ya comparte un espacio activo con quien invita | No puede aceptar: "Ya compartís Casa con Renzo" | DECISIÓN P4 |
| Nombre visible | Puede confirmarlo o cambiarlo al aceptar | RECOMENDACIÓN |
| Enlace reenviado por error | El creador ve quién entró y puede quitar ese acceso | Should |

**Lo que ve el creador:** "Invitación enviada · vence el 12/10" [Volver a compartir · Generar nueva · Cancelar] · "La invitación venció" [Generar nueva] · "Martina entró a Casa".

---

## 27. Salida de un espacio

**Principio [DECISIÓN K4, K5]:** salir no borra la historia ni los compromisos ya generados; solo corta lo que todavía no empezó.

| Paso | Pantalla | Acciones |
| --- | --- | --- |
| 1 | Menú del espacio → Salir de Casa | — |
| 2 | **Antes de salir:** saldo ("Le debés $10.000 a Renzo"); cuotas compartidas que siguen ("Heladera: quedan 4 cuotas; tu parte $200.000"); fijos compartidos que se detienen; "Tu nombre queda en el historial como ex miembro" | Registrar un pago · Salir igual · Cancelar |
| 3 | "Vas a dejar de ver Casa. No se puede deshacer." | Salir |
| 4 | "Saliste de Casa" → Compartidos (o, si es Estado B y no le quedan espacios: pantalla con Crear mi cuenta personal) | — |

| Después | Resultado | Estado |
| --- | --- | --- |
| Acceso de quien salió | Lo pierde | DECISIÓN |
| Historial | Completo para quien queda | DECISIÓN K4 |
| Identidad | Nombre con "ex miembro" | DECISIÓN K4 |
| Cuotas compartidas ya generadas | Siguen con el mismo reparto y siguen sumando al saldo | DECISIÓN K5 |
| Fijos compartidos | Se detienen desde la salida | DECISIÓN K5 |
| Quien queda, sobre cada fijo detenido | "El alquiler era compartido con Martina. ¿Lo seguís pagando vos?" → Pasarlo a mis fijos / Terminarlo | RECOMENDACIÓN |
| Radar de quien salió (si tiene cuenta personal) | Meses pasados sin cambios; su parte de cuotas vigentes sigue en Futuro como "Casa · ya no sos miembro" | RECOMENDACIÓN (P8) |
| Saldo de quien salió | Se le muestra al salir; después no lo ve actualizado | PENDIENTE (P6) |
| Volver a invitar | A la misma persona, a su lugar | PENDIENTE (P7) |
| Alguien nuevo | Otro espacio | RECOMENDACIÓN |
| Sin miembros con acceso | El espacio se elimina; en Modo 1 el creador puede eliminarlo | RECOMENDACIÓN |

---

## 28. Eliminación de cuenta

| Quién | Acción | Se borra | Se conserva |
| --- | --- | --- | --- |
| Usuario sin cuenta personal | Eliminar mi usuario | Identidad y acceso; sale de sus espacios | En cada espacio, su nombre como "ex miembro" [DECISIÓN K4] |
| Usuario con cuenta personal | Eliminar mi cuenta | Toda la cuenta personal + identidad; sale de sus espacios | Igual, en los espacios |

Pantalla: "Se borran tus finanzas personales y tu usuario. En Casa y Viaje tu nombre queda en el historial como ex miembro, porque esos registros también son de Renzo y Juan." Antes: saldos pendientes por espacio y exportar (Should). Confirmación en dos pasos. **Pendientes:** plazo de borrado en copias de seguridad (P9) y validación legal del nombre en espacios ajenos (P12). **Could:** desactivar solo la cuenta personal.

---
## 29. Reglas de negocio

Fuente de verdad para la implementación. **Principio:** la app guarda hechos que el usuario registra y calcula todo lo demás; nunca calcula ni afirma dinero real.

### G — Generales

- **G-01.** Mes = mes calendario en la zona horaria del usuario.
- **G-02.** Moneda única: pesos; montos enteros. [DECISIÓN]
- **G-03.** Medios "al contado" (efectivo, débito, billetera, transferencia, otro): la fecha de pago es la fecha del gasto. Tarjeta: T-03.
- **G-04.** La app no registra, calcula ni muestra saldos de cuentas, billeteras, tarjetas ni efectivo. [DECISIÓN]
- **G-05.** Ningún texto de la app afirma que el usuario "tiene", "le queda" o "dispone de" dinero. Prohibidos: "disponible", "te queda", "dinero disponible", "dinero libre", "libre", "saldo personal", "tenés $X", "podés gastar $X". Las cifras se rotulan como registradas, comprometidas, sin asignar o estimadas. "Saldo" solo se usa para el saldo compartido. [DECISIÓN]
- **G-06.** La app registra declaraciones del usuario sobre gastos, compromisos y pagos; no verifica movimientos de dinero reales. "Pagó", "pago" y "ya pasó" tienen ese sentido declarado; nunca se muestra "Pagado" como verificación. [DECISIÓN]

### A — Usuario y cuenta personal

- **A-01.** Un usuario tiene una identidad propia: email + enlace mágico, sin contraseña. [DECISIÓN P1]
- **A-02.** La cuenta personal es opcional y se activa explícitamente. [DECISIÓN K0]
- **A-03.** Aceptar una invitación nunca activa una cuenta personal. [DECISIÓN K0]
- **A-04.** Activar la cuenta personal no cambia identidad, nombre, historial compartido ni se comunica al otro miembro. [RECOMENDACIÓN]
- **A-05.** Sin cuenta personal no se pueden crear gastos personales, ingresos ni tarjetas.
- **A-06.** Crear un espacio requiere cuenta personal. Un usuario sin cuenta personal usa los espacios a los que fue invitado y no puede crear otros. [DECISIÓN P5]

### N — Radar personal (solo con cuenta personal)

- **N-01.** Ingresos registrados del mes = ingresos recurrentes del mes (con ajustes) + ingresos puntuales con fecha en el mes. No incluye pagos entre miembros.
- **N-02.** Comprometido del mes = tu parte de fijos, cuotas y compras con tarjeta en 1 pago cuyo mes de pago es ese mes (personales y de espacios) + resúmenes pendientes declarados de ese mes.
- **N-03.** Gastado del mes = tu parte de gastos al contado no recurrentes con fecha en el mes (personales y de espacios, incluidos los que pagó el otro miembro).
- **N-04.** Asignado = Gastado + Comprometido. **Sin asignar = Ingresos registrados − Asignado**: ingresos registrados que todavía no tienen un gasto o compromiso registrado asociado. Nunca es dinero disponible. [DECISIÓN D1, P20] Mes futuro: Sin asignar = Ingreso previsto − Comprometido; sin ingreso registrado no se calcula.
- **N-05.** De un gasto compartido, al radar llega solo tu parte. [DECISIÓN K9]
- **N-06.** Los pagos entre miembros no afectan el radar. [DECISIÓN K9]
- **N-07.** Los meses no se arrastran.
- **N-08.** Sin asignar negativo se muestra como "Tus gastos y compromisos superan tus ingresos registrados por $X".
- **N-09. Próximos pagos** = ocurrencias que paga el usuario con fecha desde hoy: un resumen estimado por tarjeta y vencimiento, fijos y cuotas sin tarjeta, resúmenes pendientes declarados; **por el monto total que paga el usuario**, indicando la parte de otros miembros. Solo los ve quien paga. No incluye lo que paga otro miembro (aunque el usuario tenga una parte), lo que le deben ni lo que debe en un espacio.
- **N-10. Resumen estimado de una tarjeta** = suma de lo registrado con esa tarjeta para ese vencimiento, por el total pagado. Siempre rotulado "Estimado según lo que registraste". No modela límite, intereses, pago mínimo ni financiación.

### E — Espacios

- **E-01.** Exactamente dos miembros. [DECISIÓN K0]
- **E-02.** El segundo miembro puede estar sin acceso; el otro carga por los dos. [DECISIÓN K0]
- **E-03.** Nombre por defecto "Con [nombre]"; lo cambia cualquier miembro con acceso.
- **E-04.** Un usuario puede tener varios espacios. [DECISIÓN K1]
- **E-05.** Dos usuarios no pueden compartir más de un espacio activo. Se controla al aceptar una invitación (I-06). [DECISIÓN P4]
- **E-06.** Cada gasto compartido se reparte 50/50 por defecto o de forma personalizada por monto. No hay reparto habitual configurable ni porcentajes en la interfaz. [DECISIÓN P3]
- **E-07.** Saldo inicial opcional; visible y editable por los dos.
- **E-08.** Se muestra el nombre visible; nunca el email. [DECISIÓN K7]
- **E-09.** El espacio no muestra ni infiere cuánto dinero tiene cada miembro. [DECISIÓN]

### I — Invitaciones

- **I-01.** Solo se invita al lugar de un miembro sin acceso.
- **I-02.** Un solo uso, 7 días, regenerable; la nueva anula la anterior. [DECISIÓN K6]
- **I-03.** Antes de aceptar se muestra qué verá la persona y qué verá el otro de ella.
- **I-04.** Al aceptar, ocupa el lugar y ve todo el historial del espacio. [DECISIÓN K8]
- **I-05.** Una invitación vencida, usada o anulada no da acceso.
- **I-06.** Si quien acepta ya comparte un espacio activo con quien invita, la invitación no se acepta: "Ya compartís [espacio] con [nombre]". [DECISIÓN P4]
- **I-07.** Aceptar una invitación no crea ni activa una cuenta personal (A-03).

### T — Tarjetas

- **T-01.** Pertenecen a la cuenta personal; nunca se muestran al otro miembro; no tienen saldo ni límite.
- **T-02.** Nombre, día de cierre, día de vencimiento; cada día puede ser "No sé". [DECISIÓN]
- **T-03.** Cierre = primera fecha con el día de cierre igual o posterior a la compra; vencimiento = primera fecha con el día de vencimiento posterior a ese cierre; mes de pago = mes del vencimiento.
- **T-04.** Día inexistente → último día del mes.
- **T-05.** Modo aproximado: solo cierre → vence el mes siguiente al cierre; solo vencimiento o ninguno → lo comprado en un mes se paga el mes siguiente; sin día de vencimiento, Próximos pagos muestra el mes y no un día. [DECISIÓN]
- **T-06.** Cambiar fechas recalcula lo de la tarjeta salvo lo fijado a mano, con aviso.
- **T-07.** Resumen pendiente declarado al activar la cuenta: monto y vencimiento del último resumen sin pagar, completo en Comprometido y en Próximos pagos.
- **T-08.** Consumos desde el último cierre: un gasto con tarjeta en 1 pago, fecha hoy, "Consumos previos (aprox.)".

### Q — Cuotas

- **Q-01.** Por total: cuota = total / cantidad, redondeo en la primera. Por valor de cuota: total = cuota × cantidad.
- **Q-02.** Con tarjeta: primera cuota en el mes de pago de la compra; después, mes a mes.
- **Q-03.** Sin tarjeta, o pagada por un miembro sin medio cargado: primera cuota un mes después de la compra, mismo día.
- **Q-04.** El mes de la primera cuota se puede fijar a mano.
- **Q-05.** Cuando llega su fecha de pago, una cuota pasa a "ya pasó"; la app no verifica que se haya pagado.
- **Q-06.** Cuotas existentes: valor C y "cuota k de n" del último resumen cerrado; se generan n − k cuotas desde el mes siguiente a ese resumen.
- **Q-07.** "Terminar ahora": conserva las pasadas, elimina las futuras.
- **Q-08.** Compra compartida en cuotas: cada cuota es una ocurrencia compartida; su efecto en el saldo se genera cuota por cuota, al llegar la fecha de impacto de cada una. Nunca se genera la deuda total el día de la compra. [DECISIÓN P2]
- **Q-09.** Con reparto personalizado, el reparto se indica sobre el total y cada cuota se divide en la misma proporción; el redondeo se ajusta en la primera cuota. [DECISIÓN P3]

### F — Gastos recurrentes

- **F-01.** Una ocurrencia por mes del inicio al fin; con tarjeta, entra en el resumen que corresponde.
- **F-02.** Ocurrencias de fecha pasada: "Fijo · ya pasó"; la app no verifica el pago.
- **F-03.** "Cambiar desde este mes", "Este mes fue distinto", "Corregir", "Dejar de pagarlo desde".
- **F-04.** Fijo compartido: cada ocurrencia es compartida; quien paga se define en el fijo. Con reparto personalizado, un ajuste de un mes reparte el nuevo monto en la misma proporción.

### C — Gastos compartidos

- **C-01.** Pertenecen al espacio, no a quien los cargó.
- **C-02.** Tienen quién pagó (declarado, G-06) y la parte de cada miembro; las partes suman el total.
- **C-03.** Reparto 50/50: tu parte = total / 2 redondeado a pesos; la otra = total − tu parte. Personalizado: el usuario indica el monto de cada uno; los dos montos suman el total y uno puede ser $0. Sin porcentajes en la interfaz. [DECISIÓN P3]
- **C-04.** Un gasto que corresponde entero a uno se carga como personalizado con $0 para el otro.
- **C-05.** El medio de pago es un detalle privado de quien pagó; sin él, se trata como al contado (o Q-03 si hay cuotas).
- **C-06.** Destino por defecto "Solo yo". [DECISIÓN K2]
- **C-07.** Se guarda creador y último editor. [DECISIÓN K3]

### S — Saldo compartido

- **S-01.** Saldo (visto por un miembro) = saldo inicial + Σ (lo que puso − su parte) en ocurrencias compartidas ya ocurridas − pagos recibidos del otro + pagos hechos al otro. Positivo: el otro le debe.
- **S-02.** Cuándo una ocurrencia compartida afecta el saldo: un gasto puntual, en **su fecha de compra**, aunque se haya pagado con tarjeta e independientemente de cuándo venza la tarjeta [DECISIÓN P19]; una cuota, en su fecha de impacto [DECISIÓN P2]; un fijo, en su día del mes.
- **S-03.** Cada miembro ve el saldo en segunda persona; el del otro es el mismo con signo opuesto.
- **S-04.** Mes del espacio: ocurrencias que ocurren en ese mes según S-02.
- **S-05.** Frase principal: "[Miembro] puso $X de más". Nunca se muestra la diferencia entre lo que pusieron como deuda.
- **S-06.** Saldo cero: "Están a mano".

### P — Pagos entre miembros

- **P-01.** Un pago entre miembros es una declaración: quién le pagó a quién, monto mayor a cero, fecha, quién lo registró. La app no verifica la transferencia (G-06).
- **P-02.** Lo registra cualquier miembro con acceso; el creador puede registrar pagos de un miembro sin acceso.
- **P-03.** Monto propuesto = el que deja el saldo en cero; se aceptan parciales y mayores (con aviso).
- **P-04.** Solo modifica el saldo compartido. No cambia "puso", Gastado, Comprometido ni Ingresos registrados de nadie.

### X — Edición y eliminación

- **X-01.** Editar un hecho recalcula todo lo que depende de él.
- **X-02.** Los dos miembros editan y eliminan cualquier registro del espacio. [DECISIÓN K3]
- **X-03.** Eliminar en un espacio pide confirmación con el nuevo saldo y "el otro también deja de verlo".
- **X-04.** Editar una compra en cuotas regenera sus cuotas; aviso si cambia meses pasados o el saldo.
- **X-05.** No se edita una cuota suelta.
- **X-06.** Eliminar compra en cuotas: "Fue un error" o "Terminar ahora".
- **X-07.** Cambiar el destino (personal ↔ espacio) solo lo puede hacer quien lo cargó, con confirmación de audiencia.
- **X-08.** Si los dos editan lo mismo, vale el último cambio guardado.
- **X-09.** Una tarjeta con cuotas o fijos activos no se elimina: se reasigna o archiva.

### SA — Salida de un espacio

- **SA-01.** Cualquier miembro con acceso puede salir; antes ve saldo, cuotas que siguen y fijos que se detienen.
- **SA-02.** Pierde el acceso; el historial queda para el otro; su nombre como "ex miembro". [DECISIÓN K4]
- **SA-03.** Las cuotas compartidas ya generadas siguen y suman al saldo. [DECISIÓN K5]
- **SA-04.** Los fijos compartidos se detienen desde la salida; quien queda decide si pasan a sus fijos. [DECISIÓN K5 + RECOMENDACIÓN]
- **SA-05.** En el radar de quien sale, meses pasados sin cambios y su parte de cuotas vigentes sigue en Futuro. [RECOMENDACIÓN, P8]
- **SA-06.** Sin miembros con acceso, el espacio se elimina; en Modo 1 el creador puede eliminarlo.

### D — Eliminación de cuenta

- **D-01.** Eliminar el usuario sale de todos sus espacios y borra su identidad y su cuenta personal.
- **D-02.** En los espacios queda su nombre como "ex miembro". [DECISIÓN K4; P12]

### PR — Privacidad

- **PR-01.** Ningún dato personal pasa a un espacio salvo lo cargado explícitamente ahí. [DECISIÓN K2]
- **PR-02.** Nunca se muestran al otro miembro tarjetas, medios, ingresos, gastos personales, otros espacios, si tiene cuenta personal ni cifras de su radar.
- **PR-03.** Toda pantalla y formulario muestran su audiencia.
- **PR-04.** Las métricas de uso registran acciones, nunca montos, descripciones ni nombres. [RECOMENDACIÓN]

### SY — Sincronización

- **SY-01.** Al abrir, volver a una pantalla o deslizar para actualizar se ven los cambios del otro miembro. Sin notificaciones en el MVP.
- **SY-02.** Si el otro eliminó un registro mientras se edita: "Martina eliminó este gasto. ¿Querés volver a crearlo?"

---

### 29.1 Verificación matemática

Casos de referencia que toda implementación debe reproducir exactamente. Son pruebas, no ejemplos ilustrativos. [DECISIÓN]

**Caso A — Radar del mes**

| Concepto | Valor |
| --- | --- |
| Ingresos registrados | $1.200.000 |
| Gastado | $250.000 |
| Comprometido | $550.000 |
| Asignado = Gastado + Comprometido | $800.000 |
| Sin asignar = Ingresos registrados − Asignado | **$400.000** |

Los $400.000 son ingresos registrados que todavía no tienen un gasto o compromiso registrado asociado. **No son plata en el banco**: la app no sabe cuánto dinero real tiene el usuario (G-04, G-05). Pantalla: "Sin asignar $400.000 · Todavía sin destino, según lo que registraste."

**Caso B — Compra con tarjeta en 1 pago**

Visa con cierre 25 y vencimiento 5. Compra de $120.000 en 1 pago el 20/10.

| Mes | Efecto |
| --- | --- |
| Octubre (compra) | No suma a Gastado de octubre. Aparece en "Con tarjeta este mes: $120.000 → se paga en noviembre" |
| Noviembre (vencimiento 5/11) | Suma $120.000 a Comprometido de noviembre (o a Gastado, una vez pasada la fecha, como "Ya pasó"). Próximos pagos: "5 nov · Visa · $120.000 · estimado según lo que registraste" |

Si la compra fuera el 27/10 (después del cierre), impacta en el vencimiento del 5/12 (T-03).

**Caso C — Gasto compartido de contado, 50/50**

Super $100.000, pagó Renzo, reparto 50/50.

| Concepto | Renzo | Martina |
| --- | --- | --- |
| Puso | $100.000 | $0 |
| Le corresponde | $50.000 | $50.000 |
| Saldo compartido | Martina le debe $50.000 | Le debe $50.000 a Renzo |
| Radar personal | Gastado +$50.000 | Gastado +$50.000 (si tiene cuenta personal) |
| Próximos pagos | Nada (contado, ya ocurrió) | Nada |

El espacio muestra: total $100.000 · pagó Renzo · $50.000 cada uno. La deuda es $50.000, no $100.000 (la diferencia entre lo que puso cada uno).

**Caso D — Compra compartida en cuotas**

Heladera $600.000 en 6 cuotas de $100.000, Visa de Renzo, 50/50. Primera cuota el 5/11.

| Momento | Espacio | Renzo (radar) | Martina (radar) | Saldo compartido |
| --- | --- | --- | --- | --- |
| Día de la compra | Compromiso de $100.000/mes por 6 meses | Comprometido +$50.000 en cada mes de cuota | Comprometido +$50.000 en cada mes de cuota | **Sin cambio** |
| Cada fecha de impacto (5 de cada mes) | Cuota k de 6: $100.000 | Su parte: $50.000 | Su parte: $50.000 | Martina debe $50.000 más [DECISIÓN P2] |
| Después de 6 cuotas, sin pagos entre ellos | $600.000 | $300.000 | $300.000 | Martina debe $300.000 |

Próximos pagos de Renzo: "5 nov · Visa · $100.000 · incluye $50.000 de Martina · estimado según lo que registraste". Próximos pagos de Martina: **nada** de esta compra (ella no paga la Visa); ve su deuda en el espacio.

**Caso E — Reparto personalizado por monto**

Super $100.000, pagó Renzo, Personalizado: Renzo $60.000 · Martina $40.000.

| Concepto | Renzo | Martina |
| --- | --- | --- |
| Puso | $100.000 | $0 |
| Le corresponde | $60.000 | $40.000 |
| Saldo | Martina le debe $40.000 | Le debe $40.000 a Renzo |
| Radar | Gastado +$60.000 | Gastado +$40.000 |

La interfaz no muestra porcentajes. En cuotas, la proporción del total se aplica a cada cuota (CA-51): $600.000 con Renzo $360.000 y Martina $240.000 en 6 cuotas → $60.000 y $40.000 por cuota.

**Caso F — Pago parcial entre miembros**

Martina debe $40.000. Se registra "Martina le pagó $15.000 a Renzo".

| Concepto | Antes | Después |
| --- | --- | --- |
| Saldo | Martina debe $40.000 | **Martina debe $25.000** |
| Puso (de cada uno) | Sin cambio | Sin cambio |
| Gastado, Comprometido, Ingresos registrados | Sin cambio | Sin cambio |

El pago es una declaración (G-06): la app no verifica la transferencia.

**Caso G — Gasto compartido puntual con tarjeta**

Supermercado $100.000 el 20/10 con la Visa de Renzo (cierre 25, vence 5), 1 pago, 50/50.

| Concepto | Efecto |
| --- | --- |
| Saldo compartido | El 20/10 (fecha de compra): Martina debe $50.000 [DECISIÓN P19] |
| Radar de Renzo | Octubre: "Con tarjeta este mes" $50.000. Noviembre: Comprometido +$50.000 (su parte) |
| Radar de Martina (con cuenta personal) | Gastado de octubre +$50.000: para ella no hay medio de pago, se trata como al contado en la fecha de compra (C-05, sección 18) |
| Próximos pagos de Renzo | "5 nov · Visa · $100.000 · incluye $50.000 de Martina · estimado según lo que registraste" |
| Próximos pagos de Martina | Nada |

Es el mismo ejemplo verificado de la sección 18.

---

## 30. Estados y transiciones

### Miembro de un espacio

```
                    acepta invitación
  [Sin acceso] ───────────────────────────▶ [Con acceso, sin cuenta personal (invitado)]
       │                                                │
       │ acepta y ya tenía cuenta personal              │ activa su cuenta personal
       ▼                                                ▼
  [Con acceso y cuenta personal] ◀──────────────────────┘
       │                       │
       └──── sale o elimina su usuario ────▶ [Ex miembro]
                                                  ┆ volver a invitar (P7)
  [Sin acceso] ◀┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┘
```

Quien crea un espacio entra directo con acceso y tiene cuenta personal (P5). "Con acceso, sin cuenta personal" es un estado completo, no intermedio.

| Entidad | Estados | Transiciones |
| --- | --- | --- |
| Usuario | Sin cuenta personal (B, solo por invitación) · Con cuenta personal (A) · Eliminado | Registro propio → A; aceptar una invitación sin ser usuario → B; B → A al activar; A o B → Eliminado |
| Invitación | Activa · Usada · Vencida · Anulada | Activa → Usada / Vencida (7 días) / Anulada (nueva o cancelada) |
| Espacio | Modo 1 · Modo 2 · Con ex miembro · Eliminado | Modo 1 → Modo 2 (invitación usada); Modo 2 → Con ex miembro (salida); → Eliminado sin miembros con acceso |
| Ocurrencia | Futura (compromiso) · Ocurrida · Detenida | Futura → Ocurrida al llegar su fecha; Detenida por salida o "Terminar ahora" |
| Pago próximo | Próximo · Ya pasó | Al llegar su fecha; la app no afirma que se pagó |

---
## 31. Casos de uso completos

Personajes: **Renzo** y **Martina** (pareja). Reparto de Casa 50/50 salvo indicación. Octubre de 2026. En ningún caso la app conoce ni muestra cuánta plata tiene alguno de los dos.

### Caso 1 — Renzo crea su cuenta personal

| | |
| --- | --- |
| Estado inicial | Renzo no es usuario |
| Acción | O1 "Las dos" → privacidad → email y enlace mágico → O3: sueldo $1.200.000 día 5; Visa (cierre 25, vence 5); último resumen pagado; cuotas "2 de 6, $30.000"; consumos desde el cierre $40.000; fijos: internet $25.000 y gimnasio $30.000 (débito) |
| Resultado | Estado A. Futuro, noviembre: comprometido $125.000 (cuota $30.000 + consumos $40.000 + fijos $55.000), ingreso previsto $1.200.000, sin asignar $1.075.000. Próximos pagos: "5 nov · Visa · resumen estimado $70.000" y los fijos con su día |
| Qué ve | Solo Renzo |
| Privado | Todo |
| Impacto compartido | Ninguno |

### Caso 2 — Renzo crea "Casa" e invita a Martina

| | |
| --- | --- |
| Acción | Compartidos → Nuevo espacio → "Martina" → Están a mano → renombra "Casa" → Invitar → comparte el enlace |
| Resultado | Modo 1; invitación activa 7 días |
| Renzo ve | Casa vacía con "Martina · invitación enviada · vence el 12/10"; Inicio: "Casa · Están a mano" |
| Martina ve | Solo el enlace, fuera de la app |
| Privado | Toda la cuenta personal de Renzo |
| Impacto | Ninguno en el radar; el espacio ya se puede usar |

### Caso 3 — Martina acepta sin crear cuenta personal

| | |
| --- | --- |
| Acción | O2: abre el enlace → qué va a ver y qué no → email y enlace mágico → confirma su nombre |
| Resultado | Martina en Estado B y miembro con acceso; invitación usada; Modo 2 |
| Martina ve | Casa como pantalla principal, bienvenida y la tarjeta "Tu plata personal" |
| Renzo ve | "Martina entró a Casa" |
| Privado | La cuenta personal de Renzo; los emails |
| Impacto | Ninguno en ningún radar |

### Caso 4 — Martina, invitada, registra un gasto compartido

| | |
| --- | --- |
| Acción | + → $40.000 → Internet → Casa → pagó Yo → 50/50 (sin medio de pago) |
| Resultado | Gasto compartido $40.000, pagó Martina, partes $20.000 / $20.000, "cargó Martina" |
| Martina ve | "Agregado a Casa · Renzo lo ve"; "Renzo te debe $20.000" |
| Renzo ve | El gasto con "cargó Martina"; "Le debés $20.000 a Martina"; en su radar de octubre, Gastado +$20.000 ("Casa · pagó Martina · tu parte") |
| Privado | Nada personal se toca |
| Impacto personal | Renzo: Gastado +$20.000. Martina: ninguno (no tiene cuenta personal). En los Próximos pagos de Renzo no aparece nada: lo que debe es saldo del espacio |
| Impacto compartido | Martina puso $40.000; le corresponden $20.000 |

### Caso 5 — Renzo registra un gasto personal

| | |
| --- | --- |
| Acción | + → $80.000 → Otros → "Solo yo" (preseleccionado) → Visa → Guardar, el 15/10 |
| Resultado | Gasto personal con tarjeta: vence 5/11 |
| Renzo ve | "Guardado · Solo vos lo ves · se paga en noviembre"; Inicio: "Con tarjeta este mes: $80.000 → se paga en noviembre"; el resumen estimado de la Visa del 5/11 sube $80.000 |
| Martina ve | Nada; no existe para ella |
| Impacto personal | Comprometido de noviembre +$80.000; sin asignar de noviembre −$80.000 |

### Caso 6 — Renzo registra un gasto compartido

| | |
| --- | --- |
| Estado inicial | Renzo le debe $20.000 a Martina |
| Acción | + → $100.000 → Supermercado → Casa ("Lo ven vos y Martina") → pagó Yo → 50/50 → Débito |
| Resultado | Gasto compartido $100.000, pagó Renzo, partes $50.000 / $50.000 |
| Renzo ve | "Agregado a Casa · Martina lo ve · Deshacer"; "Martina te debe $30.000"; radar: Gastado +$50.000 ("te corresponde"); no hay próximo pago (fue al contado) |
| Martina ve | El gasto con "cargó Renzo"; "Le debés $30.000 a Renzo". No ve que fue con débito |
| Privado | El medio de pago |
| Impacto compartido | Renzo puso $100.000 y le corresponden $70.000 del mes; Martina puso $40.000 y le corresponden $70.000 |

**Variante con tarjeta:** si lo pagaba con la Visa, el radar de Renzo suma $50.000 a Comprometido de noviembre y sus Próximos pagos muestran el resumen de la Visa con "incluye $50.000 de Martina". El saldo con Martina cambia igual, el día de la compra (S-02).

### Caso 7 — Varias semanas de gastos compartidos

| Fecha | Gasto | Pagó | Total | Parte Renzo | Parte Martina | Renzo puso de más |
| --- | --- | --- | --- | --- | --- | --- |
| 3/10 | Internet | Martina | $40.000 | $20.000 | $20.000 | −$20.000 |
| 8/10 | Supermercado | Renzo | $100.000 | $50.000 | $50.000 | +$50.000 |
| 12/10 | Cena | Martina | $60.000 | $30.000 | $30.000 | −$30.000 |
| 18/10 | Supermercado | Martina | $90.000 | $45.000 | $45.000 | −$45.000 |
| 24/10 | Farmacia (personalizado: Renzo $0, Martina $30.000) | Renzo | $30.000 | $0 | $30.000 | +$30.000 |
| 29/10 | Verdulería | Renzo | $50.000 | $25.000 | $25.000 | +$25.000 |
| **Total** | | | **$370.000** | **$170.000** | **$200.000** | **+$10.000** |

Renzo puso $180.000 (le correspondían $170.000); Martina puso $190.000 (le correspondían $200.000). **Martina le debe $10.000 a Renzo.** Martina registra "Le pagué $10.000 a Renzo": están a mano. El pago no cambia el "puso" ni el radar de nadie. En el radar de Renzo, octubre suma a Gastado su parte: $170.000 (si todo fue al contado).

### Caso 8 — Compra compartida en cuotas

| | |
| --- | --- |
| Acción | Renzo: + → $600.000 → Hogar → Casa → pagó Yo → 50/50 → Visa → 6 cuotas, el 10/10. Vista previa: "Noviembre: comprometido $205.000 → $255.000 · sin asignar $995.000 → $945.000. Suma $50.000 por mes durante 6 meses (tu parte)" |
| Resultado | Cuotas de $100.000 de noviembre a abril |
| Renzo ve | Futuro: +$50.000 comprometido por mes; Próximos pagos: el resumen estimado de la Visa sube $100.000 por mes, "incluye $50.000 de Martina" |
| Martina ve | En Casa: "Heladera $600.000 · 6 cuotas de $100.000 · pagó Renzo · 50/50"; Próximos meses de Casa: $100.000 por mes. No ve la tarjeta |
| Impacto personal | Renzo: Comprometido +$50.000/mes. Martina: ninguno mientras no tenga cuenta personal; si la activa, +$50.000/mes |
| Impacto compartido | Compromiso compartido $100.000/mes. El 10/10 el saldo no cambia; cada 5 del mes, al llegar la fecha de impacto de cada cuota, Martina pasa a deber $50.000 más [DECISIÓN P2]; si transfiere y se registra, vuelven a cero |

### Caso 9 — Gasto fijo compartido

| | |
| --- | --- |
| Acción | Renzo: + → $500.000 → Alquiler → Casa → pagó Yo → 50/50 → Transferencia → Se repite cada mes, día 1, desde noviembre |
| Renzo ve | Futuro: +$250.000 comprometido por mes ("Alquiler · Casa · tu parte"); Próximos pagos: "1 nov · Alquiler · $500.000 · incluye $250.000 de Martina" |
| Martina ve | El fijo en Casa y en Próximos meses de Casa: $500.000/mes, paga Renzo |
| Impacto personal | Renzo: +$250.000/mes. Martina (si activa cuenta): +$250.000/mes, sin próximo pago propio |
| Impacto compartido | Cada día 1, Martina pasa a deber $250.000 más, salvo compensaciones |

### Caso 10 — Martina decide crear su cuenta personal

| | |
| --- | --- |
| Acción | "Crear mi cuenta personal" → explicación → O3 |
| Resultado | Estado A; misma identidad, nombre y lugar en Casa. No se copia ningún gasto |
| Martina ve | Inicio, Movimientos, Futuro y Compartidos. "Tu cuenta personal está lista. Ya incluye tu parte de Casa." Su Futuro muestra su parte de la heladera ($50.000/mes) y del alquiler ($250.000/mes); su octubre, su parte de los gastos de Casa [DECISIÓN K8, K9] |
| Renzo ve | Nada distinto; no se le informa |

### Caso 11 — Martina registra gastos personales

| | |
| --- | --- |
| Acción | En O3: sueldo $900.000 día 1, Mastercard (cierre 20, vence 2), gimnasio. "Alquiler" aparece como "Ya en Casa · tu parte $250.000". Luego "Ropa $45.000", "Solo yo", con Mastercard |
| Martina ve | Su radar: ingresos registrados $900.000, gastado, comprometido (incluida su parte de Casa) y sin asignar; Próximos pagos con su Mastercard (que incluye la ropa). Ningún pago de Casa que pague Renzo |
| Renzo ve | Nada nuevo |
| Privado | Sueldo, tarjeta, gimnasio y ropa de Martina |

### Caso 12 — Martina abandona el espacio

| | |
| --- | --- |
| Estado inicial | Martina debe $10.000; heladera con 4 cuotas restantes; alquiler compartido |
| Acción | Salir de Casa → "Antes de salir": "Le debés $10.000 a Renzo · Heladera: quedan 4 cuotas, tu parte $200.000 · El alquiler deja de ser compartido" → Salir igual → confirmación |
| Resultado | Martina pierde el acceso; "ex miembro"; el alquiler compartido se detiene |
| Martina ve | "Saliste de Casa". En su Futuro siguen sus $50.000/mes de la heladera como "Casa · ya no sos miembro"; el alquiler deja de figurar |
| Renzo ve | "Martina salió de Casa"; "ex miembro" en cada registro; la pregunta sobre el alquiler |
| Impacto compartido | Historial completo; saldo y cuotas siguen [DECISIÓN K4, K5] |

### Caso 13 — Renzo sigue usando el espacio

| | |
| --- | --- |
| Acción | "Lo sigo pagando yo" → el alquiler pasa a sus fijos por $500.000. Registra "Martina me pagó $10.000" |
| Renzo ve | Casa con "Martina · ex miembro"; su Comprometido sube $250.000/mes (pasa de su parte al total); el próximo pago del alquiler ya no dice "incluye $250.000 de Martina" |
| Impacto | Puede seguir cargando gastos y pagos con Martina como ex miembro; no puede sumar a otra persona en su lugar |

### Caso 14 — Cuota compartida pendiente al salir

| | |
| --- | --- |
| Resultado | Las 4 cuotas siguen en Casa, 50/50 [DECISIÓN K5]; cada mes Martina pasa a deber $50.000 más |
| Renzo ve | Comprometido $50.000/mes; Próximos pagos con el resumen completo de la Visa ("incluye $50.000 de Martina"); el saldo con Martina crece hasta $200.000 salvo pagos |
| Martina ve | Si tiene cuenta personal: $50.000/mes en Futuro como "Casa · ya no sos miembro". No ve el saldo actualizado (P6) |

### Caso 15 — Una invitación vence

| | |
| --- | --- |
| Acción | Martina abre el enlace el día 8 |
| Resultado | "Esta invitación venció. Pedile a Renzo que te mande una nueva." Sin acceso. Renzo ve "La invitación venció · Generar nueva". Casa sigue en Modo 1 |

### Caso 16 — Segunda invitación

| | |
| --- | --- |
| Acción | Renzo genera una nueva y la comparte |
| Resultado | Nueva invitación activa 7 días; la anterior queda anulada [DECISIÓN K6]. El enlace viejo muestra "Esta invitación ya no sirve. Usá la última que te mandó Renzo." |

### Caso 17 — Más de un espacio

| | |
| --- | --- |
| Acción | Renzo crea "Viaje" con Juan (sin acceso) y carga "Nafta $60.000, pagó Renzo, 50/50" |
| Renzo ve | Compartidos con dos espacios; Inicio: "Viaje · Juan te debe $30.000"; destinos Solo yo · Casa · Viaje; su radar suma su parte de los dos espacios con la etiqueta de cada uno |
| Martina ve | Nada de Viaje, ni que existe |
| Impacto | Saldos separados por espacio; no se compensan entre sí |
| Límite | Renzo no puede tener un segundo espacio con Martina: si la invitara a "Viaje", ella no podría aceptar ("Ya compartís Casa con Renzo") [DECISIÓN P4] |

### Caso 18 — Una invitada intenta registrar un gasto personal

| | |
| --- | --- |
| Acción | Martina (Estado B): + → monto → categoría → en Destino toca "Personal" |
| Resultado | Hoja: "Tus gastos personales viven en tu cuenta personal, que es privada. Todavía no la creaste." [Crear mi cuenta personal] · [Cargarlo en Casa] · [Cancelar]. Si lo carga en Casa: "Renzo lo va a ver". Si crea la cuenta, el borrador se guarda como personal al terminar |
| Renzo ve | Nada, salvo que lo cargue en Casa |

### Caso 19 — Una invitada intenta crear un espacio

| | |
| --- | --- |
| Estado inicial | Martina en Estado B, miembro de Casa |
| Acción | Toca "Crear espacio" (desde la lista de espacios o el perfil) |
| Resultado | "Para crear un espacio necesitás tu cuenta personal. Es privada y la podés completar cuando quieras." [Crear mi cuenta personal] · [Ahora no] [DECISIÓN P5] |
| Impacto | Ninguno hasta que active su cuenta personal; después puede crear espacios con otras personas (no con Renzo, P4) |

---
## 32. Edge cases

Riesgo: **Rompe** = cifra falsa, afirmación indebida sobre dinero real o filtración de privacidad · **Medio** = confunde · **Bajo** = lo resuelven las reglas.

### Radar personal

| Caso | Riesgo | Resolución |
| --- | --- | --- |
| El usuario lee "Sin asignar" como plata que tiene | **Rompe** | Rótulo fijo "todavía sin destino, según lo que registraste"; nunca "disponible" ni "te queda" (G-05) |
| Ingresos registrados mayores que la plata real (no cobró, o la gastó sin registrarla) | Medio | La app no lo sabe y no lo afirma; "¿de dónde sale?" muestra qué se registró |
| Gastos no registrados | Medio | Las cifras son "según lo que registraste"; sin culpa ni alertas |
| Compra con tarjeta contada en el mes de compra | Rompe | T-03 |
| No conoce cierre ni vencimiento | Medio | T-05, modo aproximado visible |
| Cuotas y resumen pendientes al activar la cuenta | Rompe | T-07, T-08, Q-06 |
| Sin asignar negativo | Bajo | N-08, sin alarma |
| Mes sin ingresos o ingresos variables | Medio | N-04, "Este mes fue distinto" |
| Sueldo cobrado a fin de mes para el siguiente | Medio | Cuenta en el mes en que se cobra; P14 |
| Gastos en dólares | Medio | En pesos aproximados; limitación |
| Pago mínimo o financiación del resumen | Fuera | No se modela; el resumen estimado no coincidirá; limitación declarada |
| Un pago próximo cuya fecha pasó | Bajo | "Ya pasó"; la app no dice "pagado" ni "impago" |
| El usuario cree que "Ya pasó" o "pagó" significan que la app verificó el movimiento | Medio | Lenguaje de declaración (G-06); "¿de dónde sale?" |

### Espacios y miembros

| Caso | Riesgo | Resolución |
| --- | --- | --- |
| Gasto personal cargado en un espacio por error | **Rompe privacidad** | "Solo yo" por defecto, audiencia visible, Deshacer, X-07 |
| Resumen de mi tarjeta incluye gastos compartidos | Medio | Próximos pagos muestra el total con "incluye $X de Martina"; el radar cuenta mi parte (sección 7.3) |
| Los dos cargan el mismo gasto | Medio | Aviso de duplicado (Should); cualquiera lo elimina |
| Espacios duplicados entre las mismas personas | Medio | Pregunta previa al crear; sin fusión |
| Enlace de invitación reenviado | **Rompe privacidad** | Un solo uso, 7 días, quitar acceso (Should) |
| La invitada no está de acuerdo con lo cargado antes | Medio | Edita con autoría visible |
| Un miembro elimina lo que el otro edita | Medio | SY-02 |
| Gasto cargado por el otro con "pagó Renzo" | Medio | Sin medio para Renzo hasta completarlo (C-05) |
| Cambio de reparto de un gasto | Bajo | Editar el gasto recalcula el saldo (X-01) |
| Invitación de alguien con quien ya se comparte un espacio | Bajo | No se acepta (I-06) |
| Invitada sin cuenta personal intenta crear un espacio | Bajo | A-06, Caso 19 |
| Cuotas compartidas pagadas por adelantado | Medio | "Adelantó $X de cuotas que todavía no vencieron" |
| Fijo compartido variable | Bajo | "Este mes fue distinto" |
| Salir con cuotas o fijos compartidos | Medio | SA-03, SA-04, SA-05 |
| Eliminar cuenta con saldo compartido distinto de cero | Medio | Se muestra antes; el saldo queda para el otro |
| Invitada que nunca crea cuenta personal | Bajo | Estado válido indefinidamente |
| Gasto que corresponde entero a uno, cargado en el espacio | Medio | Aclaración: lo ve el otro miembro |
| Gasto entre tres o más | Medio | Fuera de alcance |
| Teléfono compartido | Medio | Bloqueo de app es Could |

---

## 33. UX/UI y microcopy

Especificación de comportamiento y textos de referencia (se pueden pulir sin cambiar su sentido). **Criterio estético:** pantallas limpias, una forma visual por pregunta (barra del radar, barras por mes, barras de "puso"), tipografía y espacio por sobre tablas densas. Nada que parezca un home banking.

### Pantallas clave

**U1 — Pantalla principal del invitado.** Objetivo: que entienda en segundos que está en un espacio compartido y que sus finanzas personales son otra cosa. Visible: el espacio y su encabezado "Lo ven vos y Renzo"; tarjeta fija "Tu plata personal". Acción principal: + Agregar. Bienvenida única: "Estás en Casa. Acá anotan lo que pagan para la casa y la app hace las cuentas. Lo que cargues acá lo ven vos y Renzo." Tarjeta: "Casa es lo que compartís con Renzo. Tus ingresos y tus gastos propios son otra cosa: si querés, podés ordenarlos acá, en privado." [Crear mi cuenta personal] · [Ahora no] ("Ahora no" la reduce a una línea; nunca insiste). Si intenta crear un espacio: "Para crear un espacio necesitás tu cuenta personal." [Crear mi cuenta personal]. Nunca: pestañas bloqueadas, candados, "cuenta incompleta", "desbloqueá".

**U2 — Activar cuenta personal.** "Tu cuenta personal es solo tuya. Vas a anotar tus ingresos, gastos y cuotas para ver qué parte ya tiene destino y qué pagos se vienen. En Casa no cambia nada y Renzo no ve nada nuevo." Final: "Listo. Tu cuenta personal ya incluye tu parte de Casa." → Futuro.

**U3 — Selector de destino.** Solo yo (por defecto) · Casa · Viaje; debajo "Solo vos lo ves" / "Lo ven vos y Martina". Estado B: espacios + "Personal" (Caso 18). Reparto: 50/50 · Personalizado (montos).

**U4 — Invitar.** "Invitá a Martina a Casa. Va a ver y poder cargar los gastos de Casa. No va a ver nada de tu plata personal." Estados: enviada · vencida · aceptada. Al generar una nueva: "La invitación anterior va a dejar de funcionar."

**U5 — Aceptar invitación.** Textos en O2. Errores: "Esta invitación venció. Pedile a Renzo una nueva." · "Esta invitación ya se usó." · "Esta invitación ya no sirve. Usá la última que te mandaron." · "Ya compartís Casa con Renzo."

**U6 — Registrar pago entre miembros.** "¿Quién le pagó a quién?" con dirección y monto propuestos. Nota: "No cambia lo que cada uno puso ni tu radar." Feedback: "Están a mano" / "Martina todavía te debe $5.000".

**U7 — Eliminar en un espacio.** "¿Eliminar Supermercado $100.000? Martina también lo va a dejar de ver. El saldo pasa a: Martina te debe $10.000."

**U8 — "¿De dónde sale?"** Al tocar una cifra: qué la compone, en palabras y con los registros. Para Sin asignar: "Ingresos registrados $1.200.000 − Gastado $320.000 − Comprometido $480.000. No es la plata que tenés en tus cuentas: es la parte de tus ingresos registrados que todavía no tiene destino."

### Auditoría de términos (V1.1 → V1.1.2)

| Expresión en V1.1 | Dónde estaba | ¿Cambia? | Término correcto | Por qué | Cómo se comunica |
| --- | --- | --- | --- | --- | --- |
| "Te quedan $420.000" | Inicio, número protagonista | Sí | "Sin asignar $400.000" | La app no conoce el saldo real; "te quedan" lo sugiere | Siempre con "todavía sin destino, según lo que registraste" |
| "Te queda" (definición y fórmula) | Glosario, definiciones, reglas N-04 | Sí | Sin asignar | Idem | En "¿de dónde sale?" se explica que no es plata en cuentas |
| "Te quedan $X sin asignar" | V1.1.1 | Se elimina | "Sin asignar $X" | "Te quedan" sugiere plata disponible [DECISIÓN D1] | — |
| "Se liberan $X" (cuotas que terminan) | Futuro | Sí | "Tu comprometido baja $X" | "Liberar" sugiere plata disponible | — |
| "Pagado" como estado | Cuotas, fijos | Sí | "Ya pasó" | La app no verifica pagos (G-06) | — |
| "Saldo pendiente de tarjeta" | Onboarding, reglas | Sí | "Resumen pendiente declarado" | "Saldo" se reserva para el saldo compartido | — |
| "Reparto habitual" con porcentajes | Espacio | Se elimina | 50/50 o Personalizado (montos) | P3 | — |
| "Compromiso de tarjeta" | Tarjetas | Sí | "Resumen estimado" | Un solo término | Siempre "Estimado según lo que registraste" |
| "≈ $15.000 por día" | Inicio | Se elimina | — | Sugiere cuánto se puede gastar | — |
| "Libre" (meses futuros) | Futuro | Sí | Sin asignar | Coherencia; "libre" sugiere plata | "Sin asignar · según tus ingresos previstos" |
| "Ingreso esperado" | Futuro | Sí | Ingreso previsto (registrado) | Es lo registrado, no una expectativa sobre dinero real | — |
| "Ingresos" (mes actual) | Inicio | Sí | Ingresos registrados | Puede no coincidir con lo cobrado | — |
| "Te pasaste por $X respecto de lo que entra este mes" | Inicio, negativo | Sí | "Tus gastos y compromisos superan tus ingresos registrados por $X" | Más preciso; sin juicio | — |
| "Lo que podés gastar sin tocar lo que ya tenés que pagar" | Definición de Te queda | Se elimina | — | Afirmación sobre capacidad de gasto | — |
| Vista previa "libre $510.000 → $480.000" | Formulario de cuotas | Sí | "comprometido $620.000 → $650.000 · sin asignar $580.000 → $550.000" | Muestra destino, no plata | Nunca "te alcanza / no te alcanza" |
| "¿Me alcanza?" | Documentos anteriores | Se elimina como nombre | "Vista previa de la compra" | Pregunta sobre dinero real | — |
| "Saldo" (compartido) | Espacios | Se mantiene acotado | "Saldo compartido" / "Martina te debe $X" | Es una cifra que la app sí conoce: lo que se deben entre ellos | Nunca "saldo" a secas en lo personal |
| "Disponible" | — | Prohibido | — | — | No aparece en ninguna pantalla |

### Microcopy de referencia

| Situación | Texto |
| --- | --- |
| Audiencia | "Solo vos" · "Lo ven vos y Martina" |
| Guardado | "Guardado · Solo vos lo ves" · "Agregado a Casa · Martina lo ve · Deshacer" |
| Radar | "Ingresos registrados" · "Gastado" · "Comprometido" · "Sin asignar" |
| Ayuda de Sin asignar | "Todavía sin destino, según lo que registraste" |
| Próximos pagos | "Resumen estimado según lo que registraste" · "incluye $X de Martina" · "Ya pasó" |
| Tarjeta | "Se paga en noviembre" · "Fechas aproximadas" |
| Cuotas que terminan | "En marzo terminan 2 cuotas: tu comprometido baja $80.000 por mes" |
| Autoría | "Cargó Renzo" · "Editó Martina" |
| Miembros | "Martina · todavía no entró" · "Martina · ex miembro" |
| Saldo compartido | "Martina te debe $X" · "Le debés $X a Renzo" · "Están a mano" |
| Mes del espacio | "Este mes pusiste $X de más" |
| Lo compartido en lo personal | "Casa · te corresponde $X" · "Casa · lo paga Renzo · tu parte" |
| Ex miembro en Futuro | "Casa · ya no sos miembro" |

### Estados vacíos

| Pantalla | Texto |
| --- | --- |
| Inicio sin ingresos registrados | "Registrá tu ingreso para ver qué parte ya tiene destino." |
| Inicio sin nada | "Anotá tus gastos fijos y tus cuotas: la app te muestra qué se viene." |
| Movimientos | "Todavía no registraste nada en octubre." |
| Futuro sin compromisos | "No tenés nada comprometido todavía. Cargá tus fijos y cuotas." |
| Próximos pagos sin datos | "No hay pagos próximos registrados." |
| Compartidos sin espacios | "¿Compartís gastos con alguien? Anótenlos acá y la app hace las cuentas." [Crear espacio] |
| Espacio sin gastos | "Anoten acá lo que pagan para la casa. La app hace las cuentas." |
| Invitado sin espacios | "No estás en ningún espacio. Para crear uno, activá tu cuenta personal." [Crear mi cuenta personal] |

---

## 34. Privacidad y confianza

**[DECISIÓN]** La privacidad es parte del producto. **Regla:** solo se dice lo que se puede cumplir y verificar.

**La app no conoce tu dinero, y eso también es privacidad.** No pide acceso a bancos ni billeteras, no ve saldos y no mueve plata. Este punto se comunica en el onboarding porque reduce la desconfianza inicial.

**Qué guarda:** lo que el usuario registra y su identidad (email). **Nunca pide:** números de tarjeta, CBU/CVU, claves bancarias, DNI, accesos a bancos o billeteras, datos de contacto de otras personas.

| Promesa | Depende de | Condición | Estado |
| --- | --- | --- | --- |
| No nos conectamos a tus cuentas ni sabemos cuánta plata tenés | Producto | Sin integraciones bancarias (G-04) | Garantizable |
| No pedimos claves del banco ni números de tarjeta | Producto | Ningún formulario los pide | Garantizable |
| Tus finanzas personales son solo tuyas | Producto | PR-01 y PR-02 implementadas y probadas | Garantizable |
| En un espacio, el otro ve solo lo que se carga ahí | Producto | Sección 12 | Garantizable |
| Nadie recibe nada tuyo sin que vos lo compartas | Producto | La app no contacta a nadie | Garantizable |
| Podés borrar tu cuenta y tus datos | Producto + infraestructura | Plazo de copias de seguridad | PENDIENTE P9 |
| No vendemos tus datos | Negocio | Compromiso escrito | PENDIENTE P10 |
| Sin publicidad | Producto + proveedores | Sin componentes publicitarios | RECOMENDACIÓN |
| No entrenamos IA con tus datos | Proveedores | Verificación | PENDIENTE P11 |
| Métricas sin montos, descripciones ni nombres | Producto + proveedor | PR-04 | RECOMENDACIÓN |
| Cifrado, ubicación, acceso de soporte | Infraestructura | Verificación | PENDIENTE P11 |
| Cumplimiento legal (Ley 25.326), incluido el nombre del ex miembro | Legal | Consulta profesional | PENDIENTE P12 |

**Prohibidas:** "No usamos tus datos para nada" · "Nadie puede ver tus datos" · "Cifrado de extremo a extremo" · "Seguridad bancaria" · "100% anónimo".

**Mensaje del onboarding (O1 paso 3)**

> **Tus números son tuyos**
>
> - La app no se conecta a tus cuentas ni sabe cuánta plata tenés: trabaja con lo que vos registrás.
> - Tus finanzas personales las ves solo vos. En un espacio compartido, la otra persona ve solo lo que se carga ahí.
> - No te pedimos claves del banco ni números de tarjeta.
> - Podés borrar todo cuando quieras.
>
> [Entendido] · Cómo cuidamos tus datos

**Perfil → Privacidad y datos:** preguntas y respuestas breves (qué guardamos, qué no sabemos, qué ve la otra persona, qué no ve nunca, qué no hacemos, con qué empresas trabajamos —pendiente—, qué pasa si salgo de un espacio o borro mi cuenta, cómo se protege —solo lo verificado—) y acciones: Eliminar mi cuenta / usuario (Must) · Exportar mis datos (Should).

---

## 35. Métricas de validación del MVP

Piloto de 1–2 meses con personas cercanas, leído persona por persona. **Qué se mide:** si la visualización de egresos y compromisos resulta útil y reemplaza el método anterior. **Qué no se mide como éxito:** que la app "prediga" cuánta plata tiene el usuario; no es su objetivo.

**Antes de empezar:** anotar cómo se organiza hoy cada persona o pareja. **Eventos** (solo acciones, sin montos ni textos): aperturas de cada pantalla, toques en "¿de dónde sale?", apertura de Próximos pagos y de cada mes de Futuro, altas/ediciones/eliminaciones por tipo, vista previa de cuotas sin guardar, invitaciones generadas y aceptadas, activaciones de cuenta personal, pagos entre miembros, salidas.

### Pilar personal

| Qué observar | Positiva | Neutra | Negativa |
| --- | --- | --- | --- |
| Completa la activación con al menos una cuota o dos fijos | Casi todos | La mitad | Pocos |
| Consulta Futuro | 1+ vez por semana | Una vez al mes | Solo en el onboarding |
| Consulta Próximos pagos | Antes de los vencimientos | A veces | Nunca |
| Registra cuotas nuevas al comprar | Siempre | A veces | Nunca después del onboarding |
| Abre la vista previa sin guardar | Ocurre (la usa antes de comprar) | — | Nunca |
| Sigue activo en semanas 4 y 8 | Sí | Solo cerca de los vencimientos | Abandono en semanas 1–2 |
| Confía en los próximos pagos (resumen estimado vs. real) | Parecidos o con diferencias que entiende | Diferencias que no entiende pero sigue usando | Deja de mirarlos por desconfianza |

### Pilar compartido

| Qué observar | Positiva | Neutra | Negativa |
| --- | --- | --- | --- |
| Espacios que pasan a Modo 2 | La mitad o más | Algunos | Casi ninguno |
| En Modo 2, los dos registran | Semanalmente | Uno carga, el otro mira | El invitado nunca carga |
| Consultan saldo y mes | Semanal | Mensual | Nunca |
| Registran pagos para saldar | Al menos uno | Se compensan sin pagos | El saldo crece sin mirarlo |
| Entienden quién debe a quién | Lo explican sin abrir la app | Con la app abierta | No lo entienden |
| Reemplazo del método anterior | La pizarra o las notas se abandonaron | Uso en paralelo | Volvieron al método anterior |

### Señales cualitativas (semanas 2 y 6)

- "¿Cuánto tenés comprometido el mes que viene?" (puede explicarlo = señal fuerte).
- "¿Qué pagos tenés esta semana o la próxima?"
- "¿Miraste la app antes de comprar algo?"
- A la otra persona: "¿Quién viene poniendo más este mes?"
- "¿Seguís usando [método anterior]? ¿Por qué?"
- "¿Alguna vez pensaste que 'Sin asignar' era plata que tenías?" (detecta si el lenguaje funciona).
- "¿Hay algo que no te animaste a cargar?"

---

## 36. Criterios de aceptación

Formato: **dado** un estado, **cuando** ocurre algo, **entonces** el resultado.

### Lenguaje y radar

| # | Criterio |
| --- | --- |
| CA-00 | En ninguna pantalla aparecen "disponible", "te queda", "dinero libre", "libre", "saldo" referido a dinero personal, "tenés $X", "podés gastar $X" ni cifras por día |
| CA-01 | Dados ingresos registrados $1.200.000, gastado $320.000 y comprometido $480.000, entonces Inicio muestra Sin asignar $400.000 con "todavía sin destino, según lo que registraste" |
| CA-02 | Dado comprometido mayor que ingresos registrados, entonces se muestra "Tus gastos y compromisos superan tus ingresos registrados por $X" |
| CA-03 | Dado un mes sin ingresos registrados, entonces no se calcula Sin asignar y se invita a registrar el ingreso |
| CA-04 | "¿De dónde sale?" en Sin asignar explica la fórmula y aclara que no es plata en cuentas |

### Cuentas e invitado

| # | Criterio |
| --- | --- |
| CA-05 | Al aceptar una invitación sin ser usuario, la persona entra al espacio sin cuenta personal activa |
| CA-06 | Un usuario sin cuenta personal no ve Inicio, Movimientos ni Futuro, ni pestañas bloqueadas, y ve "Tu plata personal" |
| CA-07 | Un usuario sin cuenta personal que elige "Personal" en Agregar ve la hoja del Caso 18 y no puede guardar un gasto personal |
| CA-08 | Al activar la cuenta personal se conservan identidad, nombre, autoría y lugar; su Futuro incluye su parte de los compromisos del espacio; el otro miembro no recibe ninguna señal |
| CA-09 | En la activación, los fijos que ya están en sus espacios aparecen como "Ya en [espacio]" |

### Privacidad

| # | Criterio |
| --- | --- |
| CA-10 | Agregar abre con "Solo yo" y "Solo vos lo ves" |
| CA-11 | Un gasto personal no aparece en ninguna pantalla ni total del otro miembro |
| CA-12 | En un gasto compartido con tarjeta, el otro ve "pagó [nombre]" y nunca la tarjeta |
| CA-13 | Ningún miembro ve email, ingresos, tarjetas, otros espacios, cifras del radar ni si el otro tiene cuenta personal |
| CA-14 | Guardar en un espacio muestra "Agregado a [espacio] · [nombre] lo ve · Deshacer"; Deshacer lo elimina |

### Espacios, invitaciones y saldo

| # | Criterio |
| --- | --- |
| CA-20 | En Modo 1, "pagó Martina" calcula el saldo igual que en Modo 2 |
| CA-21 | Invitación de un solo uso, 7 días; la nueva anula la anterior |
| CA-22 | Un enlace vencido, usado o anulado muestra su mensaje y no da acceso |
| CA-23 | Con los gastos del Caso 7: Renzo ve "Martina te debe $10.000" y Martina "Le debés $10.000 a Renzo" |
| CA-24 | Personalizado: super $100.000 (pagó Renzo), Renzo $60.000 y Martina $40.000: Martina debe $40.000; el radar de Renzo suma $60.000 y el de Martina $40.000 (Caso E de 29.1) |
| CA-25 | Renzo puso $700.000 y Martina $100.000 (50/50): Martina debe $300.000; nunca se muestra "$600.000 más" |
| CA-26 | Un pago entre miembros cambia el saldo y no cambia "puso" ni el radar de nadie |
| CA-27 | Una edición del otro miembro se ve al abrir o refrescar, con "Editó [nombre]" |
| CA-28 | Eliminar en un espacio confirma con el nuevo saldo y "el otro también deja de verlo" |
| CA-29 | Un gasto compartido puntual pagado con tarjeta cambia el saldo en la fecha de compra (S-02) |

### Cuotas, tarjetas, próximos pagos y Futuro

| # | Criterio |
| --- | --- |
| CA-30 | Tarjeta cierre 25, vence 5: compra del 20/10 → noviembre; del 27/10 → diciembre |
| CA-31 | Heladera del Caso 8: radar de Renzo $50.000/mes; Próximos pagos de la Visa con $100.000/mes y "incluye $50.000 de Martina"; espacio $100.000/mes |
| CA-32 | Una compra compartida en cuotas no cambia el saldo el día de la compra; cada cuota lo cambia al llegar su fecha de impacto (Caso D de 29.1) |
| CA-33 | Gasto compartido $100.000 al contado pagado por Martina (50/50): Gastado de Renzo +$50.000; nada en sus Próximos pagos |
| CA-34 | Cuotas existentes "3 de 6, $30.000": se generan 3 cuotas desde el mes siguiente al último resumen |
| CA-35 | El resumen estimado de una tarjeta suma el total pagado de lo registrado con ella y se rotula "estimado según lo que registraste" |
| CA-36 | Próximos pagos no incluye lo que paga el otro miembro ni las deudas del espacio |
| CA-37 | Un pago próximo cuya fecha pasó se muestra "Ya pasó", nunca "Pagado" |
| CA-38 | Futuro muestra 6 meses con comprometido, ingreso previsto y sin asignar, y la línea de cuotas que terminan |
| CA-39 | La vista previa de cuotas muestra cambios en comprometido y sin asignar, nunca "te alcanza" |

### Salida y eliminación

| # | Criterio |
| --- | --- |
| CA-40 | Al salir, pierde el acceso; el otro conserva el historial y ve "ex miembro" |
| CA-41 | Al salir, siguen las cuotas generadas y se detienen los fijos compartidos |
| CA-42 | Quien queda recibe la pregunta por cada fijo detenido |
| CA-43 | Eliminar la cuenta borra lo personal, sale de los espacios y deja "ex miembro" |
| CA-44 | Un espacio sin miembros con acceso se elimina |

### Declaraciones, reparto, identidad y próximos pagos

| # | Criterio |
| --- | --- |
| CA-45 | Ningún pago, cuota ni fijo se muestra como "Pagado"; con fecha pasada se muestra "Ya pasó" |
| CA-46 | Martina debe $40.000 y se registra un pago de $15.000: debe $25.000; no cambian "puso", Gastado, Comprometido ni Ingresos registrados de nadie (Caso F) |
| CA-47 | Un usuario sin cuenta personal no puede crear espacios; se le ofrece activar su cuenta personal |
| CA-48 | Dos usuarios que comparten un espacio activo no pueden compartir otro: la invitación muestra "Ya compartís [espacio] con [nombre]" |
| CA-49 | Registro e inicio de sesión por email con enlace mágico, sin contraseña |
| CA-50 | Martina no ve en sus Próximos pagos el resumen de la Visa de Renzo, aunque incluya su parte; sí ve su deuda en el espacio |
| CA-51 | En una compra compartida en cuotas con reparto personalizado, cada cuota se divide en la misma proporción del total |
| CA-52 | "¿De dónde sale?" en Sin asignar dice "ingresos registrados que todavía no tienen un gasto o compromiso registrado asociado" |
| CA-53 | Una compra con tarjeta en 1 pago no suma a Gastado del mes de compra: suma a Comprometido del mes de vencimiento (Caso B) |
| CA-54 | El formulario de reparto ofrece 50/50 y Personalizado por monto; no pide porcentajes |

---

## 37. Decisiones cerradas

Todas son [DECISIÓN] del usuario. Ninguna recomendación de Claude figura aquí sin haber sido aprobada.

### Definición del producto

| # | Decisión | Dónde |
| --- | --- | --- |
| R0 | La app no conoce ni pretende conocer el dinero real del usuario; organiza y visualiza ingresos, gastos y compromisos registrados. Sin saldos bancarios, conciliación, cuentas bancarias, open banking ni contabilidad | 1, 6, 7.1, G-04, G-05 |
| R1 | El número principal es el radar: Ingresos registrados, Gastado, Comprometido, Asignado y Sin asignar | 15, N-04 |
| R2 | Futuro es parte central del producto | 23 |
| D1 | Modelo del radar: Asignado = Gastado + Comprometido; Sin asignar = Ingresos registrados − Asignado; en meses futuros, Sin asignar = Ingreso previsto − Comprometido. Definición obligatoria: "Sin asignar = ingresos registrados que todavía no tienen un gasto o compromiso registrado asociado." "Disponible", "Te queda", "Tenés $X disponibles" y "Dinero libre" nunca son sinónimos | 7.2, 15, 23, N-04, 29.1 (Caso A) |
| P20 | La cifra se llama "Sin asignar" (no "No comprometido"), con el texto de ayuda "Todavía sin destino, según lo que registraste." | 15, 33 |
| G-06 | Declarar, no verificar: "La app registra declaraciones del usuario sobre gastos, compromisos y pagos; no verifica movimientos de dinero reales." "Pagó Renzo" significa "quien pagó, según lo declarado" | 7.1, 29 |
| — | Estado "Ya pasó" en lugar de "Pagado" para cuotas, fijos y resúmenes con fecha pasada | 20, 21, 23, CA-45 |

### Tarjetas

| # | Decisión | Dónde |
| --- | --- | --- |
| — | La tarjeta es un medio para organizar y proyectar compromisos: nombre, cierre, vencimiento, compras, cuotas, compras en 1 pago y resumen estimado | 22, T |
| — | No se modelan saldo bancario, límite, crédito disponible, deuda bancaria real, pago mínimo, intereses, financiación ni conciliación | 22, T-07 |
| — | Todo resumen se rotula "Estimado según lo que registraste" | 22, 23.2, N-10 |
| T-05 | Modo aproximado: si el usuario no conoce cierre o vencimiento, la app aproxima (solo cierre → vence el mes siguiente al cierre; ninguno → lo comprado en el mes M se paga en M+1) | 22, T-05 |
| — | Cuotas existentes ("voy por la k de n") obligatorias en el MVP | 20, Q |

### Modelo de cuentas y espacios

| # | Decisión | Dónde |
| --- | --- | --- |
| K0 | Modelo híbrido: usuario, cuenta personal opcional y privada, espacios de exactamente dos miembros; el segundo miembro puede existir sin acceso | 8–11 |
| K1 | Varios espacios por usuario, sin protagonismo | 9 |
| K2 | "Solo yo" es el destino por defecto; la audiencia siempre es visible | 12, 17 |
| K3 | Ambos miembros crean, editan y eliminan; autoría visible | 9, X-02 |
| K4 | Al salir se conserva el historial y la identidad como ex miembro | 27 |
| K5 | Al salir siguen las cuotas generadas; se detienen los fijos futuros | 27 |
| K6 | Invitación de un solo uso, 7 días, regenerable | 26 |
| K7 | Se muestra el nombre visible, nunca el email | 9 |
| K8 | Quien acepta tarde ve el historial del espacio y su parte | 11, 26 |
| K9 | A las finanzas personales llega solo la parte de cada uno; quién pagó ≠ a quién le corresponde | 7.3, 18 |
| K10 | Lo que un miembro carga, edita o elimina en el espacio cuenta enseguida y es igual para los dos (un solo saldo). El otro lo ve marcado "Lo cargó Martina · para revisar" (o "Lo eliminó Martina · para revisar") hasta que lo mira y toca "Está bien"; una edición posterior del otro lo vuelve a marcar. Revisar no es aprobar: es visibilidad, no un permiso, y complementa K3. Se descartó "solo cuenta si lo aceptás": esconder un gasto infla Sin asignar (casi un "te queda", G-05) y parte el saldo en dos verdades. Decidido el 14/10/2026 | 9, 12, 24, X-02 |
| P1 | Registro e inicio de sesión con email y enlace mágico, sin contraseña. Sin definir proveedor | 10, 13, CA-49 |
| P4 | No se permiten dos espacios entre las mismas dos personas en el MVP; se controla al aceptar la invitación | 9, 26, I-06, Caso 17, CA-48 |
| P5 | Un usuario invitado sin cuenta personal usa el espacio al que fue invitado (ver, historial, registrar, editar y eliminar gastos compartidos, indicar quién pagó, registrar pagos, cambiar el reparto según las reglas, salir, activar su cuenta) pero **no puede crear espacios**, ingresos, gastos personales ni tarjetas, ni acceder al radar o a sus finanzas personales, hasta activar su cuenta personal | 8, 10, 16, A-06, Caso 19, CA-47 |
| — | Secciones del Estado A: Inicio, Movimientos, Futuro, Compartidos. Estado B sin barra de pestañas, con la tarjeta "Tu plata personal" | 14, 16 |

### Gastos compartidos

| # | Decisión | Dónde |
| --- | --- | --- |
| — | Modelo híbrido de visibilidad: en su radar cada persona ve solo su parte; el espacio muestra total, quién pagó, la parte de cada uno y el saldo | 7.3, 18 |
| P2 | Cuotas compartidas: la deuda se genera cuota por cuota, en la fecha de impacto de cada cuota; nunca la deuda total el día de la compra | 20, Q-08, S-02, 29.1 (Caso D), CA-32 |
| P3 | Reparto 50/50 o Personalizado por monto (por ejemplo, Renzo $60.000 / Martina $40.000). Sin porcentajes en la interfaz; la app puede calcularlos internamente. Sin reglas complejas de reparto | 17, 18, C-03, C-04, 29.1 (Caso E), CA-24, CA-54 |
| P19 | Un gasto compartido puntual cambia el saldo en la fecha de compra, aunque se haya pagado con tarjeta | 18, S-02, 29.1 (Caso G), CA-29 |
| — | Un pago entre miembros solo modifica el saldo compartido; no cambia "puso", Gastado, Comprometido ni Ingresos registrados | 25, P-04, 29.1 (Caso F), CA-46 |
| — | Próximos pagos responde solo "¿Qué pagos que yo realizo se vienen?"; quien no pagó no ve allí la compra, ve su deuda en el espacio | 23.2, N-09, CA-50 |

### Alcance

| # | Decisión | Dónde |
| --- | --- | --- |
| — | Dos pilares: personal (ingresos, gastos, cuotas, tarjetas, recurrentes, radar, Futuro, Próximos pagos) y compartido (espacio de dos, gastos compartidos, quién pagó, 50/50, personalizado por monto, cuotas compartidas, recurrentes compartidos, saldo, pagos entre personas, invitación) | 1–6 |
| — | Fuera del MVP: Open Banking, bancos, Mercado Pago, sincronización con cuentas, OCR, WhatsApp, IA, inversiones, préstamos, scoring, contabilidad, grupos de más de dos, funciones avanzadas tipo Splitwise, chat y gamificación | 6 |
| — | Privacidad como parte del producto, sin promesas engañosas | 12, 34 |

---

## 38. Decisiones pendientes

Clasificadas según cuándo deben resolverse. Solo figuran pendientes reales; lo que ya está decidido no se reabre.

### Bloqueantes para empezar a desarrollar

**Ninguna.** Con las decisiones de la sección 37, la lógica de cálculo, la identidad, el espacio, el pilar personal y el pilar compartido pueden empezar a construirse.

### Pueden resolverse durante la implementación

| # | Pendiente | Por qué importa | Cuándo, a más tardar | [RECOMENDACIÓN] |
| --- | --- | --- | --- | --- |
| P6 | Qué ve un ex miembro después de salir | Puede seguir debiendo sin verlo | Antes de construir la salida | Resumen fijo del saldo al momento de salir |
| P7 | Volver a invitar a un ex miembro | Reconciliaciones, errores | Antes de construir la salida | Sí, recupera su lugar e historial |
| P8 | El Futuro de quien sale mantiene sus cuotas compartidas ya generadas | Coherencia con K5 | Antes de construir la salida | Sí |
| P9 | Plazo de borrado en copias de seguridad | La promesa de borrado debe ser cierta | Antes de publicar el texto de privacidad | Definirlo con la infraestructura elegida y comunicarlo tal cual |
| P10 | Compromiso escrito "No vendemos tus datos" | Confianza | Antes de publicar el texto de privacidad | Asumirlo por escrito |
| P11 | Proveedores: cifrado, ubicación de datos, acceso de soporte, uso para entrenar IA | Ninguna promesa de privacidad se publica sin verificarla | Al elegir proveedores | Verificar antes de comunicar |
| P13 | Categorías fijas o editables | Simplicidad | Al construir el formulario de gasto | Fijas |
| P16 | Recomendaciones de detalle no aprobadas explícitamente: vista previa de cuotas como Must, Movimientos como pestaña, línea "cuotas que terminan", A-04 sin notificación, pregunta de SA-04, nombre por defecto del espacio, X-07 | Alcance fino | Al construir cada pantalla | Implementarlas como están descritas; el usuario puede vetarlas sin afectar las reglas |
| P18 | Horizonte de Próximos pagos en Inicio | Utilidad vs. ruido | Al construir Inicio | 30 días, primeros 3 |
| P21 | Detalles de K10 no aprobados explícitamente: (a) no se marca la eliminación de algo que quien lo eliminó había cargado hacía menos de 10 minutos (Deshacer, un error corregido al toque); (b) lo eliminado se pide revisar durante 60 días; (c) lo eliminado se muestra en el espacio y cuenta en "N cosas para revisar", pero no en Movimientos, que lista hechos registrados (16); (d) en Inicio, solo "N cosas para revisar" debajo del nombre del espacio | Alcance fino | Implementado el 14/10/2026 | Dejarlos así; el usuario puede vetarlos sin afectar las reglas |
| P22 | Cómo se construyeron los Should y P6 (14/10/2026), no aprobados explícitamente: (a) **duplicado**: mismo monto y fecha a 3 días o menos, aviso antes de guardar con [No guardar] · [Es otro, guardar]; (b) **compartir resumen**: texto en tercera persona con los nombres ("Martina le debe $X a Renzo"), saldo, mes y lo cargado, desde el menú del espacio; (c) **CSV**: una tabla con columna Tipo, separada por ";" con BOM para Excel en español, con el medio de pago propio y nunca el del otro; también ofrecido antes de eliminar la cuenta; (d) **actividad reciente**: los últimos 20 cambios en una hoja desde el menú del espacio, derivados de la autoría y del rastro de lo eliminado; (e) **totales por categoría**: lista en el mes del espacio, sin gráficos, solo con dos categorías o más; (f) **categoría sugerida**: "¿Es Supermercado? · Usar" bajo la descripción, primero por lo que el usuario ya cargó y después por palabras conocidas; nunca cambia la categoría sola; (g) **P6**: al salir, el servidor guarda para quien sale una foto privada de los hechos del espacio; con ella su radar y su Futuro siguen (SA-05, P8) y ve "Al salir, Renzo te debía $X"; (h) **U1**: la bienvenida dice "lo que pagan entre los dos" en vez de "para la casa" | Alcance fino | Implementado el 14/10/2026 | Dejarlos así; el usuario puede vetarlos sin afectar las reglas |
| P23 | **Decidido por el usuario el 15/10/2026.** En el Estado A, la pestaña Compartidos abre siempre en la lista de espacios, aunque haya uno solo (antes: "con uno solo, entra directo"). Una pestaña que a veces es lista y a veces es un espacio no deja armar un mapa mental, y escondía "Crear otro espacio". El Estado B no cambia: el invitado entra directo al espacio al que lo invitaron (U1) | Navegación | Decidido el 15/10/2026 | — |
| P24 | **Decidido por el usuario el 16/10/2026.** Reemplaza "reasignar o archivar" de §22. Una tarjeta con pagos por venir (cuotas pendientes, fijos activos o compras cuyo resumen todavía no venció) **no se elimina**: una hoja dice qué la retiene y hasta cuándo ("Cuando terminen la vas a poder eliminar."), con [Entendido]. Sin pagos por venir se elimina con confirmación: "Sus compras pasadas quedan en Movimientos, sin tarjeta. Tus meses pasados no cambian." No existe "Archivar". "Pasar a otra tarjeta" queda fuera del MVP | Tarjetas | Decidido el 16/10/2026 | — |
| P25 | **Decidido por el usuario el 16/10/2026.** En Inicio, el radar lleva una sola ayuda: la de Sin asignar (CA-01, "todavía sin destino, según lo que registraste"). Gastado y Comprometido se explican al tocarlos ("¿de dónde sale?", M18), no con una ayuda por fila como en el boceto de §15 | Inicio | Decidido el 16/10/2026 | — |
| P26 | **Decidido por el usuario el 20/10/2026.** Los espacios que dejaste ya no viven en Perfil ni se acumulan como tarjetas en la lista: en Compartidos hay UNA puerta al final, "Espacios que dejaste" (con la cuenta: "1 espacio" / "2 espacios"; no existe si no dejaste ninguno), que abre su propia pantalla (N3) con, por espacio, el nombre, "Saliste el …", el resumen fijo del saldo al salir (P6) y "Quitar de tu historial". Quitar se puede **siempre**, también con pagos por venir (antes se bloqueaba hasta que terminaran las cuotas): la confirmación avisa lo que desaparece de Futuro ("Tu parte de lo que queda por pagar de X (hasta noviembre) deja de verse en tu Futuro") y de los meses pasados del radar, que es lo irreversible ("No se puede deshacer."). Se dice "pagos", no "cuotas": también cubre una compra en 1 pago que todavía no vence | Espacios compartidos | Decidido el 20/10/2026 | — |
| P27 | **Decidido por el usuario el 20/10/2026.** Eliminar algo en un espacio compartido **no pide aprobación del otro**: K3 y X-02 se mantienen. Para que el otro no se entere por casualidad, la pantalla del espacio muestra, debajo del N1 y sin ser una cuarta puerta, un aviso discreto cuando el otro eliminó algo en los últimos 7 días ("Martina eliminó Supermercado · $100.000 · ayer", más "(y N más)" si fueron varias), que abre "Actividad reciente". No guarda quién lo vio (haría falta base): la ventana de 7 días es la regla. Sin notificaciones (MVP, SY-01) | Espacios compartidos | Decidido el 20/10/2026 | — |

### Pueden resolverse durante el piloto

| # | Pendiente | Por qué importa | [RECOMENDACIÓN] |
| --- | --- | --- | --- |
| P12 | Validación legal (Ley 25.326; nombre del ex miembro en un espacio ajeno) | Necesaria antes de salir del círculo cercano, no antes del piloto | Consulta profesional |
| P14 | "Este ingreso es para el mes siguiente" (sueldos que se cobran a fin de mes) | Puede distorsionar el radar de quien cobra el 30 | Observar en el piloto |
| P15 | Mostrar las cuotas como proporción de los ingresos registrados | "¿Cuánto me ocupan?" | Probar en Futuro si el piloto lo pide |
| P17 | Nombre del producto | Marca | — |

---

## 39. Riesgos

| Tipo | Riesgo | Mitigación |
| --- | --- | --- |
| Producto | "Sin asignar" se lee como plata disponible | Definición fija (D1), texto de ayuda (P20), "¿de dónde sale?", pregunta cualitativa de la sección 35 |
| Producto | Sin un número de "cuánto puedo gastar", la app parece menos útil al principio | El valor está en Futuro y Próximos pagos [HIPÓTESIS] a validar |
| Producto | Todo depende de lo registrado | El radar funciona con datos que se cargan una vez; lenguaje "según lo que registraste" |
| Producto | Invitaciones no aceptadas | El espacio funciona en Modo 1; métrica principal del pilar |
| Producto | La app como árbitro de la pareja | Lenguaje neutral, autoría visible, declaraciones (G-06) |
| Producto | El resumen estimado difiere del resumen real del banco | Rótulo "Estimado según lo que registraste"; la app no promete conciliar |
| UX | Dos lentes (tu parte vs. lo que vas a pagar) confunden | Nunca en la misma cifra; "incluye $X de Martina" siempre visible |
| UX | La diferencia miembro / cuenta personal no se entiende | Estado B sin pestañas personales; tarjeta "Tu plata personal"; mensaje claro al intentar crear un espacio (P5) |
| UX | "Pagó" o "Ya pasó" se leen como verificación de un movimiento real | Lenguaje de declaración (G-06); "Ya pasó" en lugar de "Pagado" |
| UX | Movimientos convierte la app en otro tracker | Inicio primero; efecto visible en cada movimiento |
| Privacidad | Gasto personal cargado en un espacio | "Solo yo" por defecto, Deshacer |
| Privacidad | Enlace reenviado | Un solo uso, vencimiento, quitar acceso |
| Privacidad | Nombre de ex miembro en espacio ajeno | P12 |
| Complejidad | El pilar compartido es lo más caro del MVP | Espacios de dos; sin notificaciones; último cambio gana |
| Validación | Unidades de prueba de dos personas | Empezar por el caso de referencia y 3–5 parejas |

---

## 40. Próximo paso para implementación

1. **Entregar esta V1.1.2 a Claude Code** como fuente de verdad funcional, con la instrucción explícita de **no tomar decisiones de producto**: ante cualquier ambigüedad, preguntar.
2. **Primer pedido a Claude Code: análisis técnico de implementación, sin escribir código todavía.** A partir de las secciones 7, 29, 29.1 y 30, que proponga cómo implementarlo y señale lo más difícil de garantizar (PR-01 a PR-03, sincronización entre dos miembros, cálculo de resúmenes estimados, generación cuota por cuota, control de P4 al aceptar). La elección de tecnología es parte de ese análisis, no de esta especificación.
3. **Usar como pruebas** la sección 29.1 (Casos A a G), los casos de uso de la sección 31 y los criterios de la sección 36.
4. **Resolver P6–P8 antes de construir la salida** y P9–P11 antes de publicar cualquier texto de privacidad.
5. **Orden sugerido [RECOMENDACIÓN]:** lógica de cálculo (tarjetas, cuotas, radar, Próximos pagos, saldo) → identidad y espacio con miembro sin acceso → pilar personal → compartido en Modo 1 → invitación y Modo 2 → salida y eliminación.

---

## Auditoría del MVP frente a la hipótesis

**Hipótesis [HIPÓTESIS]:** "Las personas pueden entender y organizar mejor sus gastos futuros y compromisos usando una herramienta simple que automatiza las cuentas que normalmente tendrían que construir en Excel/Sheets o llevar en una pizarra."

| # | Qué hay que validar | Qué del MVP lo cubre | Cómo se observa en el piloto (sección 35) | ¿Cubierto? |
| --- | --- | --- | --- | --- |
| 1 | Registrar un gasto es fácil | Formulario único (17) con "Solo yo" por defecto, medio de pago, cuotas y destino en la misma pantalla | Registra cuotas nuevas al comprar; sigue activo en semanas 4 y 8; "¿Hay algo que no te animaste a cargar?" | Sí |
| 2 | Las cuotas evitan crear cuotas a mano | Una compra en n cuotas genera las n cuotas (20, Q); cuotas existentes "k de n" (Q); vista previa | Activación con al menos una cuota; uso de la vista previa | Sí |
| 3 | Futuro muestra los próximos pagos | Futuro por mes (23), Próximos pagos (23.2), resumen estimado por tarjeta (22) | Consulta Futuro y Próximos pagos; "¿Qué pagos tenés esta semana o la próxima?" | Sí |
| 4 | El radar ayuda a entender qué parte del ingreso tiene destino | Radar con Gastado, Comprometido, Asignado, Sin asignar (15, D1) | "¿Cuánto tenés comprometido el mes que viene?"; "¿Pensaste que 'Sin asignar' era plata que tenías?" | Sí, con el riesgo de lectura de la sección 39 |
| 5 | Los gastos compartidos eliminan la matemática manual | Espacio con quién pagó, 50/50 o personalizado, cuotas y fijos compartidos, saldo, pagos (18, 24, 25) | "Entienden quién debe a quién"; reemplazo de la pizarra o las notas | Sí |
| 6 | La app funciona sin conocer saldos bancarios | R0, G-04 a G-06; radar sobre lo registrado; tarjetas sin saldo ni límite | Confía en los próximos pagos aunque difieran del banco; no pide conectar cuentas | Sí, por diseño |

**Lectura crítica.** Los seis puntos tienen una función que los cubre y una señal observable; ninguno requiere funciones fuera del alcance. Los dos más frágiles son el 4 (que "Sin asignar" se entienda sin leerse como plata) y el 5 en Modo 2 (que la otra persona acepte la invitación y registre). Si el piloto los refuta, lo que cambia es el lenguaje o el onboarding, no el modelo de datos.

---

## Estado de la especificación

**V1.1.2 es la fuente de verdad funcional para el MVP.**

| | Estado |
| --- | --- |
| Versión | V1.1.2. Consolida y reemplaza a la V1.1.1 |
| Decisiones cerradas | R0–R2, D1, G-06, K0–K9, P1–P5, P19, P20, alcance de tarjetas, modo aproximado y alcance del MVP (sección 37) |
| Pendientes bloqueantes para empezar a desarrollar | Ninguno |
| Pendientes para resolver durante la implementación | P6, P7, P8, P9, P10, P11, P13, P16, P18 |
| Pendientes para resolver durante el piloto | P12, P14, P15, P17 |
| Riesgos conocidos | 15 (sección 39); el principal sigue siendo que "Sin asignar" se lea como plata disponible |
| Qué recibe Claude Code | Este documento y el pedido del paso 2 de la sección 40: análisis técnico de implementación, sin código |
| Qué no recibe todavía | Diseño visual de alta fidelidad, textos legales, elección de proveedores |

### Cambios respecto de la V1.1.1

| # | Cambio | Secciones |
| --- | --- | --- |
| 1 | Cerradas D1, P1–P5, P19, P20; ya no figuran como pendientes | 37, 38 |
| 2 | Definición obligatoria de Sin asignar; eliminado "Te quedan $X sin asignar" | 7.2, 15, 33, CA-52 |
| 3 | Nuevo principio y regla "Declarar, no verificar" (G-06); "Pagado" reemplazado por "Ya pasó" en todo el documento | 5, 7.1, 7.2, 20, 21, 29, CA-45 |
| 4 | Reparto: 50/50 o Personalizado por monto; se eliminan el reparto habitual con porcentajes y "Todo mío / Todo de [otro]" | 9, 17, 18, C-03, C-04, CA-24, CA-51, CA-54 |
| 5 | Cuotas compartidas cuota por cuota, también con reparto personalizado | 20, Q-08, Q-09, S-02, CA-32 |
| 6 | Alcance de tarjetas: sin saldo, límite, crédito, deuda real, mínimo, intereses, financiación ni conciliación; "Saldo pendiente" → "Resumen pendiente declarado" | 7.2, 22, T-07 |
| 7 | Email y enlace mágico como único método de acceso | 10, 13, CA-49 |
| 8 | Un invitado sin cuenta personal no puede crear espacios (cambio respecto de la recomendación de la V1.1.1); todo registro propio activa la cuenta personal | 8, 10, 13, 16, A-06, Caso 19, CA-47 |
| 9 | No hay dos espacios entre las mismas personas; control al aceptar la invitación | 9, 26, I-06, I-07, Caso 17, CA-48 |
| 10 | Saldo en fecha de compra para gastos puntuales con tarjeta, ahora como decisión | S-02, Caso G |
| 11 | Nueva sección 29.1 de verificación matemática (Casos A a G) | 29.1 |
| 12 | "Se liberan $X" → "Tu comprometido baja $X" | 23, 33 |
| 13 | Pendientes clasificados por momento de resolución; ninguno bloquea el desarrollo | 38 |
| 14 | Nueva auditoría del MVP frente a la hipótesis | Auditoría |

### Criterios de aceptación afectados

| Criterio | Cambio |
| --- | --- |
| CA-00 | Ampliado: lista completa de términos prohibidos |
| CA-24 | Reescrito: reparto personalizado por monto (Martina debe $40.000) |
| CA-32 | Reescrito: cuota por cuota, sin cambio el día de la compra |
| CA-45 a CA-54 | Nuevos: "Ya pasó", pago parcial, invitado sin espacios propios, P4, enlace mágico, Próximos pagos de quien no pagó, proporción en cuotas personalizadas, definición de Sin asignar, tarjeta en 1 pago, reparto sin porcentajes |
| CA-05 a CA-09 | Ajustes de redacción por la terminología de esta versión |

### Definición de producto en una frase

> **Una app donde anotás tus ingresos, gastos, cuotas y gastos fijos —y los que compartís con otra persona— y que te muestra qué parte de tus ingresos ya tiene destino, qué pagos se vienen y quién le debe a quién, sin que tengas que armar ninguna planilla.**

Lo que la frase deja afuera a propósito: la app **no** sabe ni dice cuánta plata tenés en tus cuentas, ni verifica los pagos que se registran.
