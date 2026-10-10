import {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from 'react';
import type { Session } from '@supabase/supabase-js';
import { useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/data/supabase';
import { displayNameFromEmail, takeOnboardingIntent } from './onboardingIntent';
import { deriveAccountState, type AccountState } from './authFlow';

/**
 * Sesión y estado de cuenta.
 *
 * El estado de cuenta es lo que decide qué árbol de navegación ve el usuario
 * (§14), y es una de las decisiones de producto más importantes:
 *
 *   Estado A · tiene cuenta personal → Inicio, Movimientos, Futuro, Compartidos
 *   Estado B · NO tiene cuenta personal → sus espacios, SIN barra de pestañas
 *
 * K0 · "Ser miembro de un espacio no es tener cuenta personal. El invitado
 * nunca siente que tiene una cuenta incompleta." Por eso el Estado B no es un
 * Estado A con cosas deshabilitadas: es otro árbol. CA-06 exige que no haya
 * pestañas bloqueadas ni candados.
 */

export type { AccountState };

export type Profile = {
  id: string;
  displayName: string;
  hasPersonalAccount: boolean;
  timezone: string;
};

type SessionContextValue = {
  session: Session | null;
  profile: Profile | null;
  /** §14 · qué árbol de navegación corresponde. */
  accountState: AccountState;
  refreshProfile: () => Promise<void>;
  /**
   * Entró por una invitación sin email (10/10). Hasta que guarde su email no
   * tiene cómo volver a entrar: no puede cerrar sesión ni activar la cuenta
   * personal.
   */
  isAnonymous: boolean;
};

const SessionContext = createContext<SessionContextValue | null>(null);

export function SessionProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);
  /** Con sesión, mientras el perfil no llegó: el estado es 'loading', no 'guest'. */
  const [profileLoading, setProfileLoading] = useState(false);

  /**
   * PR-02 / CA-13 · la caché de queries es del USUARIO, no de la app. Varias
   * keys no llevan el id (['spaces'], ['space-facts', id]): sin vaciarla, si
   * Renzo cierra sesión y entra Martina en el mismo teléfono, ella veía la
   * lista de espacios de él (con sus saldos) hasta que llegaba el refetch.
   *
   * Se vacía ANTES de publicar la sesión nueva: con un efecto, la primera
   * pantalla de Martina se pintaba un frame con los datos de Renzo.
   */
  const queryClient = useQueryClient();
  const currentUserId = useRef<string | null>(null);

  function publishSession(next: Session | null) {
    const nextUserId = next?.user.id ?? null;
    if (currentUserId.current !== nextUserId) {
      if (currentUserId.current != null) queryClient.clear();
      currentUserId.current = nextUserId;
    }
    setSession(next);
  }

  async function loadProfile(userId: string): Promise<Profile | null> {
    const { data, error } = await supabase
      .from('profiles')
      .select('id, display_name, has_personal_account, timezone')
      .eq('id', userId)
      .maybeSingle();

    if (error != null) return null;
    if (data == null) return null;

    return {
      id: data.id,
      displayName: data.display_name,
      hasPersonalAccount: data.has_personal_account,
      timezone: data.timezone,
    };
  }

  /**
   * La primera vez que alguien entra, no tiene perfil: lo crea acá.
   *
   * §13 O1 paso 5a · el registro por cuenta propia activa la cuenta personal
   * en los tres casos, porque crear un espacio la requiere (P5).
   * A-03 / CA-05 · aceptar una invitación NO la activa. La diferencia la da la
   * elección de "Empezar", que vale SOLO para el email que la pidió.
   */
  async function ensureProfile(nextSession: Session): Promise<Profile | null> {
    // Se consume SIEMPRE, aunque el perfil ya exista: una elección que no se
    // usa no puede quedar en el teléfono para el próximo usuario nuevo.
    const intent = await takeOnboardingIntent(nextSession.user.email);

    const existing = await loadProfile(nextSession.user.id);
    if (existing != null) return existing;

    await supabase.from('profiles').insert({
      id: nextSession.user.id,
      display_name: displayNameFromEmail(nextSession.user.email),
      has_personal_account: intent != null,
    });

    // Si el insert falló porque otro pedido lo creó antes, igual hay perfil.
    return loadProfile(nextSession.user.id);
  }

  /**
   * El perfil se pide UNA vez por usuario. getSession y el evento inicial de
   * onAuthStateChange llegan casi juntos: con dos ensureProfile en paralelo,
   * uno consumía la elección y el otro podía crear el perfil sin ella.
   */
  const profileRequestFor = useRef<string | null>(null);

  useEffect(() => {
    let active = true;

    function adopt(next: Session | null) {
      publishSession(next);

      if (next == null) {
        profileRequestFor.current = null;
        setProfile(null);
        setProfileLoading(false);
        return;
      }

      // Mismo usuario (refresh del token, evento repetido): el perfil ya está
      // o ya viene. Volver a pedirlo pisaría un refreshProfile más nuevo.
      if (profileRequestFor.current === next.user.id) return;
      profileRequestFor.current = next.user.id;

      setProfile(null);
      setProfileLoading(true);

      void ensureProfile(next).then((loaded) => {
        if (!active || currentUserId.current !== next.user.id) return;
        setProfile(loaded);
        setProfileLoading(false);
      });
    }

    void (async () => {
      const { data } = await supabase.auth.getSession();
      if (!active) return;
      adopt(data.session);
      setLoading(false);
    })();

    const { data: subscription } = supabase.auth.onAuthStateChange((_event, nextSession) => {
      adopt(nextSession);
    });

    return () => {
      active = false;
      subscription.subscription.unsubscribe();
    };
  }, []);

  const value = useMemo<SessionContextValue>(() => {
    const accountState = deriveAccountState({
      sessionLoading: loading,
      hasSession: session != null,
      profileLoading,
      profile,
    });

    return {
      session,
      profile,
      accountState,
      refreshProfile: async () => {
        if (session == null) return;
        setProfile(await loadProfile(session.user.id));
      },
      isAnonymous: session?.user.is_anonymous === true,
    };
  }, [session, profile, loading, profileLoading]);

  return <SessionContext.Provider value={value}>{children}</SessionContext.Provider>;
}

export function useSession(): SessionContextValue {
  const value = useContext(SessionContext);
  if (value == null) throw new Error('useSession necesita un <SessionProvider> arriba.');
  return value;
}
