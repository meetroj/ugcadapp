import React from 'react';
import { Linking } from 'react-native';
import ReactTestRenderer, { act } from 'react-test-renderer';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import WebShell from '../src/shell/WebShell';
import { WEB_URL } from '../src/config';

jest.mock('../src/shell/push', () => ({
  getInitialNotificationPath: jest.fn(async () => null),
  startPushListeners: jest.fn(() => () => {}),
  notificationStatus: jest.fn(),
  registerForPush: jest.fn(),
  unregisterPush: jest.fn(),
}));

describe('WebShell', () => {
  let mounted: ReactTestRenderer.ReactTestRenderer | undefined;
  beforeEach(() => {
    jest.spyOn(globalThis, 'fetch').mockRejectedValue(new Error('offline'));
    jest.spyOn(Linking, 'getInitialURL').mockResolvedValue(null);
    jest.spyOn(Linking, 'openURL').mockResolvedValue(undefined);
  });
  afterEach(async () => {
    await act(async () => mounted?.unmount());
    jest.restoreAllMocks();
  });

  const render = async () => {
    let tree!: ReactTestRenderer.ReactTestRenderer;
    await act(async () => {
      tree = ReactTestRenderer.create(
        <SafeAreaProvider>
          <WebShell />
        </SafeAreaProvider>,
      );
    });
    mounted = tree;
    return tree.root.findAllByProps({ testID: 'mock-webview' })[0].props;
  };

  it('loads the live site with the shell markers and the hardened settings', async () => {
    const p = await render();
    expect(p.source).toEqual({ uri: WEB_URL });
    expect(p.applicationNameForUserAgent).toMatch(/^UGCadShell\/\d+\.\d+\.\d+/);
    expect(p.injectedJavaScriptBeforeContentLoaded).toContain('window.__UGCAD_SHELL__=true');
    expect(p.injectedJavaScriptBeforeContentLoaded).toContain('__UGCAD_PLATFORM__');
    expect(p.injectedJavaScriptBeforeContentLoaded).toContain('__UGCAD_SHELL_VERSION__');
    expect(p.allowFileAccess).toBe(false);
    expect(p.mixedContentMode).toBe('never');
    expect(p.startInLoadingState).toBe(false);
    expect(p.setSupportMultipleWindows).toBe(true);
  });

  it('keeps allow-listed pages in the WebView and sends the rest to the OS', async () => {
    const p = await render();
    expect(p.onShouldStartLoadWithRequest({ url: 'https://ugcad.io/x' })).toBe(true);
    expect(p.onShouldStartLoadWithRequest({ url: 'https://evil.com/' })).toBe(false);
    expect(Linking.openURL).toHaveBeenLastCalledWith('https://evil.com/');
    expect(p.onShouldStartLoadWithRequest({ url: 'upi://pay?pa=a@b' })).toBe(false);
    expect(Linking.openURL).toHaveBeenLastCalledWith('upi://pay?pa=a@b');
    expect(p.onShouldStartLoadWithRequest({ url: 'file:///x' })).toBe(false);
    expect(p.onShouldStartLoadWithRequest({ url: 'data:text/html,x' })).toBe(false);
  });
});
