# Handoff · Radar del sueldo comprometido

Contexto para retomar el proyecto en una sesión nueva.
Última actualización: 9 de octubre de 2026 · working tree limpio.

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
- Ante una ambigüedad de producto: **preguntar**, no decidir (§40.1).
- Commits: conventional, en español, **sin atribución de IA**.

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
│   ├── migrations/           5 migraciones: schema, rls, operations, fix_pgcrypto,
│   │                         deleted_shared_records (SY-02)
│   └── tests/privacidad.test.sql   32 asserts pgTAP
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

**Fases 0 a 10.** `git log --oneline` para verlos. **El Must está completo.**

| Área | Estado |
|---|---|
| Dominio (§29 completo) | ✅ Los 7 casos de §29.1 pasan exactos |
| Supabase + RLS | ✅ 13 tablas, 30 políticas, 6 RPC, 1 trigger · **32/32 asserts** |
| UI base | ✅ Tokens claro/oscuro, motion, 14 primitivas propias |
| O1 · O2 · O3 | ✅ Completos, con T-07/Q-06 derivados del último cierre |
| Enlace mágico en Expo Go | ✅ Por tunnel, con pantalla `/auth/callback` (ver §6) |
| Agregar (§17) | ✅ Con vista previa de cuotas y fecha editable (Hoy · Ayer · Otra) |
| SY-02 | ✅ Registro de borrados por trigger: nombra a quien eliminó, sin suponer |
| Inicio (§15) | ✅ Radar, con tarjeta este mes, próximos pagos, próximos meses |
| Futuro (§23) | ✅ 23.1 + 23.2 + 23.3 |
| Movimientos (§16) | ✅ Con gastos compartidos y filtros |
| M18 "¿de dónde sale?" | ✅ CA-04 y CA-52 testeados palabra por palabra |
| Espacios (§24) | ✅ Saldo, mes, próximos meses, movimientos |
| Pagos (§25) · Invitaciones (§26) | ✅ |
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
| 1 · Dominio (vitest) | Casos A–G, CA-*, casos de uso | 148 |
| 2 · Autorización (pgTAP) | PR-01, PR-02, CA-11..13, CA-47, CA-48, SY-02, SA-06 | 32 |
| 3 · Componentes (jest-expo) | El lenguaje **obligatorio** | 28 |
| 4 · Lint de lenguaje | **Automatiza CA-00** | en CI |

El nivel 4 ya cazó **4 errores míos** ("te quedaría", "el saldo", "Te quedan N
cuotas"). El nivel 3 encontró **2 bugs reales**.

---

## 5. Qué falta

### Del Must
Nada. T-07, SY-02 y la fecha editable se cerraron el 9/10.

### Recomendaciones y Should
- SA-04 · preguntarle a quien queda si adopta el fijo detenido
- Editar un recurrente **compartido** (los personales ya se editan)
- P6 · qué ve un ex miembro (decidido: resumen fijo del saldo al salir)
- §28 exportar datos (CSV)
- Accesibilidad: auditar contraste y tamaños de toque (los labels ya están)
- Should de §5: aviso de duplicado, compartir resumen como texto, quitar
  acceso por enlace reenviado, actividad reciente, totales por categoría

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
  `exp://znfuh80-rciminello22-8081.exp.direct/--/auth/callback` (subdominio
  fijo por la cuenta de Expo). Nunca un comodín `*.exp.direct`: el dominio es
  compartido y el flujo implícito manda los tokens en la URL.
- **Probar un redirect sin gastar mails** (el SMTP integrado tiene rate limit):
  `curl -s -o /dev/null -w "%{redirect_url}" "$URL/auth/v1/verify?token=x&type=magiclink&redirect_to=<URL>"`.
  Si vuelve a `<URL>#error=...`, está permitida; si vuelve a `radar://`, no.
  Ojo: `127.0.0.1` pasa siempre (RFC 8252), así que no prueba nada.
- Renzo usa **Windows sin Android SDK** (`ANDROID_HOME` sin definir), así que
  `expo run:android` no corre. Prueba con **Expo Go en iPhone**.

### Testing
- **`render` es ASYNC desde RNTL 14.** Sin `await` da "render function has not
  been called", que no dice nada sobre la causa.
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
npm run test:rls           # 32 asserts (necesita supabase login)
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
