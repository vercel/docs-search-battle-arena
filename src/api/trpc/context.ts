import { BattleService, DatabaseService } from "../services";
import { getOrCreateSessionId } from "../../lib/session-middleware";
import { isLocalDevAdmin } from "@/lib/dev";
import { ipAddress } from "@vercel/functions";

/**
 * Create context for the tRPC API
 */
export async function createTRPCContext(req: Request) {
  const sessionId = await getOrCreateSessionId();

  return {
    databaseService: new DatabaseService(),
    battleService: new BattleService(),
    sessionId,
    isAdmin: isLocalDevAdmin(req),
    ip: ipAddress(req),
  };
}

export type TRPCContext = Awaited<ReturnType<typeof createTRPCContext>>;
