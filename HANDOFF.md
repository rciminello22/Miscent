# Handoff · Radar del sueldo comprometido

Contexto para retomar el proyecto en una sesión nueva.
Última actualización: 19 de octubre de 2026 · rediseño de jerarquía visual aplicado · migraciones hasta la 0020 aplicadas · todo commiteado en `master`, **sin push**.

---

## 1. Qué es esto

App móvil (iOS + Android) de finanzas **personales y compartidas**.

> Una app donde anotás tus ingresos, gastos, cuotas y gastos fijos —y los que
> compartís con otra persona— y que te muestra qué parte de tus ingresos ya
> tiene destino, qué pagos se vienen y quién le debe a quién, sin que tengas
> que armar ninguna planilla.

**El principio que atraviesa todo: la app NO conoce el dinero real del
usuario.** No es un banco ni una billetera. Trabaja solo con declaraciones que
el usuario registra, y no verifica ninguna.

### La fuente de verdad

```
C:\Users\cimin\Desktop\Especificación funcional V1.1.2 — Radar del sueldo comprometido.md
```

**1788 líneas. Leela antes de tocar reglas de negocio.** Secciones mandantes:

| Sección | Qué contiene |
|---|---|
| **7** | Modelo conceptual y glosario |
| **29** | Reglas de negocio (G, A, N, E, I, T, Q, F, C, S, P, X, SA, D, PR, SY) |
| **29.1** | Verificación matemática · Casos A–G, que son **pruebas, no ejemplos** |
| 31 | Casos de uso, usados como tests |
| 36 | Criterios de aceptación CA-00 a CA-54 |

Si otra sección las contradice, mandan 7, 29 y 29.1.

