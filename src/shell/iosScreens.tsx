/**
 * iOS-only native screens, drawn to the UGCad mobile design (boards M7 "Loading, empty & errors").
 * Android keeps the original screens in Splash.tsx / ErrorScreen.tsx / NotificationBanner.tsx.
 */
import React, { useEffect, useRef, useState } from 'react';
import {
  AccessibilityInfo,
  Animated,
  Easing,
  Image,
  Pressable,
  StatusBar,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { BRAND_BG } from '../config';
import type { ErrorKind } from './ErrorScreen';

/** Design tokens (UGCad brand system). */
export const IOS_INK = '#07074E';
const NAVY = '#0F1468'; // mid stop of the house gradient (no gradient library in the app)
const GLOW = '115,135,255';
const UGC_ON_DARK = '#9FAEFF';

const clipImage = require('../assets/clip.png');
const logoImage = require('../assets/logo.png');

const CLIP_H = 44;
const CLIP_W = CLIP_H * (207 / 264);
const WORD_W = 112;
const WORD_H = WORD_W * (640 / 3526);
/** Where "UGC" ends and "ad.io" starts inside logo.png (fraction of its width). */
const WORD_SPLIT = 0.47;

/** One clip of the loader: lifts 6pt and brightens, offset by 150 ms per clip (design: clipLink 1.2 s). */
function Clip({ index, animate }: { index: number; animate: boolean }) {
  const t = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    if (!animate) return undefined;
    const run = Animated.sequence([
      Animated.delay(index * 150),
      Animated.loop(
        Animated.sequence([
          Animated.timing(t, { toValue: 1, duration: 420, easing: Easing.inOut(Easing.ease), useNativeDriver: true }),
          Animated.timing(t, { toValue: 0, duration: 780, easing: Easing.inOut(Easing.ease), useNativeDriver: true }),
        ]),
      ),
    ]);
    run.start();
    return () => run.stop();
  }, [animate, index, t]);
  const opacity = animate ? t.interpolate({ inputRange: [0, 1], outputRange: [0.3, 1] }) : 1;
  const translateY = animate ? t.interpolate({ inputRange: [0, 1], outputRange: [0, -6] }) : 0;
  const rotate = index % 2 === 1 ? '180deg' : '0deg';
  return (
    <Animated.Image
      source={clipImage}
      resizeMode="contain"
      style={[styles.clip, index > 0 && styles.overlap, { opacity, transform: [{ translateY }, { rotate }] }]}
    />
  );
}

/** Wordmark on dark: "UGC" in periwinkle, "ad.io" in white (two tinted halves of logo.png). */
function Wordmark() {
  const split = WORD_W * WORD_SPLIT;
  const img = { width: WORD_W, height: WORD_H };
  return (
    <View style={{ width: WORD_W, height: WORD_H }} accessible accessibilityLabel="UGCad.io">
      <View style={[styles.half, styles.halfLeft, { width: split }]}>
        <Image source={logoImage} style={[img, styles.ugcTint]} resizeMode="contain" />
      </View>
      <View style={[styles.half, { left: split, width: WORD_W - split }]}>
        <Image source={logoImage} style={[img, styles.whiteTint, { marginLeft: -split }]} resizeMode="contain" />
      </View>
    </View>
  );
}

/** Soft radial glow built from many faint discs: too few steps read as rings, a flat disc as a circle. */
const GLOW_STEPS = Array.from({ length: 30 }, (_, k) => k);

function Glow() {
  return (
    <View pointerEvents="none" style={styles.glow}>
      {GLOW_STEPS.map(k => {
        const size = 400 * (1 - (k / GLOW_STEPS.length) * 0.85);
        return <View key={k} style={[styles.disc, { width: size, height: size, borderRadius: size / 2 }]} />;
      })}
    </View>
  );
}

/** Design "App loading": navy, four linked clips, wordmark, one line of text. */
export function IosSplash({ visible }: { visible: boolean }) {
  const [animate, setAnimate] = useState(true);
  useEffect(() => {
    AccessibilityInfo.isReduceMotionEnabled()
      .then(reduce => setAnimate(!reduce))
      .catch(() => {});
  }, []);
  if (!visible) return null;
  return (
    <View style={styles.splash} pointerEvents="auto" testID="splash">
      <StatusBar barStyle="light-content" />
      <Glow />
      <View style={styles.clips}>
        {[0, 1, 2, 3].map(i => (
          <Clip key={i} index={i} animate={animate} />
        ))}
      </View>
      <Wordmark />
      <Text style={styles.caption}>Getting your dashboard ready…</Text>
    </View>
  );
}

