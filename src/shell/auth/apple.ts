/**
 * Sign in with Apple (iOS only). The website POSTs the identity token to
 * /api/auth/apple. Apple discloses the name once, on first authorization, and
 * never inside the token, so it is returned here for the backend to store.
 */
import { Platform } from 'react-native';
import appleAuth from '@invertase/react-native-apple-authentication';

export class AppleSignInCancelled extends Error {
  constructor() {
    super('Apple sign-in was cancelled.');
    this.name = 'AppleSignInCancelled';
  }
}

export class AppleSignInUnsupported extends Error {
  constructor() {
    super('Sign in with Apple is not available on this device.');
    this.name = 'AppleSignInUnsupported';
  }
}

export type AppleCredential = {
  identityToken: string;
  authorizationCode: string | null;
  user: string;
  email: string | null;
  fullName: { givenName: string | null; familyName: string | null };
};

export function appleSignInAvailable(): boolean {
  return Platform.OS === 'ios' && appleAuth.isSupported;
}

export async function getAppleCredential(): Promise<AppleCredential> {
  if (!appleSignInAvailable()) throw new AppleSignInUnsupported();
  try {
    const r = await appleAuth.performRequest({
      requestedOperation: appleAuth.Operation.LOGIN,
      requestedScopes: [appleAuth.Scope.FULL_NAME, appleAuth.Scope.EMAIL],
    });
    if (!r.identityToken) throw new Error('Apple did not return an identity token. Please try again.');
    return {
      identityToken: r.identityToken,
      authorizationCode: r.authorizationCode ?? null,
      user: r.user,
      email: r.email ?? null,
      fullName: {
        givenName: r.fullName?.givenName?.trim() || null,
        familyName: r.fullName?.familyName?.trim() || null,
      },
    };
  } catch (error) {
    const code = (error as { code?: string | number }).code;
    // 1001 is ASAuthorizationError.canceled; some iOS versions surface it raw.
    if (code === appleAuth.Error.CANCELED || String(code) === '1001') {
      throw new AppleSignInCancelled();
    }
    throw error;
  }
}
