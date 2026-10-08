import 'react-native-url-polyfill/auto';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { createClient } from '@supabase/supabase-js';
import type { Database } from './database.types';

/**
 * Cliente de Supabase.
 *
 * La anon key es pública por diseño: va en el cliente y no otorga ningún
 * permiso por sí misma. Lo que decide qué puede leer y escribir cada usuario
 * son las políticas de RLS (supabase/migrations/..._rls.sql), no esta clave.
 *
 * La service_role key NUNCA entra en esta app.
 */

const url = process.env.EXPO_PUBLIC_SUPABASE_URL;
const anonKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY;

if (!url || !anonKey) {
  throw new Error(
    'Faltan EXPO_PUBLIC_SUPABASE_URL y EXPO_PUBLIC_SUPABASE_ANON_KEY. ' +
      'Copiá .env.example a .env.local y completalas.',
  );
}

export const supabase = createClient<Database>(url, anonKey, {
  auth: {
    storage: AsyncStorage,
    autoRefreshToken: true,
    persistSession: true,
    // En React Native no hay URL de navegador que parsear: el deep link lo
    // maneja expo-router y la sesión se establece a mano.
    detectSessionInUrl: false,
  },
});
