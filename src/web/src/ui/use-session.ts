import { useSyncExternalStore } from "react";
import { session, type Session } from "../session/client.ts";

/** The session, re-rendering whatever uses it whenever the worker or the player changes something. */
export function useSession(): Session {
  useSyncExternalStore(session.subscribe, session.getVersion);
  return session;
}
