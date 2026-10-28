# Auditoría inicial de Miscent · Etapa 1: diagnóstico del proyecto

**Fecha:** 20 de octubre de 2026 · **Alcance:** solo lectura, sin cambios en código, base de datos ni configuración · **Rama:** `master` (commit `ef76b6c`)

> **Cómo leer este informe.** Cada afirmación lleva su nivel de certeza:
>
> - **V** · Verificado: respaldado por código, configuración o una comprobación ejecutada. Cuando dice **V\***, el hallazgo lo volvió a leer el auditor principal, línea por línea, además del primer relevamiento.
> - **D** · Documentado, pero no verificado en la implementación.
> - **H** · Hipótesis: riesgo deducido del código, que requiere comprobarse en ejecución.
> - **P** · Pendiente de inspección: no se pudo determinar.
>
> **Nada de lo visual se vio en pantalla.** La app no se ejecutó: todo lo que dice sobre la interfaz sale de leer el código. Las rutas son relativas a la raíz del repo (`C:\Users\cimin\Desktop\radar`).

---

## 1. Resumen ejecutivo

### Estado general

El proyecto es un MVP funcionalmente completo, con una base técnica sólida y bien documentada. **No está listo para tiendas** (lo dice el propio `HANDOFF.md` §5). El nombre **"Miscent" no existe todavía en ningún archivo** del repo ni de la documentación: la app se llama "Radar" (`app.json:3`) y el producto, "Radar del sueldo comprometido", que el `BRANDING_BRIEF.md:29` declara nombre de trabajo. El branding (P17) está pendiente y es lo próximo según el handoff.

### Qué está bien definido

- **La especificación funcional V1.1.2** (1795 líneas) define con precisión el modelo conceptual (§7), las reglas de negocio (§29) y siete casos matemáticos que funcionan como pruebas (§29.1). Las decisiones se registran con fecha en §37 y §38 (hasta P27, del 20/10).
- **Las reglas de lenguaje** (G-05, G-06, CA-00) están definidas y automatizadas con un linter.
- **Los patrones de UI** acordados (jerarquía N1/N2/N3, signos, tocable vs informativo, errores por toast) están en `HANDOFF.md` §11.

### Qué está implementado

- 63 archivos de rutas (expo-router), unas 58.000 líneas de TypeScript, 21 migraciones de Supabase con RLS.
- Pilar personal: Inicio con radar, Movimientos, Futuro (6 meses, pagos, cuotas), Agregar, detalle y edición, fijos, tarjetas con días aproximados e historia de días, Perfil, export CSV, eliminar cuenta.
- Pilar compartido: espacios de dos, gasto puntual/cuotas/fijo, reparto 50/50 o personalizado, saldo, mes, pagos entre miembros, invitación, invitado anónimo sin cuenta, salida, espacios que dejaste, revisión de lo que carga el otro (K10), aviso de eliminaciones (P27).
- **Suite de verificación en verde, ejecutada en esta auditoría:** typecheck (3 configuraciones), vitest **1318/1318**, jest **434/434**, lint de lenguaje CA-00 sin violaciones. **V**
- Los siete casos de §29.1 tienen test y sus valores coinciden con la spec. **V**

### Qué no se pudo verificar

- La interfaz real: no se ejecutó la app, no hay capturas.
- La base remota: no se corrieron `test:rls` ni `test:rls:smoke`, porque escriben (aunque con rollback) o consultan la base real. Los 98 asserts pgTAP se leyeron, no se ejecutaron.
- La configuración del proyecto hospedado de Supabase (SMTP, anónimos, redirects): solo se leyó el `config.toml` local, que difiere (anónimos en `false`).
- Los wireframes de referencia (artifact citado en `HANDOFF.md` §5): no se abrieron.

### Principales riesgos

1. **Integridad de datos en el onboarding** (P0): el paso de deuda puede duplicar resúmenes declarados y cuotas, lo que duplica el Comprometido. **V\***
2. **Cifras que pueden estar mal o vacías sin aviso** (P1): un fijo con tarjeta puede quedar fuera del Comprometido del mes; cuatro pantallas de cifras muestran "vacío" ante un error de red. **V\***
3. **Errores duros en flujos frecuentes** (P1): un crash al corregir el monto con reparto personalizado; ediciones y "Terminar ahora" que la base rechaza. **V\***
4. **Operaciones de varios pasos sin transacción** y sin idempotencia: guardados parciales y duplicados ante fallas de red.
5. **Textos que contradicen lo que pasa** (P1): salir de un espacio en Modo 1 lo borra entero mientras la pantalla dice que el otro conserva todo. **V\***
6. **Accesibilidad**: contraste de la acción principal en oscuro, Dynamic Type sin tope con alturas fijas, gráficos sin valor accesible.
7. **Proyecto sin remoto de git**: los 189 commits existen solo en esta máquina.

---

## 2. Documentación y estado del repositorio

### Archivos de referencia encontrados

| Archivo | Ubicación | Estado |
|---|---|---|
| `HANDOFF.md` | raíz del repo, 837 líneas, actualizado el 20/10/2026 | Leído completo, empezando por "▶ Por dónde seguir" (§5) y §11, como pide el documento |
| **Especificación funcional V1.1.2** | `C:\Users\cimin\Desktop\Especificación funcional V1.1.2 — Radar del sueldo comprometido.md` (fuera del repo), 1795 líneas | Leída: §1–§30 y §32–§40 completas; §31 (casos de uso) por índice |
| `BRANDING_BRIEF.md` | raíz del repo | Leído parcialmente (contexto del nombre) |
| `AGENTS.md` | raíz del repo | Leído (reglas de Expo) |
| `C:\Users\cimin\.claude\CLAUDE.md` | global del usuario | Leído |

### Versiones de la especificación

En el escritorio conviven V1.0, V1.1, V1.1.1, V1.1.2, la "Especificación de producto — MVP", la "Decisión de producto — Modelo de cuentas" y una investigación de mercado. **La vigente es la V1.1.2** por tres razones:

1. Su encabezado dice que "consolida y reemplaza" a todas las anteriores (spec, línea 5).
2. `HANDOFF.md` §1 la declara fuente de verdad y dice que las otras "están superadas. No usarlas".
3. Es la única modificada después del 6/10 (archivo del 20/10, con las decisiones P23 a P27 de esa semana).

**Inconsistencias internas de la propia spec** (registradas, no resueltas):

| # | Inconsistencia | Evidencia |
|---|---|---|
| S-1 | El encabezado dice "6 de octubre de 2026" aunque el archivo incorpora decisiones hasta el 20/10 | spec:3 vs §38 P27 |
| S-2 | **"Te corresponde"** figura como lenguaje obligatorio (principio 11, glosario §7.2, microcopy §33: "Casa · te corresponde $X"), pero el código lo prohíbe: "Nunca 'te corresponde' en la UI: se leía como plata que te deben" | spec:128, 224, 1401 vs `HANDOFF.md` §11 |
| S-3 | X-09 dice que una tarjeta con pagos "se reasigna o archiva"; P24 lo reemplaza ("no existe Archivar") sin editar X-09 | spec:946 vs 1682 |
| S-4 | P21(b) pide revisar lo eliminado durante 60 días; P27 fija el aviso en 7 días. Conviven las dos ventanas (el cliente pide 60 días de rastros y la UI usa 7) | spec:1679, 1685; `src/data/repositories/personal.ts:134` |
| S-5 | La spec dice "enlace mágico" en O1 y "email" para el invitado (O2, K8, P1); el código usa código de 8 dígitos + enlace, y el invitado entra anónimo sin email. Está documentado como decisión de la etapa de testeo, no en la spec | `HANDOFF.md` §5 "Antes de producción", §10 |
| S-6 | El "Estado de la especificación" lista como pendientes P6, P7, P8, P13, P16 y P18, que ya están implementados o decididos | spec:1756 |

### Diferencias entre el contexto del pedido y el producto real

| Lo que dice el pedido | Lo que se verificó |
|---|---|
| "Miscent" | No aparece en ningún archivo. El nombre es de trabajo y el branding está pendiente (P17). **V** |
| "Se enfoca en egresos y compromisos" | El radar se apoya en **ingresos registrados**: Sin asignar = Ingresos registrados − (Gastado + Comprometido) (N-04). La app registra ingresos fijos y puntuales. **V** |
| "Marcado de un pago como pagado, si esa función existe" | **No existe por diseño**: G-06 y CA-45 prohíben "Pagado"; un pago con fecha pasada se muestra "Ya pasó". El lint lo hace cumplir. **V** |
| "Acceso sin cuenta, si está implementado" | Sí: el invitado entra como usuario **anónimo** de Supabase, sin email, con nombre visible. **V** |
| "Ave geométrica con un radar integrado" | No hay ningún asset de marca: ícono, splash e ícono adaptativo son los de la plantilla de Expo. **V** |

### Stack verificado

| Pieza | Versión real | Evidencia |
|---|---|---|
| Expo SDK | ~57.0.27 | `package.json` |
| React Native / React | 0.86.3 / 19.2.3 (New Architecture activa) | `package.json`, `app.json:33` |
| TypeScript | ~6.0.3, `strict` + `noUncheckedIndexedAccess` | `tsconfig.json` |
| Navegación | expo-router ~57.0.25 | `package.json` |
| Estado de servidor | @tanstack/react-query ^5.104.1 | `src/data/queryClient.ts` |
| Backend | @supabase/supabase-js ^2.117.3 · Postgres 17.11 en sa-east-1 | `HANDOFF.md` §6 |
| Formularios | **Estado local a mano** (`useState`) y validación propia (`saveBlockReason.ts`). `zod` y `react-hook-form` están instalados **sin uso** | rg sin importaciones |
| Gráficos | **Ninguna librería**: `react-native-svg` 15.15.4 y `View` a mano | rg |
| Animación | react-native-reanimated 4.5.1 (worklets 0.10.4 transitivo, no declarado) | `babel.config.js:7` |
| Íconos | lucide-react-native ^1.52.0 | `package.json` |
| Tipografía | Inter 400/500/600 vía @expo-google-fonts | `src/ui/tokens.ts:69-73` |
| Tests | vitest 5 (dominio y lógica, Node), jest-expo 57 + RNTL 14 (componentes), pgTAP (RLS) | `vitest.config.mts`, `jest.config.js` |
| Ejecución | **Solo Expo Go** en un iPhone, por tunnel. No hay `eas.json`, `bundleIdentifier` ni `package` | `HANDOFF.md` §5, `app.json` |

