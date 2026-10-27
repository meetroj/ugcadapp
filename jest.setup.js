/* eslint-env jest */
// Native modules are replaced by the files in __mocks__/ (they touch native code on import).
jest.mock('react-native-webview');
jest.mock('react-native-device-info');
jest.mock('@react-native-async-storage/async-storage');
jest.mock('@react-native-google-signin/google-signin');
jest.mock('@react-native-firebase/app');
jest.mock('@react-native-firebase/messaging');
// Apple Authentication ships untranspiled ESM and touches ASAuthorization on import.
jest.mock('@invertase/react-native-apple-authentication', () => ({
  __esModule: true,
  default: {
    isSupported: false,
    performRequest: jest.fn(),
    Operation: {LOGIN: 1},
    Scope: {FULL_NAME: 0, EMAIL: 1},
    Error: {CANCELED: '1001'},
  },
  appleAuthAndroid: {isSupported: false},
}));
// SafeAreaProvider withholds children until native layout metrics arrive (never under
// the test renderer); the shipped mock supplies them. It omits SafeAreaView.
jest.mock('react-native-safe-area-context', () => {
  const React = require('react');
  const {View} = require('react-native');
  const shipped = require('react-native-safe-area-context/jest/mock');
  return {
    ...shipped,
    ...(shipped.default || {}),
    SafeAreaView: ({children, ...props}) =>
      React.createElement(View, props, children),
  };
});
