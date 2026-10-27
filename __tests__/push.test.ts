import {
  getInitialNotificationPath,
  notificationStatus,
  pathFromMessage,
  registerForPush,
  startPushListeners,
  unregisterPush,
} from '../src/shell/push';

const mockFirebase = {
  getMessaging: jest.fn(),
  requestPermission: jest.fn(),
  hasPermission: jest.fn(),
  getToken: jest.fn(),
  deleteToken: jest.fn(),
  onTokenRefresh: jest.fn(),
  onMessage: jest.fn(),
  onNotificationOpenedApp: jest.fn(),
  getInitialNotification: jest.fn(),
};

jest.mock('@react-native-firebase/messaging', () => ({
  AuthorizationStatus: { NOT_DETERMINED: -1, DENIED: 0, AUTHORIZED: 1, PROVISIONAL: 2 },
  getMessaging: (...a: unknown[]) => mockFirebase.getMessaging(...a),
  requestPermission: (...a: unknown[]) => mockFirebase.requestPermission(...a),
  hasPermission: (...a: unknown[]) => mockFirebase.hasPermission(...a),
  getToken: (...a: unknown[]) => mockFirebase.getToken(...a),
  deleteToken: (...a: unknown[]) => mockFirebase.deleteToken(...a),
  onTokenRefresh: (...a: unknown[]) => mockFirebase.onTokenRefresh(...a),
  onMessage: (...a: unknown[]) => mockFirebase.onMessage(...a),
  onNotificationOpenedApp: (...a: unknown[]) => mockFirebase.onNotificationOpenedApp(...a),
  getInitialNotification: (...a: unknown[]) => mockFirebase.getInitialNotification(...a),
}));

const unavailable = {
  ok: false,
  error: 'push_unavailable',
  message: 'Push notifications are not available in this build.',
};

describe('push without Firebase config', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockFirebase.getMessaging.mockImplementation(() => {
      throw new Error("No Firebase App '[DEFAULT]' has been created");
    });
  });

  it('every call degrades instead of crashing', async () => {
    expect(await registerForPush()).toEqual(unavailable);
    await expect(unregisterPush()).resolves.toBeUndefined();
    expect(await getInitialNotificationPath()).toBeNull();
    expect(await notificationStatus(true)).toBe('unavailable');
    const stop = startPushListeners({ onToken: jest.fn(), onOpen: jest.fn(), onForeground: jest.fn() });
    expect(() => stop()).not.toThrow();
  });
});

describe('push with Firebase configured', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockFirebase.getMessaging.mockReturnValue({});
    mockFirebase.requestPermission.mockResolvedValue(1);
    mockFirebase.hasPermission.mockResolvedValue(-1);
    mockFirebase.getToken.mockResolvedValue('fcm-token');
    mockFirebase.getInitialNotification.mockResolvedValue(null);
    mockFirebase.onTokenRefresh.mockReturnValue(jest.fn());
    mockFirebase.onMessage.mockReturnValue(jest.fn());
    mockFirebase.onNotificationOpenedApp.mockReturnValue(jest.fn());
  });

  it('returns the token once permission is granted', async () => {
    expect(await registerForPush()).toEqual({ ok: true, token: 'fcm-token' });
  });

  it('reports denied when the user refuses', async () => {
    mockFirebase.requestPermission.mockResolvedValue(0);
    expect(await registerForPush()).toMatchObject({ ok: false, error: 'denied' });
    expect(mockFirebase.getToken).not.toHaveBeenCalled();
  });

  it('maps iOS notification status: undecided is askable, denied is blocked', async () => {
    expect(await notificationStatus(false)).toBe('denied');
    mockFirebase.hasPermission.mockResolvedValue(0);
    expect(await notificationStatus(false)).toBe('blocked');
    expect(await notificationStatus(true)).toBe('granted');
  });

  it('forwards token refresh, notification taps and foreground messages', () => {
    const onToken = jest.fn();
    const onOpen = jest.fn();
    const onForeground = jest.fn();
    startPushListeners({ onToken, onOpen, onForeground });

    mockFirebase.onTokenRefresh.mock.calls[0][1]('new-token');
    expect(onToken).toHaveBeenCalledWith('new-token');

    mockFirebase.onNotificationOpenedApp.mock.calls[0][1]({ data: { path: '/messages' } });
    expect(onOpen).toHaveBeenCalledWith('/messages');
    mockFirebase.onNotificationOpenedApp.mock.calls[0][1]({ data: { path: 'https://evil.com' } });
    expect(onOpen).toHaveBeenCalledTimes(1);

    mockFirebase.onMessage.mock.calls[0][1]({ notification: { title: 'Hi', body: 'There' }, data: { url: 'https://ugcad.io/deals' } });
    expect(onForeground).toHaveBeenCalledWith({ title: 'Hi', body: 'There', path: '/deals' });
  });
});

describe('pathFromMessage', () => {
  it('accepts a site path from data.path or an ugcad.io URL from data.url', () => {
    expect(pathFromMessage({ data: { path: '/a?b=1' } })).toBe('/a?b=1');
    expect(pathFromMessage({ data: { url: 'https://www.ugcad.io/x' } })).toBe('/x');
    expect(pathFromMessage({ data: { url: '/y' } })).toBe('/y');
  });

  it('rejects anything that is not a site path', () => {
    expect(pathFromMessage({ data: { path: '//evil.com' } })).toBeNull();
    expect(pathFromMessage({ data: { path: 'dashboard' } })).toBeNull();
    expect(pathFromMessage({ data: { url: 'https://evil.com/' } })).toBeNull();
    expect(pathFromMessage({})).toBeNull();
    expect(pathFromMessage(null)).toBeNull();
  });
});
