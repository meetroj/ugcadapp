/**
 * Native Google sign-in. Returns a Google ID token; the website POSTs it to
 * /api/auth/google, where the backend verifies it against the WEB client id.
 * Adapted from the old store app (ugcapp/src/googleSignIn.ts).
 */
import { GoogleSignin, statusCodes } from '@react-native-google-signin/google-signin';
import { GOOGLE_IOS_CLIENT_ID, GOOGLE_WEB_CLIENT_ID } from '../../config';

/** Raised when the user backs out of the Google sheet: not a real failure. */
export class GoogleSignInCancelled extends Error {
  constructor() {
    super('Google sign-in was cancelled.');
    this.name = 'GoogleSignInCancelled';
  }
}

let configured = false;

function configure() {
  if (configured) return;
  GoogleSignin.configure({
    // Must be the WEB client id: the backend checks it as the token audience.
    webClientId: GOOGLE_WEB_CLIENT_ID,
    // iOS cannot infer its client the way Android does (package + SHA-1).
    ...(GOOGLE_IOS_CLIENT_ID ? { iosClientId: GOOGLE_IOS_CLIENT_ID } : null),
    scopes: ['profile', 'email'],
    offlineAccess: false,
  });
  configured = true;
}

type SignInResult = { type?: string; idToken?: string; data?: { idToken?: string | null } };

/** Opens the Google account picker and returns the ID token. */
export async function getGoogleIdToken(): Promise<string> {
  configure();
  await GoogleSignin.hasPlayServices({ showPlayServicesUpdateDialog: true });

  try {
    // v13+ resolves {type, data}; older versions resolved the user directly.
    const result = (await GoogleSignin.signIn()) as SignInResult;
    if (result.type === 'cancelled') throw new GoogleSignInCancelled();
    const idToken = result.data?.idToken ?? result.idToken;
    if (!idToken) throw new Error('Google did not return an ID token. Please try again.');
    return idToken;
  } catch (error) {
    if (error instanceof GoogleSignInCancelled) throw error;
    const e = error as { code?: string; message?: string; userInfo?: { NSLocalizedDescription?: string } };

    // iOS reports Google's access_denied (consent screen in Testing mode, or
    // account not a test user) like a dismissed sheet; surface it instead.
    if (e.userInfo?.NSLocalizedDescription === 'access_denied' || /access_denied/i.test(e.message ?? '')) {
      throw new Error(
        'Google refused the sign-in (access_denied). If the app is still in testing on Google Cloud, add this account as a test user or publish the consent screen.',
      );
    }
    if (e.code === statusCodes.SIGN_IN_CANCELLED) throw new GoogleSignInCancelled();
    if (e.code === statusCodes.IN_PROGRESS) {
      // A dead earlier attempt leaves the SDK stuck on IN_PROGRESS; reset it.
      await signOutGoogle();
      throw new Error('A previous Google sign-in was still pending. Please tap the button again.');
    }
    if (e.code === statusCodes.PLAY_SERVICES_NOT_AVAILABLE) {
      throw new Error('Google Play Services is not available on this device. Sign in with email instead.');
    }
    throw error;
  }
}

/** Clears the cached Google account so the next sign-in shows the picker again. */
export async function signOutGoogle(): Promise<void> {
  try {
    configure();
    await GoogleSignin.signOut();
  } catch {
    // Never block logout on a stale Google cache.
  }
}
