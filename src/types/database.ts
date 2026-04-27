/**
 * Supabase database types — permissive stub
 *
 * Replace with auto-generated strict types later via:
 *   npx supabase gen types typescript --project-id YOUR_PROJECT_ID > src/types/database.ts
 *
 * For now this stub gives Supabase client just enough structure to type-check
 * insert/select/update without erroring on per-column types.
 */

export type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[];

type AnyRow = Record<string, any>;

interface PermissiveTable {
  Row: AnyRow;
  Insert: AnyRow;
  Update: AnyRow;
  Relationships: any[];
}

export interface Database {
  public: {
    Tables: {
      profiles: PermissiveTable;
      accounts: PermissiveTable;
      categories: PermissiveTable;
      transactions: PermissiveTable;
      recurring_templates: PermissiveTable;
      debts: PermissiveTable;
      debt_payments: PermissiveTable;
      investments: PermissiveTable;
      investment_transactions: PermissiveTable;
      goals: PermissiveTable;
      goal_contributions: PermissiveTable;
      ai_conversations: PermissiveTable;
      ai_messages: PermissiveTable;
      notifications: PermissiveTable;
      net_worth_snapshots: PermissiveTable;
    };
    Views: Record<string, { Row: AnyRow }>;
    Functions: Record<string, any>;
    Enums: Record<string, string>;
    CompositeTypes: Record<string, any>;
  };
}
