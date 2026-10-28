/** In-app banner for pushes that arrive while the app is open (the OS shows nothing then). */
import React, { useEffect } from 'react';
import { Platform, Pressable, StyleSheet, Text } from 'react-native';
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
  const s = Platform.OS === 'ios' ? iosStyles : styles;
  return (
    <Pressable
      style={[s.root, { top: insets.top + 8 }]}
      onPress={() => {
        onDismiss();
        onPress(notice);
      }}
      accessibilityRole="alert"
      testID="notification-banner">
      {notice.title ? <Text style={s.title}>{notice.title}</Text> : null}
      {notice.body ? <Text style={s.body} numberOfLines={2}>{notice.body}</Text> : null}
    </Pressable>
  );
}

/** iOS: the design's toast card (board M7): radius 18, 12/14 padding, soft indigo shadow. */
const iosStyles = StyleSheet.create({
  root: { position: 'absolute', left: 16, right: 16, backgroundColor: '#fff', borderRadius: 18, paddingVertical: 12, paddingHorizontal: 14, shadowColor: BRAND_INK, shadowOpacity: 0.18, shadowRadius: 14, shadowOffset: { width: 0, height: 8 } },
  title: { fontSize: 14, fontWeight: '700', color: BRAND_INK },
  body: { fontSize: 13.5, lineHeight: 19, color: '#5A5A8C', marginTop: 2 },
});

const styles = StyleSheet.create({
  root: { position: 'absolute', left: 12, right: 12, backgroundColor: '#fff', borderRadius: 14, padding: 14, elevation: 8, shadowColor: '#000', shadowOpacity: 0.15, shadowRadius: 10, shadowOffset: { width: 0, height: 4 } },
  title: { fontSize: 15, fontWeight: '700', color: BRAND_INK },
  body: { fontSize: 14, color: BRAND_INK, opacity: 0.8, marginTop: 2 },
});