Las versiones anteriores (V1.0, V1.1, V1.1.1, "Decisión de producto — Modelo
de cuentas") están en el escritorio pero **están superadas**. No usarlas.

### Cómo trabaja Renzo

- Prefiere respuestas **concisas**. No describir lo que se va a hacer antes de
  hacerlo.
- Ante una ambigüedad de producto: **preguntar**, no decidir (§40.1). Presentar
  opciones con su contra y una recomendación.
- Commits: conventional, en español, **sin atribución de IA**, uno por tema.
- Prueba en un **iPhone con Expo Go** (`npm run start:tunnel`). Encuentra los
  bugs usando la app: tomarlos en serio y buscar la causa de fondo, no el
  síntoma.
- **Nada se aplica en la base remota sin su OK explícito** (`db push`). El
  token de la CLI vence en minutos: pedirle `npx supabase login` justo antes.
- Le gusta debatir UX: sus "detalles para debatir" suelen esconder bugs reales.
- **Metodología de wireframes (desde el 15/10, obligatoria):** antes de
  rediseñar o crear una pantalla, y para **toda pregunta de UI**, se dibuja un
  wireframe HTML con las opciones lado a lado (con "Gana / Pierde" y una
  recomendación). Se publica como artifact y se implementa recién cuando lo
  elige mirándolo: "me pierdo si solo leo". El texto queda para lo que no
  tiene forma visual (reglas de datos, migraciones).
- **Las anotaciones del wireframe van como notas amarillas que dicen "NOTA".**
  Una vez confundió un recuadro punteado y un "Tocar: …" con parte de la UI.
- **El `db push` lo corre él:** el clasificador de permisos de Claude Code lo
  bloquea. Darle los comandos en orden (`login`, `db push`, `db:types`,
  `test:rls`) y después verificar con `migration list` y los tests.
- Trabaja delegando: el agente principal coordina y los subagentes
  implementan (una tanda por tema, commits por tema). A los subagentes hay que
  prohibirles explícitamente editar con sed, scripts o `cat >>`.

---

## 2. Invariantes que no se negocian

Estos son los que, si se violan, rompen el producto:

| Regla | Qué dice |
|---|---|
| **G-05 / CA-00** | PROHIBIDO en la UI: "disponible", "te queda", "dinero libre", "libre", "saldo" (en lo personal), "tenés $X", "podés gastar $X", cifras por día |
| **§7.2** | "Saldo" SOLO existe para el saldo compartido de un espacio |
| **D1 / N-04** | Sin asignar = Ingresos registrados − (Gastado + Comprometido). **Nunca** es plata disponible |
| **G-06** | Declarar, no verificar. El estado es **"Ya pasó"**, nunca "Pagado" |
| **K9** | Al radar personal llega SOLO la parte de cada uno |
| **§7.3** | Dos lentes que NUNCA se mezclan en una cifra: "tu parte" vs "lo que vas a pagar" |
| **P2** | Cuotas compartidas: la deuda se genera cuota por cuota. **Jamás** el total el día de la compra |
| **P19** | Un gasto compartido puntual mueve el saldo en la **fecha de compra**, aunque sea con tarjeta |
| **P3** | Reparto 50/50 o personalizado **por monto**. Sin porcentajes en la interfaz |
| **CA-25** | Nunca mostrar la diferencia entre lo que pusieron como si fuera la deuda |
| **T-03** | Cierre = primera fecha con el día de cierre ≥ compra · vencimiento = primera fecha con el día de vencimiento > ese cierre |
| **P5** | Crear un espacio requiere cuenta personal |
| **K0 / CA-06** | El invitado sin cuenta personal es un estado **completo y válido**. Sin pestañas bloqueadas ni candados |

---

## 3. Stack y arquitectura

**Expo SDK 57 + React Native 0.86 + TypeScript strict + Supabase.**

```
radar/
├── app/                      expo-router
│   ├── _layout.tsx           providers + MagicLinkListener + RouteGuard
│   ├── index.tsx             resuelve "/" con <Redirect> declarativo
│   ├── (auth)/               O1: bienvenida, privacidad, email, revisa-tu-email
│   ├── (personal)/           Estado A: tabs inicio/movimientos/futuro/compartidos + perfil
│   ├── (guest)/              Estado B: espacios, SIN barra de pestañas
│   ├── onboarding/           O3: cuenta-personal → ingreso → tarjetas → deuda → fijos → listo
│   ├── space/                [id]/index · agregar · pago · invitar · salir · gasto/[gid]
│   ├── invite/[token].tsx    O2
│   ├── movimiento/[id].tsx   detalle y edición
│   ├── fijo/[id].tsx         F-03
│   └── agregar.tsx           §17
│
├── src/
│   ├── domain/               ⭐ TS PURO, CERO dependencias. 12 archivos
│   ├── data/                 supabase, mappers, repositories, queryClient
│   ├── features/             auth, add, movements, spaces, radar, upcoming, breakdown, onboarding
│   ├── ui/                   tokens, theme, motion, primitives (14 propias)
│   ├── lib/format.ts         formato es-AR, hecho a mano (determinista)
│   └── test/render.tsx       renderWithTheme
│
├── supabase/
│   ├── migrations/           6 migraciones: schema, rls, operations, fix_pgcrypto,
│   │                         deleted_shared_records (SY-02), anonymous_guests
│   └── tests/privacidad.test.sql   37 asserts pgTAP
│
└── tools/language-lint.*     automatiza CA-00
```

### Las tres decisiones estructurales

1. **`src/domain/` es TypeScript puro.** Sin React, sin Supabase, sin leer el
   reloj: `hoy` SIEMPRE se inyecta. Por eso los tests corren en ~600ms sin
   emulador. §7.4 dice "la app guarda hechos y calcula todo lo demás", y eso
   **es** la arquitectura.

2. **El cálculo vive en el cliente.** El servidor guarda hechos y hace cumplir
   el acceso con RLS. Como el motor es determinista sobre los mismos hechos,
   los dos miembros ven exactamente el mismo saldo.

3. **`src/data/mappers.ts` es la única frontera** entre Postgres y el dominio.
   El dominio nunca importa los tipos generados de Supabase.

### Modelo de datos

- Montos: **INTEGER en pesos enteros** (G-02). Nunca float.
- Fechas de negocio: **DATE**, no timestamptz (G-01 habla de mes calendario;
  usar DATE elimina de raíz los bugs de timezone).
- `space_members` usa **slots 1 y 2**, no una tabla de participantes: la spec
  cierra el número en dos (K0), y así el saldo es un escalar con signo.
- `CHECK (share_slot_1 + share_slot_2 = amount)` → **C-02 garantizada por
  Postgres**. Un reparto mal calculado no puede llegar a la base.
- **Cero tablas de ocurrencias**: se expanden en memoria desde los hechos.
- `shared_payment_details` es tabla aparte porque lleva su propia política:
  es el único dato con visibilidad **asimétrica** entre dos miembros del mismo
  espacio (C-05).

---

## 4. Estado: qué está hecho

**Fases 0 a 10, más la prueba real con dos cuentas del 9 y 10/10.** `git log
--oneline` para verlos. **El Must está completo.**

| Área | Estado |
|---|---|
| Dominio (§29 completo) | ✅ Los 7 casos de §29.1 pasan exactos |
| Supabase + RLS | ✅ 16 tablas, 20 migraciones · **92/92 asserts** contra el remoto (16/10) |
| Rediseño de jerarquía (15 a 19/10) | ✅ Sistema N1/N2/N3 en todas las pantallas · ver "Por dónde seguir" y §11 |
| UI base | ✅ Tokens claro/oscuro, motion, 14 primitivas propias, teclado y footer fijo (§11) |
| O1 · O2 · O3 | ✅ Completos, con T-07/Q-06 derivados del último cierre |
| Acceso | ✅ Código de 8 dígitos + enlace · "Ya tengo cuenta" sin alta · invitada **sin email** (ver §10) |
| Agregar (§17) | ✅ Destino "Solo yo" + chip por espacio (M3), último medio usado, cuotas/fijo/fecha/descripción en **"Más opciones"** |
| SY-02 | ✅ Registro de borrados por trigger: nombra a quien eliminó, sin suponer |
| Inicio (§15) | ✅ Radar, tarjeta este mes, próximos pagos, próximos meses, **Tus espacios** |
| Compartidos | ✅ Stack dentro de la pestaña: la barra queda visible dentro del espacio |
| Ciclo del miembro | ✅ Borrado por cualquier camino = ex miembro · P7 reinvitar · el creador quita el acceso (§26) |
| Crear espacio | ✅ Paso a paso (StepShell), en el orden del Caso 2 |
| Futuro (§23) | ✅ 23.1 + 23.2 + 23.3 |
| Movimientos (§16) | ✅ Con gastos compartidos y filtros |
| M18 "¿de dónde sale?" | ✅ CA-04 y CA-52 testeados palabra por palabra |
| Espacios (§24) | ✅ Saldo, mes **hasta hoy** + "Se vienen este mes", próximos meses, movimientos con pagos |
| Pagos (§25) · Invitaciones (§26) | ✅ Pagos visibles en el mes y en movimientos, se eliminan con el saldo nuevo |
| Salida (§27) | ✅ Con SA-03/SA-04 explicados en palabras |
| Edición X-01..X-07 · F-03 · Q-07 | ✅ |
| Perfil · §28 eliminar cuenta | ✅ |

### Testing · cuatro niveles

```bash
npm run verify       # typecheck (3 configs) + vitest + jest + lint de lenguaje
npm run verify:full  # + los de RLS
```

| Nivel | Qué | Cuántos |
|---|---|---|
| 1 · Dominio y reglas puras (vitest) | Casos A–G, CA-*, casos de uso, identidad, navegación, Agregar, contraste WCAG de los tokens, historia de días de tarjeta | 1263 |
| 2 · Autorización (pgTAP) | PR-01, PR-02, CA-11..13, CA-47, CA-48, SY-02, SA-06, D-01, P7, §26, anónimos, permisos de funciones, días aproximados, `payment_method_days` | 92 |
| 3 · Componentes (jest-expo) | El lenguaje **obligatorio**, navegación de pestañas (`renderRouter`) | 399 |
| 4 · Lint de lenguaje | **Automatiza CA-00** | en CI |

El nivel 4 ya cazó **4 errores míos** ("te quedaría", "el saldo", "Te quedan N
cuotas"). El nivel 3 encontró **2 bugs reales**.

---

## 5. Qué falta

### ▶ Por dónde seguir (actualizado el 19/10)

**Estado:** las 20 migraciones están aplicadas al remoto (la 0019 y la 0020,
el 16/10) · pgTAP **92/92** · `npm run verify` en verde (vitest 1263, jest
399, CA-00) · **todo commiteado en `master`, sin push** (unos 55 commits desde
`697b52b`).

**Los wireframes (la referencia visual de todo lo que sigue):**
**https://claude.ai/artifact/6m96ypiCKBpUxwxDZk9M19** ("Jerarquía visual
Radar"). La sección `#decisiones` tiene los bloques 1 a 17, cada uno con la
opción elegida marcada "Elegida". El archivo fuente vivía en el scratchpad de
la sesión del 15 al 19/10, que se pierde. Para editarlo en otra sesión:
`Artifact read` de esa URL, editar la copia local y republicar con `url`.

**Lo próximo, en orden:**
1. **Bloque 17 · "Quitar un espacio de tu historial"** (decidido: opción a).
   Quien salió de un espacio puede quitar la foto de ese espacio
   (`former_memberships`) de su historial, de una vez y **solo si no
   quedan cuotas por venir**. Al quitarla cambia el radar de los meses
   pasados donde contaba su parte, y eso se dice en la confirmación.
   - **Falta:** que Renzo elija en el wireframe `#dq17` (dónde va la acción
     y la confirmación) y después implementarlo.
   - **Necesita una migración:** `former_memberships` no tiene políticas de
     escritura a propósito. Hace falta una RPC `security definer` que borre
     la fila propia (`user_id = auth.uid()`), con su `grant` y asserts
     pgTAP. **No se aplica sin el OK de Renzo, y el push lo corre él.**
2. **Que Renzo pruebe en el iPhone** lo del 18 y 19/10 (lista de abajo).
3. **Pendientes abiertos** (más abajo).

**Para probar en el iPhone (recargar la app antes):**
1. **Movimientos (16A):**
   - arriba "Hoy, …", con los registros de hoy y los del mes;
   - los filtros "Todos · Personales · Casa";
   - la franja de la semana con "Todo el mes" (tocar un día cambia la
     lista sin navegar; las flechas frenan en la semana de hoy);
   - la ayuda del punto la primera vez;
   - un mes pasado, sin "Agregar".
2. **Tocar filas en Movimientos:**
   - un gasto compartido abre el gasto;
   - un pago entre miembros abre su detalle (pantalla nueva);
   - una fila de "Con gonzalo · ya no sos miembro" abre el detalle de
     solo lectura.
3. **Signos:** "−" en texto normal y "+" en color en las listas y los
   detalles; sin ⇄ junto a ningún monto.
4. **Detalles:**
   - una compra en cuotas: "Faltan $X", el ciclo y "Ya pasaron 3 de 6
     cuotas";
   - un ingreso fijo ("desde octubre") y uno puntual ("Extra").
5. **Apariencia en Perfil** (Automático · Claro · Oscuro) y el tope de
   $999.999.999 en los montos.
6. **Tarjetas:**
   - corregir los días (la hoja "antes → ahora" y Deshacer), y verificar
     que un mes pasado no cambie;
   - eliminar una tarjeta con y sin pagos por venir.

**Qué se hizo del 15 al 19/10, después de la auditoría** (detalle en
engram, `ux/decisiones-*`, y en los wireframes):
- **Sistema de jerarquía N1/N2/N3** en todas las pantallas (§11): la
  respuesta con su forma visual, como mucho 3 puertas y el detalle en su
  propia pantalla. Sin desplegables para la densidad.
- **Compartidos (P23):**
  - la pestaña abre siempre en la lista (`popToTopOnBlur` y la lista
    siempre debajo del espacio);
  - las filas tienen la balanza mini y los avatares;
  - van ordenadas por la última vez que se abrió cada espacio;
  - el filtro aparece desde 5 espacios y la búsqueda desde 9.
- **El espacio:**
  - el N1 con `BalanceScale` (la balanza animada con Reanimated y SVG;
    "Están a mano" con tilde);
  - las puertas Pendientes, Mes y Movimientos, con sus N3;
  - el invitado con U1.
- **Inicio:**
  - "Tus ingresos de octubre", con el tramo de Sin asignar con contorno;
  - el exceso como recipiente a escala (1A);
  - las puertas, y en el mes que se pasa, el tope rayado con
    "+$X" a la derecha (2D).
- **Futuro:**
  - el mes elegido como N1, con el ingreso previsto a la vista (CA-38);
  - "Este mes" en los pagos;
  - el desglose de §23.1.
- **Movimientos:** una sola pantalla (16A). Un ingreso puntual dice "Extra".
- **La regla de signos de toda la app** (§11).
- **Detalles nuevos:**
  - de compra en cuotas: el ciclo, "Faltan" y "Ya pasaron N de M";
  - de ingreso: fijo o extra, desde cuándo;
  - de pago entre miembros;
  - de solo lectura de un ex espacio.
- **Días aproximados:** "Sé el día / Más o menos / No sé" en el cierre, el
  vencimiento y el día de cobro (migración 0019).
- **Tarjetas desde Perfil:**
  - la lista y el detalle;
  - **corregir los días**, que recalcula de este mes en adelante; la
    historia de días (0020) protege los meses pasados;
  - **eliminar** (P24: no se elimina con pagos por venir; si se elimina
    se marca con `deleted_at` y no se borra la fila).
- **Fechas:** no se carga nada antes del día 1 del mes en curso.
- **Montos:** tope de $999.999.999 y cifras que se achican sin abreviar.
- **Apariencia** (tema elegible) en Perfil.
- **Bugs reales arreglados:**
  - "Continuar" del onboarding cargando en loop al volver (y el sueldo
    duplicado);
  - el interruptor A/B;
  - la pestaña Compartidos que abría adentro del último espacio;
  - los gastos futuros que no se podían abrir;
  - las cuotas de un compartido calculadas sobre el total y no sobre tu
    parte (K9);
  - los pagos entre miembros que abrían el espacio.

**Decisiones nuevas en la spec (§38):** P23 (Compartidos siempre en la
lista), P24 (eliminar tarjetas), P25 (una sola ayuda en el radar). La fila
de §14 y la de "Eliminar" de §22 quedaron actualizadas.

**Qué se hizo en la auditoría del 14 y 15/10 (por etapa):**
- **1** · Ingresos fijos accesibles y sin duplicar (era P0: Perfil abría
  el onboarding, que creaba otro sueldo) · contraste de `textMuted` y
  `excess` · barra sin proporciones sin ingresos · el error cierra el
  teclado.
- **2** · `RadarBar` con contraste ≥3:1, separadores y `accessibilityValue`
  · Sin asignar de Futuro con ayuda y N-08 (decisión de Renzo) · "Este mes"
  en los pagos de Futuro, sin cambiar las 6 barras (decisión de Renzo) ·
  detalle del resumen estimado (§23.2).
- **3** · El resumen de tarjeta mostraba un **uuid** (`label: cardId`):
  arreglado en el dominio · chevron en filas tocables y áreas de 44pt ·
  token `danger` (`excess` queda solo para N-08) · `TextField` · errores
  siempre por toast.
- **4** · Cuotas "Otra" de 2 a 36 (sin valor de cuota ni primer mes: Renzo
  eligió solo "Otra") · audiencia en el footer · motivo de Guardar · el
  reparto no salta · edición con "Más opciones", fecha editable y descartar.
- **5** · **Bug de integridad**: toda edición rearmaba el plan de cuotas, y
  si editaba el que no pagó lo rearmaba sin la tarjeta del otro (movía el
  saldo) · espacio reordenado · saldo en el aviso · progreso real del
  onboarding · Perfil sin wizard.

**Pendientes abiertos (decidir o hacer):**
- **El que no pagó cambia la cantidad de cuotas** de una compra con la
  tarjeta del otro: se rearma con Q-03, porque no ve la tarjeta. Falta una
  regla de producto.
- **Una compra en cuotas guarda UN solo día de impacto** (F2). Corregir el
  vencimiento de una tarjeta mueve el día de las cuotas ya pasadas dentro de
  su mismo mes (nunca el mes ni los totales). Fijarlo del todo exigiría un día
  por cuota.
- **Deuda en subpasos** (O3 paso 4): no se hizo, por riesgo.
- Con tarjeta compartida, el aviso al guardar muestra el saldo en lugar de
  "Se paga en noviembre".
- **Huecos de la spec:**
  - §17 campo 8: valor de cuota y primer mes editable (Renzo eligió solo
    "Otra");
  - §16: fijos de meses pasados en Movimientos (la lista solo muestra lo
    cargado);
  - cuotas que no son de tarjeta en el onboarding (quedaron afuera por
    decisión).
- Un ingreso que ya terminó no aparece en "Tus ingresos".
- **Tema elegido en Perfil:** las alertas, el teclado y el selector de
  fecha nativos siguen la apariencia del iPhone, no la elegida en la app.
- **Contraste:** el "+" en `brand` sobre fondos teñidos (`brandSoft`,
  `sharedSoft`) da 4,25–4,33:1. Solo vale para cifras grandes (≥24pt):
  nunca texto chico de ese color sobre esos fondos.
- **El "Supermercado" de un ex espacio:** la foto de `former_memberships`
  guarda la descripción, si la había. Si no, el detalle de solo lectura dice
  "Gasto del 8 de octubre".
- **Un gasto en un espacio que pagó el otro** ("Luz · pagó Martina")
  aparece con "−" (es tu parte), aunque la plata no salió de tu bolsillo.
  Es coherente con K9, pero conviene aclararlo en el detalle del gasto.

Hecho el 14/10 antes de la auditoría (ver `git log`), además de la revisión
de lo que carga el otro (K10 en §37):
- **CA-07 / Caso 18**: la invitada que elige "Personal" en Agregar, con
  borrador que se guarda al terminar la activación.
- **Los 8 Should de §5**: completar con qué se pagó · aviso de duplicado ·
  compartir resumen como texto · exportar CSV (`expo-file-system` +
  `expo-sharing`) · quitar el acceso · actividad reciente · totales por
  categoría · categoría sugerida.
- **P6** (resumen fijo del saldo al salir) y un **bug grave de SA-05/P8/
  CA-41**: quien salía perdía el espacio entero en su cuenta personal (el
  pasado del radar y las cuotas que siguen). Se arregló con una foto privada
  del espacio que guarda el servidor al salir (0018).
- **§33 U1** en el espacio de la invitada con un solo espacio (bienvenida
  única, "Tu plata personal"; "Ahora no" ahora persiste).
- **X-07 al revés**: pasar un gasto compartido a personal.
- Bug de **"Cambiar desde este mes"**, que reescribía el pasado (0016).

Las decisiones de diseño que tomé sin aprobación explícita están en la spec
como **P21** y **P22** (§38), para vetarlas si hace falta.

**Lo que queda y NO es código de pantallas:**
- §35 métricas del piloto: elegir proveedor toca P11 (decisión de Renzo).
- P9–P11 antes de publicar privacidad; P12 (legal) antes de salir del
  círculo cercano.
- Build propio (EAS), SMTP transaccional, links https de invitación.

**Ideas de la prueba real**, resueltas en la auditoría: "Con esto, Martina
te debe $X" (hecho, era §17) · unificar los campos de texto (hecho,
`TextField`) · comparar con el mes pasado (descartado: compite con el radar
y se pisa con P15) · iniciales en vez de foto (no aplica: no hay avatares).

**Ya probado por Renzo en el iPhone** (16 al 19/10): la auditoría, las
tandas 1 y 2 del rediseño, días aproximados, eliminar tarjetas, el onboarding
y los bugs arreglados. **Sin probar todavía:** lo del 18 y 19/10 (ver la lista
de arriba), SA-04, varias cuotas por tarjeta y "Otro fijo" en O3.

### Del Must
**Completo.** CA-09 se cerró el 12/10. T-07, SY-02, la fecha editable, M3
(destino en Agregar) y el bloque "Tus espacios" de Inicio, el 9 y 10/10.

### Antes de producción (decisiones tomadas para la etapa de testeo)
- **Método de acceso.** Hoy: código de 8 dígitos + enlace, sin contraseña. Lo
  habitual en las stores es Apple + Google + email; ojo con la guideline 4.8
  (login social obliga a ofrecer Sign in with Apple) y con la cuenta demo que
  pide el review.
- **Invitada sin email** (usuario anónimo). Reabre P1/A-01. Si pierde el
  teléfono antes de guardar su email, pierde el acceso; el creador puede
  quitarle el acceso y volver a invitarla (§26 + P7), pero ella pierde el
  vínculo con lo que cargó. Falta CAPTCHA contra la creación masiva de
  anónimos.
- **SMTP**: hoy es Gmail con contraseña de aplicación. Para producción, un
  proveedor transaccional (Resend o Postmark) con dominio propio.
- **Links de invitación tocables**: exp:// y radar:// no se vuelven links en
  WhatsApp. Hace falta un https (página puente y/o Universal Links).
- `npm audit`: 67 vulnerabilidades, mayormente de herramientas de desarrollo.
  Revisar.

### Pulido
- Accesibilidad: auditar contraste y tamaños de toque (los labels ya están)
- Más flujos paso a paso donde convenga (criterio en §11): salir de un espacio,
  invitar
- **Build propio (EAS)**: hoy la app solo corre en Expo Go

### Bloqueantes de producto (no de código)
**P9, P10 y P11 siguen pendientes** y bloquean publicar cualquier texto de
privacidad (§34): plazo de borrado en backups, compromiso escrito de no vender
datos, y cifrado/ubicación/uso para entrenar IA del proveedor. La base está en
**sa-east-1 (São Paulo)**, que responde la parte de ubicación.

---

## 6. Entorno y gotchas

### Supabase
- Proyecto `vfmjurbvgysdqmqcucul` · sa-east-1 · Postgres 17.11
- Credenciales en `.env.local` (gitignored)
- **El access token de la CLI expira rápido.** Para `db push`, `config push` o
  `test:rls` hay que rehacer `npx supabase login`. El smoke (`test:rls:smoke`)
  no lo necesita: usa la anon key.
- **`supabase config push` SIN revisar el diff degrada la seguridad.** Los
  valores que genera `supabase init` son defaults de desarrollo: bajaban
  `otp_length` de 8 a 6 y `max_frequency` de 1 minuto a 1 segundo. **Siempre
  `supabase config diff` primero.**
- **pgcrypto vive en el schema `extensions`.** Las funciones SECURITY DEFINER
  con `search_path = public` no encuentran `gen_random_bytes` ni `digest`:
  calificarlas como `extensions.gen_random_bytes`. NO ampliar el search_path,
  que en SECURITY DEFINER es un vector de escalada.
- **`revoke ... from public` NO cierra una función.** Supabase da EXECUTE
  explícito a `anon` y `authenticated`. La 0007 dejó `app_member_departs`
  (security definer, interna) ejecutable por cualquiera; la 0008 lo cerró y
  sacó los default privileges de `anon` y `authenticated`.
- **Y eso tampoco alcanzaba (14/10).** Postgres además le da EXECUTE a
  **PUBLIC** a toda función nueva, y `anon` es miembro de PUBLIC:
  `app_resolve_stopped_recurrence` nació abierta sin sesión (en `proacl`,
  `=X/postgres` es el EXECUTE de PUBLIC). La 0012 intentó sacarlo con
  `alter default privileges IN SCHEMA public ...` y **no sirvió**: los
  default privileges por esquema solo se SUMAN a los globales, no pueden
  sacar nada. `app_mark_reviewed` (0013) nació abierta otra vez. La **0014**
  lo revoca en el default GLOBAL (`for role postgres`, sin `in schema`).
  **Desde la 0014** una función nueva nace cerrada: verificado creando una
  función de prueba en un `begin/rollback` (ACL `{postgres, service_role}`).
  Cada migración da su `grant ... to authenticated` explícito.
- **Para afirmar algo de privilegios, probarlo**: crear una función de
  prueba en una transacción y mirar su ACL. La 0012 se afirmó sin probar.
- **La única verificación confiable es `has_function_privilege`**, que es lo
  que miran los tests ("Sin sesión no se ejecuta ninguna función de la
  app"). `db:types` lista TODAS las funciones, cerradas incluidas: que una
  aparezca ahí no dice nada.
- **supabase-js no lanza: devuelve `{ error }`.** Toda lectura y escritura lo
  mira (`throwIfError` en `personal.ts`). Un `data ?? []` sin chequear
  convierte una falla de red en "no hay nada": un saldo en cero o un Futuro
  vacío, sin aviso. Nunca suponer valores: `me.data ?? 1` invertía el saldo.
- **Los tests pgTAP corren contra la base REAL** (en una transacción con
  rollback). Nunca buscar datos del test por nombre: un dato real puede
  llamarse igual (pasó con "Casa"). Primero RED contra la base actual, después
  `db push`, después GREEN.
- **Cada `supabase login` crea un token personal nuevo, con un tope de 20 por
  cuenta.** Al llegar al tope el login falla ("User can have up to 20 personal
  access tokens"): hay que borrar los viejos (`cli_…`) en
  dashboard → Account → Access Tokens. Para no chocar de nuevo: un token fijo
  en la variable `SUPABASE_ACCESS_TOKEN`. Nunca pegarlo en el chat.
- **El clasificador de permisos de Claude Code bloquea `db push`** (lo
  considera una modificación de un recurso compartido). Lo corre Renzo. Para
  verificar después: `npx supabase migration list` (cada migración con su
  `remote`), y en `test:rls` contar las líneas `"line": "ok N"` (la salida
  es JSON).
- **Antes de aplicar una migración, la app tiene que tolerar que todavía no
  esté:** el mapper toma como false una columna `undefined` y la lectura de
  una tabla inexistente (`PGRST205` / `42P01`) cae al comportamiento de
  siempre. Así se pudo commitear la 0019 y la 0020 antes del push sin romper
  nada.
- **Eliminar una tarjeta NO borra la fila** (`deleted_at`, 0019). Si se
  borrara, sus compras en 1 pago quedarían sin tarjeta y pasarían de
  Comprometido (mes del vencimiento) a Gastado (mes de compra): reescribiría
  meses pasados.
- **Los días de una tarjeta tienen historia** (`payment_method_days`, 0020).
  Una compra usa los días que valían cuando se pagó (`resolveCardStatement`).
  El corte es por MES de pago: lo pagado antes del mes de la corrección
  conserva los días viejos.

### Expo
- **`npx expo install`, NUNCA `npm install`, para paquetes con módulo nativo.**
  async-storage quedó en 3.1.1 cuando Expo Go trae la 2.2.0 compilada, y la app
  no arrancaba. Verificar con `npx expo install --check`.
- **expo-router necesita `app/index.tsx` para `/`**: un redirect en `useEffect`
  llega tarde y el router ya mostró "Unmatched Route".
- **Enlace mágico en Expo Go: SIEMPRE `npm run start:tunnel`.** Con `npm start`
  el deep link es `exp://192.168.x.x:8081/...`, y GoTrue rechaza cualquier IP
  literal que no sea loopback **antes de mirar la allowlist**: cae al site_url
  `radar://`, que Expo Go no abre ("Se ha producido un error"). Está permitida
  `exp://znfuh80-rciminello22-8081.exp.direct/--/auth/callback`. Nunca un
  comodín `*.exp.direct`: el dominio es compartido y el flujo implícito manda
  los tokens en la URL.
- **El subdominio del tunnel NO es fijo.** Sale de `urlRandomness` en
  `.expo/settings.json` (local, gitignored), y Expo lo puede regenerar: el
  10/10 pasó a `irCGR0k` y Expo Go daba "no se pudo conectar" (abría la URL
  vieja desde "Recently opened"), y el enlace del mail ya no volvía. Se fijó en
  `"urlRandomness": "znfuh80"`. Si vuelve a cambiar: restaurarlo ahí, o sumar
  la URL nueva a la allowlist. El código de 8 dígitos funciona igual, porque no
  usa redirect. Diagnóstico: `curl http://127.0.0.1:4040/api/tunnels` muestra
  la URL viva.
- **Cambiar de wifi no importa con el tunnel** (todo pasa por ngrok). Sin
  tunnel sí: la IP cambia, Windows marca la red nueva como **Pública** y el
  firewall puede bloquear el 8081, y hay redes que aíslan los dispositivos.
- **Probar un redirect sin gastar mails** (el SMTP integrado tiene rate limit):
  `curl -s -o /dev/null -w "%{redirect_url}" "$URL/auth/v1/verify?token=x&type=magiclink&redirect_to=<URL>"`.
  Si vuelve a `<URL>#error=...`, está permitida; si vuelve a `radar://`, no.
  Ojo: `127.0.0.1` pasa siempre (RFC 8252), así que no prueba nada.
- Renzo usa **Windows sin Android SDK** (`ANDROID_HOME` sin definir), así que
  `expo run:android` no corre. Prueba con **Expo Go en iPhone**.

### Testing
- **`render` es ASYNC desde RNTL 14.** Sin `await` da "render function has not
  been called", que no dice nada sobre la causa. **`fireEvent` también**: sin
  `await` aparece "overlapping act() calls".
- La lógica testeable se saca a funciones puras con su `.test.ts` (vitest,
  node): identidad (`authFlow`), navegación (`spaceNavigation`), membresías
  (`memberships`), copy (`balanceCopy`), defaults de Agregar (`addDefaults`).
- **No usar `screen`** (estado global de RNTL): usar el resultado de `render`.
- Reanimated 4 necesita el resolver de `react-native-worklets` en jest.
- `lucide-react-native` es ESM: está mockeado con un Proxy.
- Los `.spec.tsx` tienen su propio tsconfig (los globals de jest no deben ser
  visibles en producción).
- **Un `.spec.tsx` dentro de `app/` se vuelve una ruta**: los specs de
  pantallas van en `src/`.
- **Windows no distingue mayúsculas:** `foo.ts` y `Foo.tsx` en la misma
  carpeta chocan. La lógica pura lleva otro nombre (`spaceListOrder.ts` junto
  a `SpaceListView.tsx`).
- **RNTL busca `onPress` subiendo por los componentes:** un hijo que no
  debería responder (un día futuro) igual "responde" si el padre tiene
  `onPress`. En los componentes internos, usar otro nombre (`onSelect`).
- **Navegación de pestañas testeable con `renderRouter`**
  (`expo-router/testing-library`); hubo que sumar `standard-navigation` a
  `transformIgnorePatterns`.
- **Guardián de navegación:** `tools/no-redirect-in-effect.test.ts` falla si
  algún `useEffect` llama a `replace`.
- **Estado compartido entre pestañas:** cada pestaña queda montada, así que un
  `useState` leído una vez al montar no se entera de cambios hechos en otra.
  Para eso, un store con `useSyncExternalStore` (pasó con el interruptor A/B).

### Al editar código
- **Para JSX usar siempre la tool Edit, NUNCA regex por Bash.** Me rompió
  archivos dos veces (se come las comillas de los props).
- Los scripts largos de Node van a un archivo en el scratchpad, no inline: las
  comillas anidadas rompen el parser.
- **Una edición no reenvía columnas derivadas de datos que el editor no
  ve.** `updateSharedExpense` rearmaba el plan de cuotas en cada guardado
  y, si editaba el que no pagó, lo hacía sin la tarjeta del pagador (PR-02)
  y movía las fechas de impacto (F2) y el saldo. Ahora `shouldReplan`
  (`domain/installments.ts`) decide: solo rearma si cambian la cantidad, la
  fecha, quién pagó o el medio del pagador.
- **`npx expo lint` NO está configurado.** Correrlo instala eslint y
  modifica `package.json`. El chequeo del proyecto es `npm run verify`.
- **vitest no puede importar `src/ui/tokens.ts`** (hace `require` de los
  .ttf). La paleta y los temas viven en `src/ui/colors.ts`, que `tokens.ts`
  re-exporta; `src/ui/contrast.test.ts` mide WCAG sobre eso.
- **El lint CA-00 mira strings sueltos**: un id interno `'pagados'` cuenta
  como "Pagado". En O3 el paso se llama `'conQue'`.
- **Guardián de Alert:** `tools/alerts-are-confirmations.test.ts` falla si un
  `Alert.alert` no trae botones. Los errores van por toast.
- **Los subagentes se saltean "editar solo con Edit"** (usaron sed, Python y
  `cat >>`). Hay que prohibirlo explícitamente en cada prompt.
- **Nunca un junction de `node_modules` dentro de un `git worktree`.** El
  14/10, `git worktree remove --force` entró al junction y borró parte del
  `node_modules` real (se arregló con `npm ci`). Para verificar commits
  intermedios: sacar el junction con `(Get-Item …).Delete()` ANTES de
  quitar el worktree, o copiar en vez de enlazar.

---

## 7. Comandos

```bash
npm start                  # Expo (Expo Go por QR) · el enlace mágico NO vuelve
npm run start:tunnel       # Expo por tunnel · usar este para probar el login
npm run verify             # typecheck + vitest + jest + lint de lenguaje
npm run verify:full        # + RLS
npm run test:dominio       # solo el dominio (~600ms)
npm run test:componentes   # jest-expo
npm run lint:lenguaje      # CA-00
npm run test:rls           # 92 asserts (necesita supabase login; la salida es JSON)
npx supabase migration list  # qué migraciones están aplicadas en el remoto
npm run test:rls:smoke     # RLS con la anon key (no necesita login)
npm run db:push            # migraciones
npm run db:types           # regenerar tipos desde el esquema
npx expo install --check   # verificar versiones del SDK
```

---

## 8. Dónde está el contexto largo

En **engram**, pero ojo con el scope, porque engram deriva el proyecto del
directorio de trabajo:

| Proyecto | Qué tiene |
|---|---|
| **`cimin`** | Las 10 memorias de las fases 0 a 9 (decisiones y gotchas de cada una) y el resumen de sesión. Quedaron ahí porque el cwd era `C:\Users\cimin\...` |
| `radar-sueldo-comprometido` | La auditoría previa del 7/10 (#265, #266, #267), las decisiones F1–F4 (ver abajo) y todo lo del 9/10 en adelante: auth por tunnel, fecha editable, SY-02. **Desde acá, pasar siempre `project` explícito** |

```
mem_context()   # lista las recientes de los dos, sin filtrar por proyecto
```

`mem_search` SÍ filtra por el proyecto del cwd. Para las de la auditoría hay
que pasar `project: "radar-sueldo-comprometido"` explícito.

Las decisiones de UX del 15 al 19/10 están en engram con los topics
`ux/decisiones-*`, `ux/rediseno-jerarquia`, `workflow/wireframe-primero`,
`copy/cuotas-ciclo`, `db/migraciones-0019-0020` y `bug/edits-replan-cuotas`.
Los wireframes, en el artifact
https://claude.ai/artifact/6m96ypiCKBpUxwxDZk9M19.

---

## 9. Las cuatro ambigüedades de la spec (F1–F4)

Una auditoría previa al código (7/10, observación #266 de engram) detectó
cuatro ambigüedades en la V1.1.2. El código se escribió **sin verla**, así que
las coincidencias son convergencia independiente. Verificado el 9/10:

| # | Ambigüedad | Cómo quedó |
|---|---|---|
| **F1** | §29.1 Caso B dice "(o a Gastado, una vez pasada la fecha)" y contradice a §7.2, N-02 y §15 | **Siempre `committed`.** Manda la precedencia 7 > 29 > 29.1. Rotulado "Ya pasó" |
| **F2** | "Fecha de impacto" de una cuota no está en el glosario, y decide cuándo cambia el saldo | **= la fecha de pago de la cuota** (Q-02 vencimiento, Q-03 mismo día). Además se PERSISTE, porque deriva de la tarjeta del pagador que el otro no puede ver (PR-02) |
| **F3** | C-03 no dice quién absorbe el peso impar en un 50/50 | **El slot 1, no el pagador**: si fuera el pagador, editar "quién pagó" cambiaría las partes y el saldo |
| **F4** | T-08 "fecha hoy" mandaría los consumos al resumen equivocado | **El razonamiento de la auditoría no se sostiene.** "Consumos *desde* el último cierre" son posteriores al cierre, así que van al próximo resumen, que es lo que da fechar hoy. Verificado con T-03 en los dos escenarios |

### Investigando F4 aparecieron dos bugs en O3 paso 4 (arreglados, `b1e98ea`)

Los dos venían de deducir "el último resumen" del mes calendario en lugar del
cierre de la tarjeta:

- **T-07**: `dateInMonth(mes actual, dueDay)` fallaba **después** del cierre
  (cierre 25, vence 5, hoy 28/10 → guardaba 5/10 en vez de 5/11). Antes del
  cierre daba bien: al 9/10, el resumen cerrado el 25/9 vence de verdad el 5/10.
- **Q-06**: `lastStatementMonth` era "el mes pasado" y generaba una cuota que
  ya estaba en el último resumen: contada dos veces en el Comprometido.

Ahora los dos salen de `lastClosedStatement(card, today)`, en el dominio, y el
vencimiento se muestra y se puede corregir (§13 O3 paso 4: "monto y vencimiento").

---

## 10. Identidad y acceso (rearmado el 9 y 10/10, con la prueba real)

### Los tres caminos de entrada

| Camino | Qué crea | Cómo |
|---|---|---|
| **Empezar** | Usuario CON cuenta personal (O1 5a) | La elección se guarda **atada al email** (`authFlow.intentFor`) y se consume siempre |
| **Ya tengo cuenta** | Nada | `shouldCreateUser: false`. Email inexistente → "No encontramos una cuenta" |
| **Invitación** | Usuario anónimo, SIN cuenta personal | Link → nombre → adentro. "Guardá tu acceso" en el Perfil vincula el email después |

El mail trae un **código de 8 dígitos** y el enlace. Cualquiera de los dos sirve.

### Configuración del dashboard (no está en el repo)
- **SMTP**: Gmail con contraseña de aplicación (Authentication → Emails → SMTP).
  Sin SMTP propio, el servicio integrado manda 2 mails por hora y no deja
  editar las plantillas.
- **Plantillas con `{{ .Token }}`**: Magic Link, Confirm signup y Change email
  address.
- **Anonymous sign-ins**: activado. La regla "sin email no hay cuenta personal"
  la hace cumplir el servidor (migración 0006).
- **Redirect URLs**: la exacta del tunnel. Las de IP de LAN no sirven nunca (§6).

### Gotchas que costaron caro
- **La RLS define lo VISIBLE, no lo PROPIO.** `space_members` deja ver las dos
  filas de cada espacio. Una consulta de "mis espacios" sin filtrar por usuario
  duplicaba el espacio y el radar sumaba la parte del otro (K9). Toda consulta
  de "mis X" filtra explícitamente: `ownActiveMemberships`.
- **Estado "una vez" en el layout raíz.** No se desmonta al cerrar sesión: hay
  que atarlo al user id (PendingInvitation) y vaciar la caché de queries al
  cambiar de usuario (SessionProvider.publishSession).
- **Carreras al loguear.** `space_members.user_id` tiene FK a profiles: aceptar
  una invitación espera al perfil. El perfil se pide UNA vez por usuario.
- **Historial de navegación.** Cambiar de árbol (login, logout) usa `resetTo`,
  y "Volver" desde un espacio va a un destino fijo (`spaceBackTarget`). Los
  redirects tipo "con uno solo, entra directo" se renderizan inline: con
  `useEffect` + `replace` hacían loop.
- **El claim `is_anonymous` del JWT** sigue en true hasta renovar la sesión:
  después de guardar el email se llama a `refreshSession`.
- **Los tests de RLS corren contra la base REAL**, dentro de una transacción con
  rollback. Nunca buscar datos del test por nombre: un dato real puede
  llamarse igual (pasó con "Casa").

---

## 11. Patrones de UI y de lenguaje acordados (9 al 19/10)

| Patrón | Regla | Dónde vive |
|---|---|---|
| **Botón principal fijo** | En formularios, la acción principal va en `<Screen footer={...}>`: queda fija y sube con el teclado. En pantallas de contenido, NO | `src/ui/primitives/layout.tsx` |
| **Teclado** | `Screen` ya maneja el teclado (KeyboardAvoidingView + insets). Nada de `react-native-keyboard-controller`: no viene en Expo Go | idem |
| **Salir siempre** | Nunca `router.back()` a secas: `goBack(router)` (sin historial, va a la raíz). Cambio de árbol: `resetTo` | `src/features/shared/navigation.ts` |
| **Abrir un espacio** | `useOpenSpace()`, nunca la ruta armada a mano: personal → dentro de la pestaña; invitado → `/space/[id]` | `src/features/spaces/` |
| **Compartidos abre siempre en la lista** (P23) | Estado A: la pestaña es la lista, aunque haya un solo espacio; `popToTopOnBlur` y abrir un espacio deja la lista debajo (`withAnchor`). Estado B: el invitado con un solo espacio entra directo, renderizado inline, nunca `useEffect` + `replace` | `compartidos/index.tsx`, `(guest)/espacios.tsx` |
| **Paso a paso vs formulario** | Paso a paso (`StepShell`, una pregunta por pantalla) en flujos poco frecuentes y con consecuencias. Formulario único con "Más opciones" en los frecuentes (Agregar: principio 4) | `StepShell`, `MoreOptions` |
| **"Tu parte"** | Nunca "te corresponde" en la UI: se leía como plata que te deben. "Parte" es el sinónimo del glosario §7.2 | todo `features/spaces` |
| **El mes del espacio** | Cuenta hasta hoy, igual que el saldo. Lo que falta: "Se vienen este mes" | `calculateSpaceMonth` |
| **Todo pago se ve** | Un pago entre miembros no cambia "puso" (P-04), pero aparece en el mes y en movimientos | `SpaceScreen` |
| **Tocable vs informativo** (15/10) | Toda fila tocable lleva `RowChevron`; las informativas, ni chevron ni rol de botón. Links de texto con `TextLink`, íconos con `IconButton`: área efectiva ≥44pt (`ui/touch.ts`) | `src/ui/primitives` |
| **Acciones secundarias** | "Cancelar", "Ahora no", "Saltear": `Button ghost`, nunca texto suelto | `Button` |
| **Color con un solo sentido** | `danger` = errores y destructivo (`Button destructive`). `excess` (ámbar) = SOLO N-08 y la marca de exceso: sin alarma (§15). Nada se distingue solo por color (tilde en chips, borde en el mes elegido) | `colors.ts` |
| **Campos de texto** | Siempre `TextField` (variante `shared` en lo compartido). Excepciones: `AmountInput`, el código de 8 dígitos y el monto de `SplitPicker` | `TextField` |
| **Errores** | Por toast (`useFeedback().error`, cierra el teclado). `Alert` solo para confirmaciones | `Toast`, `useFeedback` |
| **Audiencia en Agregar** | La línea "Solo vos lo ves" / "Lo ven vos y X" va debajo de los chips de destino (§12, §17) Y en `SaveFooter`, sobre Guardar; Guardar es teal si el destino es un espacio | `DestinationAudience`, `SaveFooter` |
| **Gestión desde Perfil** | Listas propias (`/fijo/ingresos`, `/fijo/gastos`, `/tarjetas`); el alta reutiliza el formulario del onboarding con `?desde=perfil`, que guarda y vuelve. Perfil nunca entra al wizard | `app/fijo`, `app/tarjetas` |
| **Jerarquía N1/N2/N3** (15/10) | N1: la respuesta de la pantalla, con su forma visual SIEMPRE y una acción. N2: como mucho 3 puertas (`Door`: ícono, título, cifra, chevron). N3: el detalle en su propia pantalla. **Nada de desplegables para la densidad** (los rechazó). Lo gráfico nunca es secundario | todas las pantallas |
| **Pantalla del espacio** | N1 con `BalanceScale` (la balanza: se inclina hacia quien puso de más; nivelada con tilde = "Están a mano"), la frase en dos líneas ("Martina te debe" / cifra) y las acciones. N2: Pendientes (primera y urgente si hay un fijo detenido, SA-04), Mes, Movimientos. N3: `mes`, `movimientos`, `pendientes` | `spaceLayout.ts`, `SpaceHero`, `app/space/[id]/*` |
| **Movimientos** (16A) | Una sola pantalla: hoy y "N registros hoy · M en el mes" → filtros segmentados → franja de la semana con "Todo el mes" → la lista del día, sin navegar. Cuenta registros, nunca plata | `MovementsTabView`, `movementsTab.ts` |
| **Signos** (15) | Todo MOVIMIENTO lleva "−" (sale) o "+" (entra). Solo lo que entra lleva color (`brand`); nunca rojo. El pago entre miembros: ⇄ a la izquierda y +/− según quien mira. **Sin signo:** el saldo, los totales del radar, Próximos pagos, el resumen estimado y Futuro. El lector de pantalla dice "gasto de", "ingreso de", "te pagaron", "pagaste" | `Money sign`, `amountSign.ts` |
| **Cuotas: el ciclo** | "Faltan $X" · segmentos · "Ya pasaron 3 de 6 cuotas" (nunca "Vas pagando" ni "Pagado": G-06) · Próxima · Termina · Medio solo si pagaste vos | `installmentsCycle.ts` |
| **Meses en minúscula** | Dentro de una frase, "se paga en noviembre" (RAE). La mayúscula solo va al principio de una línea o un título | `format.ts` |
| **Montos** | Tope de $999.999.999 (`MAX_AMOUNT`, la base es `integer`). Las cifras grandes se achican solas hasta 20pt, sin abreviar nunca. En las filas se corta el nombre con "…", nunca el monto | `money.ts`, `amountFit.ts` |
| **Días que no se saben** | "Sé el día / Más o menos (2, 15, 28, aprox.) / No sé (T-05)". Lo que sale de un "Más o menos" se muestra "~15 nov · aprox." | `DayAnswerField` |
| **Fechas de carga** | Nada antes del día 1 del mes en curso. Un gasto de un mes pasado no cambia su fecha | `domain/calendar.ts` |
| **Apariencia** | Automático (sigue al iPhone) · Claro · Oscuro, en Perfil. Se resuelve en el `ThemeProvider`, no con `Appearance.setColorScheme` | `ui/appearance.ts` |
