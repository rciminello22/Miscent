import { Text } from 'react-native';
import { renderWithTheme } from '@/test/render';
import { PaidByMeCard } from './PaidByMeCard';

/**
 * Nivel 3 · §5 1º Should · "¿Con qué lo pagaste?". Si Martina carga "pagó
 * Renzo", el gasto no entra al resumen de la Visa de Renzo hasta que él diga
 * con qué lo pagó.
 */

const base = {
  title: 'Martina cargó 2 gastos que pagaste vos. ¿Con qué los pagaste?',
  items: [
    { expenseId: 'super', line: 'Supermercado · 10 oct · $100.000' },
    { expenseId: 'heladera', line: 'Heladera · 12 cuotas · $600.000' },
  ],
  renderPicker: (expenseId: string) => <Text>{`selector de ${expenseId}`}</Text>,
};

describe('PaidByMeCard', () => {
  it('dice quién los cargó y lista cada gasto', async () => {
    const view = await renderWithTheme(<PaidByMeCard {...base} />);

    expect(view.getByText(base.title)).toBeTruthy();
    expect(view.getByText('Supermercado · 10 oct · $100.000')).toBeTruthy();
    expect(view.getByText('Heladera · 12 cuotas · $600.000')).toBeTruthy();
  });

  it('cada gasto tiene su propio selector de medio', async () => {
    const view = await renderWithTheme(<PaidByMeCard {...base} />);

    expect(view.getByText('selector de super')).toBeTruthy();
    expect(view.getByText('selector de heladera')).toBeTruthy();
  });

  it('PR-02 · aclara que el medio es privado', async () => {
    const view = await renderWithTheme(<PaidByMeCard {...base} />);
    expect(view.getByText(/Solo vos ves con qué pagaste/)).toBeTruthy();
  });
});
