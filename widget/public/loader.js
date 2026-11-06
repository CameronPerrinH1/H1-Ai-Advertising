/*
 * Concierge loader: the one script tag a client's site adds.
 *   <script src="https://chat.example.com/loader.js" async></script>
 * Optional markup:
 *   <div data-concierge-inline data-height="620"></div>   inline chat section
 *   <a data-concierge-open data-concierge-question="How much is Botox?">Ask about Botox</a>
 *   data-launcher="true" data-launcher-label="Chat with Ava" on the script tag for a launcher button
 *
 * The chat runs in an iframe from the chat. origin. Nothing passes between the iframe and this
 * page except UI events (open, close, refresh); the session lives in the iframe (D30, D53).
 */
(function () {
  if (window.__conciergeLoaded) return;
  window.__conciergeLoaded = true;

  var script = document.currentScript;
  if (!script) return;
  var origin = new URL(script.src).origin;
  var page = location.pathname;
  var inlineFrames = [];
  var overlay = null;
  var lastTrigger = null;
  var launcher = null;

  function frameUrl(mode, question) {
    var u = new URL('/', origin);
    u.searchParams.set('mode', mode);
    u.searchParams.set('page', page);
    if (question) u.searchParams.set('q', question.slice(0, 200));
    return u.toString();
  }

  function makeFrame(src, title) {
    var f = document.createElement('iframe');
    f.src = src;
    f.title = title;
    f.setAttribute('referrerpolicy', 'no-referrer');
    // "Save as image" hands the picture to the phone's share sheet; the image never leaves the device (D63).
    f.setAttribute('allow', 'web-share');
    f.style.border = '0';
    f.style.display = 'block';
    f.style.background = 'transparent';
    f.style.colorScheme = 'normal';
    return f;
  }

  function mountInline(el) {
    if (el.__conciergeMounted) return;
    el.__conciergeMounted = true;
    var f = makeFrame(frameUrl('inline'), 'Chat with our virtual concierge');
    f.style.width = '100%';
    f.style.height = (parseInt(el.getAttribute('data-height'), 10) || 620) + 'px';
    f.style.borderRadius = '20px';
    el.appendChild(f);
    inlineFrames.push(f);
  }

  function open(question, trigger) {
    if (overlay) return;
    lastTrigger = trigger || document.activeElement;
    overlay = document.createElement('div');
    overlay.setAttribute('role', 'dialog');
    overlay.setAttribute('aria-modal', 'true');
    overlay.setAttribute('aria-label', 'Virtual concierge');
    var s = overlay.style;
    s.position = 'fixed';
    s.inset = '0';
    s.zIndex = '2147483646';
    s.background = 'rgba(28, 22, 20, 0.28)';
    s.opacity = '0';
    s.transition = 'opacity .25s ease';
    var f = makeFrame(frameUrl('fullscreen', question), 'Chat with our virtual concierge');
    f.style.position = 'absolute';
    f.style.inset = '0';
    f.style.width = '100%';
    f.style.height = '100%';
    overlay.appendChild(f);
    document.body.appendChild(overlay);
    document.documentElement.style.overflow = 'hidden';
    if (launcher) launcher.style.display = 'none';
    requestAnimationFrame(function () {
      overlay.style.opacity = '1';
    });
    f.addEventListener('load', function () {
      f.focus();
    });
  }

  function close() {
    if (!overlay) return;
    overlay.remove();
    overlay = null;
    document.documentElement.style.overflow = '';
    if (launcher) launcher.style.display = '';
    // Inline frames reload the conversation so it continues where full screen left off.
    inlineFrames.forEach(function (f) {
      if (f.contentWindow) f.contentWindow.postMessage({ type: 'concierge:refresh' }, origin);
    });
    if (lastTrigger && typeof lastTrigger.focus === 'function') lastTrigger.focus();
  }

  window.addEventListener('message', function (e) {
    if (e.origin !== origin || !e.data || typeof e.data.type !== 'string') return;
    if (e.data.type === 'concierge:close') close();
    if (e.data.type === 'concierge:open') open('', null);
  });

  document.addEventListener('click', function (e) {
    var t = e.target && e.target.closest ? e.target.closest('[data-concierge-open]') : null;
    if (!t) return;
    e.preventDefault();
    open(t.getAttribute('data-concierge-question') || '', t);
  });

  function addLauncher() {
    if (script.getAttribute('data-launcher') !== 'true') return;
    launcher = document.createElement('button');
    launcher.type = 'button';
    launcher.textContent = script.getAttribute('data-launcher-label') || 'Chat with us';
    var s = launcher.style;
    s.position = 'fixed';
    s.right = '20px';
    s.bottom = '20px';
    s.zIndex = '2147483645';
    s.padding = '14px 20px';
    s.border = '0';
    s.borderRadius = '999px';
    s.background = script.getAttribute('data-color') || '#2f2a28';
    s.color = '#fff';
    s.font = '600 15px/1 -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif';
    s.boxShadow = '0 10px 30px rgba(0,0,0,.18)';
    s.cursor = 'pointer';
    launcher.addEventListener('click', function () {
      open('', launcher);
    });
    document.body.appendChild(launcher);
  }

  // Inline chats load once the page is idle, so they never compete with the client's own page
  // (build plan 9.6). Native iframe lazy-loading proved unreliable in some embedded browsers.
  function whenIdle(fn) {
    var run = function () {
      if ('requestIdleCallback' in window) window.requestIdleCallback(fn, { timeout: 2000 });
      else setTimeout(fn, 200);
    };
    if (document.readyState === 'complete') run();
    else window.addEventListener('load', run, { once: true });
  }

  function init() {
    addLauncher();
    whenIdle(function () {
      document.querySelectorAll('[data-concierge-inline]').forEach(mountInline);
    });
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init);
  else init();
})();
