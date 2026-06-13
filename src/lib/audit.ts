import { supabase } from "@/integrations/supabase/client";

/**
 * Log an admin action to activity_logs.
 * Fails silently to avoid breaking the primary action.
 */
export async function logAction(
  action: string,
  entity: string,
  entityId?: string | null,
  meta?: Record<string, unknown>,
) {
  try {
    const client = supabase as unknown as {
      rpc: (fn: string, args: Record<string, unknown>) => Promise<{ error: unknown }>;
    };
    await client.rpc("log_admin_action", {
      _action: action,
      _entity: entity,
      _entity_id: entityId ?? null,
      _meta: meta ?? {},
    });
  } catch {
    // ignore
  }
}
