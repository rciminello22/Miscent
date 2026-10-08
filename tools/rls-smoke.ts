/**
 * Smoke test de RLS contra el proyecto real, con la anon key.
 *
 * Verifica la propiedad más básica y más importante del esquema: sin sesión,
 * NINGUNA tabla devuelve una sola fila.
 *
 * Es complementario a supabase/tests/privacidad.test.sql, que prueba la
 * privacidad entre dos usuarios autenticados. Este prueba algo distinto: que
 * RLS esté realmente activo en todas las tablas, en la base de verdad, con la
 * clave que va a llevar la app. Si alguien agrega una tabla y se olvida del
 * `enable row level security`, acá se ve.
 *
 *   npm run test:rls:smoke
 */

import { readFileSync } from 'node:fs';
import { join } from 'node:path';

const TABLES = [
  'profiles',
  'payment_methods',
  'personal_movements',
  'declared_statements',
  'recurrences',
  'recurrence_overrides',
  'spaces',
  'space_members',
  'shared_expenses',
  'shared_payment_details',
  'member_payments',
  'invitations',
] as const;

function readEnv(): { url: string; anonKey: string } {
  const candidates = ['.env.local', '.env'];

  for (const file of candidates) {
    let contents: string;
    try {
      contents = readFileSync(join(process.cwd(), file), 'utf8');
    } catch {
      continue;
    }

    const values = new Map<string, string>();
    for (const line of contents.split('\n')) {
      const match = /^\s*([A-Z0-9_]+)\s*=\s*(.*)$/.exec(line);
      if (match) values.set(match[1]!, match[2]!.trim());
    }

    const url = values.get('EXPO_PUBLIC_SUPABASE_URL');
    const anonKey = values.get('EXPO_PUBLIC_SUPABASE_ANON_KEY');
    if (url && anonKey) return { url: url.replace(/\/+$/, ''), anonKey };
  }

  throw new Error(
    'No encontré EXPO_PUBLIC_SUPABASE_URL ni EXPO_PUBLIC_SUPABASE_ANON_KEY. ' +
      'Copiá .env.example a .env.local y completalas.',
  );
}

async function main() {
  const { url, anonKey } = readEnv();
  const headers = { apikey: anonKey, Authorization: `Bearer ${anonKey}` };

  console.log('RLS · sin sesión, con la anon key. Ninguna tabla debe devolver filas.\n');

  let leaks = 0;

  for (const table of TABLES) {
    const response = await fetch(`${url}/rest/v1/${table}?select=*&limit=5`, { headers });

    let detail: string;
    let ok: boolean;

    if (!response.ok) {
      // Un 401/404 también es "no devolvió datos", pero conviene verlo.
      detail = `HTTP ${response.status}`;
      ok = response.status === 401 || response.status === 404;
    } else {
      const rows = (await response.json()) as unknown[];
      detail = `${rows.length} filas`;
      ok = rows.length === 0;
    }

    if (!ok) leaks += 1;
    console.log(`  ${ok ? '✓' : '✗ FUGA'}  ${table.padEnd(24)} ${detail}`);
  }

  console.log('');

  if (leaks > 0) {
    console.error(`✗ ${leaks} tabla(s) devolvieron datos sin sesión. PR-01/PR-02 roto.`);
    process.exit(1);
  }

  console.log(`✓ RLS falla cerrada en las ${TABLES.length} tablas.`);
}

main().catch((error: unknown) => {
  console.error(error instanceof Error ? error.message : error);
  process.exit(1);
});
