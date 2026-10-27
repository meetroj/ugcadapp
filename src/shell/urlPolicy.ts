/**
 * Decides what happens to every URL the WebView wants to load.
 * Pure functions only, so the security rules are unit-tested without a device.
 */
import {
  DEV_ORIGIN,
  ALLOWED_HOSTS,
  ALLOWED_HOST_SUFFIXES,
  BRIDGE_HOSTS,
  NATIVE_SCHEMES,
} from '../config';

/** webview: load here. native: hand to the OS app. external: system browser. block: do nothing. */
export type UrlVerdict = 'webview' | 'native' | 'external' | 'block';

type Parts = { scheme: string; host: string };

/**
 * Splits `scheme://host[:port]/...`. Returns null for URLs without an
 * authority, with userinfo (`https://ugcad.io@evil.com`) or with a non-443
 * port, so none of those can ever look like an allow-listed host.
 */
function parse(url: string): Parts | null {
  const m = /^([a-z][a-z0-9+.-]*):\/\/([^/?#]*)/i.exec(url.trim());
  if (!m) return null;
  const authority = m[2];
  if (authority.includes('@')) return null;
  const [host, port] = authority.toLowerCase().split(':');
  if (!host || (port !== undefined && port !== '443' && !isDevAuthority(host, port))) return null;
  return { scheme: m[1].toLowerCase(), host };
}

/** Debug builds only: the developer's website server (http://localhost:3000 over `adb reverse`). */
function isDevAuthority(host: string, port: string | undefined): boolean {
  return !!DEV_ORIGIN && host === 'localhost' && port === '3000';
}

export function isAllowedHost(host: string): boolean {
  const h = host.toLowerCase();
  return (
    ALLOWED_HOSTS.includes(h) ||
    ALLOWED_HOST_SUFFIXES.some(s => h === s || h.endsWith(`.${s}`))
  );
}

/** True for https pages on an allow-listed host (debug builds also accept the dev server). */
export function isAllowedUrl(url: string): boolean {
  const p = parse(url);
  if (!p) return false;
  if (DEV_ORIGIN && p.scheme === 'http' && p.host === 'localhost') return true;
  return p.scheme === 'https' && isAllowedHost(p.host);
}

/** True when a page at `url` may call the native bridge. */
export function isTrustedBridgeUrl(url: string | undefined): boolean {
  const p = url ? parse(url) : null;
  if (!p) return false;
  if (DEV_ORIGIN && p.scheme === 'http' && p.host === 'localhost') return true;
  return p.scheme === 'https' && BRIDGE_HOSTS.includes(p.host);
}

export function classifyUrl(url: string): UrlVerdict {
  const trimmed = url.trim();
  if (trimmed === 'about:blank') return 'webview';

  // blob: URLs carry their origin after the prefix: blob:https://ugcad.io/uuid
  if (/^blob:/i.test(trimmed)) {
    return isAllowedUrl(trimmed.slice(5)) ? 'webview' : 'block';
  }

  const scheme = /^([a-z][a-z0-9+.-]*):/i.exec(trimmed)?.[1].toLowerCase();
  if (!scheme) return 'block';
  if (NATIVE_SCHEMES.includes(scheme)) return 'native';

  if (scheme === 'https' || scheme === 'http') {
    return isAllowedUrl(trimmed) ? 'webview' : 'external';
  }
  // file:, data:, javascript:, ftp:, anything else never loads or opens.
  return 'block';
}

/**
 * Android `intent://host/path#Intent;scheme=upi;package=...;end` is not
 * understood by Linking, so rebuild the plain `scheme://host/path` URL.
 * Anything else is returned unchanged.
 */
export function intentToUrl(url: string): string {
  if (!/^intent:\/\//i.test(url)) return url;
  const scheme = /;scheme=([a-z][a-z0-9+.-]*)/i.exec(url)?.[1];
  if (!scheme) return url;
  const rest = url.slice('intent://'.length).split('#Intent')[0];
  return `${scheme}://${rest}`;
}

/** Schemes the website may ask the shell to open via `open:external`. */
export function isOpenableExternal(url: string): boolean {
  return /^(https?:\/\/|mailto:|tel:)/i.test(url.trim());
}
