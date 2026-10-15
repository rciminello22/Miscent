import { Alert, type AlertButton } from 'react-native';
import { confirmDiscardChanges } from './confirmDiscard';

describe('UX-18 · confirmDiscardChanges', () => {
  afterEach(() => jest.restoreAllMocks());

  it('pregunta "¿Descartar los cambios?" con dos botones', () => {
    const alert = jest.spyOn(Alert, 'alert').mockImplementation(() => {});

    confirmDiscardChanges(() => {});

    const [title, , buttons] = alert.mock.calls[0]!;
    expect(title).toBe('¿Descartar los cambios?');
    expect((buttons as AlertButton[]).map((button) => button.text)).toEqual([
      'Seguir editando',
      'Descartar',
    ]);
  });

  it('"Descartar" descarta y "Seguir editando" no hace nada', () => {
    const alert = jest.spyOn(Alert, 'alert').mockImplementation(() => {});
    const onDiscard = jest.fn();

    confirmDiscardChanges(onDiscard);
    const buttons = alert.mock.calls[0]![2] as AlertButton[];

    buttons[0]!.onPress?.();
    expect(onDiscard).not.toHaveBeenCalled();

    buttons[1]!.onPress?.();
    expect(onDiscard).toHaveBeenCalledTimes(1);
  });
});
