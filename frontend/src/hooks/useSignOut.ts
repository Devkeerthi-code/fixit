import { useMutation, useQueryClient } from "@tanstack/react-query";
import { authApi } from "../api/auth";
import { keys } from "../api/queries";
import { toast } from "../lib/toast";

export function useSignOut() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: authApi.logout,
    onSettled: () => {
      // even if the server call failed, forget everything on this device
      qc.removeQueries({ predicate: (q) => q.queryKey[0] !== keys.me[0] });
      qc.setQueryData(keys.me, null);
      toast("Signed out.");
    },
  });
}
