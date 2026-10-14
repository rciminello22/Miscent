import { fireEvent } from '@testing-library/react-native';
import { renderWithTheme } from '@/test/render';
import { StoppedFixedCard } from './StoppedFixedCard';

/**
 * Nivel 3 · SA-04 · §27 · Caso 12: "Renzo ve […] la pregunta sobre el
 * alquiler". Sin ella, el alquiler desaparecía de su radar sin aviso.
 */

const alquiler = {
  recurrenceId: 'alquiler',
  label: 'Alquiler',
  amount: 500_000,
};

const base = {
  otherName: 'Martina',
  spaceName: 'Casa',
  items: [alquiler],
  canKeep: true,
  busyId: null,
  onKeep: () => {},
  onEnd: () => {},
};

describe('StoppedFixedCard · SA-04', () => {
  it('dice quién salió y pregunta por cada fijo', async () => {
    const view = await renderWithTheme(<StoppedFixedCard {...base} />);

    expect(view.getByText('Martina salió de Casa')).toBeTruthy();
    expect(view.getByText('"Alquiler" era compartido con Martina. ¿Lo seguís pagando vos?')).toBeTruthy();
    expect(view.getByText('En tus fijos cuenta entero: $500.000 por mes.')).toBeTruthy();
  });

  it('§27 · las dos salidas: Pasarlo a mis fijos / Terminarlo', async () => {
    const onKeep = jest.fn();
    const onEnd = jest.fn();
    const view = await renderWithTheme(<StoppedFixedCard {...base} onKeep={onKeep} onEnd={onEnd} />);

    await fireEvent.press(view.getByRole('button', { name: 'Pasarlo a mis fijos' }));
    await fireEvent.press(view.getByRole('button', { name: 'Terminarlo' }));

    expect(onKeep).toHaveBeenCalledWith('alquiler');
    expect(onEnd).toHaveBeenCalledWith('alquiler');
  });

  it('A-05 · sin cuenta personal no ofrece "mis fijos": avisa y se cierra', async () => {
    const onEnd = jest.fn();
    const view = await renderWithTheme(
      <StoppedFixedCard {...base} canKeep={false} onEnd={onEnd} />,
    );

    expect(view.queryByRole('button', { name: 'Pasarlo a mis fijos' })).toBeNull();
    expect(view.getByText('"Alquiler" era compartido con Martina y dejó de serlo cuando salió.')).toBeTruthy();

    await fireEvent.press(view.getByRole('button', { name: 'Entendido' }));
    expect(onEnd).toHaveBeenCalledWith('alquiler');
  });
});
