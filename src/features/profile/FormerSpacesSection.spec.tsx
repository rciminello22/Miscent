import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import {
  RENZO,
  casa,
  membership,
  personalFacts,
  sharedExpense,
  spaceFacts,
} from '@domain/__tests__/fixtures';
import type { Member } from '@domain/types';
import { fireEvent, renderWithTheme, waitFor } from '@/test/render';
import { ToastProvider } from '@/ui/primitives';
import { FormerSpacesSection } from './FormerSpacesSection';

/**
 * Quitar un espacio de tu historial · el container: conecta los hechos de la
 * cuenta personal con la lista, la hoja y la llamada al servidor.
 */

const mockRemove = jest.fn();
let mockFacts: ReturnType<typeof personalFacts>;

jest.mock('expo-router', () => ({ useRouter: () => ({ push: jest.fn() }) }));
jest.mock('@/features/auth/SessionProvider', () => ({
  useSession: () => ({ session: { user: { id: 'u1' } } }),
}));
jest.mock('@/features/shared/usePersonalFacts', () => ({
  usePersonalFacts: () => ({ facts: mockFacts, today: '2026-10-19' }),
}));
jest.mock('@/data/repositories/mutations', () => ({
  deletePersonalMovement: jest.fn(),
  deleteRecurrence: jest.fn(),
}));
jest.mock('@/data/repositories/spaces', () => ({
  deleteMemberPayment: jest.fn(),
  deleteSharedExpense: jest.fn(),
  removeFormerSpace: (spaceId: string) => mockRemove(spaceId),
}));

const people: [Member, Member] = [
  { slot: 1, userId: null, displayName: 'Renzo', status: 'active', isCreator: true },
  { slot: 2, userId: null, displayName: 'Gonzalo', status: 'active', isCreator: false },
];

function conGonzalo(options: { cuotas?: boolean; leftOn?: string | null } = {}) {
  const expenses = [
    sharedExpense({ id: 'a', amount: 48_000, date: '2026-08-10', payerSlot: RENZO }),
    sharedExpense({ id: 'o', amount: 60_000, date: '2026-10-08', payerSlot: 2 }),
  ];
  if (options.cuotas === true) {
    expenses.push(
      sharedExpense({
        id: 'c',
        amount: 150_000,
        date: '2026-10-08',
        payerSlot: 2,
        installments: { count: 2, card: null },
      }),
    );
  }
  return membership({
    facts: spaceFacts({
      space: casa({ id: 'gonzalo', name: 'Con gonzalo', members: people }),
      expenses,
    }),
    mySlot: RENZO,
    leftOn: options.leftOn === undefined ? '2026-10-12' : options.leftOn,
  });
}

async function renderSection() {
  // gcTime 0: una mutación con el tiempo por defecto deja un timer de 5 minutos
  // abierto y jest no termina.
  const client = new QueryClient({ defaultOptions: { mutations: { gcTime: 0 } } });
  const invalidate = jest.spyOn(client, 'invalidateQueries');
  const view = await renderWithTheme(
    <QueryClientProvider client={client}>
      <ToastProvider>
        <FormerSpacesSection />
      </ToastProvider>
    </QueryClientProvider>,
  );
  return { view, invalidate };
}

const QUITAR = { name: 'Quitar Con gonzalo de tu historial' };

beforeEach(() => {
  mockRemove.mockReset();
  mockRemove.mockResolvedValue(undefined);
  mockFacts = personalFacts({ spaces: [conGonzalo()] });
});