### Estado de Git y restricciones

- Rama `master`, árbol de trabajo **limpio** al empezar y al terminar (salvo este informe, que es un archivo nuevo sin commitear). **V**
- **No hay ningún remoto configurado** (`git remote -v` vacío) ni stashes. Los 189 commits viven solo en este disco. El handoff habla de "sin push", pero en realidad no hay dónde pushear. **V**
- La "rama principal" que informa el entorno se llama `main`, pero no existe localmente: solo hay `master`. **V**
- Variables sensibles: existen `.env.local` (gitignored) y `.env.example`. No se abrieron sus valores.
- Restricciones del handoff que hay que respetar en las próximas etapas:
  - Ninguna migración se aplica sin OK explícito de Renzo, y el `db push` lo corre él.
  - `npx expo lint` **no está configurado**: correrlo instala eslint y modifica `package.json`. El chequeo es `npm run verify`.
  - Nunca `supabase config push` sin `config diff` (degrada la seguridad).
  - `npx expo install`, nunca `npm install`, para paquetes nativos (Expo Go).
  - Metodología obligatoria de wireframes HTML lado a lado antes de cualquier decisión de UI, con anotaciones en notas amarillas "NOTA".
  - Los `.spec.tsx` no pueden vivir en `app/` (se vuelven rutas).

---

## 3. Inventario de pantallas

Nivel de verificación de toda la tabla: **inspección de código**. Ninguna se vio en ejecución. Los componentes de pantalla están testeados con jest en su mayoría (lenguaje obligatorio y navegación), pero eso no equivale a comportamiento visual comprobado.

### Entrada, autenticación e invitación

| Pantalla | Ruta | Archivo principal | Función | Estado | Estados alternativos |
|---|---|---|---|---|---|
| Raíz | `/` | `app/index.tsx` | Redirige declarativamente según el estado de cuenta | Completa | Spinner de carga |
| Bienvenida (O1 pasos 1-2) | `/(auth)/bienvenida` | `app/(auth)/bienvenida.tsx` | Tres opciones ("Ordenar mi plata", "Compartir gastos", "Las dos"), Empezar, Ya tengo cuenta, Tengo una invitación | Completa; la elección no cambia los pasos (H-17) | — |
| Privacidad (O1 paso 3) | `/(auth)/privacidad` | `privacidad.tsx` | "Tus números son tuyos" | Completa | — |
| Email (O1 paso 4) | `/(auth)/email` | `email.tsx` | Pide el email y envía el código | Completa | Error en línea, carga |
| Código | `/(auth)/revisa-tu-email` | `revisa-tu-email.tsx` | Código de 8 dígitos (se envía solo al completarlo), reenviar, usar otro email | Completa | Error en línea; "Código reenviado" queda deshabilitado (H-46) |
| Pegar invitación | `/(auth)/invitacion` | `invitacion.tsx` | Pegar un enlace o token | Completa | Error de formato |
| Callback del enlace | `/auth/callback` | `app/auth/callback.tsx` | Aterrizaje del deep link | Completa | Pendiente / falló ("Pedir un enlace nuevo", H-17) |
| Aceptar invitación (O2) | `/invite/[token]` | `app/invite/[token].tsx` | Explica qué se ve, pide el nombre, entra como anónimo | Completa, con diferencias de spec (H-36) | Error de la invitación (vencida, usada, anulada, lugar ocupado, P4) |

### Onboarding O3 (activación de la cuenta personal)

| Pantalla | Ruta | Función | Persiste | Estado |
|---|---|---|---|---|
| Cuenta personal | `/onboarding/cuenta-personal` | Explica y activa (RPC `app_activate_personal_account`) | Al tocar el botón | Completa |
| Guardar acceso | `/onboarding/guardar-acceso` | Vincula un email al anónimo antes de activar | Al confirmar el código | Completa |
| Ingreso | `/onboarding/ingreso` | Sueldo mensual como fijo; día "Sé / Más o menos / No sé" | Al Continuar | Completa; traga el error sin aviso (H-16) |
| Tarjetas | `/onboarding/tarjetas` | Alta de tarjetas con días | Al "Guardar tarjeta" | Completa; descarta en silencio una tarjeta escrita (H-16) |
| Deuda | `/onboarding/deuda` | Por tarjeta: resumen pendiente, cuotas en curso, consumos previos | Al Continuar, 3 escrituras | **No idempotente (H-01)** |
| Pagados | `/onboarding/pagados` | "¿Con qué pagaste?" los gastos de espacios | Por fila | Completa |
| Fijos | `/onboarding/fijos` | Sugerencias tildables y "Otro fijo" | Al Continuar, una escritura por fijo | No atómica (H-16) |
| Listo | `/onboarding/listo` | Resultado; consume el borrador del invitado | Al terminar | Completa; sin guarda de doble toque (H-11) |

Las pantallas de ingreso y tarjetas se reutilizan desde Perfil con `?desde=perfil`.

### Estado A: usuario con cuenta personal (pestañas)

| Pantalla | Ruta | Archivo principal | Función e información | Acciones | Estados alternativos |
|---|---|---|---|---|---|
| Inicio | `/(personal)/inicio` | `app/(personal)/inicio.tsx`, `RadarSummary`, `HomeDoors`, `SpacesOnHome` | Radar del mes (barra con Gastado, Comprometido, Sin asignar y exceso), puerta Próximos pagos, puerta Próximos meses (mini barras + "Con tarjeta este mes"), Tus espacios | Tocar cada cifra → "¿De dónde sale?", puertas → Futuro, Perfil, refrescar | Skeleton, **ErrorState con reintento**, vacío, sin ingresos, exceso (N-08) |
| ¿De dónde sale? | hoja sobre Inicio | `src/features/breakdown/WhereFrom.tsx` | Fórmula y registros de cada cifra (M18, CA-04, CA-52) | Cerrar | Vacío; sin ingresos "no se calcula" |
| Movimientos | `/(personal)/movimientos` | `MovementsScreen` → `MovementsTabView` | "Hoy", conteos, filtros Todos/Personales/espacios, franja de la semana, lista del día | Mes anterior/siguiente, filtro, día, tocar → detalle, mantener → eliminar | Skeleton, 4 vacíos distintos; **sin estado de error (H-03)** |
| Futuro | `/(personal)/futuro` | `futuro/index.tsx`, `FutureHero`, `FutureMonthSelector`, `FutureMonthDetail` | Mes elegido como N1 con ingreso previsto, 6 barras, "Este mes", puertas Pagos / Cuotas / Fijos, hoja de desglose | Elegir mes, desglose, puertas | Skeleton, vacío; **sin estado de error (H-03)** |
| Pagos del mes | `/(personal)/futuro/pagos` | `FuturePaymentsScreen` | Próximos pagos del mes con detalle del resumen estimado | Abrir resumen (`StatementDetailSheet`) | Carga, vacío; sin error |
| Tus cuotas | `/(personal)/futuro/cuotas` | `FutureInstallmentsScreen` | Compras activas: "k de n", cuánto falta, cuándo termina | — | Carga, vacío; sin error |
| Compartidos (lista) | `/(personal)/compartidos` | `compartidos/index.tsx`, `SpaceListView` | Lista de espacios con balanza mini, avatares, pastilla "N por revisar"; filtro desde 5, búsqueda desde 9; puerta "Espacios que dejaste" | Abrir, crear, refrescar | Skeleton, ErrorState, vacío con CTA |
| Espacio (A) | `/(personal)/compartidos/[id]` | `SpaceScreen` | N1 con la balanza y el saldo; N2 Pendientes, Mes, Movimientos; aviso P27 | Agregar, Registrar pago, Invitar, menú | Skeleton, ErrorState, Modo 1, ex miembro |
| Mes / Movimientos / Pendientes del espacio (A) | `/(personal)/compartidos/[id]/{mes,movimientos,pendientes}` | `SpaceMonthScreen`, `SpaceMovementsScreen`, `SpacePendingScreen` | N3 del espacio | Abrir registros, "Está bien" | Skeleton, ErrorState, vacío |
| Espacios que dejaste (A) | `/(personal)/compartidos/dejados` | `FormerSpacesScreen` | Foto de cada espacio dejado y "Quitar de tu historial" (P26) | Quitar | Skeleton, error, vacío |
| Perfil | `/(personal)/perfil` (oculto de la barra) | `perfil.tsx`, `ProfileSections` | Nombre, Tus datos (ingresos, fijos, tarjetas), Apariencia, Privacidad y datos, CSV, cerrar sesión, eliminar cuenta | — | — |

### Pantallas compartidas por los dos estados (fuera de las pestañas)

