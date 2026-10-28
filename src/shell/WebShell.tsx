/**
 * The whole app: one full-screen WebView on https://ugcad.io plus the native
 * behaviour a browser tab cannot give (bridge, back button, external links,
 * payment-app links, crash recovery, offline screen, push taps).
 */
import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  AppState,
  BackHandler,
  Linking,
  Modal,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  ToastAndroid,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { WebView, type WebViewProps } from 'react-native-webview';
import type {
  ShouldStartLoadRequest,
  WebViewMessageEvent,
} from 'react-native-webview/lib/WebViewTypes';
import {
  APP_ENTRY_PATH,
  BRAND_BG,
  BRAND_INK,
  HIDE_LANDING_PAGE,
  SHELL_VERSION,
  SPLASH_MAX_MS,
  WEB_ORIGIN,
  WEB_URL,
} from '../config';
import { buildDispatchScript, handleBridgeMessage, type NativeDetail, type Payload } from './bridge';
import { getInitialPath, navigateScript, subscribeDeepLinks, toWebPath } from './deepLinks';
import { downloadFile } from './download';
import ErrorScreen, { useLoadErrorKind } from './ErrorScreen';
import { createHandlers } from './handlers';
import { isLandingPath, LANDING_GUARD_JS } from './landingGuard';
import NotificationBanner from './NotificationBanner';
import { getInitialNotificationPath, startPushListeners, type ForegroundNotice } from './push';
import Splash from './Splash';
import { classifyUrl, intentToUrl } from './urlPolicy';
import { checkVersion, type VersionGate } from './versionCheck';

const PLATFORM = Platform.OS === 'ios' ? 'ios' : 'android';

/** The three flags the website reads to switch into app mode. */
const INJECTED_BEFORE_LOAD = `window.__UGCAD_SHELL__=true;window.__UGCAD_PLATFORM__=${JSON.stringify(
  PLATFORM,
)};window.__UGCAD_SHELL_VERSION__=${JSON.stringify(SHELL_VERSION)};${
  HIDE_LANDING_PAGE ? LANDING_GUARD_JS : ''
}true;`;

const COMMON_PROPS: WebViewProps = {
  applicationNameForUserAgent: `UGCadShell/${SHELL_VERSION}`,
  injectedJavaScriptBeforeContentLoaded: INJECTED_BEFORE_LOAD,
  // '*' so every URL reaches onShouldStartLoadWithRequest, which is the only policy.
  originWhitelist: ['*'],
  javaScriptEnabled: true,
  domStorageEnabled: true,
  sharedCookiesEnabled: true,
  thirdPartyCookiesEnabled: true,
  setSupportMultipleWindows: true,
  javaScriptCanOpenWindowsAutomatically: true,
  allowsInlineMediaPlayback: true,
  mediaPlaybackRequiresUserAction: false,
  allowsBackForwardNavigationGestures: true,
  bounces: false,
  overScrollMode: 'never',
  pullToRefreshEnabled: false,
  contentInsetAdjustmentBehavior: 'never',
  allowFileAccess: false,
  allowsLinkPreview: false,
  textZoom: 100,
  mixedContentMode: 'never',
  webviewDebuggingEnabled: __DEV__,
  startInLoadingState: false,
  style: { flex: 1, backgroundColor: BRAND_BG },
};

const openOutside = (url: string) => {
  Linking.openURL(url).catch(() => {
    // No app can handle it (e.g. UPI app not installed): nothing to do.
  });
};

/** The one place that decides what a navigation does. Returns whether the WebView may load it. */
function shouldStartLoad(req: ShouldStartLoadRequest): boolean {
  const url = req.url;
  // Embedded frames (Razorpay, videos) load in place; only top-level navigation is policed.
  if (req.isTopFrame === false && /^(https:|about:|blob:)/i.test(url)) return true;
  switch (classifyUrl(url)) {
    case 'webview':
      return true;
    case 'native':
      openOutside(intentToUrl(url));
      return false;
    case 'external':
      openOutside(url);
      return false;
    default:
      return false;
  }
}

