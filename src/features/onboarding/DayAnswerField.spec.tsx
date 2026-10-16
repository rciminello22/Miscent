import { fireEvent, renderWithTheme } from '@/test/render';
import { DayAnswerField } from './DayAnswerField';

/**
 * Nivel 3 · el patrón de tres respuestas para un día (T-02, T-05): "Sé el día"
 * abre los días, "Más o menos" ofrece Principio, Mediados y Fin de mes, y "No sé"
 * no pide nada más ni ofrece un día "por las dudas".
 */
describe('DayAnswerField', () => {
  it('las tres respuestas, ninguna elegida de antemano', async () => {
    const view = await renderWithTheme(
      <DayAnswerField label="Día de cierre" value={{ mode: null, day: null }} onChange={jest.fn()} />,
    );

    for (const label of ['Sé el día', 'Más o menos', 'No sé']) {
      expect(view.getByLabelText(label).props.accessibilityState).toMatchObject({ selected: false });
    }
    // Sin elegir nada no se ofrece ningún día: nadie queda con uno que no eligió.
    expect(view.queryByText('Principio')).toBeNull();
    expect(view.queryByLabelText('15')).toBeNull();
  });

  it('"Sé el día" abre el selector de días', async () => {
    const onChange = jest.fn();
    const view = await renderWithTheme(
      <DayAnswerField label="Día de cierre" value={{ mode: 'exact', day: null }} onChange={onChange} />,
    );

    await fireEvent.press(view.getByLabelText('15'));
    expect(onChange).toHaveBeenCalledWith({ mode: 'exact', day: 15 });
  });

  it('tocar "Sé el día" desde otra respuesta cambia el modo y suelta el día', async () => {
    const onChange = jest.fn();
    const view = await renderWithTheme(
      <DayAnswerField label="Día de cierre" value={{ mode: 'approx', day: 15 }} onChange={onChange} />,
    );

    await fireEvent.press(view.getByLabelText('Sé el día'));
    expect(onChange).toHaveBeenCalledWith({ mode: 'exact', day: null });
  });

  it('"Más o menos" ofrece Principio, Mediados y Fin de mes, y dice qué guarda', async () => {
    const onChange = jest.fn();
    const view = await renderWithTheme(
      <DayAnswerField label="Día de cierre" value={{ mode: 'approx', day: 15 }} onChange={onChange} />,
    );

    expect(view.getByText('Principio')).toBeTruthy();
    expect(view.getByText('Fin de mes')).toBeTruthy();
    expect(view.getByText('Guardamos el 15, marcado como aproximado.')).toBeTruthy();

    await fireEvent.press(view.getByLabelText('Fin de mes'));
    expect(onChange).toHaveBeenCalledWith({ mode: 'approx', day: 28 });
  });

  it('"No sé" no pide nada más: solo dice qué pasa', async () => {
    const view = await renderWithTheme(
      <DayAnswerField
        label="Día de cierre"
        value={{ mode: 'unknown', day: null }}
        onChange={jest.fn()}
        unknownHelp="Lo contamos en el mes en que cobrás, sin día."
      />,
    );

    expect(view.getByLabelText('No sé').props.accessibilityState).toMatchObject({ selected: true });
    expect(view.getByText('Lo contamos en el mes en que cobrás, sin día.')).toBeTruthy();
    expect(view.queryByLabelText('15')).toBeNull();
    expect(view.queryByText('Principio')).toBeNull();
  });
});