| Pantalla | Ruta | Función | Estado / observaciones |
|---|---|---|---|
| Agregar (§17) | `/agregar` | Gasto o ingreso; destino "Solo yo" o un espacio; "Más opciones" (cuotas, fijo, fecha, descripción) | Sin pantalla de error; Guardar bloqueado "Cargando el espacio" si el espacio no carga (H-03) |
| Detalle de movimiento | `/movimiento/[id]` | Detalle, editar, eliminar, terminar cuotas, pasar a un espacio | "Este movimiento ya no existe" |
| Fijos | `/fijo/gastos`, `/fijo/ingresos`, `/fijo/[id]` | Listas y F-03 (cambiar desde este mes, este mes fue distinto, corregir el día, dejar de pagarlo, eliminar) | Sin carga ni error en las listas |
| Tarjetas | `/tarjetas`, `/tarjetas/[id]` | Lista, detalle, corregir días (con hoja "antes → ahora" y Deshacer), eliminar (P24) | "Esta tarjeta ya no existe" |
| Espacio (B) | `/space/[id]` | El mismo `SpaceScreen`, sin barra; bienvenida U1 y tarjeta "Tu plata personal" | Igual que en A |
| Crear espacio | `/space/nuevo` | 3 pasos: el otro, el saldo inicial, el nombre | Pantalla de bloqueo para el invitado (P5) |
| Agregar en el espacio | `/space/[id]/agregar` | Gasto o fijo compartido | "Cargando…" sin salida si falla (H-03); crash con reparto personalizado (H-04) |
| Detalle de gasto compartido | `/space/[id]/gasto/[gid]` | Detalle, editar, eliminar, pasar a personal, "Está bien" | Dice "ya no existe" también al cargar o ante error (H-03) |
| Fijo compartido | `/space/[id]/fijo/[fid]` | `FixedDetail` en modo compartido | `return null` mientras carga |
| Registrar pago | `/space/[id]/pago` | Propone el monto que deja el saldo en cero | "Cargando…" eterno si falla |
| Detalle de pago | `/space/[id]/pagos/[pid]` | Solo eliminar | Error de red se muestra como "ya no existe" |
| Invitar | `/space/[id]/invitar` | Generar, copiar, compartir, cancelar el enlace | "Cargando…" en texto, sin error |
| Salir | `/space/[id]/salir` | Resumen antes de salir y confirmación | "Cargando…" sin error; texto incorrecto en Modo 1 (H-07) |
| Mes / Movimientos / Pendientes (B) | `/space/[id]/{mes,movimientos,pendientes}` | Igual que en A | Igual |
| Historial de un ex espacio | `/historial/[spaceId]/[id]` | Detalle de solo lectura desde la foto | "Ya no está en tu historial" |

### Estado B: invitado sin cuenta personal

| Pantalla | Ruta | Función | Estados |
|---|---|---|---|
| Espacios | `/(guest)/espacios` | Con un espacio, lo renderiza inline (U1); con 0 o varios, la lista; "Crear otro espacio" ofrece activar la cuenta | Skeleton, vacío ("No estás en ningún espacio") |
| Perfil | `/(guest)/perfil` | Guardar acceso (email), nombre, crear cuenta personal, eliminar; **sin cerrar sesión para el anónimo** (H-35) | — |
| Espacios que dejaste | `/(guest)/dejados` | Igual que en A, con copy de Estado A (H-25) | Skeleton, error, vacío |

### Hojas (modales) relevantes

`StatementDetailSheet` (resumen estimado), `CardDaysSheet` y `CardDeleteSheet` (tarjetas), `RemoveFormerSpaceSheet`, `SpaceMenu` (renombrar, actividad reciente, compartir resumen, invitar, quitar acceso, salir), `ActivityList`, `GuestPersonalSheet` (Caso 18), `DeletedWhileEditing` (SY-02), `DotHelp`.

### Guardas de navegación

`RouteGuard` (`app/_layout.tsx:112-175`) resuelve tres estados: sin sesión (solo `(auth)`, `invite`, `auth/callback`), invitado (`(guest)` y rutas compartidas) y personal (`(personal)` y rutas compartidas). **Las rutas compartidas (`/agregar`, `/movimiento`, `/fijo`, `/tarjetas`, `/historial`, `/onboarding`) también están abiertas para el invitado** si llega por deep link (H-18). El guard corre en un `useEffect`, así que el árbol equivocado puede verse un instante antes de redirigir (H). Existe un test guardián que prohíbe `replace` dentro de `useEffect` (`tools/no-redirect-in-effect.test.ts`).

---

## 4. Mapa de flujos

| # | Flujo | Entrada → salida | Persistencia | Completitud | Problemas | Evidencia |
|---|---|---|---|---|---|---|
| 1 | Entrada y autenticación | Bienvenida → privacidad → email → código → **Inicio** | El perfil se crea en `ensureProfile` al llegar la sesión (`SessionProvider.tsx:110-126`) | Completo para entrar; **O1 no continúa a O3** como pide la spec | H-09, H-17 | **V\*** |
| 1b | "Ya tengo cuenta" | Email (`shouldCreateUser:false`) → código → app | Ninguna nueva | Completo | "Pedir un enlace nuevo" desde el callback vuelve a email **sin modo** y se trata como invitación (`createUser:true`) | `callback.tsx:33`, `email.tsx:45` **V\*** |
| 2 | Gasto personal | FAB → Agregar → Guardar → toast con Deshacer | Un único INSERT en `personal_movements` o `recurrences` (`mutations.ts:34,197`) | Completo | Medio por defecto "último usado"; offline queda en pausa (H-13); salida por gesto sin confirmar (H-15) | V |
| 2b | Ingreso | Puntual desde Agregar; fijo solo desde onboarding o Perfil | INSERT | Parcial: Agregar no permite ingreso fijo; el fijo de Perfil es siempre "Sueldo" | H-33 | V |
| 3 | Editar y eliminar gasto personal | Movimientos → detalle → Editar / Eliminar | UPDATE / DELETE; replanifica cuotas solo si cambian cantidad, fecha o medio (`shouldReplan`) | Completo con fallas | "Terminar ahora" con 1 cuota falla (H-06); el UPDATE no verifica filas afectadas (H-46); eliminar sin Deshacer | **V\*** |
| 4 | Historial de movimientos | Pestaña Movimientos | Solo lectura de hechos (no ocurrencias) | Parcial frente a §16: no lista fijos de meses pasados | Sin estado de error (H-03); montos completos de compras con tarjeta sin nota (H-32) | V |
| 5 | Próximos pagos | Inicio (puerta) y Futuro → Pagos | Calculado | Completo; Inicio muestra el primero + "y N más" en vez de los 3 de §15 | H-02 (fijos con tarjeta fuera del horizonte); "Ya pasó" solo se ve el mismo día | **V\*** |
| 6 | Marcar como pagado | — | — | **No existe por diseño** (G-06, CA-45) | — | V |
| 7 | Espacio compartido | Compartidos → espacio (A) o pantalla principal (B) | Lectura con 8-9 consultas por espacio | Completo | Pantallas secundarias sin estado de error (H-03); menú con 6 acciones | V |
| 7b | Crear espacio | Compartidos → 3 pasos → espacio | RPC atómica `app_create_space` al final | Completo; no encadena la invitación (Caso 2) | Atrás pierde lo cargado sin confirmar | V |
| 8 | Gasto compartido: alta, edición, eliminación | Agregar o espacio → Guardar | Dos INSERT sin transacción (gasto + detalle privado de pago), con borrado compensatorio no verificado | Completo con fallas | **Crash** al cambiar el monto con reparto personalizado (H-04); edición de monto con reparto personalizado rechazada por la base (H-05); confirmación de eliminar cuotas sin saldo nuevo (H-27) | **V\*** |
| 9 | Saldo entre dos personas | N1 del espacio, lista, Inicio | Calculado por una sola función (`calculateSharedBalance`, vía `deriveSpace`) | Completo; coherente entre lista, Inicio y N1 | Fijos compartidos no se proyectan al mes siguiente (H-08); saldo inicial invisible (H-38) | **V\*** |
| 9b | Pago entre miembros | Botón del N1 (solo con saldo ≠ 0) → pago → Guardar | INSERT `member_payments` | Completo para registrar y eliminar; **no se edita** | No hay forma de pagar con saldo en cero | V |
| 10 | Invitación y acceso de la segunda persona | Invitar → enlace → `/invite/[token]` → nombre → espacio | RPC `app_accept_invitation` (atómica, un solo uso, 7 días) desde `PendingInvitation` | Completo; anónimo sin email | Token persistente sin dueño (H-10); invitación vencida se muestra "activa" (H-24); sin cerrar sesión para el anónimo (H-35) | V |
| 10b | Salir de un espacio | Menú → Salir → resumen → confirmación → Inicio | RPC atómica `app_leave_space` | Completo; **texto incorrecto en Modo 1, donde borra el espacio** (H-07) | Aterriza en Inicio, no en Compartidos; sin "Saliste de Casa" | **V\*** |
| 10c | Espacios que dejaste | Puerta al final de Compartidos → quitar | RPC `app_remove_former_space` | Completo (P26) | Copy de radar para el invitado (H-25) | V |
| 11 | Atrás, cancelar, abandonar | X / Cancelar / gesto / botón atrás | — | **Parcial**: solo la X y Cancelar piden confirmación | No hay `usePreventRemove`, `beforeRemove` ni `BackHandler` en el repo (H-15) | V |
| 12 | Errores, reintentos, carga | — | `retry: 2` en lecturas, `0` en escrituras | **Inconsistente**: Inicio y el espacio tienen ErrorState; Futuro, Movimientos y siete pantallas de espacio no | H-03, H-13 | **V\*** |
| 13 | Onboarding O3 | Inicio vacío "Cargar mis datos" o "Crear mi cuenta personal" → 7 pasos | Cada paso escribe al Continuar | Completo pero frágil | **Duplicados en deuda (H-01)** y fijos (H-16) | **V\*** |
| 14 | Tarjetas: corregir días y eliminar | Perfil → Tarjetas | N UPDATE + historia + tarjeta, con rollback manual documentado | Completo | Reglas de P24 solo en el cliente (H-18) | V |
| 15 | Mover entre personal y espacio (X-07) | Detalle → mover | 3 pasos sin transacción | Completo con riesgo | Duplicado contado dos veces si falla el último paso (H-12) | V |
| 16 | Eliminar cuenta (§28) | Perfil → dos confirmaciones | RPC atómica `app_delete_account` | Completo | "Exportar mis datos antes" cierra el flujo | V |

---

## 5. Reglas financieras y datos