const stripHash = (u: string) => u.split('#')[0];

/** On iOS a root link is the marketing landing page; inside the app it means the entry (login) screen. */
const appPath = (path: string): string =>
  HIDE_LANDING_PAGE && isLandingPath(path) ? APP_ENTRY_PATH : path;

const pathFromAppUrl = (url: string): string | null => {
  if (url === WEB_ORIGIN) return '/';
  if (url.startsWith(`${WEB_ORIGIN}/`)) return url.slice(WEB_ORIGIN.length);
  return toWebPath(url);
};

export default function WebShell() {
  const insets = useSafeAreaInsets();
  const webRef = useRef<WebView>(null);
  const [startUrl, setStartUrl] = useState<string | null>(null);
  const [attempt, setAttempt] = useState(0);
  const [splash, setSplash] = useState(true);
  const [loadError, setLoadError] = useState(false);
  const [serverError, setServerError] = useState(false);
  const [gate, setGate] = useState<VersionGate | null>(null);
  const [popupUrl, setPopupUrl] = useState<string | null>(null);
  const [notice, setNotice] = useState<ForegroundNotice | null>(null);

  const readyRef = useRef(false);
  const pendingOpenRef = useRef<string | null>(null);
  const canGoBackRef = useRef(false);
  const homedRef = useRef(false);
  const lastBackRef = useRef(0);
  const mainUrlRef = useRef('');

  const run = useCallback((js: string) => webRef.current?.injectJavaScript(js), []);
  const send = useCallback((detail: NativeDetail) => run(buildDispatchScript(detail)), [run]);
  const emit = useCallback((type: string, payload: Payload) => send({ type, payload }), [send]);

  /** Website sent app:ready, or the 8 s timer fired: drop the splash and deliver queued events. */
  const markReady = useCallback(() => {
    readyRef.current = true;
    setSplash(false);
    if (pendingOpenRef.current) {
      emit('push:open', { path: pendingOpenRef.current });
      pendingOpenRef.current = null;
    }
  }, [emit]);

  const openPath = useCallback(
    (path: string) => {
      if (readyRef.current) emit('push:open', { path });
      else pendingOpenRef.current = path;
    },
    [emit],
  );

  const handlers = useMemo(() => createHandlers(markReady), [markReady]);

  // Start URL: the launching deep link if there was one, else the login screen.
  // A root universal link is also normalized to login so the marketing page is
  // never the app's first screen.
  useEffect(() => {
    getInitialPath().then(path => setStartUrl(path ? `${WEB_ORIGIN}${appPath(path)}` : WEB_URL));
  }, []);

  useEffect(() => {
    checkVersion().then(setGate);
  }, []);

  // Splash safety net, restarted on every retry.
  useEffect(() => {
    const t = setTimeout(markReady, SPLASH_MAX_MS);
    return () => clearTimeout(t);
  }, [attempt, markReady]);

  useEffect(() => subscribeDeepLinks(path => run(navigateScript(appPath(path)))), [run]);

  useEffect(() => {
    getInitialNotificationPath().then(path => path && openPath(path));
    return startPushListeners({
      onToken: token => emit('push:token', { token, platform: PLATFORM }),
      onOpen: openPath,
      onForeground: setNotice,
    });
  }, [emit, openPath]);

  useEffect(() => {
    let previous = AppState.currentState;
    const sub = AppState.addEventListener('change', next => {
      if (next === 'active' && previous !== 'active') emit('app:resume', {});
      previous = next;
    });
    return () => sub.remove();
  }, [emit]);

  // Android back: page history, then home once, then double-back to exit.
  useEffect(() => {
    if (Platform.OS !== 'android') return;
    const sub = BackHandler.addEventListener('hardwareBackPress', () => {
      if (canGoBackRef.current) {
        webRef.current?.goBack();
        return true;
      }
      if (!homedRef.current) {
        homedRef.current = true;
        run(`window.location.replace(${JSON.stringify(APP_ENTRY_PATH)});true;`);
        return true;
      }
      const now = Date.now();
      if (now - lastBackRef.current < 2000) return false; // let the system close the app
      lastBackRef.current = now;
      ToastAndroid.show('Press back again to exit', ToastAndroid.SHORT);
      return true;
    });
    return () => sub.remove();
  }, [run]);

  const retry = useCallback(() => {
    readyRef.current = false;
    setLoadError(false);
    setServerError(false);
    setSplash(true);
    setAttempt(n => n + 1);
  }, []);

  const onOpenWindow = useCallback((e: { nativeEvent: { targetUrl: string } }) => {
    const url = e.nativeEvent.targetUrl;
    if (classifyUrl(url) !== 'webview') {
      shouldStartLoad({ url } as ShouldStartLoadRequest);
      return;
    }
    // Our own pages navigate the main view; payment pop-ups get their own window.
    const path = toWebPath(url);
    if (path) run(navigateScript(appPath(path)));
    else setPopupUrl(url);
  }, [run]);

  const shouldStartMainLoad = useCallback(
    (req: ShouldStartLoadRequest) => {
      const path = req.isTopFrame === false ? null : pathFromAppUrl(req.url);
      if (HIDE_LANDING_PAGE && path && isLandingPath(path)) {
        run(`window.location.replace(${JSON.stringify(APP_ENTRY_PATH)});true;`);
        return false;
      }
      return shouldStartLoad(req);
    },
    [run],
  );

  const probed = useLoadErrorKind(loadError);
  const kind = serverError ? 'server' : probed;

  return (
    <View style={[styles.root, { paddingTop: insets.top, paddingBottom: insets.bottom }]}>
      {startUrl ? (
        <WebView
          {...COMMON_PROPS}
          key={attempt}
          ref={webRef}
          source={{ uri: startUrl }}
          onMessage={(e: WebViewMessageEvent) =>
            handleBridgeMessage(e.nativeEvent.data, e.nativeEvent.url, send, handlers)
          }
          onShouldStartLoadWithRequest={shouldStartMainLoad}
          onOpenWindow={onOpenWindow}
          onLoadStart={e => {
            mainUrlRef.current = stripHash(e.nativeEvent.url);
          }}
          onNavigationStateChange={nav => {
            canGoBackRef.current = nav.canGoBack;
            if (nav.canGoBack) homedRef.current = false;
          }}
          onError={() => setLoadError(true)}
          onHttpError={e => {
            const { statusCode, url } = e.nativeEvent;
            if (statusCode >= 500 && stripHash(url) === mainUrlRef.current) setServerError(true);
          }}
          onRenderProcessGone={() => webRef.current?.reload()}
          onContentProcessDidTerminate={() => webRef.current?.reload()}
          onFileDownload={({ nativeEvent }) => {
            downloadFile(nativeEvent.downloadUrl).catch(() => {});
          }}
        />
      ) : null}

      <Splash visible={splash && !loadError && !serverError && !gate?.required} />
      {loadError || serverError ? <ErrorScreen kind={kind} onAction={retry} /> : null}
      <NotificationBanner
        notice={notice}
        onDismiss={() => setNotice(null)}
        onPress={n => n.path && openPath(n.path)}
      />
      {gate?.required ? <ErrorScreen kind="update" onAction={() => openOutside(gate.storeUrl)} /> : null}

      <Modal visible={popupUrl !== null} animationType="slide" onRequestClose={() => setPopupUrl(null)}>
        <View style={[styles.root, { paddingTop: insets.top, paddingBottom: insets.bottom }]}>
          <Pressable style={styles.close} onPress={() => setPopupUrl(null)} accessibilityRole="button">
            <Text style={styles.closeText}>Close</Text>
          </Pressable>
          {popupUrl ? (
            <WebView
              {...COMMON_PROPS}
              source={{ uri: popupUrl }}
              onShouldStartLoadWithRequest={shouldStartLoad}
              onOpenWindow={onOpenWindow}
            />
          ) : null}
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: BRAND_BG },
  close: { alignSelf: 'flex-end', paddingHorizontal: 16, paddingVertical: 10 },
  closeText: { color: BRAND_INK, fontSize: 16, fontWeight: '600' },
});
