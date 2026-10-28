import { isLandingPath, LANDING_GUARD_JS } from '../src/shell/landingGuard';

describe('landing guard (iOS)', () => {
  it('treats only the site root as the landing page', () => {
    expect(isLandingPath('/')).toBe(true);
    expect(isLandingPath('/?ref=x')).toBe(true);
    expect(isLandingPath('/#top')).toBe(true);
    expect(isLandingPath('/auth')).toBe(false);
    expect(isLandingPath('/dashboard/brand')).toBe(false);
  });

  it('sends in-page navigation to "/" to login and hides "Back to home"', () => {
    const calls: unknown[][] = [];
    const history = {
      pushState: (...a: unknown[]) => calls.push(['push', ...a]),
      replaceState: (...a: unknown[]) => calls.push(['replace', ...a]),
    };
    const appended: Array<{ textContent?: string }> = [];
    const doc = {
      createElement: () => ({} as { textContent?: string }),
      documentElement: { appendChild: (n: { textContent?: string }) => appended.push(n) },
    };
    const loc = { href: 'https://ugcad.io/auth', origin: 'https://ugcad.io' };
    // The guard is a script string for the WebView; run it here against stubs of the page globals.
    // eslint-disable-next-line no-new-func
    new Function('history', 'location', 'document', 'URL', LANDING_GUARD_JS)(history, loc, doc, URL);

    history.pushState(null, '', '/');
    history.replaceState(null, '', 'https://ugcad.io/?x=1');
    history.pushState(null, '', '/dashboard');
    history.pushState(null, '', 'https://other.com/');
    history.pushState(null, '');

    expect(calls).toEqual([
      ['push', null, '', '/auth'],
      ['replace', null, '', '/auth'],
      ['push', null, '', '/dashboard'],
      ['push', null, '', 'https://other.com/'],
      ['push', null, '', undefined],
    ]);
    expect(appended[0].textContent).toContain('.ap-back');
  });
});
