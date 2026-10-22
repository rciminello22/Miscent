import type { PostgrestError } from '@supabase/supabase-js';
import { supabase } from './supabase';

type RpcResult<T> = { data: T | null; error: PostgrestError | null };

/**
 * Las funciones de la 0022 reciben argumentos que pueden ser `null` (sin
 * cuotas, sin medio de pago), y `db:types` los genera como no nulos. Para que
 * regenerar los tipos no rompa el typecheck, se llaman por acá. Lo que se
 * pierde de tipado lo cubre cada repositorio con su propio tipo de entrada.
 */
export function rpcWithNulls<T>(fn: string, args: Record<string, unknown>): PromiseLike<RpcResult<T>> {
  const call = supabase.rpc as unknown as (
    this: typeof supabase,
    name: string,
    params: Record<string, unknown>,
  ) => PromiseLike<RpcResult<T>>;
  return call.call(supabase, fn, args);
}
