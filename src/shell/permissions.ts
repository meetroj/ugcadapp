/**
 * OS permissions on behalf of the website (`permissions:status` / `permissions:request`).
 *
 * Android uses react-native's PermissionsAndroid. iOS has no permission API in
 * core react-native, and react-native-permissions is not installed, so on iOS:
 *  - photos: 'granted' (the system picker used by <input type=file> needs no permission)
 *  - notifications: real status via Firebase messaging
 *  - camera / microphone: 'unavailable' (iOS asks by itself the first time the page
 *    opens the camera or the file chooser; the website should just proceed)
 * Adding react-native-permissions would make camera/microphone reportable on iOS.
 */
import { Platform, PermissionsAndroid, type Permission } from 'react-native';
import { notificationStatus } from './push';

export const PERMISSION_KINDS = ['camera', 'microphone', 'photos', 'notifications'] as const;
export type PermissionKind = (typeof PERMISSION_KINDS)[number];
export type PermissionStatus = 'granted' | 'denied' | 'blocked' | 'limited' | 'unavailable';

export function isPermissionKind(v: unknown): v is PermissionKind {
  return (PERMISSION_KINDS as readonly unknown[]).includes(v);
}

const P = PermissionsAndroid.PERMISSIONS;

function androidPermissions(kind: PermissionKind): Permission[] {
  const api = typeof Platform.Version === 'number' ? Platform.Version : parseInt(Platform.Version, 10);
  switch (kind) {
    case 'camera':
      return [P.CAMERA];
    case 'microphone':
      return [P.RECORD_AUDIO];
    case 'photos':
      return api >= 33 ? [P.READ_MEDIA_IMAGES, P.READ_MEDIA_VIDEO] : [P.READ_EXTERNAL_STORAGE];
    case 'notifications':
      // Before Android 13 notifications need no runtime permission.
      return api >= 33 ? [P.POST_NOTIFICATIONS] : [];
  }
}

async function androidStatus(kind: PermissionKind): Promise<PermissionStatus> {
  const perms = androidPermissions(kind);
  const checks = await Promise.all(perms.map(p => PermissionsAndroid.check(p)));
  return checks.every(Boolean) ? 'granted' : 'denied';
}

async function androidRequest(kind: PermissionKind): Promise<PermissionStatus> {
  const perms = androidPermissions(kind);
  if (perms.length === 0) return 'granted';
  const results = await PermissionsAndroid.requestMultiple(perms);
  const values = perms.map(p => results[p]);
  if (values.every(v => v === PermissionsAndroid.RESULTS.GRANTED)) return 'granted';
  return values.includes(PermissionsAndroid.RESULTS.NEVER_ASK_AGAIN) ? 'blocked' : 'denied';
}

async function run(kind: PermissionKind, ask: boolean): Promise<PermissionStatus> {
  try {
    if (Platform.OS === 'android') return await (ask ? androidRequest(kind) : androidStatus(kind));
    if (Platform.OS !== 'ios') return 'unavailable';
    if (kind === 'photos') return 'granted';
    if (kind === 'notifications') return await notificationStatus(ask);
    return 'unavailable';
  } catch {
    return 'unavailable';
  }
}

export const getPermissionStatus = (kind: PermissionKind) => run(kind, false);
export const requestPermission = (kind: PermissionKind) => run(kind, true);
