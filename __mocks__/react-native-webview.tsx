/**
 * Jest stand-in for react-native-webview. The real module calls
 * TurboModuleRegistry.getEnforcing at import time, which throws outside a
 * native runtime. This renders an inert View that keeps every prop (so tests can
 * read `onMessage`, `source`, `injectedJavaScriptBeforeContentLoaded`, ...) and
 * exposes the imperative methods the shell calls as jest.fn().
 */
import React from 'react';
import {View, type ViewProps} from 'react-native';

export const webViewHandle = {
  injectJavaScript: jest.fn(),
  reload: jest.fn(),
  goBack: jest.fn(),
  goForward: jest.fn(),
  stopLoading: jest.fn(),
};

export const WebView = React.forwardRef<unknown, ViewProps & Record<string, any>>(
  (props, ref) => {
    React.useImperativeHandle(ref, () => webViewHandle);
    return <View testID="mock-webview" {...props} />;
  },
);

WebView.displayName = 'WebView';

export default WebView;
