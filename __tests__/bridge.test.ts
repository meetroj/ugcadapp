import {
  buildDispatchScript,
  handleBridgeMessage,
  parseBridgeMessage,
  type Handlers,
} from '../src/shell/bridge';

const ORIGIN = 'https://ugcad.io/dashboard';
const msg = (m: object) => JSON.stringify(m);

describe('parseBridgeMessage', () => {
  it('accepts every contract type', () => {
    const types = [
      'auth:google', 'auth:apple', 'push:register', 'push:unregister', 'open:external',
      'share', 'download', 'app:info', 'app:openSettings', 'permissions:status', 'permissions:request',
    ];
    for (const type of types) {
      expect(parseBridgeMessage(msg({ id: 'a1', type, payload: { x: 1 } }))).toEqual({
        id: 'a1', type, payload: { x: 1 },
      });
    }
  });

  it('allows app:ready without an id and defaults payload to {}', () => {
    expect(parseBridgeMessage(msg({ type: 'app:ready' }))).toEqual({ id: '', type: 'app:ready', payload: {} });
  });

  it('rejects malformed JSON, non-objects, unknown and legacy types', () => {
    expect(parseBridgeMessage('{nope')).toBeNull();
    expect(parseBridgeMessage('[1,2]')).toBeNull();
    expect(parseBridgeMessage('"hi"')).toBeNull();
    expect(parseBridgeMessage(undefined)).toBeNull();
    expect(parseBridgeMessage(msg({ id: '1', type: 'launch:missiles' }))).toBeNull();
    expect(parseBridgeMessage(msg({ type: 'ugcad-overlay', depth: 2 }))).toBeNull();
  });

  it('rejects requests that need a reply but have no valid id', () => {
    expect(parseBridgeMessage(msg({ type: 'app:info' }))).toBeNull();
    expect(parseBridgeMessage(msg({ id: 5, type: 'app:info' }))).toBeNull();
  });

  it('replaces a non-object payload with {}', () => {
    expect(parseBridgeMessage(msg({ id: '1', type: 'share', payload: 'x' }))?.payload).toEqual({});
  });
});

describe('buildDispatchScript', () => {
  it('dispatches the ugcad-native event with safely escaped JSON', () => {
    const detail = { id: '1', type: 'share:result', payload: { ok: true, text: '</script> "quote"' } };
    const script = buildDispatchScript(detail);
    expect(script).toContain("new CustomEvent('ugcad-native'");
    expect(script).not.toContain('</script>');
    expect(script).not.toContain(' ');
    const json = /detail:(\{.*\})\}\)\);/.exec(script)?.[1] ?? '';
    expect(JSON.parse(json)).toEqual(detail);
  });
});

describe('handleBridgeMessage', () => {
  const run = async (raw: unknown, url: string | undefined, handlers: Handlers) => {
    const send = jest.fn();
    await handleBridgeMessage(raw, url, send, handlers);
    return send;
  };

  it('replies with <type>:result and the same id', async () => {
    const send = await run(msg({ id: 'k', type: 'app:info' }), ORIGIN, {
      'app:info': async () => ({ ok: true, version: '1.3.0' }),
    });
    expect(send).toHaveBeenCalledWith({ id: 'k', type: 'app:info:result', payload: { ok: true, version: '1.3.0' } });
  });

  it('does not reply to app:ready but still runs the handler', async () => {
    const ready = jest.fn(async () => ({ ok: true as const }));
    const send = await run(msg({ type: 'app:ready' }), ORIGIN, { 'app:ready': ready });
    expect(ready).toHaveBeenCalled();
    expect(send).not.toHaveBeenCalled();
  });

  it('turns a throwing handler into an ok:false reply', async () => {
    const send = await run(msg({ id: 'k', type: 'share' }), ORIGIN, {
      share: async () => {
        throw new Error('boom');
      },
    });
    expect(send).toHaveBeenCalledWith({
      id: 'k', type: 'share:result', payload: { ok: false, error: 'failed', message: 'boom' },
    });
  });

  it('ignores messages from other origins', async () => {
    const handler = jest.fn(async () => ({ ok: true as const }));
    for (const url of [
      'https://evil.com/', 'https://ugcad.io.evil.com/', 'https://ugcad.io@evil.com/',
      'http://ugcad.io/', 'https://checkout.razorpay.com/', 'file:///x.html', undefined,
    ]) {
      const send = await run(msg({ id: '1', type: 'auth:google' }), url, { 'auth:google': handler });
      expect(send).not.toHaveBeenCalled();
    }
    expect(handler).not.toHaveBeenCalled();
  });

  it('ignores unknown types, malformed JSON and missing handlers without throwing', async () => {
    expect(await run('{bad', ORIGIN, {})).not.toHaveBeenCalled();
    expect(await run(msg({ id: '1', type: 'zzz' }), ORIGIN, {})).not.toHaveBeenCalled();
    expect(await run(msg({ id: '1', type: 'share' }), ORIGIN, {})).not.toHaveBeenCalled();
  });

  it('never throws when send fails', async () => {
    const send = jest.fn(() => {
      throw new Error('webview gone');
    });
    await expect(
      handleBridgeMessage(msg({ id: '1', type: 'app:info' }), ORIGIN, send, { 'app:info': async () => ({ ok: true }) }),
    ).resolves.toBeUndefined();
  });
});
