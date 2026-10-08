import { describe, it, expect } from 'vitest';
import { lintSource } from './language-lint';

describe('CA-00 · lint de lenguaje prohibido', () => {
  it('rechaza "disponible"', () => {
    const v = lintSource(`<Text>Tenés $400.000 disponibles</Text>`, 'src/features/home/Home.tsx');
    expect(v.map((x) => x.term)).toContain('disponible');
  });

  it('rechaza "te queda" y "te quedan"', () => {
    expect(lintSource(`const t = "Te quedan $400.000";`, 'src/ui/a.ts')).toHaveLength(1);
    expect(lintSource(`const t = "Te queda poco";`, 'src/ui/a.ts')).toHaveLength(1);
  });

  it('rechaza "libre" como sinónimo de plata', () => {
    const v = lintSource(`const t = "Libre $580.000";`, 'src/features/future/Future.tsx');
    expect(v.map((x) => x.term)).toContain('libre');
  });

  it('rechaza "podés gastar" y "tenés $"', () => {
    expect(lintSource(`const a = "Podés gastar $15.000";`, 'src/ui/a.ts')).toHaveLength(1);
    expect(lintSource('const b = `Tenés $${monto}`;', 'src/ui/a.ts')).toHaveLength(1);
  });

  it('rechaza cifras por día (eliminado en V1.1.2)', () => {
    const v = lintSource(`const t = "≈ $15.000 por día";`, 'src/features/home/Home.tsx');
    expect(v.map((x) => x.term)).toContain('cifra por día');
  });

  it('rechaza "se liberan" (§33: el término correcto es "tu comprometido baja")', () => {
    const v = lintSource(`const t = "Se liberan $80.000 por mes";`, 'src/features/future/F.tsx');
    expect(v.map((x) => x.term)).toContain('se libera');
  });

  it('rechaza "te alcanza" en la vista previa', () => {
    const v = lintSource(`const t = "Te alcanza para esta compra";`, 'src/features/add/Preview.tsx');
    expect(v.map((x) => x.term)).toContain('me alcanza');
  });

  it('rechaza "Pagado" como etiqueta de estado, pero permite "pagó Renzo"', () => {
    expect(lintSource(`const estado = "Pagado";`, 'src/ui/Badge.tsx')).toHaveLength(1);
    expect(lintSource(`const t = "pagó Renzo";`, 'src/ui/Row.tsx')).toHaveLength(0);
    expect(lintSource(`const t = "Ya pasó";`, 'src/ui/Row.tsx')).toHaveLength(0);
  });

  it('rechaza "saldo" en pantallas personales', () => {
    const v = lintSource(`const t = "Tu saldo del mes";`, 'src/features/home/Home.tsx');
    expect(v.map((x) => x.term)).toContain('saldo');
  });

  it('permite "saldo" solo en el espacio compartido (§7.2)', () => {
    const v = lintSource(
      `const t = "Martina te debe $20.000"; const l = "Saldo compartido";`,
      'src/features/spaces/SpaceHeader.tsx',
    );
    expect(v).toHaveLength(0);
  });

  it('ignora comentarios y nombres de identificadores', () => {
    const source = `
      // El dato "disponible" del banco no existe en este producto.
      const isAvailable = true;
      function getSaldoLibre() { return 0; }
    `;
    expect(lintSource(source, 'src/features/home/Home.tsx')).toHaveLength(0);
  });

  it('acepta el lenguaje correcto del radar', () => {
    const source = `
      const labels = {
        income: "Tus ingresos de octubre",
        spent: "Gastado",
        committed: "Comprometido",
        unassigned: "Sin asignar",
        help: "Todavía sin destino, según lo que registraste",
        negative: "Tus gastos y compromisos superan tus ingresos registrados por",
        card: "Se paga en noviembre",
        statement: "Estimado según lo que registraste",
        past: "Ya pasó",
      };
    `;
    expect(lintSource(source, 'src/features/home/labels.ts')).toHaveLength(0);
  });
});
