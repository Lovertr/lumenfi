/**
 * Supabase database types
 *
 * After applying DATABASE_SCHEMA.sql, regenerate types via:
 *   npx supabase gen types typescript --project-id YOUR_PROJECT_ID > src/types/database.ts
 *
 * For now, this is a minimal stub so TypeScript compiles.
 */

export type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[];

export interface Database {
  public: {
    Tables: {
      profiles: {
        Row: {
          id: string;
          email: string;
          full_name: string | null;
          avatar_url: string | null;
          default_currency: string;
          timezone: string;
          locale: string;
          monthly_income_target: number | null;
          monthly_expense_target: number | null;
          ai_provider: string | null;
          ai_api_key_encrypted: string | null;
          ai_endpoint: string | null;
          ai_privacy_mode: boolean;
          onboarded: boolean;
          created_at: string;
          updated_at: string;
        };
        Insert: Partial<Database['public']['Tables']['profiles']['Row']> & { id: string; email: string };
        Update: Partial<Database['public']['Tables']['profiles']['Row']>;
      };
      // Other tables will be auto-generated via supabase CLI
      [key: string]: any;
    };
    Views: { [key: string]: any };
    Functions: { [key: string]: any };
    Enums: { [key: string]: any };
  };
}
