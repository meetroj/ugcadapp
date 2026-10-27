/**
 * Push notifications through Firebase Cloud Messaging.
 *
 * Permission is requested only when the website calls `push:register`.
 * If Firebase is not configured (no google-services.json / GoogleService-Info.plist)
 * every call resolves with `push_unavailable` and the app keeps working.
 */
import {
  AuthorizationStatus,
  deleteToken,
  getInitialNotification,
  getMessaging,
  getToken,
  hasPermission,
  onMessage,
  onNotificationOpenedApp,
  onTokenRefresh,
  requestPermission,
} from '@react-native-firebase/messaging';
import { isSafePath, toWebPath } from './deepLinks';

export type PushResult =
  | { ok: true; token: string }
  | { ok: false; error: 'push_unavailable' | 'denied'; message: string };

export type ForegroundNotice = { title: string; body: string; path: string | null };

type RemoteMessageLike = {
  data?: Record<string, unknown>;
  notification?: { title?: string; body?: string };
};

const UNAVAILABLE: PushResult = {
  ok: false,
  error: 'push_unavailable',
  message: 'Push notifications are not available in this build.',
};

/** Throws when no default Firebase app exists (config files missing). */
const messaging = () => getMessaging();

/** The in-app path a notification wants to open, from data.path or data.url. */
export function pathFromMessage(message: RemoteMessageLike | null | undefined): string | null {
  const data = message?.data;
  if (!data) return null;
  if (isSafePath(data.path)) return data.path;
  return typeof data.url === 'string' ? toWebPath(data.url) ?? (isSafePath(data.url) ? data.url : null) : null;
}

export async function registerForPush(): Promise<PushResult> {
  try {
    const m = messaging();
    const status = await requestPermission(m);
    if (status !== AuthorizationStatus.AUTHORIZED && status !== AuthorizationStatus.PROVISIONAL) {
      return { ok: false, error: 'denied', message: 'Notification permission was refused.' };
    }
    const token = await getToken(m);
    return token ? { ok: true, token } : UNAVAILABLE;
  } catch {
    return UNAVAILABLE;
  }
}

/**
 * iOS notification permission as a bridge status. iOS prompts once: after a
 * refusal (DENIED) it never prompts again, so that state is 'blocked'.
 */
export async function notificationStatus(
  ask: boolean,
): Promise<'granted' | 'denied' | 'blocked' | 'unavailable'> {
  try {
    const m = messaging();
    const status = ask ? await requestPermission(m) : await hasPermission(m);
    if (status === AuthorizationStatus.AUTHORIZED || status === AuthorizationStatus.PROVISIONAL) {
      return 'granted';
    }
    return status === AuthorizationStatus.DENIED ? 'blocked' : 'denied';
  } catch {
    return 'unavailable';
  }
}

/** Called on logout: drops the FCM token so a signed-out device stops receiving pushes. */
export async function unregisterPush(): Promise<void> {
  try {
    await deleteToken(messaging());
  } catch {
    // Not configured, or already deleted.
  }
}

/** Path from the notification that cold-started the app, if any. */
export async function getInitialNotificationPath(): Promise<string | null> {
  try {
    return pathFromMessage(await getInitialNotification(messaging()));
  } catch {
    return null;
  }
}

type Listeners = {
  onToken: (token: string) => void;
  onOpen: (path: string) => void;
  onForeground: (notice: ForegroundNotice) => void;
};

/** Subscribes to token refreshes, notification taps and foreground messages. Returns an unsubscribe. */
export function startPushListeners({ onToken, onOpen, onForeground }: Listeners): () => void {
  try {
    const m = messaging();
    const offs = [
      onTokenRefresh(m, onToken),
      onNotificationOpenedApp(m, message => {
        const path = pathFromMessage(message);
        if (path) onOpen(path);
      }),
      // Android and iOS both stay silent for foreground messages; the shell draws a banner.
      onMessage(m, message => {
        const n = message.notification;
        if (n?.title || n?.body) {
          onForeground({ title: n.title ?? '', body: n.body ?? '', path: pathFromMessage(message) });
        }
      }),
    ];
    return () => offs.forEach(off => off());
  } catch {
    return () => {};
  }
}
