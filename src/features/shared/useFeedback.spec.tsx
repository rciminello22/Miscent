import { Pressable, Text } from 'react-native';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { fireEvent, renderWithTheme } from '@/test/render';
import { ToastProvider } from '@/ui/primitives';
import { useFeedback } from './useFeedback';

/**
 * §17 · el aviso al guardar una compra en cuotas lleva dos acciones: "Ver en
 * Futuro" (abre Futuro con el mes de la primera cuota elegido) y "Deshacer".
 */

const mockPush = jest.fn();

jest.mock('expo-router', () => ({ useRouter: () => ({ push: mockPush }) }));
jest.mock('@/features/auth/SessionProvider', () => ({
  useSession: () => ({ session: { user: { id: 'u1' } } }),
}));
jest.mock('@/data/repositories/mutations', () => ({
  deletePersonalMovement: jest.fn(),
  deleteRecurrence: jest.fn(),
}));
jest.mock('@/data/repositories/spaces', () => ({
  deleteMemberPayment: jest.fn(),
  deleteSharedExpense: jest.fn(),
}));

function Saver({ args }: { args: Parameters<ReturnType<typeof useFeedback>['saved']>[0] }) {
  const feedback = useFeedback();
  return (
    <Pressable accessibilityRole="button" onPress={() => feedback.saved(args)}>
      <Text>Guardar</Text>
    </Pressable>
  );
}

async function renderSaver(args: Parameters<ReturnType<typeof useFeedback>['saved']>[0]) {
  return renderWithTheme(
    <QueryClientProvider client={new QueryClient()}>
      <ToastProvider>
        <Saver args={args} />
      </ToastProvider>
    </QueryClientProvider>,
  );
}

beforeEach(() => mockPush.mockClear());

describe('useFeedback.saved · compra en cuotas', () => {
  const args = {
    audience: { kind: 'private' as const },
    detail: '6 cuotas de $50.000 · la primera suma a noviembre',
    undo: { kind: 'movement' as const, id: 'm1' },
    futureMonth: '2026-11',
  };

  it('dice dónde aterrizó y ofrece "Ver en Futuro" y "Deshacer"', async () => {
    const view = await renderSaver(args);

    await fireEvent.press(view.getByRole('button', { name: 'Guardar' }));

    expect(view.getByText('Guardado · Solo vos lo ves')).toBeTruthy();
    expect(view.getByText('6 cuotas de $50.000 · la primera suma a noviembre')).toBeTruthy();
    expect(view.getByRole('button', { name: 'Ver en Futuro' })).toBeTruthy();
    expect(view.getByRole('button', { name: 'Deshacer' })).toBeTruthy();
  });

  it('"Ver en Futuro" abre Futuro con el mes de la primera cuota elegido', async () => {
    const view = await renderSaver(args);
    await fireEvent.press(view.getByRole('button', { name: 'Guardar' }));

    await fireEvent.press(view.getByRole('button', { name: 'Ver en Futuro' }));

    expect(mockPush).toHaveBeenCalledTimes(1);
    expect(mockPush).toHaveBeenCalledWith({
      pathname: '/(personal)/futuro',
      params: { mes: '2026-11', n: expect.any(String) },
    });
  });

  it('sin mes de cuotas no hay "Ver en Futuro": solo "Deshacer", como siempre', async () => {
    const view = await renderSaver({ ...args, futureMonth: undefined });
    await fireEvent.press(view.getByRole('button', { name: 'Guardar' }));

    expect(view.queryByRole('button', { name: 'Ver en Futuro' })).toBeNull();
    expect(view.getByRole('button', { name: 'Deshacer' })).toBeTruthy();
  });

  it('"Ver en Futuro" no deshace nada', async () => {
    const view = await renderSaver(args);
    await fireEvent.press(view.getByRole('button', { name: 'Guardar' }));
    await fireEvent.press(view.getByRole('button', { name: 'Ver en Futuro' }));

    expect(view.queryByText('Listo, no se guardó')).toBeNull();
  });
});
