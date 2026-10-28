<p align="center">
  <img src="docs/assets/miscent-logo.png" alt="Logo de Miscent" width="160">
</p>

<h1 align="center">Miscent</h1>

<p align="center"><strong>El radar de tus finanzas.</strong><br>
App móvil de finanzas personales y compartidas: qué parte de tus ingresos ya tiene destino, qué pagos se vienen y quién le debe a quién.</p>

<!-- TODO (dueño del repo): cuando el repo esté en GitHub, descomentar y reemplazar <USUARIO>/<REPO>:
<p align="center">
  <a href="https://github.com/<USUARIO>/<REPO>/actions/workflows/ci.yml"><img src="https://github.com/<USUARIO>/<REPO>/actions/workflows/ci.yml/badge.svg" alt="CI"></a>
</p>
-->

> **English summary.** Miscent is a mobile finance app (Expo SDK 57 / React Native / TypeScript strict / Supabase) for personal and two-person shared finances, built for the Argentine context (pesos, credit-card cut-off and due dates, installments). Its core idea is a "committed income radar": the app never claims to know how much money the user *has*; it only shows what the user declared, what is already committed and what is coming. **This is a portfolio project, not published to any store**, and the cloud Supabase project is paused. What is worth reading: a pure-TypeScript domain layer with a full business-rules spec behind it ([`src/domain/`](src/domain/)), Postgres RLS with pgTAP authorization tests ([`supabase/`](supabase/)), atomic and idempotent writes through RPCs ([migration 0022](supabase/migrations/20261021000022_atomic_writes.sql)), and a custom linter that enforces product-language rules ([`tools/language-lint.ts`](tools/language-lint.ts)). Docs are in Spanish. The code was written with AI coding agents directed by the author: an orchestrator delegating scoped tasks to subagents, spec-driven development against numbered business rules, TDD, and automated guardrails (see [Uso de IA](#uso-de-ia)). All rights reserved ([LICENSE](LICENSE)).

---

## Estado del proyecto

- **Es un proyecto de portfolio.** Se decidió **no publicarlo** en App Store ni Play Store. El repo es público para que se pueda leer y evaluar el código, la arquitectura, las decisiones técnicas y el proceso de desarrollo.
- **El backend en la nube está pausado.** El proyecto de Supabase donde se probó la app está pausado por inactividad; solo se reactivaría para una demo. Para correrla hoy hay que levantar Supabase en local ([ver abajo](#cómo-correrlo-localmente)).
- **Qué funciona** (según [`docs/handoff.md`](docs/handoff.md) §4 y probado por el autor en un iPhone con Expo Go): el MVP completo de la especificación. Registro por código de 8 dígitos o enlace, onboarding, Inicio con el radar, Movimientos, Futuro (próximos meses, cuotas), Agregar (gasto/ingreso, cuotas, fijos), tarjetas con días de cierre y vencimiento, espacios compartidos de a dos con saldo, pagos entre miembros, invitaciones, invitados sin cuenta personal, salida de un espacio, exportación CSV y eliminación de cuenta.
- **Qué no hay:** build de producción (EAS), cuentas de desarrollador, textos legales ni links de invitación `https`. Detalle en [Limitaciones conocidas](#limitaciones-conocidas).

## Qué problema resuelve

Según la [especificación funcional](docs/especificacion-funcional-v1.1.2.md) (§2): el problema no es "no sé cuánta plata tengo" (eso lo responde el banco), sino **no saber cuánto de lo que cobro ya está comprometido ni qué tengo que pagar próximamente**. Las cuotas, el resumen de la tarjeta y los gastos fijos van consumiendo el sueldo de los próximos meses sin que se note. Y en lo compartido, dos personas no saben quién viene poniendo más ni cuánto se deben.

La app lo resuelve con dos pilares:

- **Personal (privado):** ingresos, gastos, cuotas, tarjetas y fijos, con un "radar" del mes (ingresos registrados, gastado, comprometido, sin asignar) y una vista de los meses que vienen.
- **Compartido:** un *espacio* de exactamente dos personas donde se anota quién pagó qué; la app calcula el saldo. De cada gasto compartido, al radar personal de cada uno llega **solo su parte**.

El principio que atraviesa todo: **la app no conoce el dinero real del usuario**. No es un banco ni una billetera; trabaja con declaraciones y no verifica ninguna (por eso un pago pasado dice "Ya pasó", nunca "Pagado"). Esto no es un detalle de copy: define el modelo de datos, los textos permitidos y los tests.

## Nombre: Miscent y Radar

La marca es **Miscent** ("El radar de tus finanzas"). Pero el nombre **técnico** del proyecto sigue siendo **`radar`**: `name`, `slug` y `scheme` en [`app.json`](app.json), y `name` en [`package.json`](package.json). No es un olvido:

- El esquema `radar://auth/callback` lo usa el flujo de login (enlace mágico) y está en la allowlist de redirects de Supabase ([`supabase/config.toml`](supabase/config.toml)). Renombrarlo rompe el login.
- El nombre de trabajo original era "Radar del sueldo comprometido"; el branding ([`docs/branding-brief.md`](docs/branding-brief.md)) llegó cuando el producto ya estaba construido, y como la app no se publica, no hubo motivo para migrar identificadores.

Por eso, en los documentos y en el código vas a ver los dos nombres.

## Stack

| Capa | Tecnología |
| --- | --- |
| App | Expo SDK 57, React Native 0.86, React 19, TypeScript estricto, `newArchEnabled` |
| Navegación | Expo Router (rutas en [`app/`](app/)) |
| Estado de servidor | TanStack Query |
| Formularios y validación | react-hook-form, zod |
| Backend | Supabase: Postgres, Auth (código/enlace, usuarios anónimos), RLS, funciones RPC |
| UI | Primitivas propias sobre tokens claro/oscuro, Reanimated, react-native-svg |
| Tests | Vitest (dominio y lógica pura), Jest + React Native Testing Library (componentes), pgTAP (base) |

Versiones exactas en [`package.json`](package.json).

## Arquitectura

```
app/                  Rutas (expo-router): (auth), (personal), (guest), onboarding, space, invite, ...
src/
  domain/             TypeScript puro: radar, cuotas, tarjetas, reparto, saldo, futuro, ocurrencias
  data/               Supabase: cliente, mappers, repositorios, RPC, caché de queries
  features/           Una carpeta por área: auth, add, movements, spaces, onboarding, future, home, ...
  ui/                 Tokens, tema, movimiento y primitivas propias
  lib/format.ts       Formato es-AR hecho a mano (determinista)
supabase/
  migrations/         22 migraciones: esquema, RLS, operaciones, correcciones de permisos, escrituras atómicas
  tests/              pgTAP: privacidad.test.sql, integridad.test.sql
tools/                Linter de lenguaje, guardianes de código, smoke de RLS, integración local
docs/                 Especificación, auditoría, handoff, brief de branding
```

Tres decisiones estructurales (explicadas en [`docs/handoff.md`](docs/handoff.md) §3):

1. **El dominio es TypeScript puro.** [`src/domain/`](src/domain/) no importa React, Supabase ni nada externo, y nunca lee el reloj: `hoy` se inyecta siempre. Por eso sus tests corren en milisegundos y sin emuladores. Es la traducción directa de la regla de la spec "la app guarda hechos y calcula todo lo demás".
2. **El cálculo vive en el cliente; el servidor guarda hechos y hace cumplir el acceso.** Como el motor es determinista sobre los mismos hechos, los dos miembros de un espacio ven exactamente el mismo saldo.
3. **[`src/data/mappers.ts`](src/data/mappers.ts) es la única frontera entre Postgres y el dominio.** El dominio nunca importa los tipos generados de Supabase.

Del modelo de datos ([`supabase/migrations/`](supabase/migrations/)): montos como `integer` en pesos enteros (nunca float), fechas de negocio como `DATE` (evita de raíz los bugs de zona horaria) y un `CHECK (share_slot_1 + share_slot_2 = amount)` que hace que un reparto mal calculado no pueda llegar a la base ([schema](supabase/migrations/20261008000001_schema.sql)).

## Decisiones técnicas destacadas

- **Privacidad por RLS, probada.** Lo personal es privado por defecto y lo compartido se comparte a propósito. Hay asimetrías reales (por ejemplo, `shared_payment_details`, el detalle de pago que ve solo uno de los dos miembros del espacio), así que la autorización se verifica con pgTAP: [`supabase/tests/privacidad.test.sql`](supabase/tests/privacidad.test.sql) (`plan(98)`). Las migraciones de permisos ([0008](supabase/migrations/20261010000008_function_grants.sql), [0012](supabase/migrations/20261014000012_close_public_execute.sql), [0014](supabase/migrations/20261014000014_close_public_execute_global.sql)) documentan un gotcha concreto de Postgres/Supabase: `revoke ... from public` no alcanza porque `anon` hereda `EXECUTE` de `PUBLIC`.
- **Escrituras atómicas e idempotentes.** Las operaciones de varios pasos (guardar una deuda de tarjeta, mover un gasto entre personal y compartido, salir de un espacio) son funciones transaccionales de todo o nada en la [migración 0022](supabase/migrations/20261021000022_atomic_writes.sql). Toda alta lleva un id generado en la app ([`src/data/ids.ts`](src/data/ids.ts)) y es un upsert, y las mutaciones usan `networkMode: 'always'` ([`src/data/queryClient.ts`](src/data/queryClient.ts)), así que un reintento por red no duplica datos. Origen: la [auditoría inicial](docs/auditoria-inicial.md) (hallazgos H-01 a H-16).
- **Errores que no se disfrazan de "vacío".** Un estado `loading | error | ready` ([`src/features/shared/loadState.ts`](src/features/shared/loadState.ts)) evita que una falla de red se vea como "no tenés gastos" o como un saldo en cero.
- **Invitaciones e invitados anónimos.** Quien recibe una invitación entra a un espacio sin crear cuenta personal (usuario anónimo de Supabase) y puede después vincular su email. La regla "sin email no hay cuenta personal" la hace cumplir el servidor ([migración 0006](supabase/migrations/20261010000006_anonymous_guests.sql)). La lógica de identidad es pura y testeada ([`authFlow.ts`](src/features/auth/authFlow.ts), [`invitationLink.ts`](src/features/auth/invitationLink.ts)).
- **El lenguaje del producto es una regla verificable.** Palabras como "disponible", "te queda" o "libre" están prohibidas en la interfaz porque afirmarían que la app conoce el dinero del usuario. [`tools/language-lint.ts`](tools/language-lint.ts) escanea los literales de string y hace fallar `npm run verify` (y el CI) si aparece alguna (criterio CA-00 de la spec); además hay tests de componentes que fijan los textos obligatorios.
- **Guardianes de código.** Dos tests estructurales evitan clases enteras de bugs: [`no-redirect-in-effect.test.ts`](tools/no-redirect-in-effect.test.ts) (ningún `useEffect` llama a `replace`, que producía loops de navegación) y [`alerts-are-confirmations.test.ts`](tools/alerts-are-confirmations.test.ts) (los errores van por toast; `Alert` solo para confirmaciones).
- **Reglas financieras con casos de verificación.** Los casos A–G de la spec (§29.1) son pruebas, no ejemplos, y están como tests en [`src/domain/__tests__/verificacion-matematica.test.ts`](src/domain/__tests__/verificacion-matematica.test.ts). Las cuatro ambigüedades que detectó la auditoría previa (F1–F4) y cómo se resolvieron están en [`docs/handoff.md`](docs/handoff.md) §9.
- **Historia de datos que protege el pasado.** Los días de cierre y vencimiento de una tarjeta tienen historia ([migración 0020](supabase/migrations/20261016000020_payment_method_days.sql)): corregirlos recalcula de ese mes en adelante sin reescribir los meses cerrados.

## Testing

Cuatro niveles (detalle en [`docs/handoff.md`](docs/handoff.md) §4):

| Nivel | Qué cubre | Comando | Necesita Supabase |
| --- | --- | --- | --- |
| 1. Dominio y lógica pura (Vitest) | Reglas de negocio, casos A–G, identidad, navegación, contraste WCAG de los tokens | `npm run test` | No |
| 2. Componentes (Jest + RNTL) | Pantallas, lenguaje obligatorio, navegación de pestañas | `npm run test:componentes` | No |
| 3. Lint de lenguaje | Automatiza CA-00 | `npm run lint:lenguaje` | No |
| 4. Base de datos | RLS y autorización (pgTAP), integridad de escrituras, repositorios contra la base | `test:rls`, `test:integridad`, `test:rls:docker`, `test:integracion` | Sí |

`npm run verify` encadena typecheck (3 configuraciones de TypeScript) + los tres primeros niveles, sin red. Es lo que corre el CI ([`.github/workflows/ci.yml`](.github/workflows/ci.yml)).

**Resultados reales de `npm run verify`, ejecutado el 27/10/2026 en Windows con Node 22:**

| Paso | Resultado |
| --- | --- |
| `npm run typecheck` | OK |
| `npm run test` (Vitest) | 112 archivos OK (1 salteado) · **1381 tests OK**, 11 salteados (son los de integración, que requieren Supabase local) |
| `npm run test:componentes` (Jest) | 64 suites OK · **435 tests OK** |
| `npm run lint:lenguaje` | OK, sin términos prohibidos |

Los tests de base (nivel 4) **no forman parte de `npm run verify`** y no se ejecutaron en esa corrida: los scripts `test:rls` y `test:integridad` apuntan al proyecto remoto, que está pausado. Se corrieron aparte el 28/10/2026 contra el Supabase local en Docker: `npx supabase test db --local` dio **144 tests OK** (`plan(98)` en [`privacidad.test.sql`](supabase/tests/privacidad.test.sql) + `plan(46)` en [`integridad.test.sql`](supabase/tests/integridad.test.sql), Result: PASS) y `npm run test:integracion` dio **11 tests OK** (ver [`docs/handoff.md`](docs/handoff.md) §5 y la sección siguiente).

> Nota: en una corrida local en Windows, `test:componentes` falló una vez por un error de escritura en el caché de Jest y pasó completo al repetirla. En CI (Linux, `npm ci`, sin caché previo) no debería ocurrir.

## Cómo correrlo localmente

> **Estado de esta sección:** verificado el 28/10/2026 en Windows con Docker Desktop: `npx supabase start`, `db reset --local` (las 22 migraciones se aplican sin errores), `npx supabase test db --local` (144 de 144, PASS), `npm run test:integracion` (11 de 11) y el buzón de mails local. **No verificado:** correr la app en un celular contra el Supabase local y el flujo completo de login/invitaciones desde la app (solo se comprobó que el endpoint de login anónimo del Supabase local responde). Si algo no coincide, el [handoff](docs/handoff.md) §5 y §6 tiene los detalles.

**Requisitos:** Node.js 22.13 o superior (lo exige Expo SDK 57), npm, Docker Desktop (para Supabase local) y la app **Expo Go** en un celular (o un emulador).

1. **Instalar dependencias**

   ```bash
   npm install
   ```

2. **Levantar Supabase en local**

   ```bash
   npx supabase start             # primera vez: descarga las imágenes de Docker (~3 min en la prueba)
   npx supabase db reset --local  # aplica las 22 migraciones desde cero (~1 min)
   npx supabase status            # muestra las URLs y la anon key locales
   ```

   Puertos locales: API en `http://127.0.0.1:54321`, Studio en `http://127.0.0.1:54323` y buzón de mails (Mailpit) en `http://127.0.0.1:54324`. Los mails (incluido el código de acceso de 8 dígitos) no se envían: quedan en ese buzón. Al resetear aparece `no files matched pattern: supabase/seed.sql`: es esperable, el repo no tiene seed.

   Para frenar todo: `npx supabase stop`.

   **Tests de base de datos en local** (no tocan el proyecto remoto):

   ```bash
   npx supabase test db --local   # pgTAP: 144 tests (98 de privacidad + 46 de integridad)
   npm run test:integracion       # 11 tests de repositorios contra el Supabase local
   ```

   `test:integracion` toma la URL y las claves de `npx supabase status` y se niega a correr si la URL no es `localhost` / `127.0.0.1`.

3. **Variables de entorno.** Copiá [`.env.example`](.env.example) a `.env.local` y completá:

   ```
   EXPO_PUBLIC_SUPABASE_URL=...        # API URL de `supabase status`
   EXPO_PUBLIC_SUPABASE_ANON_KEY=...   # anon key de `supabase status`
   ```

   `.env.local` está en `.gitignore`: nunca subas valores reales. Si usás un celular físico, `127.0.0.1` apunta al propio celular, no a tu PC; hace falta una URL alcanzable desde la red (no verificado: no se probó la app en un celular contra el Supabase local).

4. **Iniciar la app**

   ```bash
   npm start
   ```

   Escaneá el QR con Expo Go. Para ingresar, usá el **código de 8 dígitos** que llega al buzón local. El enlace mágico no vuelve a la app con `npm start` (limitación de GoTrue con IPs de red local, explicada en [`docs/handoff.md`](docs/handoff.md) §6).

**Login anónimo:** el flujo de invitados sin cuenta usa usuarios anónimos (`signInAnonymously` en [`src/data/auth.ts`](src/data/auth.ts)). En el proyecto remoto original estaba activado desde el dashboard, así que [`supabase/config.toml`](supabase/config.toml) lo tiene en `enable_anonymous_sign_ins = true` para que la configuración local lo refleje. Los 11 tests de `test:integracion` no lo usan; sí lo necesita la app para las invitaciones. Con el valor en `true`, el endpoint de registro anónimo del Supabase local respondió con una sesión; el flujo de invitaciones desde la app no se probó. La [auditoría](docs/auditoria-inicial.md) señala esta diferencia entre la configuración local y la hospedada.

**Verificación sin Supabase:**

```bash
npm run verify      # typecheck + vitest + jest + lint de lenguaje
```

Los scripts `db:*`, `test:rls*` y `test:integracion` operan sobre una base y no hacen falta para leer o verificar el código.

## Proceso de desarrollo

- **Spec primero.** Antes del código hay una [especificación funcional](docs/especificacion-funcional-v1.1.2.md) de ~1800 líneas con reglas de negocio numeradas, casos matemáticos y criterios de aceptación (CA-00 a CA-54). Las decisiones de producto quedan registradas con etiquetas ([DECISIÓN], [RECOMENDACIÓN], [HIPÓTESIS], [PENDIENTE]).
- **Auditoría.** Antes de cerrar el MVP se hizo una [auditoría inicial](docs/auditoria-inicial.md) de solo lectura que clasifica cada hallazgo por certeza (verificado, documentado, hipótesis) y por prioridad. Los grupos P0/P1 se corrigieron después (ver la migración 0022).
- **Historia de git limpia.** 199 commits (al 27/10/2026) en Conventional Commits, en español, uno por tema. Es parte de lo que conviene leer: `git log --oneline`.
- **Handoff.** [`docs/handoff.md`](docs/handoff.md) es el documento de traspaso que se mantuvo entre sesiones: invariantes del producto, gotchas con su causa raíz y estado. Fue escrito para retomar el trabajo, no para ser leído como marketing, y refleja el plan de ese momento (menciona tiendas y piloto, que ya no son el objetivo).
- **Wireframes antes de la UI.** Ver [Uso de IA](#uso-de-ia). Esos wireframes no están en el repo.

## Uso de IA

El proyecto se desarrolló con **agentes de código con IA (Claude Code) dirigidos por el autor**. Mucho del código de este repo lo escribieron esos agentes. Lo que no se delegó es el criterio: la especificación, las decisiones de producto y de arquitectura, la aprobación de todo lo irreversible y la prueba de la app a mano en un iPhone. Esta es la metodología, con la evidencia que queda en el repo:

- **Un orquestador y subagentes con tareas acotadas.** Un agente principal mantiene el hilo de la conversación y coordina; el trabajo real (explorar código, implementar una tanda de un tema, verificar, auditar) lo hacen subagentes que arrancan con contexto limpio, reciben solo lo que necesitan y devuelven un resumen. Así el contexto del orquestador no se degrada en sesiones largas y cada tanda termina en un commit por tema ([`docs/handoff.md`](docs/handoff.md) §1).
- **Desarrollo guiado por especificación (spec-driven).** La [especificación funcional](docs/especificacion-funcional-v1.1.2.md) es anterior al primer commit y es el contrato: cada regla tiene un ID (`A-03`, `C-02`, `CA-05`) y los agentes trabajan contra esos IDs, no contra una descripción suelta. 79 de los 179 archivos de test citan IDs de la spec o de la auditoría. Ante una ambigüedad de producto, el agente no decide: pregunta con opciones y una recomendación (así se resolvieron F1–F4, handoff §9).
- **TDD.** Las reglas se implementan con el test primero: test que falla, implementación mínima, refactor. En el historial se ve como test e implementación en el mismo commit, porque se commitea el tema terminado: 93 de 106 commits `feat` y 41 de 53 `fix` incluyen tests. El dominio puro y la fecha inyectada (ver [Arquitectura](#arquitectura)) existen en buena parte para que esto sea rápido.
- **Barandas en lugar de confianza.** Los errores típicos de los agentes se convirtieron en controles automáticos: [`AGENTS.md`](AGENTS.md) con las reglas del repo, tests estructurales como [`no-redirect-in-effect.test.ts`](tools/no-redirect-in-effect.test.ts) y [`alerts-are-confirmations.test.ts`](tools/alerts-are-confirmations.test.ts), el [lint de lenguaje](tools/language-lint.ts) y `npm run verify` en verde como definición de terminado. Cuando un subagente se salía de una regla (por ejemplo, editar archivos con `sed` en vez de con la herramienta de edición), la regla pasaba a ser explícita en el siguiente encargo (handoff §6).
- **Memoria entre sesiones.** Un agente no recuerda la sesión anterior. El [handoff](docs/handoff.md) y una memoria persistente con las decisiones por tema hacen que el contexto (invariantes, decisiones de UX, gotchas con su causa raíz) sobreviva entre sesiones.
- **El humano en el circuito para lo irreversible.** Ninguna migración se aplicó a la base remota sin el OK del autor: el `db push` lo corría el autor, y el agente verificaba después con los tests de RLS.
- **Decisiones visuales con wireframes.** Antes de rediseñar una pantalla, el agente dibujaba las opciones lado a lado, con qué gana y qué pierde cada una y una recomendación; recién cuando el autor elegía, se implementaba.
- **Revisión independiente.** La [auditoría inicial](docs/auditoria-inicial.md) la hicieron agentes de solo lectura, con un nivel de certeza por hallazgo (verificado, documentado, hipótesis) y una segunda lectura de los hallazgos críticos; las correcciones P0/P1 vinieron después, con su propia migración.

## Limitaciones conocidas

Lo que faltaría para publicarla (lista completa en [`docs/handoff.md`](docs/handoff.md) §5), visto como mapa de deuda y de criterio:

- **Distribución:** no hay build propio con EAS, `bundleIdentifier`/`package` ni cuentas de desarrollador. Hoy solo corre en Expo Go.
- **Invitaciones:** los links son `exp://` o `radar://`, que apps como WhatsApp no vuelven tocables; haría falta un dominio `https`, una página puente y Universal Links / App Links.
- **Mail transaccional:** el proyecto original enviaba el código por Gmail con contraseña de aplicación; para producción haría falta un proveedor transaccional con dominio propio.
- **Abuso de usuarios anónimos:** falta un CAPTCHA contra la creación masiva, y un invitado que pierde el teléfono antes de guardar su email pierde el acceso.
- **Legales y privacidad:** hay decisiones de producto abiertas (P9 a P12) que bloquean redactar una política de privacidad.
- **Dependencias:** `npm audit` reportaba vulnerabilidades, mayormente de herramientas de desarrollo (pendiente de revisar).
- **Pendientes de producto y de pulido:** reglas abiertas (por ejemplo, quién cambia la cantidad de cuotas de una compra con la tarjeta del otro), accesibilidad por auditar a fondo (Dynamic Type, valores accesibles en gráficos) y alertas nativas que no siguen el tema elegido en la app.
- **Verificación visual:** el repo no incluye capturas ni wireframes.

## Licencia

Todos los derechos reservados. El código es público para lectura y evaluación como muestra de trabajo; no se concede licencia de uso, copia ni distribución. Ver [LICENSE](LICENSE).

## Documentación

| Documento | Qué es |
| --- | --- |
| [`docs/especificacion-funcional-v1.1.2.md`](docs/especificacion-funcional-v1.1.2.md) | Fuente de verdad funcional: modelo, reglas de negocio, casos de verificación y criterios de aceptación |
| [`docs/auditoria-inicial.md`](docs/auditoria-inicial.md) | Diagnóstico de solo lectura del proyecto, con hallazgos priorizados y nivel de certeza |
| [`docs/handoff.md`](docs/handoff.md) | Traspaso entre sesiones: arquitectura, invariantes, estado, gotchas y comandos |
| [`docs/branding-brief.md`](docs/branding-brief.md) | Brief para definir nombre, identidad visual y voz de la marca |
| [`AGENTS.md`](AGENTS.md) | Instrucciones para los agentes de código que trabajan en el repo |
