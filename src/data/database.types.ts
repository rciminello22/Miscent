/**
 * ⚠️ ARCHIVO GENERADO · placeholder
 *
 * Los tipos reales se generan desde el esquema con:
 *
 *   npm run db:types
 *
 * Hasta que el proyecto de Supabase esté conectado, este stub existe solo para
 * que `npm run typecheck` pase. NO refleja el esquema: en cuanto haya base,
 * se sobrescribe con los tipos verdaderos y las queries quedan tipadas de
 * punta a punta.
 */

export type Json = string | number | boolean | null | { [key: string]: Json } | Json[];

export type Database = {
  public: {
    Tables: Record<string, never>;
    Views: Record<string, never>;
    Functions: Record<string, never>;
    Enums: Record<string, never>;
    CompositeTypes: Record<string, never>;
  };
};
