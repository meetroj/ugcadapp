// The debug-only dev server origin (http://localhost:3000 over `adb reverse`) must never exist in release builds.

type Mods = {
  config: typeof import('../src/config');
  policy: typeof import('../src/shell/urlPolicy');
};

function load(dev: boolean): Mods {
  const g = globalThis as unknown as { __DEV__: boolean };
  const previous = g.__DEV__;
  g.__DEV__ = dev;
  let mods: Mods | undefined;
  jest.isolateModules(() => {
    mods = {
      config: require('../src/config'),
      policy: require('../src/shell/urlPolicy'),
    };
  });
  g.__DEV__ = previous;
  return mods as Mods;
}

describe('dev origin', () => {
  it('release: loads https://ugcad.io only and rejects localhost in every form', () => {
    const { config, policy } = load(false);
    expect(config.DEV_ORIGIN).toBe('');
    expect(config.WEB_ORIGIN).toBe('https://ugcad.io');
    expect(config.WEB_URL).toBe('https://ugcad.io/auth');
    expect(policy.isAllowedUrl('http://localhost:3000/auth')).toBe(false);
    expect(policy.isAllowedUrl('https://localhost/auth')).toBe(false);
    expect(policy.isTrustedBridgeUrl('http://localhost:3000/')).toBe(false);
    expect(policy.classifyUrl('http://localhost:3000/')).toBe('external');
    expect(policy.isAllowedUrl('https://ugcad.io/')).toBe(true);
  });

  it('debug: loads the dev server on localhost:3000 only (not other ports or look-alike hosts)', () => {
    const { config, policy } = load(true);
    expect(config.DEV_ORIGIN).toBe('http://localhost:3000');
    expect(config.WEB_ORIGIN).toBe('http://localhost:3000');
    expect(config.WEB_URL).toBe('http://localhost:3000/auth');
    expect(policy.isAllowedUrl('http://localhost:3000/auth')).toBe(true);
    expect(policy.isTrustedBridgeUrl('http://localhost:3000/')).toBe(true);
    expect(policy.isAllowedUrl('http://localhost:8081/')).toBe(false);
    expect(policy.isAllowedUrl('http://localhost.evil.com:3000/')).toBe(false);
    expect(policy.isAllowedUrl('http://evil.com/')).toBe(false);
    expect(policy.isAllowedUrl('https://ugcad.io/')).toBe(true);
  });
});
