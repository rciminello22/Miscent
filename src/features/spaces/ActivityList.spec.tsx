import { renderWithTheme } from '@/test/render';
import { ActivityList } from './ActivityList';

/** Nivel 3 · Should 6 · la actividad reciente del espacio. */
describe('ActivityList', () => {
  it('muestra cada cambio con su momento', async () => {
    const view = await renderWithTheme(
      <ActivityList items={[{ key: 'a', line: 'Martina cargó Supermercado · $100.000', when: 'hoy' }]} />,
    );
    expect(view.getByText('Martina cargó Supermercado · $100.000')).toBeTruthy();
    expect(view.getByText('hoy')).toBeTruthy();
  });

  it('sin nada, lo dice', async () => {
    const view = await renderWithTheme(<ActivityList items={[]} />);
    expect(view.getByText('Todavía no hay movimientos en este espacio.')).toBeTruthy();
  });
});
