/**
 * `download` bridge request.
 *
 * react-native-blob-util (or any file-system package) is not installed, so the
 * shell cannot write a file itself. Fallback: hand the https URL to the system
 * browser, which downloads it with its own download manager / share sheet.
 * Limitation: URLs that need the app's login cookie will not work this way.
 */
import { Linking } from 'react-native';

/** Opens `url` outside the app. Returns false for anything but https/http. */
export async function downloadFile(url: unknown): Promise<boolean> {
  if (typeof url !== 'string' || !/^https?:\/\//i.test(url.trim())) return false;
  await Linking.openURL(url.trim());
  return true;
}
