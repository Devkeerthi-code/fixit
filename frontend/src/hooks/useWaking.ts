import { useSyncExternalStore } from "react";
import { waking } from "../api/waking";

export function useWaking(): boolean {
  return useSyncExternalStore(waking.subscribe, waking.isWaking, waking.isWaking);
}
