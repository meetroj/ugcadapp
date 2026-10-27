/** Full-screen state shown instead of the website when it cannot load (or the app is too old). */
import React, { useEffect, useState } from 'react';
import { Image, Pressable, StyleSheet, Text, View } from 'react-native';
import { BRAND_ACCENT, BRAND_BG, BRAND_INK, WEB_URL } from '../config';

export type ErrorKind = 'offline' | 'load' | 'server' | 'update';

const COPY: Record<ErrorKind, { title: string; body: string; action: string }> = {
  offline: {
    title: 'You are offline',
    body: 'UGCad needs an internet connection. Check your Wi-Fi or mobile data and try again.',
    action: 'Retry',
  },
  load: {
    title: 'Could not load UGCad',
    body: 'Something went wrong while opening the page. Please try again.',
    action: 'Retry',
  },
  server: {
    title: 'UGCad is having trouble',
    body: 'Our servers are not responding right now. Please try again in a moment.',
    action: 'Retry',
  },
  update: {
    title: 'Update required',
    body: 'This version of UGCad is no longer supported. Please update the app to continue.',
    action: 'Update',
  },
};

/** True when the device cannot reach the site at all (fetch rejects). */
export async function isOffline(timeoutMs = 4000): Promise<boolean> {
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), timeoutMs);
  try {
    await fetch(WEB_URL, { method: 'HEAD', signal: ctrl.signal });
    return false;
  } catch {
    return true;
  } finally {
    clearTimeout(timer);
  }
}

type Props = { kind: ErrorKind; onAction: () => void };

export default function ErrorScreen({ kind, onAction }: Props) {
  const { title, body, action } = COPY[kind];
  return (
    <View style={styles.root} testID="error-screen">
      <Image source={require('../assets/logo.png')} style={styles.logo} resizeMode="contain" />
      <Text style={styles.title} accessibilityRole="header">
        {title}
      </Text>
      <Text style={styles.body}>{body}</Text>
      <Pressable style={styles.button} onPress={onAction} accessibilityRole="button" testID="error-action">
        <Text style={styles.buttonText}>{action}</Text>
      </Pressable>
    </View>
  );
}

/** Picks offline vs generic load error by probing the network once. */
export function useLoadErrorKind(failed: boolean): ErrorKind {
  const [kind, setKind] = useState<ErrorKind>('load');
  useEffect(() => {
    if (!failed) return;
    let alive = true;
    isOffline().then(off => alive && setKind(off ? 'offline' : 'load'));
    return () => {
      alive = false;
    };
  }, [failed]);
  return kind;
}

const styles = StyleSheet.create({
  root: { ...StyleSheet.absoluteFill, backgroundColor: BRAND_BG, alignItems: 'center', justifyContent: 'center', padding: 32 },
  logo: { width: 180, height: 33, marginBottom: 32 },
  title: { fontSize: 22, fontWeight: '700', color: BRAND_INK, textAlign: 'center', marginBottom: 12 },
  body: { fontSize: 16, lineHeight: 23, color: BRAND_INK, opacity: 0.75, textAlign: 'center', marginBottom: 28 },
  button: { backgroundColor: BRAND_ACCENT, paddingVertical: 14, paddingHorizontal: 40, borderRadius: 12, minWidth: 160, alignItems: 'center' },
  buttonText: { color: '#fff', fontSize: 16, fontWeight: '600' },
});
