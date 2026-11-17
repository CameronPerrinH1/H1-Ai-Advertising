/* H1 motion layer: scroll reveals and the card spotlight. See motion.css. */
(function () {
  window.hbMotion = true;
  var root = document.documentElement;
  var reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  var targets = [].slice.call(document.querySelectorAll('.hb-reveal, .hb-kb'));

  function showAll() {
    targets.forEach(function (el) { el.classList.add('is-in'); });
  }

  if (reduce || !('IntersectionObserver' in window)) {
    root.classList.remove('hb-js');
    showAll();
  } else {
    // Elements that enter together are staggered in DOM order, so a row of
    // cards cascades while a single item scrolled into view shows at once.
    var io = new IntersectionObserver(function (entries) {
      var n = 0;
      entries.forEach(function (e) {
        if (!e.isIntersecting) return;
        var el = e.target;
        el.style.setProperty('--hb-d', Math.min(n++, 6) * 0.09 + 's');
        el.classList.add('is-in');
        io.unobserve(el);
      });
    }, { rootMargin: '0px 0px -8% 0px', threshold: 0 });
    targets.forEach(function (el) { io.observe(el); });
  }

  // Footer glow waits until the footer itself is on screen, so it lands last.
  var glow = document.querySelector('.hb-glow-late');
  // Watch the copyright row (the very bottom), not the whole footer: on tall
  // screens the footer top is already visible alongside the CTA band.
  var foot = document.querySelector('footer');
  foot = foot && (foot.lastElementChild || foot);
  if (glow && foot) {
    if (reduce || !('IntersectionObserver' in window)) {
      glow.classList.add('is-in');
    } else {
      var gio = new IntersectionObserver(function (entries) {
        if (entries[0].isIntersecting) { glow.classList.add('is-in'); gio.disconnect(); }
      }, { threshold: 1 });
      gio.observe(foot);
    }
  }

  // Nav underlines follow the pointer: record which half it entered or left by.
  document.querySelectorAll('.hb-nav').forEach(function (a) {
    function edge(e) {
      var r = a.getBoundingClientRect();
      a.setAttribute('data-edge', e.clientX < r.left + r.width / 2 ? 'l' : 'r');
    }
    a.addEventListener('pointerenter', edge);
    a.addEventListener('pointerleave', edge);
  });

  // Sticky header frosts once the page has scrolled.
  var header = document.querySelector('.hb-header');
  if (header) {
    var onScroll = function () { header.classList.toggle('is-scrolled', window.scrollY > 8); };
    window.addEventListener('scroll', onScroll, { passive: true });
    onScroll();

    // Mobile menu: the nav doubles as the dropdown panel (see motion.css).
    var burger = header.querySelector('.hb-burger');
    var setMenu = function (open) {
      header.classList.toggle('menu-open', open);
      burger.setAttribute('aria-expanded', String(open));
      burger.setAttribute('aria-label', open ? 'Close menu' : 'Open menu');
    };
    if (burger) {
      burger.addEventListener('click', function () { setMenu(!header.classList.contains('menu-open')); });
      header.querySelectorAll('nav a').forEach(function (a) { a.addEventListener('click', function () { setMenu(false); }); });
      document.addEventListener('keydown', function (e) {
        if (e.key === 'Escape' && header.classList.contains('menu-open')) { setMenu(false); burger.focus(); }
      });
      document.addEventListener('click', function (e) {
        if (header.classList.contains('menu-open') && !header.contains(e.target)) setMenu(false);
      });
      window.matchMedia('(min-width: 960px)').addEventListener('change', function (m) { if (m.matches) setMenu(false); });
    }
  }

  // FAQ accordion: one answer open at a time, height animated both ways.
  // Built on <details>, so without JS every question still opens natively.
  var EASE = 'cubic-bezier(.16,1,.3,1)';
  document.querySelectorAll('[data-accordion]').forEach(function (group) {
    var items = [].slice.call(group.children).filter(function (el) { return el.tagName === 'DETAILS'; });

    function body(d) { return [].slice.call(d.children).filter(function (el) { return el.tagName !== 'SUMMARY'; }); }
    function closedHeight(d) {
      var cs = getComputedStyle(d);
      return d.querySelector('summary').offsetHeight + parseFloat(cs.paddingTop) + parseFloat(cs.paddingBottom) +
        parseFloat(cs.borderTopWidth) + parseFloat(cs.borderBottomWidth);
    }
    function stop(d) {
      if (d._h) { d._h.cancel(); d._h = null; }
      (d._f || []).forEach(function (a) { a.cancel(); });
      d._f = null;
    }
    function run(d, from, to, done) {
      d.style.overflow = 'hidden';
      var a = d.animate([{ height: from + 'px' }, { height: to + 'px' }],
        { duration: Math.min(650, 300 + Math.abs(to - from) * 0.5), easing: EASE });
      d._h = a;
      a.onfinish = function () { d._h = null; d.style.overflow = ''; if (done) done(); };
    }
    function open(d) {
      items.forEach(function (o) { if (o !== d && o.open && !o.classList.contains('hb-closing')) close(o); });
      var from = d.offsetHeight;
      stop(d);
      d.classList.remove('hb-closing');
      d.open = true;
      if (reduce) return;
      run(d, from, d.offsetHeight);
      d._f = body(d).map(function (el) {
        return el.animate([{ opacity: 0, transform: 'translateY(-8px)' }, { opacity: 1, transform: 'none' }],
          { duration: 500, delay: 90, easing: EASE, fill: 'backwards' });
      });
    }
    function close(d) {
      if (reduce) { d.open = false; return; }
      var from = d.offsetHeight;
      stop(d);
      d.classList.add('hb-closing');
      run(d, from, closedHeight(d), function () {
        stop(d);
        d.open = false;
        d.classList.remove('hb-closing');
      });
      d._f = body(d).map(function (el) {
        return el.animate([{ opacity: 1 }, { opacity: 0 }], { duration: 220, easing: 'ease', fill: 'forwards' });
      });
    }

    items.forEach(function (d) {
      d.querySelector('summary').addEventListener('click', function (e) {
        e.preventDefault();
        if (d.open && !d.classList.contains('hb-closing')) close(d); else open(d);
      });
    });
  });

  // Cursor-following glow on .hb-spot cards (pointer devices only).
  if (window.matchMedia('(hover: hover)').matches) {
    document.querySelectorAll('.hb-spot').forEach(function (card) {
      card.addEventListener('pointermove', function (e) {
        var r = card.getBoundingClientRect();
        card.style.setProperty('--mx', (e.clientX - r.left) + 'px');
        card.style.setProperty('--my', (e.clientY - r.top) + 'px');
      });
    });
  }
})();
