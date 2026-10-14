# Handoff · Radar del sueldo comprometido

Contexto para retomar el proyecto en una sesión nueva.
Última actualización: 14 de octubre de 2026 (noche) · working tree limpio · **0018 sin aplicar al remoto**.

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
| Supabase + RLS | ✅ 15 tablas, 18 migraciones · **78 asserts** (74/74 verificados; 0018 sin aplicar) |
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
| 1 · Dominio y reglas puras (vitest) | Casos A–G, CA-*, casos de uso, identidad, navegación, Agregar | 298 |
| 2 · Autorización (pgTAP) | PR-01, PR-02, CA-11..13, CA-47, CA-48, SY-02, SA-06, D-01, P7, §26, anónimos, permisos de funciones | 46 |
| 3 · Componentes (jest-expo) | El lenguaje **obligatorio** | 46 |
| 4 · Lint de lenguaje | **Automatiza CA-00** | en CI |

El nivel 4 ya cazó **4 errores míos** ("te quedaría", "el saldo", "Te quedan N
cuotas"). El nivel 3 encontró **2 bugs reales**.

---

## 5. Qué falta

### ▶ Por dónde seguir (actualizado el 14/10, noche)

> ⚠️ **La migración 0018 (former_memberships) está commiteada pero NO
> aplicada al remoto** (espera el OK de Renzo). Hasta aplicarla, la app falla
> al leer la cuenta personal: `fetchPersonalFacts` lee `former_memberships`.
> Pasos: `supabase login` → `npm run db:push` → `npm run db:types` →
> `npm run test:rls` (78 asserts). 0015–0017 ya están aplicadas (74/74).

**La V1 del MVP está completa contra la spec** (auditoría del 14/10 contra
§5, §36, §33 y §38). Lo que sigue son las **auditorías de UX/UI**: el
contenido está; queda pulir flujos e interfaz.

Hecho el 14/10 (ver `git log`), además de la revisión de lo que carga el
otro (K10 en §37):
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

**Ideas de la prueba real, fuera de la spec** (decidir en la auditoría):
"Con esto, Martina te debe $X" en el aviso al guardar · comparar con el mes
pasado · iniciales en vez de foto · unificar los campos de texto.

**Sin probar todavía en el iPhone:** todo lo del 14/10 (ver la lista de
arriba), SA-04, varias cuotas por tarjeta y "Otro fijo" en O3, Deshacer.

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

### Al editar código
- **Para JSX usar siempre la tool Edit, NUNCA regex por Bash.** Me rompió
  archivos dos veces (se come las comillas de los props).
- Los scripts largos de Node van a un archivo en el scratchpad, no inline: las
  comillas anidadas rompen el parser.
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
npm run test:rls           # 37 asserts (necesita supabase login)
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

## 11. Patrones de UI y de lenguaje acordados (9 y 10/10)

| Patrón | Regla | Dónde vive |
|---|---|---|
| **Botón principal fijo** | En formularios, la acción principal va en `<Screen footer={...}>`: queda fija y sube con el teclado. En pantallas de contenido, NO | `src/ui/primitives/layout.tsx` |
| **Teclado** | `Screen` ya maneja el teclado (KeyboardAvoidingView + insets). Nada de `react-native-keyboard-controller`: no viene en Expo Go | idem |
| **Salir siempre** | Nunca `router.back()` a secas: `goBack(router)` (sin historial, va a la raíz). Cambio de árbol: `resetTo` | `src/features/shared/navigation.ts` |
| **Abrir un espacio** | `useOpenSpace()`, nunca la ruta armada a mano: personal → dentro de la pestaña; invitado → `/space/[id]` | `src/features/spaces/` |
| **"Con uno solo, entra directo"** | Se renderiza inline, nunca `useEffect` + `replace` (hacía loop) | `compartidos/index.tsx` |
| **Paso a paso vs formulario** | Paso a paso (`StepShell`, una pregunta por pantalla) en flujos poco frecuentes y con consecuencias. Formulario único con "Más opciones" en los frecuentes (Agregar: principio 4) | `StepShell`, `MoreOptions` |
| **"Tu parte"** | Nunca "te corresponde" en la UI: se leía como plata que te deben. "Parte" es el sinónimo del glosario §7.2 | todo `features/spaces` |
| **El mes del espacio** | Cuenta hasta hoy, igual que el saldo. Lo que falta: "Se vienen este mes" | `calculateSpaceMonth` |
| **Todo pago se ve** | Un pago entre miembros no cambia "puso" (P-04), pero aparece en el mes y en movimientos | `SpaceScreen` |
