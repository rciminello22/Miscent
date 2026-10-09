/**
 * CLI del linter de lenguaje. Corre en CI: si encuentra una violación de
 * CA-00, el build falla.
 *
 *   npm run lint:lenguaje
 */
import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join, relative } from 'node:path';
import { lintSource, type Violation } from './language-lint';

const ROOTS = ['src', 'app'];
const EXTENSIONS = ['.ts', '.tsx'];
const SKIP_DIRS = new Set(['node_modules', '__tests__', '.expo', 'test']);

/**
 * Los tests quedan afuera, y no es una concesión: un test que verifica que
 * "disponible" NO aparece tiene que poder nombrar la palabra. Si el linter los
 * revisara, la única forma de testear la regla sería violarla.
 */
function isTestFile(name: string): boolean {
  return name.endsWith('.test.ts') || name.endsWith('.test.tsx') || name.endsWith('.spec.tsx');
}

function walk(dir: string, found: string[] = []): string[] {
  let entries: string[];
  try {
    entries = readdirSync(dir);
  } catch {
    return found;
  }
  for (const entry of entries) {
    const full = join(dir, entry);
    if (statSync(full).isDirectory()) {
      if (!SKIP_DIRS.has(entry)) walk(full, found);
    } else if (EXTENSIONS.some((ext) => entry.endsWith(ext)) && !isTestFile(entry)) {
      found.push(full);
    }
  }
  return found;
}

const cwd = process.cwd();
const violations: Violation[] = [];

for (const root of ROOTS) {
  for (const file of walk(join(cwd, root))) {
    const relativePath = relative(cwd, file);
    violations.push(...lintSource(readFileSync(file, 'utf8'), relativePath));
  }
}

if (violations.length === 0) {
  console.log('✓ CA-00: ningún término prohibido en la interfaz.');
  process.exit(0);
}

console.error(`\n✗ CA-00: ${violations.length} término(s) prohibido(s) en la interfaz.\n`);
console.error('  G-05: la app nunca afirma que el usuario "tiene", "le queda" o');
console.error('  "dispone de" dinero. Las cifras se rotulan como registradas,');
console.error('  comprometidas, sin asignar o estimadas.\n');

for (const v of violations) {
  console.error(`  ${v.file}:${v.line}`);
  console.error(`    término: "${v.term}"  ·  regla: ${v.rule}`);
  console.error(`    ${v.excerpt}\n`);
}

process.exit(1);
