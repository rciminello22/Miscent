import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join, relative } from 'node:path';
import { describe, it, expect } from 'vitest';

/**
 * HANDOFF §10 · "Con uno solo, entra directo" se renderiza inline, NUNCA con
 * `useEffect` + `router.replace`: el redirect llega tarde, vuelve a disparar al
 * regresar y hacía loop. Esta prueba no deja entrar un `replace` dentro de un
 * `useEffect` en las pantallas.
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

/** El texto entre los paréntesis de cada `useEffect(...)`, con comillas y anidación. */
export function effectBodies(source: string): string[] {
  const bodies: string[] = [];
  let from = source.indexOf('useEffect(');

  while (from !== -1) {
    let depth = 0;
    let quote: string | null = null;
    let i = from + 'useEffect'.length;
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

    bodies.push(source.slice(start, i));
    from = source.indexOf('useEffect(', from + 1);
  }

  return bodies;
}

/** ¿Redirige con `replace` (o `<router>.replace`) adentro? */
export function redirectsWithReplace(body: string): boolean {
  return /\.replace\(\s*[`'"{]/.test(body);
}

describe('effectBodies y redirectsWithReplace', () => {
  it('detecta un router.replace dentro de un useEffect', () => {
    const [body] = effectBodies(
      "useEffect(() => { if (x) { router.replace(`/space/${id}`); } }, [x, router]);",
    );
    expect(redirectsWithReplace(body!)).toBe(true);
  });

  it('un useEffect sin redirect no se marca', () => {
    const [body] = effectBodies('useEffect(() => { setOpen(true); }, []);');
    expect(redirectsWithReplace(body!)).toBe(false);
  });

  it('un replace de texto (String.replace con regex) no se marca', () => {
    const [body] = effectBodies('useEffect(() => { setText(raw.replace(/\\D/g, "")); }, [raw]);');
    expect(redirectsWithReplace(body!)).toBe(false);
  });

  it('cada useEffect se mira por separado', () => {
    const bodies = effectBodies(
      "useEffect(() => { a(); }, []); useEffect(() => { router.replace('/x'); }, []);",
    );
    expect(bodies.map(redirectsWithReplace)).toEqual([false, true]);
  });
});

describe('las pantallas no redirigen desde un useEffect', () => {
  it('ningún useEffect de app/ ni src/ llama a replace', () => {
    const offenders: string[] = [];
    for (const file of [...sourceFiles(join(ROOT, 'app')), ...sourceFiles(join(ROOT, 'src'))]) {
      const path = relative(ROOT, file).replaceAll('\\', '/');
      for (const body of effectBodies(readFileSync(file, 'utf8'))) {
        if (redirectsWithReplace(body)) offenders.push(path);
      }
    }
    expect(offenders).toEqual([]);
  });
});
