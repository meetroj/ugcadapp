/**
 * Single place for every value the shell needs to know about the outside world.
 * Nothing here is secret: OAuth client ids are public identifiers.
 */
import { Platform } from 'react-native';
import pkg from '../package.json';

/**
 * DEBUG BUILDS ONLY (__DEV__): load the website from the developer machine instead of production, over USB:
 *   adb reverse tcp:3000 tcp:3000   +   the website dev server on port 3000.
 * In release builds DEV_ORIGIN is '' and every dev path below is dead code.
 */
export const DEV_ORIGIN: string = __DEV__ ? 'http://localhost:3000' : '';

/** Website origin used by the shell. Nothing from the website is bundled in the app. */
export const WEB_ORIGIN: string = DEV_ORIGIN || 'https://ugcad.io';

/**
 * iOS never opens the marketing landing page: signed-out users start at login.
 * Android keeps the site root, which is what the client signed off.
 */
export const HIDE_LANDING_PAGE: boolean = Platform.OS === 'ios';
export const APP_ENTRY_PATH: string = HIDE_LANDING_PAGE ? '/auth' : '/';
export const WEB_URL: string = `${WEB_ORIGIN}${APP_ENTRY_PATH}`;

/** Backend API (the website talks to it itself; the shell only needs it for docs/diagnostics). */
export const API_BASE = 'https://app.ugcad.io/api';

/** Marketing version, taken from package.json so there is one source of truth. */
export const SHELL_VERSION: string = pkg.version;

/**
 * Store build number (Android versionCode / iOS CFBundleVersion).
 * Keep in sync with android/app/build.gradle and the Xcode project.
 */
export const SHELL_BUILD = 26;

/** Remote file that can force old app versions to update. Missing file = no gate. */
export const APP_CONFIG_URL = 'https://ugcad.io/app-config.json';

/** Compiled-in floor used when app-config.json is unreachable. '0.0.0' = never block. */
export const MIN_SUPPORTED_VERSION = '0.0.0';

/** Fallback store pages for the "Update required" screen. */
export const STORE_URLS = {
  android: 'https://play.google.com/store/apps/details?id=com.ugcapp',
  ios: 'https://apps.apple.com/app/id0000000000', // placeholder: replace with the real App Store id
} as const;

/** Hosts that may render inside the WebView and talk to the bridge (exact match). */
export const ALLOWED_HOSTS: readonly string[] = [
  'ugcad.io',
  'www.ugcad.io',
  'app.ugcad.io',
];

/** Domain suffixes allowed in the WebView (host === suffix or ends with `.suffix`). */
export const ALLOWED_HOST_SUFFIXES: readonly string[] = ['razorpay.com'];

/** Hosts whose pages may call the native bridge (Google/Apple/push/share...). Stricter than ALLOWED_HOSTS. */
export const BRIDGE_HOSTS: readonly string[] = ['ugcad.io', 'www.ugcad.io'];

/** Hosts a universal link / `ugcad://` link may navigate the WebView to. */
export const DEEP_LINK_HOSTS: readonly string[] = ['ugcad.io', 'www.ugcad.io'];

/** URL schemes handed to the OS (UPI apps, dialer, mail) instead of the WebView. */
export const NATIVE_SCHEMES: readonly string[] = [
  'upi',
  'phonepe',
  'gpay',
  'paytmmp',
  'tez',
  'bhim',
  'tel',
  'mailto',
  'intent',
];

/**
 * Google OAuth clients. The WEB client id must stay the audience the backend
 * verifies (GOOGLE_CLIENT_ID); the iOS one is a separate "iOS" client for
 * bundle id io.ugcad.app. Android needs only the OAuth client registered in
 * Google Cloud (package com.ugcapp + signing SHA-1).
 */
export const GOOGLE_WEB_CLIENT_ID =
  '193113275370-c3or5lgj2m92qgc364hvu45tbiflj470.apps.googleusercontent.com';
export const GOOGLE_IOS_CLIENT_ID =
  '193113275370-rnctnc7p6bma4kve8p0hrqbc0b1c9al2.apps.googleusercontent.com';

/** Brand colours shared by splash, error screens and the safe-area padding. */
export const BRAND_BG = '#F4F5FF';
export const BRAND_INK = '#0A0850';
export const BRAND_ACCENT = '#667EEA';

/** The splash never stays longer than this even if the site never sends app:ready. */
export const SPLASH_MAX_MS = 8000;
