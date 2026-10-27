import { isSafePath, navigateScript, toWebPath } from '../src/shell/deepLinks';

describe('toWebPath', () => {
  it.each([
    ['https://ugcad.io/', '/'],
    ['https://ugcad.io', '/'],
    ['https://www.ugcad.io/dashboard/creator', '/dashboard/creator'],
    ['https://ugcad.io/auth?view=reset&email=a%40b.co', '/auth?view=reset&email=a%40b.co'],
    ['https://ugcad.io?x=1', '/?x=1'],
    ['https://ugcad.io/team/accept?token=abc#top', '/team/accept?token=abc#top'],
    ['ugcad://dashboard/creator', '/dashboard/creator'],
    ['ugcad:///messages?c=1', '/messages?c=1'],
    // Extra slashes collapse to a plain in-site path, never to a protocol-relative URL.
    ['ugcad:////evil.com', '/evil.com'],
  ])('maps %s to %s', (url, path) => expect(toWebPath(url)).toBe(path));

  it.each([
    'https://evil.com/x', 'https://ugcad.io.evil.com/', 'https://ugcad.io@evil.com/', 'http://ugcad.io/x',
    'https://app.ugcad.io/api', 'https://ugcad.io:8080/', 'ugcad://\\evil',
    'javascript:alert(1)', 'file:///x', '',
  ])('rejects %s', url => expect(toWebPath(url)).toBeNull());

  it('rejects null and undefined', () => {
    expect(toWebPath(null)).toBeNull();
    expect(toWebPath(undefined)).toBeNull();
  });
});

describe('isSafePath', () => {
  it('accepts site-relative paths only', () => {
    expect(isSafePath('/a/b?c=1')).toBe(true);
    const bad = ['a/b', '//evil.com', '/\\evil', '/a\nb', 'https://ugcad.io/', 5, null, `/${'a'.repeat(3000)}`];
    for (const b of bad) expect(isSafePath(b)).toBe(false);
  });
});

describe('navigateScript', () => {
  it('quotes the path as a JS string', () => {
    expect(navigateScript('/a"b')).toBe('window.location.assign("/a\\"b");true;');
  });
});
