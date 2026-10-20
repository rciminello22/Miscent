import {
  RENZO,
  casa,
  membership,
  personalFacts,
  sharedExpense,
  spaceFacts,
} from '@domain/__tests__/fixtures';
import { fireEvent, renderWithTheme } from '@/test/render';
import { FormerSpacesDoor } from './FormerSpacesDoor';

/**
 * P26 · la puerta "Espacios que dejaste" al final de la lista de Compartidos:
 * una sola, con la cuenta; no existe si no dejaste ninguno.
 */

const mockPush = jest.fn();
let mockFacts: ReturnType<typeof personalFacts>;
let mockAccountState: 'personal' | 'guest' = 'personal';

jest.mock('expo-router', () => ({ useRouter: () => ({ push: mockPush }) }));
jest.mock('@/features/auth/SessionProvider', () => ({
  useSession: () => ({ accountState: mockAccountState }),
}));
jest.mock('@/features/shared/usePersonalFacts', () => ({
  usePersonalFacts: () => ({ facts: mockFacts, today: '2026-10-19' }),
}));

function dejado(id: string, leftOn: string | null) {
  return membership({
    facts: spaceFacts({
      space: casa({ id, name: `Espacio ${id}` }),
      expenses: [sharedExpense({ id: `e-${id}`, amount: 40_000, date: '2026-09-02', payerSlot: RENZO })],
    }),
    mySlot: RENZO,
    leftOn,
  });
}

beforeEach(() => {
  mockPush.mockReset();
  mockAccountState = 'personal';
});

describe('FormerSpacesDoor', () => {
  it('sin espacios dejados no existe (uno activo no cuenta)', async () => {
    mockFacts = personalFacts({ spaces: [dejado('a', null)] });
    const view = await renderWithTheme(<FormerSpacesDoor />);

    expect(view.queryByText('Espacios que dejaste')).toBeNull();
  });

  it('con uno: el título y "1 espacio"', async () => {
    mockFacts = personalFacts({ spaces: [dejado('a', '2026-10-12')] });
    const view = await renderWithTheme(<FormerSpacesDoor />);

    expect(view.getByText('Espacios que dejaste')).toBeTruthy();
    expect(view.getByText('1 espacio')).toBeTruthy();
  });

  it('con varios: la cuenta en plural, una sola puerta', async () => {
    mockFacts = personalFacts({
      spaces: [dejado('a', '2026-10-12'), dejado('b', '2026-09-20'), dejado('c', null)],
    });
    const view = await renderWithTheme(<FormerSpacesDoor />);

    expect(view.getByText('2 espacios')).toBeTruthy();
    expect(view.getAllByRole('button')).toHaveLength(1);
  });

  it('con cuenta personal abre la pantalla dentro de la pestaña Compartidos', async () => {
    mockFacts = personalFacts({ spaces: [dejado('a', '2026-10-12')] });
    const view = await renderWithTheme(<FormerSpacesDoor />);

    await fireEvent.press(view.getByRole('button'));

    expect(mockPush).toHaveBeenCalledWith('/(personal)/compartidos/dejados');
  });

  it('el invitado la abre sin pestañas', async () => {
    mockAccountState = 'guest';
    mockFacts = personalFacts({ spaces: [dejado('a', '2026-10-12')] });
    const view = await renderWithTheme(<FormerSpacesDoor />);

    await fireEvent.press(view.getByRole('button'));

    expect(mockPush).toHaveBeenCalledWith('/(guest)/dejados');
  });
});
