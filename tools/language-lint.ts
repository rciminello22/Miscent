/**
 * Nivel 4 de testing: convierte CA-00 en una garantía mecánica.
 *
 * CA-00 es el criterio de aceptación más fácil de violar sin darse cuenta:
 * alcanza con escribir "no tenés nada disponible" en un estado vacío para
 * romper el principio central del producto (G-05: la app no conoce el dinero
 * real del usuario y nunca afirma que lo tiene).
 *
 * Este linter escanea SOLO literales de string, no comentarios ni nombres de
 * variables, para no producir falsos positivos que alguien terminaría
 * silenciando.
 *
 * Reglas: §29 G-05 y §36 CA-00.
 */

export type Violation = {
  file: string;
  line: number;
  term: string;
  excerpt: string;
  rule: string;
};

type ForbiddenTerm = {
  /** Nombre humano del término prohibido. */
  term: string;
  pattern: RegExp;
  rule: string;
  /**
   * Fragmentos de ruta donde el término SÍ está permitido.
   * Solo "saldo" tiene excepción: §7.2 lo autoriza exclusivamente para el
   * saldo compartido de un espacio.
   */
  allowedIn?: string[];
};

const FORBIDDEN: ForbiddenTerm[] = [
  {
    term: 'disponible',
    pattern: /\bdisponibles?\b/i,
    rule: 'G-05 · CA-00',
  },
  {
    term: 'te queda',
    pattern: /\bte\s+qued[ao]n?\b/i,
    rule: 'G-05 · CA-00 · D1',
  },
  {
    term: 'dinero libre',
    pattern: /\bdinero\s+(libre|disponible)\b/i,
    rule: 'G-05 · CA-00',
  },
  {
    term: 'libre',
    pattern: /\blibres?\b/i,
    rule: 'G-05 · CA-00 · §33 (reemplazado por "Sin asignar")',
  },
  {
    term: 'tenés $X',
    pattern: /\bten[eé]s\s+(\$|\{)/i,
    rule: 'G-05 · CA-00',
  },
  {
    term: 'podés gastar',
    pattern: /\bpod[eé]s\s+gastar\b/i,
    rule: 'G-05 · CA-00',
  },
  {
    term: 'cifra por día',
    pattern: /\b(por|al)\s+d[ií]a\b/i,
    rule: 'CA-00 · §5 (eliminado respecto de V1.1)',
  },
  {
    term: 'se libera',
    pattern: /\bse\s+liber[ao]n?\b/i,
    rule: '§33 (reemplazado por "tu comprometido baja")',
  },
  {
    term: 'me alcanza',
    pattern: /\b(te|me)\s+alcanza\b/i,
    rule: '§17 · §33 (la vista previa nunca dice si alcanza)',
  },
  {
    term: 'saldo',
    pattern: /\bsaldos?\b/i,
    rule: '§7.2 · G-05 ("saldo" solo existe para el saldo compartido)',
    allowedIn: ['features/spaces', 'domain/shared-balance', 'data/spaces'],
  },
];

/** "Pagado" como etiqueta de estado: G-06 exige "Ya pasó". */
const FORBIDDEN_EXACT: ForbiddenTerm[] = [
  {
    term: 'Pagado (como estado)',
    pattern: /^pagad[oa]s?$/i,
    rule: 'G-06 · CA-45 (el estado correcto es "Ya pasó")',
  },
];

/**
 * Reemplaza comentarios por espacios, preservando los literales de string
 * (para no cortar en el "//" de una URL). Escáner de un paso con estado.
 *
 * Analizamos todo el código restante, no solo los literales: en React Native
 * el texto de interfaz muy a menudo es JSXText suelto (`<Text>Hola</Text>`),
 * sin comillas. Un falso negativo acá rompe el producto; un falso positivo
 * sobre un identificador (`const saldo = ...` en una pantalla personal) es,
 * en realidad, una señal legítima: ese concepto no existe en lo personal.
 */
export function stripComments(source: string): string {
  const out: string[] = [];
  let i = 0;
  const n = source.length;

  while (i < n) {
    const c = source[i]!;
    const next = source[i + 1];

    if (c === '/' && next === '/') {
      while (i < n && source[i] !== '\n') {
        out.push(' ');
        i++;
      }
      continue;
    }

    if (c === '/' && next === '*') {
      while (i < n && !(source[i] === '*' && source[i + 1] === '/')) {
        out.push(source[i] === '\n' ? '\n' : ' ');
        i++;
      }
      out.push(' ', ' ');
      i += 2;
      continue;
    }

    if (c === "'" || c === '"' || c === '`') {
      const quote = c;
      out.push(c);
      i++;
      while (i < n) {
        const ch = source[i]!;
        if (ch === '\\') {
          out.push(ch, source[i + 1] ?? '');
          i += 2;
          continue;
        }
        out.push(ch);
        i++;
        if (ch === quote) break;
        // Un string de comilla simple o doble no cruza saltos de línea.
        if (ch === '\n' && quote !== '`') break;
      }
      continue;
    }

    out.push(c);
    i++;
  }

  return out.join('');
}

/** Divide el código (ya sin comentarios) en líneas numeradas. */
function visibleLines(source: string): Array<{ value: string; line: number }> {
  return stripComments(source)
    .split('\n')
    .map((value, index) => ({ value, line: index + 1 }));
}

function isAllowed(term: ForbiddenTerm, filePath: string): boolean {
  if (!term.allowedIn) return false;
  const normalized = filePath.replace(/\\/g, '/');
  return term.allowedIn.some((fragment) => normalized.includes(fragment));
}

export function lintSource(source: string, filePath: string): Violation[] {
  const violations: Violation[] = [];

  for (const { value, line } of visibleLines(source)) {
    if (value.trim() === '') continue;

    for (const term of FORBIDDEN) {
      if (isAllowed(term, filePath)) continue;
      if (term.pattern.test(value)) {
        violations.push({
          file: filePath,
          line,
          term: term.term,
          excerpt: value.trim().slice(0, 90),
          rule: term.rule,
        });
      }
    }

    // "Pagado" solo se prohíbe cuando es la etiqueta completa, para no
    // romper usos legítimos como "¿último resumen pagado?" (§13, O3 paso 4).
    for (const term of FORBIDDEN_EXACT) {
      const literals = value.match(/'([^']*)'|"([^"]*)"|>\s*([^<>{}]+?)\s*</g) ?? [];
      const labels = literals.map((l) => l.replace(/^['">\s]+|['"<\s]+$/g, '').trim());
      if (labels.some((label) => term.pattern.test(label))) {
        violations.push({
          file: filePath,
          line,
          term: term.term,
          excerpt: value.trim().slice(0, 90),
          rule: term.rule,
        });
      }
    }
  }

  return violations;
}
