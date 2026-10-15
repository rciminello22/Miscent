import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join, relative } from 'node:path';
import { describe, it, expect } from 'vitest';

/**
 * UX-23 · canal de errores. Un error que no bloquea va por `useFeedback().error`
 * (toast, que además cierra el teclado). `Alert.alert` queda SOLO para
 * confirmaciones: un diálogo con botones entre los que elegir.
 *
 * Un `Alert.alert(titulo, mensaje)` sin botones es un aviso disfrazado de
 * diálogo: eso es lo que esta prueba no deja entrar.
 */

const ROOT = process.cwd();

function sourceFiles(dir: string): string[] {
  const out: string[] = [];
  for (const name of readdirSync(dir)) {
    const path = join(dir, name);
    if (statSync(path).isDirectory()) {
      if (name === 'node_modules') continue;
      out.push(...sourceFiles(path));
    } else if (/\.tsx?$/.test(name) && !/\.(spec|test)\.tsx?$/.test(name)) {
      out.push(path);
    }
  }
  return out;
}

/** El texto entre los paréntesis de cada `Alert.alert(...)`, con comillas y anidación. */
export function alertCalls(source: string): string[] {
  const calls: string[] = [];
  let from = source.indexOf('Alert.alert(');

  while (from !== -1) {
    let depth = 0;
    let quote: string | null = null;
    let i = from + 'Alert.alert'.length;
    const start = i + 1;

    for (; i < source.length; i += 1) {
      const char = source[i]!;
      if (quote != null) {
        if (char === '\\') i += 1;
        else if (char === quote) quote = null;
        continue;
      }
      if (char === "'" || char === '"' || char === '`') quote = char;
      else if (char === '(') depth += 1;
      else if (char === ')') {
        depth -= 1;
        if (depth === 0) break;
      }
    }

    calls.push(source.slice(start, i));
    // Desde el inicio + 1, no desde el final: un Alert puede estar anidado en los botones de otro.
    from = source.indexOf('Alert.alert(', from + 1);
  }

  return calls;
}

/** ¿Tiene un arreglo de botones como argumento (a nivel del propio llamado)? */
export function hasButtons(call: string): boolean {
  let depth = 0;
  let quote: string | null = null;

  for (let i = 0; i < call.length; i += 1) {
    const char = call[i]!;
    if (quote != null) {
      if (char === '\\') i += 1;
      else if (char === quote) quote = null;
      continue;
    }
    if (char === "'" || char === '"' || char === '`') quote = char;
    else if (char === '(' || char === '{') depth += 1;
    else if (char === ')' || char === '}') depth -= 1;
    else if (char === '[' && depth === 0 && startsArgument(call, i)) return true;
  }
  return false;
}

/** `[` abre un argumento (un arreglo de botones) si lo precede una coma; si no, indexa. */
function startsArgument(text: string, index: number): boolean {
  for (let i = index - 1; i >= 0; i -= 1) {
    if (/\s/.test(text[i]!)) continue;
    return text[i] === ',';
  }
  return false;
}

describe('UX-23 · alertCalls y hasButtons', () => {
  it('una confirmación con botones se reconoce', () => {
    const [call] = alertCalls(
      "Alert.alert('¿Eliminar?', 'Se pierde.', [{ text: 'Cancelar', style: 'cancel' }]);",
    );
    expect(hasButtons(call!)).toBe(true);
  });

  it('un aviso con título y mensaje, sin botones, se detecta', () => {
    const [call] = alertCalls("Alert.alert('No pudimos hacerlo', error.message);");
    expect(hasButtons(call!)).toBe(false);
  });

  it('los paréntesis y corchetes dentro del texto no confunden', () => {
    const [call] = alertCalls("Alert.alert('Ojo (esto)', 'lista [1, 2]');");
    expect(hasButtons(call!)).toBe(false);
  });

  it('un título armado con una llamada no cuenta como botones', () => {
    const [call] = alertCalls('Alert.alert(titleOf(error), messages[0]);');
    expect(hasButtons(call!)).toBe(false);
  });
});

/**
 * Los avisos que siguen siendo un diálogo nativo, y por qué.
 *
 * PendingInvitation: la invitación no se pudo abrir y, si la persona entró sin
 * email, la sesión se cierra justo después. Se queda sin espacio y sin forma de
 * volver, y la razón (ya usada, vencida, anulada) tiene que quedar reconocida:
 * un toast se va solo a los 6 segundos, sobre una pantalla que cambia.
 */
const BLOCKING_NOTICES = ['src/features/auth/PendingInvitation.tsx'];

describe('UX-23 · Alert.alert es solo para confirmaciones', () => {
  const offenders: string[] = [];

  for (const file of [...sourceFiles(join(ROOT, 'app')), ...sourceFiles(join(ROOT, 'src'))]) {
    const path = relative(ROOT, file).replaceAll('\\', '/');
    for (const call of alertCalls(readFileSync(file, 'utf8'))) {
      if (!hasButtons(call)) offenders.push(`${path} · Alert.alert(${call.slice(0, 50).trim()}…`);
    }
  }

  it('ningún error pasa por un Alert sin botones (salvo los avisos bloqueantes justificados)', () => {
    const unexpected = offenders.filter(
      (offender) => !BLOCKING_NOTICES.some((allowed) => offender.startsWith(allowed)),
    );
    expect(unexpected).toEqual([]);
  });

  it('la lista de excepciones no tiene entradas que ya no hagan falta', () => {
    for (const allowed of BLOCKING_NOTICES) {
      expect(offenders.some((offender) => offender.startsWith(allowed))).toBe(true);
    }
  });
});