### Cálculos identificados

Todo el cálculo vive en `src/domain/` (TypeScript puro, sin React ni reloj). La pantalla inyecta `hoy` desde `useToday` (`src/features/shared/useToday.ts:14-36`: fecha local, se refresca cada 60 s). `usePersonalFacts` expande las ocurrencias **una sola vez** con la ventana `[mes-1, mes+7]` (`usePersonalFacts.ts:57-62`) y la comparten Inicio, Futuro, Pagos, Cuotas y "¿De dónde sale?". Movimientos no usa la expansión: lee los hechos.

| Cifra | Función | Regla | Observaciones |
|---|---|---|---|
| Ingresos registrados | `calculateRadar` (`radar.ts:61-63`) | N-01 | Fijos de ingreso con ajustes + puntuales del mes |
| Gastado | `radar.ts:66` | N-03 | Tu parte de lo pagado al contado, no recurrente; en espacios, tu parte cuando pagó el otro o cuando pagaste vos sin tarjeta |
| Comprometido | `radar.ts:67` | N-02 | Fijos, cuotas y compras con tarjeta en su mes de pago, más resúmenes declarados; siempre `committed`, también ya pasados (F1) |
| Sin asignar | `radar.ts:92-93` | N-04, N-08, CA-03 | `null` sin ingresos; negativo → frase de exceso |
| Con tarjeta este mes | `radar.ts:70-83` | §15 | Tratamiento desigual de cuotas personales, compartidas y fijos (H-22) |
| Próximos pagos | `calculateUpcomingPayments` (`upcoming.ts:72-172`), `upcomingForHome` (`:186-195`) | N-09, P18 | Lente "lo que vas a pagar": total con "incluye $X de [otro]" |
| Resumen estimado | Agrupación por tarjeta y mes en `upcoming.ts:85-120` | N-10 | Por el total pagado; `estimatedStatement` (`:215-230`) no tiene uso en producción |
| Futuro (6 meses) | `calculateFuture` (`future.ts:49-96`) | §23.1, N-04 | Arranca en el mes siguiente |
| Desglose por mes | `future.ts:80-91` | §23.1 | **No es una partición**; una fila de tarjeta suma tu parte con el rótulo "resumen estimado" (H-21) |
| Cuotas que terminan | `findEndingInstallments` (`future.ts:104-128`) | §23.1 | Se anuncia el mes siguiente a la última cuota; otra pantalla dice el mes de la última (H-32) |
| Saldo compartido | `calculateSharedBalance` (`shared-balance.ts:44-73`) | S-01 a S-06, P2, P19 | Una sola función para lista, Inicio y N1 |
| Mes del espacio | `calculateSpaceMonth` (`shared-balance.ts:105-176`) | S-04 | Hasta hoy, con "Se vienen este mes" aparte |
| Reparto | `halve` (`money.ts:67-70`), `splitInstallmentShares` (`split.ts:51-83`) | C-03, F3, Q-09 | El slot 1 absorbe el peso impar; `splitColumns` (`mappers.ts:388-396`) duplica la lógica de `halve` |
| Cuotas | `distribute` (`money.ts:54-59`), `planInstallments` | Q-01 a Q-09 | Resto en la primera cuota; día de impacto persistido (F2) |
| Tarjetas | `resolveCardStatement`, `cards.ts`, `cardDays.ts` | T-03 a T-06, P24 | Historia de días por mes de pago (0020) |

**Los siete casos de §29.1 (A a G) tienen test en `src/domain/__tests__/verificacion-matematica.test.ts` y sus valores coinciden con la spec**. La suite pasó en esta auditoría. **V**

**Advertencia:** esos tests usan atajos (`radarForMonth`, `futureFrom`) que expanden **solo el mes evaluado** (`radar.ts:101-103`). La app real usa otra ventana (`[mes-1, mes+7]`) que no tiene test propio. Por ese hueco pasa H-02. **V\***

### Persistencia

- **Montos `integer` en pesos, siempre `> 0`**, fechas de negocio `DATE`, meses como dominio `month_text`. **V**
- **`CHECK (share_slot_1 + share_slot_2 = amount)`** en gastos compartidos: un reparto que no suma no puede llegar a la base. En fijos solo se valida el modo personalizado. **V**
- **Cero tablas de ocurrencias**: se expanden en memoria desde los hechos (§7.4). **V**
- **Borrados físicos**, salvo tarjetas (`deleted_at`). El rastro de lo eliminado en espacios queda en `deleted_shared_records` por trigger (SY-02) y no se purga nunca. **V**
- **La foto del espacio dejado** (`former_memberships`) sostiene el radar pasado y las cuotas vigentes de quien salió (SA-05, P8). **V**
- **`src/data/mappers.ts` es la única frontera** entre Postgres y el dominio. **V**

### Integridad

| Situación | Resultado | Certeza |
|---|---|---|
| Escrituras atómicas (RPC) | Crear espacio, invitar, aceptar, salir, quitar acceso, eliminar cuenta, resolver fijo detenido, marcar revisado, quitar del historial | V |
| Escrituras de varios pasos sin transacción | Gasto y fijo compartidos (2 pasos), editar gasto compartido, mover personal ↔ espacio (3 y 2 pasos), corregir días de tarjeta (N pasos con rollback manual), onboarding deuda (3 pasos), onboarding fijos (N pasos) | V |
| Idempotencia | **No hay claves de idempotencia** ni ids generados en el cliente. La única protección contra el doble envío es el `loading` del botón | V |
| Escrituras sin red | Las mutaciones no fijan `networkMode`; con `onlineManager` conectado a NetInfo, en TanStack v5 quedan **en pausa** y se ejecutan al reconectar, aunque el usuario ya se haya ido | H |
| Lecturas fallidas | El repositorio lanza a propósito (`throwIfError`), pero cuatro pantallas no leen `isError` y muestran el estado vacío | **V\*** |
| Una falla en un espacio | `fetchPersonalFacts` falla entera: tumba el radar completo | V |
| Sincronización entre los dos miembros | Refetch al montar, al volver la app al frente y por pull-to-refresh; sin realtime ni notificaciones (SY-01) | V |
| Caché entre usuarios | `queryClient.clear()` al cambiar de usuario. `AsyncStorage` (token de invitación, borrador del invitado) **no** se limpia | V |

### Posibles inconsistencias de cifras

1. **Fijo con tarjeta fuera del Comprometido del mes** (H-02). Ejemplo: tarjeta con cierre 25 y vencimiento 5, fijo el día 28. La ocurrencia de hace dos meses vence este mes, pero la ventana empieza el mes pasado y la descarta. **V\*** por lectura; impacto según los días de cada tarjeta.
2. **"Resumen estimado" con dos significados** (H-21): en Próximos pagos es el total que pagás; en el desglose de Futuro es tu parte.
3. **Desglose de Futuro que no suma** (H-21): un mismo pago aparece en varias filas (Fijos, Tarjetas, De tus espacios). Hay una nota al pie, pero no un total.
4. **"Con tarjeta este mes"** (H-22): cuenta la primera cuota personal como compra del mes, nunca las cuotas compartidas, cuenta un fijo con tarjeta como "compra" y cuenta las cuotas en curso del onboarding como compras nuevas.
5. **Movimientos vs Inicio** (H-32): Movimientos muestra el monto completo de una compra con tarjeta o en cuotas en el mes de compra; Inicio no la cuenta en Gastado. Es lo que pide §16, pero la fila no lo aclara.
6. **Fijos compartidos invisibles en los próximos meses del espacio** (H-08).
7. **Saldo inicial invisible** (H-38): entra en el saldo, pero no se muestra en ninguna pantalla, así que nadie puede reconciliar la cifra.
8. **Riesgo de `integer`**: el tope de $999.999.999 es solo de UI y la base no lo exige. Una cuota existente de $999.999.999 con 3 restantes supera el máximo de `integer` (2.147.483.647) en el total. H

### Definiciones financieras que faltan (ver §8)

Qué entra en "Con tarjeta este mes", qué significa "resumen estimado" en Futuro, si "Faltan" cuenta la cuota del mes cuya fecha ya pasó, cómo se trata una compra con una sola cuota restante, qué mes se anuncia como fin de las cuotas, y qué día corta un fijo compartido al salir (hoy usa la fecha UTC de `left_at` y Buenos Aires fijo en el servidor).

---

## 6. Hallazgos priorizados

Cada hallazgo indica su origen y su certeza. Cuando agrupa varios síntomas de una misma causa, se listan todos. **No se proponen soluciones.**

### P0 · Crítico

#### H-01 · El paso "deuda" del onboarding duplica resúmenes, cuotas y consumos

- **Área:** onboarding O3, integridad financiera.
- **Descripción:** al Continuar, `deuda.tsx` hace tres escrituras sueltas (resumen declarado, cuotas en curso, consumos previos) sin guardar el id de lo creado. Después de la última tarjeta hace `push` a `/onboarding/pagados` **sin limpiar el formulario**. Si la persona vuelve atrás (gesto o botón) y toca Continuar otra vez, todo se escribe de nuevo. Lo mismo pasa si falla la segunda o la tercera escritura y reintenta.
- **Evidencia:** `app/onboarding/deuda.tsx:109-168` (escrituras), `:170-181` (`next()` solo limpia al pasar a otra tarjeta). No hay clave única en `declared_statements` ni en `personal_movements`.
- **Impacto:** el Comprometido de los próximos meses y los Próximos pagos se cuentan dos veces, justo en el "aha moment" del producto (ver los meses cargados al terminar la activación).
- **Certeza:** **V\*** por lectura. No se reprodujo en ejecución.
- **A comprobar:** si hoy existe alguna forma, desde la UI, de ver y eliminar un resumen declarado duplicado.

### P1 · Alto

#### H-02 · Un fijo con tarjeta puede quedar fuera del Comprometido y de los Próximos pagos del mes

