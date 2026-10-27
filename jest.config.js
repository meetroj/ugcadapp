module.exports = {
  preset: '@react-native/jest-preset',
  testTimeout: 20000,
  setupFilesAfterEnv: ['<rootDir>/jest.setup.js'],
  // These packages ship untranspiled ESM, so they must not be ignored.
  transformIgnorePatterns: [
    'node_modules/(?!(?:@react-native|react-native|react-native-webview|react-native-safe-area-context|react-native-device-info|@react-native-firebase|@react-native-google-signin|@invertase)/)',
  ],
};
