/** In-app banner for pushes that arrive while the app is open (the OS shows nothing then). */
import React, { useEffect } from 'react';
import { Pressable, StyleSheet, Text } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { BRAND_INK } from '../config';
import type { ForegroundNotice } from './push';

const SHOW_MS = 5000;

type Props = { notice: ForegroundNotice | null; onPress: (notice: ForegroundNotice) => void; onDismiss: () => void };

export default function NotificationBanner({ notice, onPress, onDismiss }: Props) {
  const insets = useSafeAreaInsets();
  useEffect(() => {
    if (!notice) return;
    const t = setTimeout(onDismiss, SHOW_MS);
    return () => clearTimeout(t);
  }, [notice, onDismiss]);
  if (!notice) return null;
  return (
    <Pressable
      style={[styles.root, { top: insets.top + 8 }]}
      onPress={() => {
        onDismiss();
        onPress(notice);
      }}
      accessibilityRole="alert"
      testID="notification-banner">
      {notice.title ? <Text style={styles.title}>{notice.title}</Text> : null}
      {notice.body ? <Text style={styles.body} numberOfLines={2}>{notice.body}</Text> : null}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  root: { position: 'absolute', left: 12, right: 12, backgroundColor: '#fff', borderRadius: 14, padding: 14, elevation: 8, shadowColor: '#000', shadowOpacity: 0.15, shadowRadius: 10, shadowOffset: { width: 0, height: 4 } },
  title: { fontSize: 15, fontWeight: '700', color: BRAND_INK },
  body: { fontSize: 14, color: BRAND_INK, opacity: 0.8, marginTop: 2 },
});