- **Área:** motor financiero.
- **Descripción:** la ventana de expansión `[mes-1, mes+7]` se aplica al mes en que ocurre el fijo, no al mes en que se paga. Con cierre 25 y vencimiento 5, un fijo del día 28 de hace dos meses vence este mes y no entra.
- **Evidencia:** `src/features/shared/usePersonalFacts.ts:57-62`, `src/domain/occurrences.ts:460-497`. Los tests de §29.1 usan `radarForMonth` (`radar.ts:101-103`), que no ejercita esta ventana.
- **Impacto:** cifra principal subestimada, y distinta de la que Futuro mostraba el mes anterior para ese mismo mes.
- **Certeza:** **V\*** por lectura. No se ejecutó con datos.

#### H-03 · Pantallas que muestran "vacío" o "cargando" cuando en realidad falló la lectura

- **Área:** estados de error.
- **Descripción:** solo Inicio y las pantallas principales del espacio leen `isError`. Futuro dice "No tenés nada comprometido todavía", y Pagos, Cuotas y Movimientos muestran listas vacías ante un error de red. En el espacio, Agregar, Pago, Invitar y Salir quedan en "Cargando…" para siempre; el detalle de gasto y el de pago dicen "ya no existe, puede que el otro lo haya eliminado"; el fijo compartido devuelve una pantalla vacía.
- **Evidencia:** `app/(personal)/futuro/index.tsx:60,173`, `FuturePaymentsScreen.tsx:25`, `FutureInstallmentsScreen.tsx:16`, `useMovements.ts:33` frente a `inicio.tsx:130`. En el espacio: `app/space/[id]/agregar.tsx:195-203`, `pago.tsx:108-116`, `invitar.tsx:100-108`, `salir.tsx:94-102`, `gasto/[gid].tsx:285-296`, `pagos/[pid].tsx:25-31`, `fijo/[fid].tsx:101`.
- **Impacto:** la app afirma algo falso sobre los compromisos ("no tenés nada"), que es lo que el propio repositorio quiso evitar (`HANDOFF.md` §6: "Un `data ?? []` sin chequear convierte una falla de red en 'no hay nada'"). En el espacio, culpa al otro miembro de un error de red.
- **Certeza:** **V\*** (Futuro y Movimientos); V (pantallas del espacio).

#### H-04 · La app se cae al cambiar el monto después de elegir reparto "Personalizado"

- **Área:** gasto compartido, Agregar.
- **Descripción:** el reparto personalizado guarda dos montos fijos. Si después se corrige el monto total, `resolveShares` recibe partes que ya no suman y **lanza un error dentro de un `useMemo`**, en pleno render. Nada vuelve a ajustar las partes al cambiar el total, y no hay un ErrorBoundary propio.
- **Evidencia:** `app/space/[id]/agregar.tsx:137-140` y `app/agregar.tsx:155-159` (`resolveShares` en `useMemo`), `src/domain/split.ts:21-26` (lanza "C-02 violado"), `src/features/spaces/SplitPicker.tsx` sin normalización.
- **Impacto:** se pierde todo lo cargado. Corregir el monto es una acción común.
- **Certeza:** **V\*** por lectura. No se ejecutó.

#### H-05 · Editar el monto de un gasto compartido con reparto personalizado no se puede guardar

- **Área:** edición de gasto compartido.
- **Descripción:** al guardar, `splitColumns(amount, split)` envía las partes viejas con el monto nuevo y el CHECK de la base lo rechaza con "No pudimos guardarlo", sin explicar el motivo. `endSharedInstallmentsNow` ("Terminar ahora" de cuotas compartidas con reparto personalizado) tiene el mismo problema, aunque su comentario diga que recalcula.
- **Evidencia:** `src/data/mappers.ts:388-402`, `app/space/[id]/gasto/[gid].tsx:156-174, 617-645`, `src/data/repositories/edits.ts:349-358`; CHECK `shares_sum_total` en `20261008000001_schema.sql`.
- **Impacto:** un flujo de edición que no se puede completar, sin pista de por qué.
- **Certeza:** **V\*** el envío de partes viejas; el rechazo se deduce del CHECK (no se ejecutó).

#### H-06 · Un plan de una sola cuota choca con la base

- **Área:** cuotas.
- **Descripción:** el esquema exige `installments_count >= 2`. Dos caminos generan `count = 1`:
  - "Terminar ahora" cuando la única cuota conservada es la del mes actual (caso típico: la primera cuota cae este mes): `endInstallmentsNow` devuelve `count: 1` y el UPDATE falla con "No pudimos terminar las cuotas".
  - Cuotas en curso del onboarding con una sola restante ("5 de 6").
- **Evidencia:** `src/domain/installments.ts:176-193`, `src/data/repositories/edits.ts:108-130`, `supabase/migrations/20261008000001_schema.sql:147,260`, `app/onboarding/deuda.tsx:115-143`.
- **Impacto:** la persona no puede terminar una compra ni declarar una cuota pendiente que sí tiene.
- **Certeza:** **V\*** el primero; V el segundo.

#### H-07 · Salir de un espacio en Modo 1 lo borra entero, mientras la pantalla dice lo contrario

- **Área:** salida de un espacio.
- **Descripción:** si el otro miembro nunca entró, al salir no queda nadie con acceso y el servidor **elimina el espacio y todo su contenido** (SA-06 lo permite). La pantalla no distingue ese caso y dice "Tu nombre queda en el historial… porque esos registros también son de X" y "X va a decidir si los sigue pagando".
- **Evidencia:** `app/space/[id]/salir.tsx:132-227` (sin rama por el estado del otro), `supabase/migrations/20261014000011_stopped_recurrences.sql:47-53` (`delete from spaces` con `remaining = 0`).
- **Impacto:** eliminación irreversible presentada como conservación.
- **Certeza:** **V\***.

#### H-08 · Los fijos compartidos no aparecen en los próximos meses del espacio

- **Área:** espacio, §23.4.
- **Descripción:** el horizonte del espacio termina en el mes actual, salvo que haya cuotas más largas. Un espacio con un alquiler compartido y sin cuotas no muestra nada para el mes siguiente, y el selector de meses no avanza.
- **Evidencia:** `src/domain/occurrences.ts:153-173` (`spaceHorizon`), `SpaceMonthScreen.tsx:55-67, 335-340`; spec §23.4 y Caso 9.
- **Impacto:** "¿Qué tenemos comprometido en común?" responde "nada" cuando hay un fijo.
- **Certeza:** **V\***.

#### H-09 · Una falla al cargar el perfil manda al usuario personal al árbol del invitado

- **Área:** autenticación.
- **Descripción:** `loadProfile` devuelve `null` ante un error de red. `ensureProfile` intenta crear el perfil (choca, porque ya existe) y vuelve a leer; si sigue fallando, el estado de cuenta se deriva como "invitado": la persona ve la app sin Inicio, Movimientos ni Futuro. No hay reintento. Para un registro nuevo, la elección de "Empezar" ya se consumió, así que al reabrir el perfil se crea **sin cuenta personal**.
- **Evidencia:** `src/features/auth/SessionProvider.tsx:84-126`, `src/features/auth/authFlow.ts:71`.
- **Impacto:** con mala señal al abrir, la app parece haber perdido la cuenta personal.
- **Certeza:** **V\*** por lectura.

#### H-10 · El token de invitación sobrevive y no tiene dueño

- **Área:** invitación.
- **Descripción:**
  - "Ahora no" en la pantalla de invitación, o una falla al entrar como invitado, dejan el token guardado en el teléfono. La próxima sesión (cualquier persona que entre en ese teléfono) lo acepta sin pedirlo.
  - A la inversa, `takeInvitationToken` borra el token **antes** de llamar a la RPC: si la red falla, se pierde y la persona no sabe que el enlace sigue sirviendo.
- **Evidencia:** `app/invite/[token].tsx:71-79, 214`, `src/features/auth/invitationToken.ts:30-33`, `PendingInvitation.tsx:45-58`.
- **Impacto:** en un teléfono compartido, alguien puede quedar dentro de un espacio ajeno.
- **Certeza:** V (relevamiento); no re-verificado línea por línea.

#### H-11 · El borrador del invitado no está atado a la cuenta

- **Área:** onboarding, privacidad.
- **Descripción:** el borrador del gasto personal que un invitado intentó cargar (Caso 18) vive en `AsyncStorage` con una clave global. No se limpia al cerrar sesión ni al eliminar la cuenta, y se consume en el próximo "Listo" de **cualquier** usuario del teléfono. Además se borra antes de saber si el alta salió bien, y "Listo" no tiene guarda contra un doble toque.
- **Evidencia:** `src/features/add/personalDraft.ts:10-29`, `app/onboarding/listo.tsx:50-80`, `src/data/auth.ts:150`.
- **Impacto:** un gasto de una persona puede terminar en la cuenta de otra.
- **Certeza:** V el mecanismo; H el escenario completo.

#### H-12 · Mover un gasto entre lo personal y un espacio puede duplicarlo

- **Área:** X-07, integridad.
- **Descripción:** pasar a un espacio crea el compartido, luego el detalle de pago y al final borra el personal. Si el último paso falla, el gasto queda en los dos lados (se cuenta dos veces) y el mensaje dice "No pudimos moverlo"; reintentar crea un tercero. El camino inverso tiene el mismo patrón, y los borrados compensatorios no verifican su propio error.
- **Evidencia:** `src/data/repositories/edits.ts:148-195`, `src/data/repositories/spaces.ts:415-437`.
- **Certeza:** V.

### P2 · Medio

