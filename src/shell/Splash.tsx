/** Brand splash drawn over the WebView until the website sends `app:ready` (or SPLASH_MAX_MS passes). */
import React from 'react';
import { Image, StyleSheet, View } from 'react-native';
import { BRAND_BG } from '../config';

export default function Splash({ visible }: { visible: boolean }) {
  if (!visible) return null;
  return (
    <View style={styles.root} pointerEvents="auto" testID="splash">
      <Image source={require('../assets/logo.png')} style={styles.logo} resizeMode="contain" />
    </View>
  );
}

const styles = StyleSheet.create({
  root: { ...StyleSheet.absoluteFill, backgroundColor: BRAND_BG, alignItems: 'center', justifyContent: 'center' },
  logo: { width: 220, height: 40 },
});
