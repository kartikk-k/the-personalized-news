"use client";
import { useMemo, useRef, useState, useSyncExternalStore } from "react";
import { defaultPreferences, preferencesSchema, type Preferences } from "@/lib/preferences/schema";
const KEY = "tpt-guest-preferences";
const EVENT = "tpt-preferences-change";
function subscribe(callback: () => void) { window.addEventListener("storage", callback); window.addEventListener(EVENT, callback); return () => { window.removeEventListener("storage", callback); window.removeEventListener(EVENT, callback); }; }
function snapshot() { try { return localStorage.getItem(KEY) ?? ""; } catch { return ""; } }
export function usePreferences(owner: boolean, initial: Preferences) {
  const raw = useSyncExternalStore(subscribe, snapshot, () => "");
  const guest = useMemo(() => { try { return preferencesSchema.parse(JSON.parse(raw)); } catch { return defaultPreferences; } }, [raw]);
  const [cloud, setCloud] = useState(initial);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  const lock = useRef(false);
  const preferences = owner ? cloud : guest;
  async function save(patch: Partial<Preferences>) {
    if (lock.current) return;
    lock.current = true; setBusy(true); setMessage("Saving…");
    try {
      if (owner) {
        const response = await fetch("/api/preferences", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(patch) });
        if (!response.ok) throw new Error();
        setCloud(preferencesSchema.parse(await response.json()));
        setMessage("Saved privately across your devices.");
      } else {
        let current = defaultPreferences;
        try { current = preferencesSchema.parse(JSON.parse(snapshot())); } catch { /* Defaults on first visit. */ }
        localStorage.setItem(KEY, JSON.stringify(preferencesSchema.parse({ ...current, ...patch })));
        window.dispatchEvent(new Event(EVENT));
        setMessage("Saved in this browser.");
      }
    } catch { setMessage("Could not save. Your previous settings are unchanged. Please try again."); }
    finally { lock.current = false; setBusy(false); }
  }
  return { ...preferences, save, busy, message };
}