| ID | Área | Descripción | Evidencia | Certeza |
|---|---|---|---|---|
| H-13 | Escrituras sin red | Las mutaciones quedan en pausa sin red: Guardar sigue "cargando" y la escritura ocurre sola al volver la conexión, con toast y `goBack` en otra pantalla. Sin idempotencia, un reintento manual duplica | `src/data/queryClient.ts:30-33, 49-54`, `app/agregar.tsx:290-367` | H |
| H-14 | Gastos compartidos | Alta en dos pasos con borrado compensatorio no verificado: puede quedar un gasto sin su detalle de pago. El Deshacer y los borrados compensatorios pasan por el trigger de SY-02 y pueden mostrarle al otro una "eliminación" de algo que nunca vio (también en el aviso P27, que no tiene la excepción de 10 minutos de K10) | `spaces.ts:188-300`, `0005_deleted_shared_records.sql:57-70`, `otherDeletions.ts:244-257` vs `review.ts:98-106` | V / H |
| H-15 | Abandono de formularios | Solo la X y Cancelar piden "¿Descartar…?". El gesto de volver de iOS y el botón atrás de Android no pasan por ninguna confirmación. Crear espacio (3 pasos) tampoco confirma | Sin `usePreventRemove`, `beforeRemove` ni `BackHandler` en el repo; `app/agregar.tsx:241-253` | V (ausencia); H (comportamiento nativo) |
| H-16 | Onboarding | Fijos: un INSERT por fijo en un bucle; si falla uno, reintentar duplica los anteriores. Tarjetas: "Continuar" o "No uso tarjetas" descarta en silencio una tarjeta escrita y no guardada. Ingreso: el error de guardado no se muestra | `app/onboarding/fijos.tsx:132-155`, `tarjetas.tsx:111-118`, `ingreso.tsx:80-82` | **V\*** (fijos); V |
| H-17 | Entrada | Tras "Empezar", la persona cae en Inicio vacío, no en O3 (§13 O1 5a) ni en crear un espacio (5b). Las tres opciones de "¿Qué querés hacer primero?" producen el mismo resultado. "Pedir un enlace nuevo" desde el callback vuelve al email sin modo y se trata como invitación: crea un usuario nuevo sin cuenta personal, o borra la elección | `SessionProvider.tsx:121`, `inicio.tsx:132-137`, `app/auth/callback.tsx:33`, `app/(auth)/email.tsx:44-45` | **V\*** |
| H-18 | Reglas solo en el cliente | Un invitado (también anónimo) puede escribir tarjetas, ingresos y gastos personales por deep link o API: la RLS solo exige `user_id = auth.uid()` (contradice P5). También son solo de UI el tope de $999.999.999, el rango de fechas, el máximo de 36 cuotas y la retención de tarjetas (P24) | `supabase/migrations/20261008000002_rls.sql:119-126`, `app/_layout.tsx:133-142`, `cardOverview.ts:158` | **V\*** (RLS) |
| H-19 | Políticas de escritura | La policy de UPDATE de `invitations` no restringe columnas: un miembro puede reactivar una invitación usada o extender su vencimiento. En `shared_expenses`, un UPDATE puede reescribir `created_by_slot` (quién lo cargó) y evadir "para revisar". `member_payments` también admite UPDATE de cualquier columna | `rls.sql:295-297` (**V\***), `rls.sql:165-170, 276-278` | V |
| H-20 | Lugar reutilizado | Cuando alguien ocupa un lugar que tuvo otra persona (P7, §26), hereda sus "revisados" y sus filas de detalle de pago. Un invitado que llega tarde ve todo el historial como "para revisar" | `0013_record_reviews.sql:47-60`, `review.ts:46-68` | V el mecanismo; H el impacto |
| H-21 | Futuro | "Tarjeta · resumen estimado" en el desglose suma tu parte, pero el mismo rótulo en Próximos pagos es el total (mezcla de lentes, §7.3). Las filas del desglose no son una partición y no muestran un total | `future.ts:69-91`, `futureMonthCopy.ts:40-47`, `FutureMonthDetail.tsx:79-82` | V |
| H-22 | Inicio | "Con tarjeta este mes" trata distinto cuotas personales (cuenta la primera), compartidas (nunca), fijos con tarjeta (como compra) y cuotas en curso del onboarding (como compras nuevas). Además solo se muestra dentro de la puerta Próximos meses y si algún mes siguiente tiene Comprometido | `radar.ts:70-83`, `occurrences.ts:385-406, 604`, `HomeDoors.tsx:87`, `inicio.tsx:160` | V |
| H-23 | Inicio | El estado vacío decide "sin datos" sin mirar los espacios: alguien con cuenta personal y gastos solo en espacios ve el vacío y pierde tanto el radar (que tendría su parte) como "Tus espacios" | `inicio.tsx:87-88, 132-138` | V |
| H-24 | Invitar | Una invitación vencida se sigue mostrando como "Ya hay una invitación activa": el cliente no compara el vencimiento y el servidor no la marca como vencida (el `UPDATE` a `expired` se revierte con el `RAISE` de la misma función). Faltan los estados "La invitación venció · Generar nueva" y "Martina entró a Casa" de §26 | `invitar.tsx:82, 140-150`, `20261010000007_member_lifecycle.sql:198-201` | **V\*** (servidor) |
| H-25 | Copy para el invitado | El invitado no tiene radar, pero lee "no cambia tu radar" en los pagos y "tu radar" y "tu Futuro" en la hoja de quitar un espacio dejado | `pago.tsx:252-255`, `PaymentDetail.tsx:75-80`, `spaceMovements.ts:256`, `formerSpaces.ts:459-485` | V |
| H-26 | Acciones irreversibles | Sin confirmación: "Cancelar la invitación"; el "Entendido" del invitado en un fijo detenido (SA-04), que **termina** el fijo sin decirlo; "Quitar" un mes distinto de un fijo | `invitar.tsx:222-230`, `StoppedFixedCard.tsx:71-77`, `FixedDetail.tsx:361-365` | V |
| H-27 | Eliminar compra en cuotas compartida | La confirmación no muestra el saldo nuevo ni en "Fue un error" ni en "Terminar ahora" (X-03, CA-28, U7). El gasto puntual sí | `gasto/[gid].tsx:382-396` vs `:400-407` | V |
| H-28 | Renombrar espacio | Sin manejo de error: si falla, no hay aviso y la hoja queda abierta | `SpaceMenu.tsx:94-102`, `useSpaces.ts:137-144` | V |
| H-30 | Accesibilidad | (a) Texto blanco sobre `brand` en oscuro (botón principal y FAB) da **3,54:1**, bajo AA para 14pt; botón `shared` 4,48 / 3,30; inicial del avatar 4,24. (b) Sin `maxFontSizeMultiplier` y con alturas fijas (botones 36/46/54, FAB 52): con Dynamic Type grande el texto puede cortarse. (c) `Segmented` y `FilterSegmented` miden 38pt sin `hitSlop`, bajo los 44 que fija `ui/touch.ts`. (d) El toast de "Deshacer" no usa `announceForAccessibility` y dura 6 s sin pausa. (e) Las mini barras de Inicio no tienen mes, monto ni valor accesible; el selector de Futuro anuncia solo el mes. (f) Gastado y Comprometido se distinguen solo por luminosidad del mismo matiz | `Button.tsx:47-66`, `_layout.tsx:117-134`, `Segmented.tsx:54`, `Toast.tsx:47-71`, `HomeDoors.tsx:113-156`, `FutureMonthSelector.tsx:47-56`, `colors.ts:118-119, 152-153` | V (contraste calculado sobre los tokens con la fórmula WCAG; ausencias); H (efecto visual) |
| H-32 | Consistencia de términos | "En marzo termina 1 cuota" (Futuro, mes siguiente a la última) vs "termina en febrero" (Tus cuotas, mes de la última). Tres nombres para el mismo conteo: "por revisar", "para revisar", "cosas para revisar". La fila de un gasto compartido muestra tu parte en Movimientos y el total en "Se vienen este mes". Movimientos muestra el monto completo de una compra con tarjeta en el mes de compra, sin aclarar que no está en Gastado. El mes del espacio dice "$X entre los dos" sin "hasta hoy" | `future.ts:104-127`, `futureView.ts:50-58`, `spaceListCopy.ts:20-22`, `reviewCopy.ts:259-261`, `MovementItem.tsx:328-395`, `buildMovementList.ts:97-140`, `spaceMonth.ts:429-439` | V |
| H-33 | Spec no implementada | §17 campo 8 "valor de cuota" y primer mes editable (`pinnedFirstMonth` siempre `null`); ingreso fijo desde Agregar; un fijo que empieza en un mes futuro; "Corregir" un fijo solo cambia el día; Perfil sin "Categorías"; X-07 al revés solo desde el espacio. Parte figura en `HANDOFF.md` como "huecos de la spec" | `agregar.tsx:314, 335, 357, 559`, `DateField.tsx:131`, `FixedDetail.tsx:401` | V |
| H-35 | Invitado anónimo | No ve "Cerrar sesión" (no podría volver a entrar), y el error "Ese email ya tiene una cuenta… entrá con ese desde la bienvenida" le indica un camino que no tiene | `ProfileSections.tsx:259-263`, `authErrors.ts:15-17` | V |
| H-37 | Branding y tiendas | Ícono, splash e ícono adaptativo son los de la plantilla de Expo; no hay `bundleIdentifier` ni `package`; el esquema es `radar://`. No es un defecto de UX hoy, pero condiciona el rediseño | `assets/`, `app.json` | V |
| H-38 | Saldo inicial | Existe en la base y entra en el saldo, pero no hay UI para verlo ni editarlo (E-07 lo pide "visible y editable por los dos") | `spaces.ts:393-404`, sin usos en `app/` | V |
| H-44 | Lecturas frágiles | `fetchPersonalFacts` hace decenas de consultas sin snapshot; si un espacio falla, cae todo el radar. `fetchMySpaces` ignora el error de la consulta de miembros y el espacio aparece como "X todavía no entró" con nombre vacío | `personal.ts:28-110`, `spaces.ts:62-76` | V |
| H-45 | Proyecto | El repositorio no tiene remoto: un fallo del disco pierde los 189 commits | `git remote -v` vacío | **V\*** |

### P3 · Bajo

