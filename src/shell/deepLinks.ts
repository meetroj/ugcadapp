/**
 * Universal / app links (https://ugcad.io/*) and the custom scheme
 * (ugcad://<path>) become a site-relative path the WebView navigates to.
 * Every path is validated before it is injected into the page.
 */
import { Linking } from 'react-native';
import { DEEP_LINK_HOSTS } from '../config';

const MAX_PATH = 2048;

/** A site-relative path: starts with a single '/', no control chars or backslashes. */
export function isSafePath(value: unknown): value is string {
  return (
    typeof value === 'string' &&
    value.length <= MAX_PATH &&
    value.startsWith('/') &&
    !value.startsWith('//') &&
    // eslint-disable-next-line no-control-regex
    !/[\u0000-\u001f\u007f\\]/.test(value)
  );
}

/** Returns the in-app path for `url`, or null if it is not one of ours. */
export function toWebPath(url: string | null | undefined): string | null {
  const u = String(url ?? '').trim();

  const custom = /^ugcad:\/\/(.*)$/i.exec(u);
  if (custom) {
    const path = `/${custom[1].replace(/^\/+/, '')}`;
    return isSafePath(path) ? path : null;
  }

  // No userinfo (@) and only the default port, so ugcad.io@evil.com never matches.
  const web = /^https:\/\/([^/?#:@]+)(?::443)?([/?][^#]*)?(#.*)?$/i.exec(u);
  if (!web || !DEEP_LINK_HOSTS.includes(web[1].toLowerCase())) return null;
  let path = web[2] ?? '/';
  if (path.startsWith('?')) path = `/${path}`;
  path += web[3] ?? '';
  return isSafePath(path) ? path : null;
}

/** JS that moves the page to `path` (must already be validated). */
export function navigateScript(path: string): string {
  return `window.location.assign(${JSON.stringify(path)});true;`;
}

export async function getInitialPath(): Promise<string | null> {
  try {
    return toWebPath(await Linking.getInitialURL());
  } catch {
    return null;
  }
}

/** Calls `onPath` for every link opened while the app is running. Returns an unsubscribe. */
export function subscribeDeepLinks(onPath: (path: string) => void): () => void {
  const sub = Linking.addEventListener('url', ({ url }) => {
    const path = toWebPath(url);
    if (path) onPath(path);
  });
  return () => sub.remove();
}
