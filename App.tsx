/** UGCad mobile shell: a safe-area-aware full-screen WebView on https://ugcad.io. */
import React from 'react';
import { StatusBar } from 'react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import WebShell from './src/shell/WebShell';

export default function App() {
  return (
    <SafeAreaProvider>
      <StatusBar barStyle="dark-content" />
      <WebShell />
    </SafeAreaProvider>
  );
}