describe('FormerSpacesSection', () => {
  it('sin espacios dejados no aparece nada (un espacio activo no cuenta)', async () => {
    mockFacts = personalFacts({ spaces: [conGonzalo({ leftOn: null })] });
    const { view } = await renderSection();

    expect(view.queryByText('Espacios que dejaste')).toBeNull();
  });

  it('muestra el espacio que dejaste', async () => {
    const { view } = await renderSection();

    expect(view.getByText('Espacios que dejaste')).toBeTruthy();
    expect(view.getByText('Con gonzalo')).toBeTruthy();
    expect(view.getByText('Saliste el 12 de octubre')).toBeTruthy();
  });

  it('"Quitar" abre la hoja con lo que cambia, y todavía no llama a nada', async () => {
    const { view } = await renderSection();

    await fireEvent.press(view.getByRole('button', QUITAR));

    expect(view.getByText('¿Quitar Con gonzalo de tu historial?')).toBeTruthy();
    expect(
      view.getByText(
        'Tu radar de agosto, septiembre y octubre deja de contar tu parte de Con gonzalo ($54.000 en total).',
      ),
    ).toBeTruthy();
    expect(view.getByText('Sus 2 gastos desaparecen de Movimientos.')).toBeTruthy();
    expect(view.getByText('Para Gonzalo no cambia nada, ni para nadie más.')).toBeTruthy();
    expect(mockRemove).not.toHaveBeenCalled();
  });

  it('"Cancelar" cierra la hoja sin llamar al servidor', async () => {
    const { view, invalidate } = await renderSection();
    await fireEvent.press(view.getByRole('button', QUITAR));

    await fireEvent.press(view.getByRole('button', { name: 'Cancelar' }));

    expect(view.queryByText('¿Quitar Con gonzalo de tu historial?')).toBeNull();
    expect(mockRemove).not.toHaveBeenCalled();
    expect(invalidate).not.toHaveBeenCalled();
  });

  it('confirmar quita el espacio, refresca los hechos de la cuenta y avisa', async () => {
    const { view, invalidate } = await renderSection();
    await fireEvent.press(view.getByRole('button', QUITAR));

    await fireEvent.press(view.getByRole('button', { name: 'Quitar' }));

    await waitFor(() => expect(view.getByText('Quitaste Con gonzalo de tu historial')).toBeTruthy());
    expect(mockRemove).toHaveBeenCalledTimes(1);
    expect(mockRemove).toHaveBeenCalledWith('gonzalo');
    expect(invalidate).toHaveBeenCalledWith({ queryKey: ['personal-facts', 'u1'] });
    expect(view.getByText('Tu radar de agosto a octubre ya no lo cuenta.')).toBeTruthy();
    expect(view.queryByText('¿Quitar Con gonzalo de tu historial?')).toBeNull();
  });

  it('si la función todavía no existe en la base: avisa y no se rompe nada', async () => {
    mockRemove.mockRejectedValue(new Error('Todavía no se puede hacer. Probá de nuevo más tarde.'));
    const { view, invalidate } = await renderSection();
    await fireEvent.press(view.getByRole('button', QUITAR));

    await fireEvent.press(view.getByRole('button', { name: 'Quitar' }));

    await waitFor(() => expect(view.getByText('No pudimos quitar el espacio')).toBeTruthy());
    expect(view.getByText('Todavía no se puede hacer. Probá de nuevo más tarde.')).toBeTruthy();
    expect(view.queryByText('¿Quitar Con gonzalo de tu historial?')).toBeNull();
    expect(view.getByText('Con gonzalo')).toBeTruthy();
    expect(invalidate).not.toHaveBeenCalled();
  });

  it('con pagos por venir se puede quitar: la hoja avisa de Futuro y el radar sigue', async () => {
    mockFacts = personalFacts({ spaces: [conGonzalo({ cuotas: true })] });
    const { view } = await renderSection();

    await fireEvent.press(view.getByRole('button', QUITAR));

    expect(view.getByText('¿Quitar Con gonzalo de tu historial?')).toBeTruthy();
    expect(
      view.getByText(
        'Tu parte de lo que queda por pagar de Con gonzalo (hasta diciembre) deja de verse en tu Futuro ($75.000 en total).',
      ),
    ).toBeTruthy();
    expect(view.getByText(/^Tu radar de /)).toBeTruthy();
    expect(view.getByText('No se puede deshacer.')).toBeTruthy();
    expect(mockRemove).not.toHaveBeenCalled();
  });

  it('confirmar con pagos por venir quita y el aviso nombra el Futuro', async () => {
    mockFacts = personalFacts({ spaces: [conGonzalo({ cuotas: true })] });
    const { view } = await renderSection();
    await fireEvent.press(view.getByRole('button', QUITAR));

    await fireEvent.press(view.getByRole('button', { name: 'Quitar' }));

    await waitFor(() => expect(view.getByText('Quitaste Con gonzalo de tu historial')).toBeTruthy());
    expect(mockRemove).toHaveBeenCalledWith('gonzalo');
    expect(view.getByText(/Tu Futuro ya no cuenta lo que quedaba hasta diciembre\./)).toBeTruthy();
  });
});
