/** Client-only prefs (discovery UI); API currently persists genre preferences only — mobile parity until backend exposes these. */

const STORAGE_KEY = "spinlive_web_discovery_prefs_v1";

export type BudgetTierId = "tier1" | "tier2" | "tier3";

export interface StoredDiscoveryPrefs {
  localDjsOnly: boolean;
  showVirtualStreams: boolean;
  budgetTierId: BudgetTierId;
}

const DEFAULTS: StoredDiscoveryPrefs = {
  localDjsOnly: false,
  showVirtualStreams: true,
  budgetTierId: "tier2",
};

function parseTier(raw: unknown): BudgetTierId {
  if (raw === "tier1" || raw === "tier2" || raw === "tier3") return raw;
  return DEFAULTS.budgetTierId;
}

export function loadDiscoveryPrefs(): StoredDiscoveryPrefs {
  if (typeof window === "undefined") return { ...DEFAULTS };
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return { ...DEFAULTS };
    const o = JSON.parse(raw) as Partial<StoredDiscoveryPrefs>;
    return {
      localDjsOnly: Boolean(o.localDjsOnly),
      showVirtualStreams: o.showVirtualStreams !== false,
      budgetTierId: parseTier(o.budgetTierId),
    };
  } catch {
    return { ...DEFAULTS };
  }
}

export function saveDiscoveryPrefs(next: StoredDiscoveryPrefs): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
  } catch {
    /* ignore quota / privacy mode */
  }
}