| ID | Descripción | Evidencia | Certeza |
|---|---|---|---|
| H-29 | El tema elegido en Perfil no llega a lo nativo: `Alert`, teclado, `Switch` y `RefreshControl` siguen al sistema (el datepicker sí sigue a la app). Ya registrado en el handoff | `theme.tsx`, sin `keyboardAppearance` en el repo | V (ausencia) |
| H-31 | El menú del espacio concentra 6 acciones bajo un ícono "…" sin texto, con "Salir" al mismo nivel que "Compartir resumen" (§24 lista 3) | `SpaceScreen.tsx:354`, `SpaceMenu.tsx:145-197` | V |
| H-34 | El CSV no neutraliza celdas que empiezan con `= + - @`, y las descripciones de un espacio las escribe el otro miembro. El archivo queda en caché sin borrarse e incluye tarjetas eliminadas como activas | `exportCsv.ts:28-30, 84-85, 119-124`, `useExportData.ts:26` | H |
| H-36 | O2 genérico: "Te invitaron a un espacio compartido" en vez de "Renzo te invitó a Casa"; P4 dice "con esta persona" en vez del nombre | `invite/[token].tsx:156`, `invitations.ts:136-138` | V |
| H-39 | Los pagos entre miembros no se editan (§25 dice editar y eliminar), y con saldo en cero no hay forma de registrar uno | `PaymentDetail.tsx:88`, `SpaceScreen.tsx:216` | V |
| H-40 | Después de salir de un espacio no hay "Saliste de Casa" y se aterriza en Inicio, no en Compartidos (§27 paso 4). Quitar el acceso tampoco confirma el éxito | `salir.tsx:79-87`, `app/index.tsx:39-41`, `SpaceMenu.tsx:81-83` | V |
| H-41 | El aviso de adelanto de cuotas suma tu parte de todas las cuotas futuras sin mirar quién las paga y puede atribuirle el adelanto al otro | `shared-balance.ts:207-215`, `balanceCopy.ts:94-105` | H |
| H-42 | La balanza se inclina 8° fijos para cualquier saldo distinto de cero ($1 o $1.000.000) y baja del lado de quien está a favor; en una balanza física baja lo más pesado. La frase lo compensa | `BalanceScale.tsx:18`, `balanceScaleState.ts:57` | V (mecanismo); H (lectura) |
| H-43 | Huecos en los tests de RLS: no cubren `app_delete_account`, escrituras entre espacios, reescritura de autoría, UPDATE de invitaciones, ni lectura anónima de `record_reviews` y `former_memberships`. El test de grants mira solo funciones con prefijo `app_` | `supabase/tests/privacidad.test.sql`, `tools/rls-smoke.ts:19-35` | V |
| H-46 | Detalles: "Código reenviado" queda deshabilitado; `updatePersonalMovement` dice "Cambios guardados" aunque el movimiento ya no exista; "va a ver y poder cargar"; "Yo puso más" si falta el nombre; "Anoten acá lo que pagan para la casa" en cualquier espacio (P22h lo cambió en la bienvenida); Apariencia dice "iPhone"; `SectionHeader` sin rol de encabezado (solo 4 en toda la app); dos "Cerrar" en cada hoja; bordes de campos a 1,31:1 | `revisa-tu-email.tsx:151-155`, `edits.ts:83-96`, `invitar.tsx:128`, `nuevo.tsx:145`, `SpaceScreen.tsx:412`, `appearance.ts:44`, `Sheet.tsx:41,62` | V |
| H-47 | Mantenibilidad: `zod` y `react-hook-form` instalados sin uso; `react-native-worklets` usado por Babel sin declararse; `Segmented` y `FilterSegmented` duplicados; `splitColumns` duplica `halve`; la sombra con `#000` copiada en FAB y Toast; las invalidaciones de caché repetidas en 5 lugares | `package.json`, `babel.config.js:7`, `mappers.ts:388-396` | V |

### Hipótesis previas del pedido, contrastadas

| Hipótesis | Resultado |
|---|---|
| "Exceso de información en ciertas pantallas" | **Parcialmente sostenida.** Inicio quedó sobrio (un panel y tres puertas). Los más densos son Movimientos (resumen, forma del mes, filtros, franja, ayuda, lista) y el N1 del espacio, que puede juntar hasta tres botones más una nota, el aviso de adelanto y el aviso P27. El desglose de Futuro tiene filas que se pisan (H-21). Confirmarlo exige verlo en pantalla. |
| "Gráficos que no resultan intuitivos" | **Sostenida con matices.** La barra del radar suma bien y muestra el exceso a escala con rayado (V), pero con exceso no deja ver qué parte lo causó, Gastado y Comprometido se distinguen solo por luminosidad (H-30f) y las mini barras de Inicio no tienen mes ni monto (H-30e). La balanza es un estado de tres posiciones, no una proporción (H-42). |
| "Dificultad para distinguir elementos interactivos" | **Hay una regla y se cumple casi siempre** (chevron en filas tocables, `Door`, `IconButton`, `TextLink`). Puntos débiles: eliminar en Movimientos solo con mantener presionado, sin alternativa accesible (`MovementRowView.tsx:56`); el menú "…" del espacio sin texto; las puertas `Door` sin estado de presión propio (`scaleOnPress=false`); las barras de Futuro que se eligen tocándolas. |

---

## 7. Riesgos técnicos y dependencias

### Módulos que no deberían tocarse sin precaución

| Módulo | Por qué | Protegido por |
|---|---|---|
| `src/domain/*` | Es el motor financiero; las pantallas solo presentan. §29.1 se reproduce acá | 1318 tests de vitest (Casos A–G, casos de uso, CA-*) |
| `src/data/mappers.ts` | Única frontera entre Postgres y el dominio. La foto del espacio dejado comparte la forma de las filas: agregar o renombrar una columna toca mappers, `toFormerMembership` y `app_space_snapshot` | `mappers.test.ts`, `formerMembership.test.ts` |
| `src/data/memberships.ts` (`ownActiveMemberships`) | La RLS devuelve las dos filas de cada espacio; sin este filtro el radar suma la parte del otro (K9) | `memberships.test.ts` |
| `SessionProvider.tsx` | `queryClient.clear()` al cambiar de usuario es lo único que separa las claves `spaces` y `space-facts/<id>`, que no llevan el id del usuario. Además decide el árbol de navegación (H-09) | Parcial |
| `app/_layout.tsx` (`RouteGuard`, `MagicLinkListener`, `PendingInvitation`) | Estado "una vez" en el layout raíz y carreras al loguear (`HANDOFF.md` §10) | `authFlow.test.ts`, `no-redirect-in-effect.test.ts` |
| Mensajes de error de la base | Son un contrato: el cliente busca `'P5'`, `'I-01'`, `ALREADY_SHARING:` e `INVITATION_*` en el texto. Cambiar un `RAISE` rompe el mapeo y cae a "unknown" | `authErrors.test.ts` |
| Migraciones y grants | Una función nueva nace cerrada desde la 0014; cada migración debe dar su `grant` explícito | 98 asserts pgTAP (contra la base real) |

### Dependencias entre lógica financiera y presentación

- El texto obligatorio vive en archivos `*Copy.ts` puros (`balanceCopy`, `radarBarCopy`, `futureMonthCopy`, `spaceListCopy`…) con su propio test. Un rediseño que reescriba textos tiene que pasar por ellos y por los specs de jest que exigen frases literales (CA-01, CA-04, CA-52).
- **El lint CA-00 mira cualquier string**, también ids internos: `'pagados'` cuenta como "Pagado" (`HANDOFF.md` §6). Cualquier copy nuevo pasa por `npm run lint:lenguaje`.
- Las proporciones de los gráficos salen de funciones puras testeadas (`radarBarRatios`, `splitBarFractions`, `balanceScaleState`, `miniBars`). Cambiar la forma de un gráfico sin cambiar esas funciones es posible; cambiar lo que representan, no.
- La jerarquía N1/N2/N3 está codificada en funciones (`spaceLayout.ts`, `homeDoorsCopy.ts`) con tests: reorganizar puertas cambia tests de lógica, no solo de vista.

### Riesgos para autenticación, permisos y RLS al cambiar pantallas

- **La seguridad real está en la RLS y las RPC**, pero hay reglas que hoy existen solo en la UI (H-18): mover o quitar una guarda de pantalla puede abrir algo que la base no protege (por ejemplo, Agregar con "Solo yo" para un invitado).
- Toda lectura nueva debe pasar por `throwIfError`; un `data ?? []` sin chequear convierte una falla en "no hay nada".
- Toda mutación nueva debe invalidar `personal-facts`, `spaces` y `space-facts`, y hoy ese patrón está copiado en cinco lugares.
- Toda escritura nueva hereda la falta de idempotencia (H-13).

### Limitaciones para animaciones, gráficos y navegación

- **Solo Expo Go**: no se puede sumar ningún módulo nativo que Expo Go no traiga sin pasar a un build propio (EAS), que no existe. No están `react-native-keyboard-controller`, Skia, ninguna librería de gráficos ni de bottom sheets. Todo gráfico es `View` + `react-native-svg` a mano.
- Reanimated 4 con worklets está disponible y respeta "Reducir movimiento" en casi todo (`ReduceMotion.System`); las excepciones son `Money animate` (en el hilo JS con `setTimeout`) y las animaciones de entrada de `Sheet` y `Toast`.
- `RadarBar` y `MonthBar` animan `flexGrow` (layout), no `transform`: posible costo con muchas barras (H).
- `react-native-gesture-handler` está instalado pero sin uso: no hay gestos propios.
- Las hojas usan el `Modal` nativo; un Toast que vive en la raíz puede quedar tapado por una hoja abierta (H).
- `predictiveBackGestureEnabled: false` en Android.
- **El identificador del paquete se elige una sola vez** y no se puede cambiar después de publicar (`HANDOFF.md` §5): depende del branding.

### Restricciones documentadas en `HANDOFF.md` (resumen)

