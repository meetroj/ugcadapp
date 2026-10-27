import { Platform, PermissionsAndroid } from 'react-native';
import { getPermissionStatus, isPermissionKind, requestPermission } from '../src/shell/permissions';

jest.mock('../src/shell/push', () => ({
  notificationStatus: jest.fn(async (ask: boolean) => (ask ? 'granted' : 'blocked')),
}));

const setPlatform = (os: 'android' | 'ios', version: number | string) => {
  Object.defineProperty(Platform, 'OS', { configurable: true, get: () => os });
  Object.defineProperty(Platform, 'Version', { configurable: true, get: () => version });
};

describe('permissions', () => {
  afterEach(() => jest.restoreAllMocks());

  it('validates the kind', () => {
    expect(isPermissionKind('camera')).toBe(true);
    expect(isPermissionKind('location')).toBe(false);
  });

  describe('android', () => {
    beforeEach(() => setPlatform('android', 34));

    it('granted / denied from PermissionsAndroid.check', async () => {
      const check = jest.spyOn(PermissionsAndroid, 'check').mockResolvedValue(true);
      expect(await getPermissionStatus('camera')).toBe('granted');
      check.mockResolvedValue(false);
      expect(await getPermissionStatus('microphone')).toBe('denied');
    });

    it('request: granted, denied and never_ask_again (blocked)', async () => {
      const req = jest.spyOn(PermissionsAndroid, 'requestMultiple');
      req.mockResolvedValue({ 'android.permission.CAMERA': 'granted' } as never);
      expect(await requestPermission('camera')).toBe('granted');
      req.mockResolvedValue({ 'android.permission.CAMERA': 'denied' } as never);
      expect(await requestPermission('camera')).toBe('denied');
      req.mockResolvedValue({ 'android.permission.CAMERA': 'never_ask_again' } as never);
      expect(await requestPermission('camera')).toBe('blocked');
    });

    it('asks for the media permissions that match the Android version', async () => {
      const req = jest.spyOn(PermissionsAndroid, 'requestMultiple').mockResolvedValue({} as never);
      await requestPermission('photos');
      expect(req.mock.calls[0][0]).toEqual([
        'android.permission.READ_MEDIA_IMAGES',
        'android.permission.READ_MEDIA_VIDEO',
      ]);
      setPlatform('android', 31);
      await requestPermission('photos');
      expect(req.mock.calls[1][0]).toEqual(['android.permission.READ_EXTERNAL_STORAGE']);
    });

    it('notifications need no runtime permission before Android 13', async () => {
      setPlatform('android', 31);
      expect(await requestPermission('notifications')).toBe('granted');
    });
  });

  describe('ios', () => {
    beforeEach(() => setPlatform('ios', '17.0'));

    it('photos need no permission, notifications use Firebase, camera/microphone are unavailable', async () => {
      expect(await getPermissionStatus('photos')).toBe('granted');
      expect(await getPermissionStatus('notifications')).toBe('blocked');
      expect(await requestPermission('notifications')).toBe('granted');
      expect(await getPermissionStatus('camera')).toBe('unavailable');
      expect(await requestPermission('microphone')).toBe('unavailable');
    });
  });
});