const COPY: Record<
  ErrorKind,
  { title: string; body: string; action: string; glyph: string; tile: string; ink: string }
> = {
  offline: {
    title: 'You’re offline',
    body: 'UGCad needs an internet connection. Check your Wi-Fi or mobile data and try again.',
    action: 'Try again',
    glyph: '!',
    tile: '#EEF0FF',
    ink: '#2A3AB8',
  },
  load: {
    title: 'We couldn’t load UGCad',
    body: 'Something went wrong while opening the page. Please try again.',
    action: 'Try again',
    glyph: 'i',
    tile: '#FFF2DC',
    ink: '#8A4B00',
  },
  server: {
    title: 'We couldn’t load UGCad',
    body: 'It’s on our side. Your data is safe. Please try again in a moment.',
    action: 'Try again',
    glyph: 'i',
    tile: '#FFF2DC',
    ink: '#8A4B00',
  },
  update: {
    title: 'Update required',
    body: 'This version of UGCad is no longer supported. Please update the app to continue.',
    action: 'Update',
    glyph: '↑',
    tile: '#EEF0FF',
    ink: '#2A3AB8',
  },
};

/** Design state screen: icon tile, title, one-sentence body, pill button. */
export function IosErrorScreen({ kind, onAction }: { kind: ErrorKind; onAction: () => void }) {
  const { title, body, action, glyph, tile, ink } = COPY[kind];
  return (
    <View style={styles.errorRoot} testID="error-screen">
      <View style={[styles.tile, { backgroundColor: tile }]}>
        <View style={[styles.ring, { borderColor: ink }]}>
          <Text style={[styles.glyph, { color: ink }]}>{glyph}</Text>
        </View>
      </View>
      <Text style={styles.title} accessibilityRole="header">
        {title}
      </Text>
      <Text style={styles.body}>{body}</Text>
      <Pressable
        style={({ pressed }) => [styles.button, pressed && styles.pressed]}
        onPress={onAction}
        accessibilityRole="button"
        testID="error-action">
        <Text style={styles.buttonText}>{action}</Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  clip: { width: CLIP_W, height: CLIP_H, tintColor: '#FFFFFF' },
  overlap: { marginLeft: -10 },
  half: { position: 'absolute', top: 0, height: WORD_H, overflow: 'hidden' },
  halfLeft: { left: 0 },
  ugcTint: { tintColor: UGC_ON_DARK },
  whiteTint: { tintColor: '#FFFFFF' },
  disc: { position: 'absolute', backgroundColor: `rgba(${GLOW},0.022)` },
  splash: { ...StyleSheet.absoluteFill, backgroundColor: NAVY, alignItems: 'center', justifyContent: 'center', overflow: 'hidden' },
  glow: { position: 'absolute', right: -120, top: -100, width: 400, height: 400, alignItems: 'center', justifyContent: 'center' },
  clips: { flexDirection: 'row', marginBottom: 18 },
  caption: { marginTop: 18, fontSize: 14, color: 'rgba(255,255,255,0.78)' },
  errorRoot: { ...StyleSheet.absoluteFill, backgroundColor: BRAND_BG, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 24 },
  tile: { width: 84, height: 84, borderRadius: 28, alignItems: 'center', justifyContent: 'center', marginBottom: 18 },
  ring: { width: 36, height: 36, borderRadius: 18, borderWidth: 3, alignItems: 'center', justifyContent: 'center' },
  glyph: { fontSize: 19, lineHeight: 23, fontWeight: '700' },
  title: { fontSize: 22, lineHeight: 28, fontWeight: '600', color: IOS_INK, textAlign: 'center', marginBottom: 10 },
  body: { fontSize: 14, lineHeight: 21, color: '#5A5A8C', textAlign: 'center', maxWidth: 320, marginBottom: 28 },
  button: { height: 54, borderRadius: 999, backgroundColor: IOS_INK, alignItems: 'center', justifyContent: 'center', alignSelf: 'stretch', maxWidth: 420, width: '100%' },
  pressed: { opacity: 0.85 },
  buttonText: { color: '#FFFFFF', fontSize: 16, fontWeight: '700' },
});
