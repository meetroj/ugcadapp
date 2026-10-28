/**
 * iOS keeps the marketing landing page out of the app. The native load filter sees full page loads
 * only; the website is a single-page app, so its in-page links to "/" (the login screen's
 * "Back to home" button, logout) need a guard inside the page as well.
 */
import { APP_ENTRY_PATH } from '../config';

/** True for the site root ("/", "/?x", "/#x"): the landing page. */
export const isLandingPath = (path: string): boolean =>
  path === '/' || path.startsWith('/?') || path.startsWith('/#');

/**
 * Injected before the page loads (iOS only): in-page navigation to "/" lands on the entry screen
 * instead, and the login screen's "Back to home" button (.ap-back) is hidden.
 */
export const LANDING_GUARD_JS = `(function(){
var ENTRY=${JSON.stringify(APP_ENTRY_PATH)};
function landing(u){try{var x=new URL(u,location.href);return x.origin===location.origin&&x.pathname==='/';}catch(e){return false;}}
['pushState','replaceState'].forEach(function(k){
var orig=history[k];
history[k]=function(s,t,u){return orig.call(this,s,t,u!=null&&landing(u)?ENTRY:u);};
});
var css=document.createElement('style');
css.textContent='.ap-back{display:none!important}';
document.documentElement.appendChild(css);
})();`;
