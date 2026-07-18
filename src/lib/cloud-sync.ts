import { useEffect } from "react";
import { toast } from "sonner";
import { CLOUD_ROW_ID, supabase } from "./supabase";
import { SYNCED_KEYS, useStore, type State } from "./store";

type SyncedState = Pick<State, (typeof SYNCED_KEYS)[number]>;

function pickSyncedState(s: State): SyncedState {
  const out: Record<string, unknown> = {};
  for (const key of SYNCED_KEYS) out[key] = s[key];
  return out as SyncedState;
}

let debounceHandle: ReturnType<typeof setTimeout> | null = null;

function pushToCloud(data: SyncedState) {
  const client = supabase;
  if (!client) return;
  if (debounceHandle) clearTimeout(debounceHandle);
  debounceHandle = setTimeout(() => {
    client
      .from("app_state")
      .upsert({ id: CLOUD_ROW_ID, data, updated_at: new Date().toISOString() })
      .then(({ error }) => {
        if (error) toast.error("Gagal menyimpan ke cloud, coba lagi nanti.");
      });
  }, 800);
}

export function useCloudSync() {
  useEffect(() => {
    if (!supabase) return;
    let unsubscribe: (() => void) | undefined;
    let cancelled = false;

    supabase
      .from("app_state")
      .select("data")
      .eq("id", CLOUD_ROW_ID)
      .maybeSingle()
      .then(({ data, error }) => {
        if (cancelled) return;
        if (error) {
          toast.error("Gagal memuat data dari cloud, pakai data lokal dulu.");
        } else if (data?.data && Object.keys(data.data).length > 0) {
          useStore.setState(data.data as SyncedState);
        } else {
          pushToCloud(pickSyncedState(useStore.getState()));
        }

        unsubscribe = useStore.subscribe((s) => pushToCloud(pickSyncedState(s)));
      });

    return () => {
      cancelled = true;
      unsubscribe?.();
      if (debounceHandle) clearTimeout(debounceHandle);
    };
  }, []);
}
