// Progressive enhancement only. The pages work without this script.
// Loaded at the top of <body> without defer, so the first block can mark the page before it
// paints; everything that touches the DOM waits for DOMContentLoaded.
//
// 1. Home intro: plays once per browser session, on the home page only, when motion is allowed.
//    Click, tap or Esc skips it. Only transform, opacity and filter are animated.
// 2. Scroll progress: one scroll listener, updated once per animation frame, using transform.
// 3. Entrance animations: IntersectionObserver adds .is-visible to .reveal elements, with a stagger.
// 4. Hero glows: their CSS drift is paused while the hero is off screen or the tab is hidden.
// Under prefers-reduced-motion the intro is skipped, the progress bar stays a plain bar and every
// element is shown at once.
(function () {
  var root = document.documentElement;
  root.classList.remove('no-js');
  root.classList.add('js');

  var reduce = !!(window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches);
  var INTRO_KEY = 'syzygy-intro-played';

  function introAlreadyPlayed() {
    try { return window.sessionStorage.getItem(INTRO_KEY) === '1'; } catch (e) { return true; }
  }
  function markIntroPlayed() {
    try { window.sessionStorage.setItem(INTRO_KEY, '1'); } catch (e) { /* storage unavailable */ }
  }

  var isHome = document.body && document.body.getAttribute('data-page') === 'Home';
  var canAnimate = typeof Element !== 'undefined' && typeof Element.prototype.animate === 'function';
  var playIntro = isHome && !reduce && canAnimate && !introAlreadyPlayed();
  if (playIntro) root.classList.add('intro-pending');

  // Stage durations in milliseconds. Total: 200 + 1400 + 1200 + 1000 + 700 + 500 + 1200 + 800 = 7000.
  var T = { blank: 200, glow: 1400, sharpen: 1200, converge: 1000, slide: 700, tagIn: 500, hold: 1200, land: 800 };
  var START = {};
  START.glow = T.blank;
  START.sharpen = START.glow + T.glow;
  START.converge = START.sharpen + T.sharpen;
  START.slide = START.converge + T.converge;
  START.tagIn = START.slide + T.slide;
  START.land = START.tagIn + T.tagIn + T.hold;
  var TOTAL = START.land + T.land;
  // The timeline starts after the fonts (at most FONT_WAIT) and one frame (at most FRAME_WAIT).
  // The failsafe shows the site FAILSAFE_MARGIN after the latest possible end, and is re-armed
  // when the timeline actually starts, so it can never cut the intro short.
  var FONT_WAIT = 400;
  var FRAME_WAIT = 60;
  var FAILSAFE_MARGIN = 1000;
  var FAILSAFE = FONT_WAIT + FRAME_WAIT + TOTAL + FAILSAFE_MARGIN;

  function onReady(fn) {
    if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', fn);
    else fn();
  }

  function setupStagger() {
    document.querySelectorAll('[data-stagger]').forEach(function (group) {
      Array.prototype.forEach.call(group.children, function (child, i) {
        child.style.setProperty('--delay', (i * 80) + 'ms');
      });
    });
  }

  function setupProgress() {
    var bar = document.querySelector('.scroll-progress');
    if (!bar) return;
    var frame = 0;
    var update = function () {
      frame = 0;
      var max = document.documentElement.scrollHeight - window.innerHeight;
      var p = max > 0 ? Math.min(1, Math.max(0, window.scrollY / max)) : 0;
      bar.style.transform = 'scaleX(' + p + ')';
    };
    var request = function () {
      if (!frame) frame = window.requestAnimationFrame(update);
    };
    window.addEventListener('scroll', request, { passive: true });
    window.addEventListener('resize', request);
    update();
  }

  function setupReveal() {
    var items = document.querySelectorAll('.reveal');
    if (reduce || !('IntersectionObserver' in window)) {
      Array.prototype.forEach.call(items, function (el) { el.classList.add('is-visible'); });
      return;
    }
    var observer = new IntersectionObserver(function (entries) {
      entries.forEach(function (entry) {
        if (entry.isIntersecting) {
          entry.target.classList.add('is-visible');
          observer.unobserve(entry.target);
        }
      });
    }, { threshold: 0.12, rootMargin: '0px 0px -40px 0px' });
    Array.prototype.forEach.call(items, function (el) { observer.observe(el); });
  }

  // ---- Home intro ----
  function runIntro(done) {
    var overlay = document.querySelector('.intro');
    if (!overlay) { root.classList.remove('intro-pending'); done(); return; }
    var bg = overlay.querySelector('.intro-bg');
    var logoWrap = overlay.querySelector('.intro-logo-wrap');
    var logo = overlay.querySelector('.intro-logo');
    var rings = overlay.querySelectorAll('.intro-ring');
    var text = overlay.querySelector('.intro-text');
    var wordWrap = overlay.querySelector('.intro-word-wrap');
    var word = overlay.querySelector('.intro-word');
    var tag = overlay.querySelector('.intro-tag');
    var headerLogo = document.querySelector('.site-header .brand img');
    var headerWord = document.querySelector('.site-header .brand span');

    markIntroPlayed();

    // Lock scrolling while the intro plays; restore the previous values afterwards.
    var prevHtmlOverflow = root.style.overflow;
    var prevBodyOverflow = document.body.style.overflow;
    root.style.overflow = 'hidden';
    document.body.style.overflow = 'hidden';

    var timers = [];
    var finished = false;
    var ease = 'cubic-bezier(0.22, 1, 0.36, 1)';
    // fill 'both' only for an element's first animation; later stages use 'forwards' so their
    // starting keyframe does not override the earlier stages while they wait for their delay.
    function anim(el, frames, delay, duration, fill) {
      return el.animate(frames, { delay: delay, duration: duration, easing: ease, fill: fill || 'both' });
    }

    function onKey(e) { if (e.key === 'Escape' || e.key === 'Esc') finish(); }
    function finish() {
      if (finished) return;
      finished = true;
      timers.forEach(clearTimeout);
      window.removeEventListener('pointerdown', finish);
      window.removeEventListener('click', finish);
      window.removeEventListener('keydown', onKey);
      overlay.getAnimations({ subtree: true }).forEach(function (a) { a.cancel(); });
      root.classList.remove('intro-pending'); // header shows at once; main and footer fade in
      if (overlay.parentNode) overlay.parentNode.removeChild(overlay);
      root.style.overflow = prevHtmlOverflow;
      document.body.style.overflow = prevBodyOverflow;
      done();
    }
    window.addEventListener('pointerdown', finish);
    window.addEventListener('click', finish);
    window.addEventListener('keydown', onKey);

    // Start the timeline once the web fonts are ready (at most 400 ms) and the overlay has been
    // laid out, so the measurements below use the final wordmark and tagline widths. The overlay
    // already shows the plain page background while it waits, which is stage 1.
    var fontsReady = document.fonts && document.fonts.ready ? document.fonts.ready : Promise.resolve();
    var started = false;
    function go() {
      if (started || finished) return;
      started = true;
      start();
    }
    Promise.race([fontsReady, new Promise(function (resolve) { timers.push(setTimeout(resolve, FONT_WAIT)); })])
      .then(function () {
        // Whichever comes first: the next frame (layout is current) or a short timer, so a tab
        // that does not paint frames still starts and finishes the intro.
        window.requestAnimationFrame(go);
        timers.push(setTimeout(go, FRAME_WAIT));
      });
    // Failsafe: whatever happens, the site is shown shortly after the longest possible intro.
    var failsafe = setTimeout(finish, FAILSAFE);
    timers.push(failsafe);

    function start() {
    // Re-arm the failsafe from the real start time, so a late start never cuts the intro short.
    clearTimeout(failsafe);
    timers.push(setTimeout(finish, TOTAL + FAILSAFE_MARGIN));
    // Before the slide, the logo sits alone in the centre: shift it right by half of the text
    // block's width plus the gap, so the group is centred on the logo.
    var gap = parseFloat(getComputedStyle(text.parentNode).columnGap) || 0;
    var centreShift = (text.getBoundingClientRect().width + gap) / 2;

    // Stage 2: three soft points of light, spread apart, one per ring colour.
    // Stage 3: they sharpen into clear rings. Stage 4: they move together into the logo.
    var spread = [-1, 0, 1];
    Array.prototype.forEach.call(rings, function (ring, i) {
      var dx = spread[i] * 85; // percent of the logo width
      anim(ring, [
        { opacity: 0, transform: 'translate(' + dx + '%, 0) scale(0.35)', filter: 'blur(22px)' },
        { opacity: 1, transform: 'translate(' + dx + '%, 0) scale(0.45)', filter: 'blur(18px)' },
      ], START.glow + i * 90, T.glow - 180);
      anim(ring, [
        { opacity: 1, transform: 'translate(' + dx + '%, 0) scale(0.45)', filter: 'blur(18px)' },
        { opacity: 1, transform: 'translate(' + dx + '%, 0) scale(1)', filter: 'blur(0px)' },
      ], START.sharpen, T.sharpen, 'forwards');
      anim(ring, [
        { opacity: 1, transform: 'translate(' + dx + '%, 0) scale(1)', filter: 'blur(0px)' },
        { opacity: 1, transform: 'translate(0, 0) scale(1)', filter: 'blur(0px)' },
      ], START.converge, T.converge, 'forwards');
    });

    // Stage 5: the logo slides left and the wordmark appears beside it.
    anim(logo, [
      { transform: 'translateX(' + centreShift + 'px)' },
      { transform: 'translateX(0)' },
    ], START.slide, T.slide);
    anim(word, [
      { opacity: 0, transform: 'translateX(-12px)' },
      { opacity: 1, transform: 'translateX(0)' },
    ], START.slide + 120, T.slide - 120);

    // Stage 6: the tagline appears below the wordmark and holds.
    anim(tag, [
      { opacity: 0, transform: 'translateY(6px)' },
      { opacity: 1, transform: 'translateY(0)' },
    ], START.tagIn, T.tagIn);

    // Stage 7: measure the header logo and wordmark now, at run time, and move the logo and
    // wordmark onto them. The tagline fades out and the overlay background fades away.
    timers.push(setTimeout(function () {
      if (finished) return;
      anim(tag, [{ opacity: 1 }, { opacity: 0 }], 0, 200);
      anim(bg, [{ opacity: 1 }, { opacity: 0 }], 0, T.land);
      [[logoWrap, headerLogo], [wordWrap, headerWord]].forEach(function (pair) {
        var el = pair[0];
        var target = pair[1];
        if (!target) { anim(el, [{ opacity: 1 }, { opacity: 0 }], 0, T.land); return; }
        var from = el.getBoundingClientRect();
        var to = target.getBoundingClientRect();
        var s = from.width > 0 ? to.width / from.width : 1;
        anim(el, [
          { transform: 'translate(0, 0) scale(1)' },
          { transform: 'translate(' + (to.left - from.left) + 'px, ' + (to.top - from.top) + 'px) scale(' + s + ')' },
        ], 0, T.land);
      });
    }, START.land));

    timers.push(setTimeout(finish, TOTAL));
    }
  }

  // ---- Living hero background ----
  // The three glows drift with CSS animations (transform and opacity only). Pause them while the
  // hero is off screen or the tab is hidden, and resume when it returns. Under reduced motion the
  // stylesheet shows them still, so there is nothing to do here.
  function setupHeroGlows() {
    var hero = document.querySelector('.hero');
    if (!hero || !hero.querySelector('.hero-glow') || reduce) return;
    var onScreen = true;
    var update = function () {
      hero.classList.toggle('glows-paused', !onScreen || document.hidden);
    };
    if ('IntersectionObserver' in window) {
      new IntersectionObserver(function (entries) {
        onScreen = entries[entries.length - 1].isIntersecting;
        update();
      }).observe(hero);
    }
    document.addEventListener('visibilitychange', update);
    update();
  }

  onReady(function () {
    setupStagger();
    setupProgress();
    setupHeroGlows();
    if (playIntro) {
      runIntro(setupReveal);
    } else {
      setupReveal();
    }
  });

  // Exposed for verification only: the computed stage start times and total duration.
  window.SyzygyIntroTiming = { stages: T, starts: START, total: TOTAL, failsafe: FAILSAFE, failsafeAfterStart: TOTAL + FAILSAFE_MARGIN };
})();
