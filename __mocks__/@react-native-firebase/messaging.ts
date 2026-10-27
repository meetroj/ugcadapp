/** Jest stand-in for @react-native-firebase/messaging (no native Firebase under Jest). */
const messagingInstance = {
  requestPermission: jest.fn(async () => 1),
  hasPermission: jest.fn(async () => 1),
  getToken: jest.fn(async () => 'test-fcm-token'),
  deleteToken: jest.fn(async () => {}),
  onTokenRefresh: jest.fn(() => () => {}),
  onMessage: jest.fn(() => () => {}),
  onNotificationOpenedApp: jest.fn(() => () => {}),
  getInitialNotification: jest.fn(async () => null),
  setBackgroundMessageHandler: jest.fn(),
  registerDeviceForRemoteMessages: jest.fn(async () => {}),
};

const messaging = () => messagingInstance;
messaging.AuthorizationStatus = {
  NOT_DETERMINED: -1,
  DENIED: 0,
  AUTHORIZED: 1,
  PROVISIONAL: 2,
};

export const getMessaging = () => messagingInstance;
export default messaging;
