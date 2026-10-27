/** The native side of every bridge request type. Wiring only; the work lives in the modules it calls. */
import { Linking, Platform } from 'react-native';
import { SHELL_BUILD, SHELL_VERSION } from '../config';
import { fail, type Handlers } from './bridge';
import { getAppleCredential, AppleSignInCancelled, AppleSignInUnsupported } from './auth/apple';
import { getGoogleIdToken, GoogleSignInCancelled, signOutGoogle } from './auth/google';
import { downloadFile } from './download';
import {
  getPermissionStatus,
  isPermissionKind,
  requestPermission,
  PERMISSION_KINDS,
} from './permissions';
import { registerForPush, unregisterPush } from './push';
import { shareContent } from './share';
import { getMinSupportedVersion } from './versionCheck';
import { isOpenableExternal } from './urlPolicy';

const platform = Platform.OS === 'ios' ? 'ios' : 'android';
const message = (e: unknown) => (e instanceof Error ? e.message : 'Something went wrong.');

export function createHandlers(onReady: () => void): Handlers {
  return {
    'app:ready': async () => {
      onReady();
      return { ok: true };
    },

    'auth:google': async () => {
      try {
        return { ok: true, idToken: await getGoogleIdToken() };
      } catch (e) {
        if (e instanceof GoogleSignInCancelled) return fail('cancelled', 'Google sign-in was cancelled.');
        return fail('google_failed', message(e));
      }
    },

    'auth:apple': async () => {
      try {
        return { ok: true, ...(await getAppleCredential()) };
      } catch (e) {
        if (e instanceof AppleSignInCancelled) return fail('cancelled', 'Apple sign-in was cancelled.');
        if (e instanceof AppleSignInUnsupported) return fail('unsupported', e.message);
        return fail('apple_failed', message(e));
      }
    },

    'push:register': async () => {
      const r = await registerForPush();
      return r.ok ? { ok: true, token: r.token, platform } : fail(r.error, r.message);
    },

    // Logout: drop the FCM token and the cached Google account so the next login starts clean.
    'push:unregister': async () => {
      await Promise.all([unregisterPush(), signOutGoogle()]);
      return { ok: true };
    },

    'open:external': async ({ url }) => {
      if (typeof url !== 'string' || !isOpenableExternal(url)) {
        return fail('invalid_url', 'Only https, http, mailto and tel links can be opened.');
      }
      try {
        await Linking.openURL(url.trim());
        return { ok: true };
      } catch (e) {
        return fail('open_failed', message(e));
      }
    },

    share: async payload => {
      try {
        return (await shareContent(payload))
          ? { ok: true }
          : fail('invalid_payload', 'Nothing to share.');
      } catch (e) {
        return fail('share_failed', message(e));
      }
    },

    download: async ({ url }) => {
      try {
        // Fallback: the system browser downloads it; there is no local file path to report.
        return (await downloadFile(url))
          ? { ok: true, path: '', openedInBrowser: true }
          : fail('invalid_url', 'Only http(s) downloads are supported.');
      } catch (e) {
        return fail('download_failed', message(e));
      }
    },

    'app:info': async () => ({
      ok: true,
      version: SHELL_VERSION,
      build: SHELL_BUILD,
      platform,
      minSupportedVersion: getMinSupportedVersion(),
    }),

    'app:openSettings': async () => {
      try {
        await Linking.openSettings();
        return { ok: true };
      } catch (e) {
        return fail('open_failed', message(e));
      }
    },

    'permissions:status': async ({ kind }) =>
      isPermissionKind(kind)
        ? { ok: true, status: await getPermissionStatus(kind) }
        : fail('invalid_kind', `kind must be one of ${PERMISSION_KINDS.join(', ')}.`),

    'permissions:request': async ({ kind }) =>
      isPermissionKind(kind)
        ? { ok: true, status: await requestPermission(kind) }
        : fail('invalid_kind', `kind must be one of ${PERMISSION_KINDS.join(', ')}.`),
  };
}