Invariantes de §2 (G-05/CA-00, §7.2, D1/N-04, G-06, K9, §7.3, P2, P19, P3, CA-25, T-03, P5, K0/CA-06); metodología de wireframes obligatoria; nada en la base remota sin OK; `db push` lo corre Renzo; `npx expo lint` prohibido; `npx expo install` para nativos; JSX solo con la herramienta de edición, nunca regex; los specs fuera de `app/`; Windows no distingue mayúsculas en nombres de archivo.

---

## 8. Decisiones pendientes

Solo lo que no está resuelto ni en la documentación ni en el código.

### De producto

1. **Nombre e identidad (P17).** "Miscent" no está adoptado en ningún lado. Hay que confirmarlo antes de que dependan de él el identificador del paquete, el dominio y los textos.
2. **¿El rediseño reabre los flujos?** El `BRANDING_BRIEF.md` §0 dice "Los flujos no se tocan" y este pedido habla de rediseño de UX/UI. Hay que decidir si esta etapa puede cambiar flujos y navegación o solo su forma visual.
3. **"Te corresponde"** (S-2): la spec lo pide y el código lo prohíbe. Decidir y alinear la spec.
4. **Qué entra en "Con tarjeta este mes"**: cuotas (¿la primera, todas, ninguna?), compartidas, fijos con tarjeta y cuotas en curso del onboarding (H-22).
5. **"Resumen estimado" en Futuro**: ¿total que pagás (N-10) o tu parte (Comprometido)? (H-21).
6. **Compra con una sola cuota restante** o "Terminar ahora" que deja una cuota: ¿pasa a pago único? (H-06).
7. **Fin de cuotas**: ¿se anuncia el mes de la última cuota o el mes en que baja el Comprometido? (H-32).
8. **¿"Faltan" cuenta la cuota del mes cuya fecha ya pasó?**
9. **Qué tiene que pasar al salir de un espacio en Modo 1** (H-07): ¿advertir que se borra, impedirlo o conservarlo?
10. **Qué ve una persona que entra tarde a un espacio con historia** (H-20): ¿todo "para revisar" o nada?
11. **Saldo inicial** (H-38): E-07 lo pide visible y editable, el código no lo muestra.
12. **Editar pagos entre miembros y registrar un pago con saldo en cero** (H-39).
13. **Huecos ya listados en el handoff**: "valor de cuota" y primer mes editable (§17 campo 8), fijos de meses pasados en Movimientos (§16), cuotas que no son de tarjeta en el onboarding, el que no pagó cambia la cantidad de cuotas, un ingreso que terminó no aparece en "Tus ingresos".
14. **O1 paso 2**: ¿la elección "¿Qué querés hacer primero?" debe cambiar los pasos (como dice la spec) o se elimina? (H-17).
15. **Acceso para producción**: código + enlace, anónimos sin email, CAPTCHA, Sign in with Apple (pendiente según el handoff).
16. **Privacidad publicable**: P9, P10, P11 y P12 bloquean cualquier texto de privacidad.

### De diseño

1. **Sistema visual completo**: paleta, tipografía, iconografía e ilustración salen del branding; hoy la marca vive solo en `colors.ts` (índigo `brand`, teal `shared`).
2. **Cómo se representa cada pregunta**: barra del radar con exceso, diferenciación de Gastado y Comprometido sin depender del color, mini barras de Inicio, selector de meses de Futuro, balanza del espacio (estado vs proporción).
3. **Densidad de Movimientos y del N1 del espacio.**
4. **Patrón de estados de error, carga y vacío** común a todas las pantallas (hoy inconsistente).
5. **Patrón de abandono de formularios** (gesto, atrás de Android, flujos paso a paso).
6. **Patrón de acciones destructivas y de confirmación** (cancelar invitación, terminar un fijo, quitar un ajuste).
7. **Menú del espacio**: qué acciones, en qué nivel.
8. **Accesibilidad como requisito**: contraste mínimo para la acción principal en los dos temas, tamaño máximo de texto, áreas táctiles de controles segmentados, anuncio de toasts.
9. **Copy diferenciado para el invitado** (sin radar).
10. **Términos únicos** para "por revisar", el fin de las cuotas y el monto principal de una fila compartida.

### Limitaciones técnicas a decidir

1. **¿Se sigue en Expo Go o se pasa a un build propio (EAS)?** Define si el rediseño puede usar módulos nativos nuevos (gestos avanzados, Skia, hojas nativas, teclado).
2. **Tema elegido vs controles nativos** (H-29): solo se resuelve del todo con decisiones de plataforma.
3. **Escrituras atómicas e idempotentes**: varias de las fallas de integridad (H-01, H-12, H-14, H-16) se resuelven en la capa de datos, no en la UI; cualquier rediseño de esos flujos depende de esa decisión.
4. **Comportamiento sin red** (H-13): pausar, fallar o encolar.
5. **Remoto de git** (H-45).

---

## 9. Plan de trabajo recomendado

No se implementa nada. Es un orden propuesto para las próximas etapas de definición.

1. **Corregir los P0 y P1 de integridad y cifras antes de diseñar** (H-01 a H-12). Un rediseño sobre cifras que pueden estar mal o vacías no se puede evaluar: si la persona no confía en el número, ningún gráfico ayuda. Varios de estos son de capa de datos y no cambian la UI.
2. **Cerrar las decisiones de producto de §8** que condicionan el diseño: alcance del rediseño (si se tocan flujos), nombre, "te corresponde", "Con tarjeta este mes", "resumen estimado", salida en Modo 1. Actualizar la spec (incluidas S-1 a S-6) para que vuelva a ser la fuente de verdad.
3. **Branding** (ya es lo próximo en el handoff): nombre, ícono, paleta y voz, con la metodología de wireframes lado a lado.
4. **Fundamentos del sistema visual**: tokens de color con contraste verificado en los dos temas (sumando los pares que hoy no mide `contrast.test.ts`), escala tipográfica con tope de Dynamic Type, áreas táctiles, y los patrones transversales: error, carga, vacío, confirmación, abandono de formularios.
5. **Decidir la plataforma** (Expo Go vs EAS) antes de definir animaciones y gráficos nuevos.
6. **Rediseño por pregunta**, en el orden de valor del producto: Inicio (radar) → Futuro → espacio (saldo, mes, pagos) → Agregar → Movimientos → onboarding → Perfil, cada una con wireframes y validando contra §29.1 y CA-00.
7. **Probar en el iPhone con lector de pantalla y texto grande**, y en el piloto observar la pregunta de §35: "¿Alguna vez pensaste que 'Sin asignar' era plata que tenías?".

---

## 10. Resumen de verificación

### Qué se inspeccionó

- `HANDOFF.md` completo, en el orden pedido ("▶ Por dónde seguir" y §11 primero).
- La especificación V1.1.2: §1–§30 y §32–§40 completas (incluidas 7, 29 y 29.1); §31 por índice.
- `BRANDING_BRIEF.md` (parcial), `AGENTS.md`, `package.json`, `app.json`, configuraciones de TypeScript, jest, vitest y Babel, `.gitignore`, `tools/`.
- El código de `app/` (63 rutas), `src/` (dominio, datos, features, UI), las 21 migraciones, `supabase/tests/privacidad.test.sql` y `supabase/config.toml` (solo claves). La lectura se repartió en seis relevamientos de solo lectura en paralelo (entrada y onboarding, formularios personales, motor financiero, espacios, datos y RLS, sistema de UI). Los hallazgos marcados **V\*** se volvieron a leer línea por línea.
- Memoria de sesiones anteriores: existe una auditoría de UX del 14/10 cuyos hallazgos el handoff da por resueltos.

### Qué comprobaciones se ejecutaron

| Comprobación | Resultado |
|---|---|
| `npm run verify` (typecheck de 3 configuraciones + vitest + jest + lint CA-00) | **Verde.** vitest 105 archivos, 1318/1318 · jest 64 suites, 434/434 · CA-00 sin violaciones. Dos avisos de "overlapping act() calls" en `compartidosTab.spec.tsx`, que no hacen fallar la suite |
| `git status`, `git log`, `git branch -a`, `git remote -v`, `git stash list` | Árbol limpio, rama `master`, 189 commits, sin remoto ni stashes |
| Cálculo de contraste WCAG sobre los tokens de `colors.ts` | Con un script en el directorio temporal de la sesión, fuera del repo |

### Qué no se pudo comprobar y por qué

- **La app en ejecución y la interfaz visual**: no se levantó Expo ni se usó un dispositivo. Todo lo visual es deducción del código.
- **`npm run test:rls`**: corre contra la base real (aunque en una transacción con rollback) y necesita `supabase login`. No se ejecutó para respetar la regla de no tocar la base.
- **`npm run test:rls:smoke`**: consulta la base real con la anon key. No se ejecutó.
- **`npx expo lint`**: el handoff advierte que modifica `package.json`. No se ejecutó.
- **`npx expo-doctor` / `npx expo install --check`**: consultan la red y no aportaban al diagnóstico de UX. No se ejecutaron.
- **Configuración del proyecto hospedado de Supabase** (SMTP, anónimos, redirects, CAPTCHA): no está en el repo.
- **Los wireframes de referencia** (artifact citado en el handoff): no se abrieron.
- **Escenarios de red, doble toque y navegación** de §6: se deducen del código y no se reprodujeron (son pruebas que escribirían datos).
- Quedaron sin revisar a fondo `GuestCards`, `PaidByMeSection`, los textos de `ActivityList`, el SY-02 de los fijos y el §31 completo de la spec.

### Modificaciones

**No se modificó ningún archivo, dato ni configuración existente.** El único archivo creado en el proyecto es este informe, `AUDITORIA_INICIAL_MISCENT.md`, nuevo y sin commitear (se verificó antes que no existía). Los archivos auxiliares (salida de la suite de tests y el script de contraste) quedaron en el directorio temporal de la sesión, fuera del repositorio.
