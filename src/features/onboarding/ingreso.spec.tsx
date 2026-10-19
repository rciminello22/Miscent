import { fireEvent, renderWithTheme, waitFor } from '@/test/render';
import Ingreso from '../../../app/onboarding/ingreso';

const mockPush = jest.fn();
const mockCreate = jest.fn();
const mockUpdate = jest.fn();

jest.mock('expo-router', () => ({
  useRouter: () => ({ push: mockPush, replace: jest.fn(), back: jest.fn(), canGoBack: () => true }),
  useLocalSearchParams: () => ({}),
}));

jest.mock('@/features/shared/useToday', () => ({ useToday: () => '2026-10-18' }));

jest.mock('@/features/shared/usePersonalFacts', () => ({
  usePersonalFacts: () => ({ facts: { paymentMethods: [], spaces: [], recurrences: [] } }),
  useCreateRecurrence: () => ({ mutateAsync: mockCreate, isPending: false }),
  useUpdateIncome: () => ({ mutateAsync: mockUpdate, isPending: false }),
}));

// TextInput real: el monto se escribe como lo haría el usuario.
async function typeAmount(view: Awaited<ReturnType<typeof renderWithTheme>>, text: string) {
  await fireEvent.changeText(view.getByLabelText('Monto en pesos'), text);
}

async function continueButton(view: Awaited<ReturnType<typeof renderWithTheme>>) {
  return view.getByRole('button', { name: 'Continuar' });
}

describe('Onboarding · Ingreso', () => {
  beforeEach(() => {
    mockPush.mockReset();
    mockCreate.mockReset();
    mockUpdate.mockReset();
  });

  it('al guardar sigue a tarjetas y el botón no queda cargando al volver', async () => {
    mockCreate.mockResolvedValue('r1');
    const view = await renderWithTheme(<Ingreso />);
    await typeAmount(view, '1000000');

    await fireEvent.press(await continueButton(view));

    await waitFor(() => expect(mockPush).toHaveBeenCalledWith('/onboarding/tarjetas'));
    const button = await continueButton(view);
    expect(button.props.accessibilityState?.busy).toBeFalsy();
  });

  it('si guardar falla, no navega y el botón queda libre', async () => {
    mockCreate.mockRejectedValue(new Error('sin red'));
    const view = await renderWithTheme(<Ingreso />);
    await typeAmount(view, '1000000');

    await fireEvent.press(await continueButton(view));

    await waitFor(() => expect(mockCreate).toHaveBeenCalledTimes(1));
    expect(mockPush).not.toHaveBeenCalled();
    const button = await continueButton(view);
    expect(button.props.accessibilityState?.busy).toBeFalsy();
  });

  it('al volver y tocar Continuar otra vez sin cambios, no crea un segundo sueldo', async () => {
    mockCreate.mockResolvedValue('r1');
    const view = await renderWithTheme(<Ingreso />);
    await typeAmount(view, '1000000');

    await fireEvent.press(await continueButton(view));
    await waitFor(() => expect(mockPush).toHaveBeenCalledTimes(1));
    await fireEvent.press(await continueButton(view));

    await waitFor(() => expect(mockPush).toHaveBeenCalledTimes(2));
    expect(mockCreate).toHaveBeenCalledTimes(1);
    expect(mockUpdate).not.toHaveBeenCalled();
  });

  it('al volver y cambiar el monto, actualiza el mismo ingreso', async () => {
    mockCreate.mockResolvedValue('r1');
    mockUpdate.mockResolvedValue(undefined);
    const view = await renderWithTheme(<Ingreso />);
    await typeAmount(view, '1000000');
    await fireEvent.press(await continueButton(view));
    await waitFor(() => expect(mockPush).toHaveBeenCalledTimes(1));

    await typeAmount(view, '1200000');
    await fireEvent.press(await continueButton(view));

    await waitFor(() => expect(mockPush).toHaveBeenCalledTimes(2));
    expect(mockCreate).toHaveBeenCalledTimes(1);
    expect(mockUpdate).toHaveBeenCalledWith(expect.objectContaining({ id: 'r1', amount: 1_200_000 }));
  });
});
