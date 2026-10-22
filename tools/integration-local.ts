/**
 * Corre las pruebas de integración de los repositorios contra el Supabase
 * LOCAL (Docker), nunca contra el remoto.
 *
 *   npx supabase start
 *   npm run test:integracion
 *
 * Lee las claves de `supabase status` (son las de desarrollo local, distintas
 * de las del proyecto) y se niega a seguir si la URL no es de esta máquina.
 */

import { execSync, spawnSync } from 'node:child_process';

const status = execSync('npx supabase status -o env', { encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore'] });
const env = Object.fromEntries(
  status
    .split(/\r?\n/)
    .map((line) => line.match(/^([A-Z_]+)="?(.*?)"?$/))
    .filter((match): match is RegExpMatchArray => match != null)
    .map((match) => [match[1]!, match[2]!]),
);

const url = env.API_URL ?? '';
if (!/^http:\/\/(127\.0\.0\.1|localhost):\d+$/.test(url)) {
  console.error(`La URL de Supabase no es local (${url || 'vacía'}). ¿Corriste "npx supabase start"?`);
  process.exit(1);
}

const result = spawnSync('npx', ['vitest', 'run', 'src/data/repositories/integridad.integration.test.ts'], {
  stdio: 'inherit',
  shell: true,
  env: {
    ...process.env,
    SUPABASE_LOCAL_URL: url,
    SUPABASE_LOCAL_ANON_KEY: env.ANON_KEY,
    SUPABASE_LOCAL_SERVICE_KEY: env.SERVICE_ROLE_KEY,
  },
});
process.exit(result.status ?? 1);
