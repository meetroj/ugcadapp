/**
 * Message bridge between the website and native code.
 *
 *   website -> native: window.ReactNativeWebView.postMessage(JSON.stringify({id, type, payload}))
 *   native -> website: window.dispatchEvent(new CustomEvent('ugcad-native', {detail: {id, type, payload}}))
 *
 * This file only parses and dispatches; the native work lives in handlers.ts.
 * Nothing here throws: bad input is dropped, handler failures become an
 * `{ok:false}` reply.
 */
import { isTrustedBridgeUrl } from './urlPolicy';

export const REQUEST_TYPES = [
  'app:ready',
  'auth:google',
  'auth:apple',
  'push:register',
  'push:unregister',
  'open:external',
  'share',
  'download',
  'app:info',
  'app:openSettings',
  'permissions:status',
  'permissions:request',
] as const;

export type RequestType = (typeof REQUEST_TYPES)[number];

export type Payload = Record<string, unknown>;

export type BridgeRequest = { id: string; type: RequestType; payload: Payload };

export type Failure = { ok: false; error: string; message: string };
export type Success = { ok: true } & Payload;
export type BridgeResult = Success | Failure;

/** What native sends to the page: a reply (`<type>:result`) or an unsolicited event. */
export type NativeDetail = { id?: string; type: string; payload: Payload };

export type Handler = (payload: Payload) => Promise<BridgeResult>;
export type Handlers = Partial<Record<RequestType, Handler>>;

const MAX_MESSAGE_CHARS = 256 * 1024;
const MAX_ID_CHARS = 128;

export const fail = (error: string, message: string): Failure => ({
  ok: false,
  error,
  message,
});

function isPlainObject(v: unknown): v is Payload {
  return typeof v === 'object' && v !== null && !Array.isArray(v);
}

/** Returns the request, or null for malformed JSON, unknown types and legacy messages. */
export function parseBridgeMessage(raw: unknown): BridgeRequest | null {
  if (typeof raw !== 'string' || raw.length > MAX_MESSAGE_CHARS) return null;
  let msg: unknown;
  try {
    msg = JSON.parse(raw);
  } catch {
    return null;
  }
  if (!isPlainObject(msg)) return null;

  const { id, type, payload } = msg;
  if (typeof type !== 'string' || !(REQUEST_TYPES as readonly string[]).includes(type)) {
    return null;
  }
  // app:ready expects no reply, so it is the one request allowed without an id.
  if (id !== undefined && (typeof id !== 'string' || id.length > MAX_ID_CHARS)) return null;
  if (id === undefined && type !== 'app:ready') return null;

  return {
    id: id ?? '',
    type: type as RequestType,
    payload: isPlainObject(payload) ? payload : {},
  };
}

/**
 * JS the shell runs inside the page. JSON is a valid JS expression except for
 * U+2028/2029, and `<` is escaped so the payload can never close a tag.
 */
export function buildDispatchScript(detail: NativeDetail): string {
  const json = JSON.stringify(detail)
    .replace(/\u2028/g, '\\u2028')
    .replace(/\u2029/g, '\\u2029')
    .replace(/</g, '\\u003c');
  return `try{window.dispatchEvent(new CustomEvent('ugcad-native',{detail:${json}}));}catch(e){}true;`;
}

/**
 * Handles one raw message from the WebView.
 * @param originUrl event.nativeEvent.url: messages from non-allow-listed pages are ignored.
 */
export async function handleBridgeMessage(
  raw: unknown,
  originUrl: string | undefined,
  send: (detail: NativeDetail) => void,
  handlers: Handlers,
): Promise<void> {
  if (!isTrustedBridgeUrl(originUrl)) return;
  const req = parseBridgeMessage(raw);
  if (!req) return;
  const handler = handlers[req.type];
  if (!handler) return;

  let result: BridgeResult;
  try {
    result = await handler(req.payload);
  } catch (e) {
    result = fail('failed', e instanceof Error ? e.message : 'Something went wrong.');
  }
  if (req.type === 'app:ready') return;
  try {
    send({ id: req.id, type: `${req.type}:result`, payload: result });
  } catch {
    // The WebView may be gone; nothing to tell.
  }
}
