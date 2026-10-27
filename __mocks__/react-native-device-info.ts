/** Jest stand-in for react-native-device-info (native module is absent under Jest). */
export const getVersion = jest.fn(() => '1.3.0');
export const getBuildNumber = jest.fn(() => '26');
export default {getVersion, getBuildNumber};
