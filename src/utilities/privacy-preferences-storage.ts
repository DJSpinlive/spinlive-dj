/** Client-only privacy toggles until backend endpoints exist. */

const STORAGE_KEY = "spinlive_web_privacy_prefs_v1";

export interface PrivacyPrefs {
  privateProfile: boolean;
  activityStatus: boolean;
  allowDm: boolean;
}

const DEFAULTS: PrivacyPrefs = {
  privateProfile: false,
  activityStatus: true,
  allowDm: true,
};

export function loadPrivacyPrefs(): PrivacyPrefs {
  if (typeof window === "undefined") return { ...DEFAULTS };
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return { ...DEFAULTS };
    const o = JSON.parse(raw) as Partial<PrivacyPrefs>;
    return {
      privateProfile: Boolean(o.privateProfile),
      activityStatus: o.activityStatus !== false,
      allowDm: o.allowDm !== false,
    };
  } catch {
    return { ...DEFAULTS };
  }
}

export function savePrivacyPrefs(next: PrivacyPrefs): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
  } catch {
    /* ignore */
  }
}
