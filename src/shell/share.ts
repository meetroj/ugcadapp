/** Native share sheet via react-native's built-in Share. */
import { Platform, Share } from 'react-native';

export type ShareInput = { title?: string; text?: string; url?: string };

const str = (v: unknown): string | undefined =>
  typeof v === 'string' && v.trim() ? v.trim().slice(0, 4000) : undefined;

/** Returns false when there is nothing to share. */
export async function shareContent(input: ShareInput): Promise<boolean> {
  const title = str(input.title);
  const text = str(input.text);
  const url = str(input.url);
  if (url && !/^https?:\/\//i.test(url)) return false;
  if (!text && !url) return false;

  // Android's sheet ignores `url`, so fold it into the message there.
  const message = (Platform.OS === 'android' ? [text, url].filter(Boolean).join('\n') : text) ?? '';
  await Share.share({ title, message, url: Platform.OS === 'ios' ? url : undefined });
  return true;
}
