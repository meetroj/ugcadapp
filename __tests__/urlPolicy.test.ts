import {
  classifyUrl, intentToUrl, isAllowedUrl, isOpenableExternal, isTrustedBridgeUrl,
} from '../src/shell/urlPolicy';

describe('allow-list', () => {
  it.each([
    'https://ugcad.io/', 'https://www.ugcad.io/auth', 'https://app.ugcad.io/api/x',
    'https://checkout.razorpay.com/v1/checkout.html', 'https://api.razorpay.com/v1', 'https://x.y.razorpay.com/',
    'HTTPS://UGCAD.IO/',
  ])('allows %s', url => expect(isAllowedUrl(url)).toBe(true));

  it.each([
    'https://evil.com/', 'https://ugcad.io.evil.com/', 'https://evilugcad.io/', 'https://notrazorpay.com/',
    'https://razorpay.com.evil.com/', 'https://ugcad.io@evil.com/', 'https://ugcad.io:8443/', 'http://ugcad.io/',
    'ftp://ugcad.io/', 'file:///ugcad.io', 'javascript:alert(1)', '',
  ])('rejects %s', url => expect(isAllowedUrl(url)).toBe(false));
});

describe('classifyUrl', () => {
  it('loads allow-listed https pages and about:blank in the WebView', () => {
    expect(classifyUrl('https://ugcad.io/x')).toBe('webview');
    expect(classifyUrl('https://checkout.razorpay.com/')).toBe('webview');
    expect(classifyUrl('about:blank')).toBe('webview');
    expect(classifyUrl('blob:https://ugcad.io/1234')).toBe('webview');
  });

  it('sends payment, phone, mail and intent links to the OS', () => {
    const urls = [
      'upi://pay?pa=a@b', 'phonepe://pay', 'gpay://upi/pay', 'paytmmp://pay',
      'tel:+911234567890', 'mailto:a@b.co', 'intent://pay#Intent;scheme=upi;end',
    ];
    for (const u of urls) expect(classifyUrl(u)).toBe('native');
  });

  it('opens every other http(s) host outside the app', () => {
    expect(classifyUrl('https://evil.com/')).toBe('external');
    expect(classifyUrl('https://ugcad.io.evil.com/')).toBe('external');
    expect(classifyUrl('http://ugcad.io/')).toBe('external');
  });

  it('blocks file:, data:, javascript: and foreign blob: top-level URLs', () => {
    const urls = [
      'file:///etc/passwd', 'data:text/html,<h1>x</h1>', 'javascript:alert(1)',
      'blob:https://evil.com/1', 'weird', 'content://x',
    ];
    for (const u of urls) expect(classifyUrl(u)).toBe('block');
  });
});

describe('helpers', () => {
  it('rebuilds a plain URL from an Android intent:// link', () => {
    expect(intentToUrl('intent://pay?pa=a@b&am=1#Intent;scheme=upi;package=com.x;end')).toBe('upi://pay?pa=a@b&am=1');
    expect(intentToUrl('https://ugcad.io/')).toBe('https://ugcad.io/');
  });

  it('only lets the website open https, http, mailto and tel', () => {
    expect(isOpenableExternal('https://a.com')).toBe(true);
    expect(isOpenableExternal('mailto:a@b.co')).toBe(true);
    expect(isOpenableExternal('tel:123')).toBe(true);
    expect(isOpenableExternal('javascript:1')).toBe(false);
    expect(isOpenableExternal('file:///x')).toBe(false);
  });

  it('trusts the bridge only for the site itself', () => {
    expect(isTrustedBridgeUrl('https://ugcad.io/a')).toBe(true);
    expect(isTrustedBridgeUrl('https://www.ugcad.io/')).toBe(true);
    expect(isTrustedBridgeUrl('https://checkout.razorpay.com/')).toBe(false);
    expect(isTrustedBridgeUrl(undefined)).toBe(false);
  });
});
