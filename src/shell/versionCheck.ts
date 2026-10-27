/**
 * Optional "Update required" gate. Reads https://ugcad.io/app-config.json:
 *   { "minSupportedVersion": "1.3.0", "storeUrls": { "android": "...", "ios": "..." } }
 * Fails open: a missing, slow or malformed file never blocks the app.
 */
import { Platform } from 'react-native';
import { APP_CONFIG_URL, MIN_SUPPORTED_VERSION, SHELL_VERSION, STORE_URLS } from '../config';

export type VersionGate = { required: boolean; storeUrl: string };

let remoteMin: string | undefined;

/** Min supported version known so far (remote value if it was fetched). */
export const getMinSupportedVersion = (): string => remoteMin ?? MIN_SUPPORTED_VERSION;

const parts = (v: string) => v.split('.').map(n => parseInt(n, 10) || 0);

/** -1, 0, 1 like a comparator; missing parts count as 0. */
export function compareVersions(a: string, b: string): number {
  const x = parts(a);
  const y = parts(b);
  for (let i = 0; i < Math.max(x.length, y.length); i++) {
    const d = (x[i] ?? 0) - (y[i] ?? 0);
    if (d) return d < 0 ? -1 : 1;
  }
  return 0;
}

const isVersion = (v: unknown): v is string => typeof v === 'string' && /^\d+(\.\d+){0,3}$/.test(v);
const isStoreUrl = (v: unknown): v is string => typeof v === 'string' && /^(https:\/\/|market:\/\/)/.test(v);

export async function checkVersion(timeoutMs = 5000): Promise<VersionGate> {
  const platform = Platform.OS === 'ios' ? 'ios' : 'android';
  let storeUrl: string = STORE_URLS[platform];
  let min = MIN_SUPPORTED_VERSION;
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), timeoutMs);
  try {
    const res = await fetch(`${APP_CONFIG_URL}?t=${Date.now()}`, { signal: ctrl.signal });
    if (res.ok) {
      const json: unknown = await res.json();
      const cfg = (json ?? {}) as { minSupportedVersion?: unknown; storeUrls?: Record<string, unknown> };
      if (isVersion(cfg.minSupportedVersion)) min = cfg.minSupportedVersion;
      const remoteUrl = cfg.storeUrls?.[platform];
      if (isStoreUrl(remoteUrl)) storeUrl = remoteUrl;
    }
  } catch {
    // fail open
  } finally {
    clearTimeout(timer);
  }
  remoteMin = min;
  return { required: compareVersions(SHELL_VERSION, min) < 0, storeUrl };
}
