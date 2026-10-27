import { checkVersion, compareVersions } from '../src/shell/versionCheck';

const respond = (body: unknown, ok = true) =>
  jest.spyOn(globalThis, 'fetch').mockResolvedValue({ ok, json: async () => body } as Response);

describe('compareVersions', () => {
  it('compares numerically and pads missing parts', () => {
    expect(compareVersions('1.3.0', '1.3')).toBe(0);
    expect(compareVersions('1.2.15', '1.3.0')).toBe(-1);
    expect(compareVersions('1.10.0', '1.9.9')).toBe(1);
  });
});

describe('checkVersion', () => {
  afterEach(() => jest.restoreAllMocks());

  it('requires an update when the installed version is older than the minimum', async () => {
    respond({ minSupportedVersion: '9.0.0', storeUrls: { android: 'https://play.google.com/x', ios: 'https://apps.apple.com/x' } });
    const gate = await checkVersion();
    expect(gate.required).toBe(true);
    expect(gate.storeUrl).toMatch(/^https:\/\//);
  });

  it('does not block when the minimum is at or below the installed version', async () => {
    respond({ minSupportedVersion: '1.0.0' });
    expect((await checkVersion()).required).toBe(false);
  });

  it('fails open on network errors, bad status and malformed content', async () => {
    jest.spyOn(globalThis, 'fetch').mockRejectedValue(new Error('offline'));
    expect((await checkVersion()).required).toBe(false);
    respond({}, false);
    expect((await checkVersion()).required).toBe(false);
    respond({ minSupportedVersion: 'latest; drop table' });
    expect((await checkVersion()).required).toBe(false);
  });

  it('ignores non-https store URLs from the file', async () => {
    respond({ minSupportedVersion: '9.0.0', storeUrls: { android: 'javascript:alert(1)', ios: 'javascript:alert(1)' } });
    expect((await checkVersion()).storeUrl).toMatch(/^https:\/\//);
  });
});
