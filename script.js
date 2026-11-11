(function () {
  var root = document.documentElement;
  root.classList.add('js');
  var reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  var canHover = window.matchMedia('(hover: hover)').matches;

  // ----- Mobile menu -----
  var menuBtn = document.getElementById('menu-toggle');
  var links = document.getElementById('nav-links');
  function setMenu(open) {
    links.classList.toggle('open', open);
    menuBtn.setAttribute('aria-expanded', String(open));
    menuBtn.setAttribute('aria-label', open ? 'Close menu' : 'Open menu');
  }
  menuBtn.addEventListener('click', function () { setMenu(!links.classList.contains('open')); });
  links.addEventListener('click', function (e) { if (e.target.tagName === 'A') setMenu(false); });
  document.addEventListener('keydown', function (e) { if (e.key === 'Escape') setMenu(false); });

  // ----- Footer year -----
  document.getElementById('year').textContent = new Date().getFullYear();

  // ----- Scroll progress bar -----
  var bar = document.querySelector('.progress');
  var ticking = false;
  function updateProgress() {
    var max = document.documentElement.scrollHeight - window.innerHeight;
    bar.style.setProperty('--p', max > 0 ? (window.scrollY / max).toFixed(4) : 0);
    ticking = false;
  }
  window.addEventListener('scroll', function () {
    if (!ticking) { ticking = true; requestAnimationFrame(updateProgress); }
  }, { passive: true });
  updateProgress();

  // ----- Cursor-following glow on cards -----
  if (canHover) {
    document.querySelectorAll('.card').forEach(function (card) {
      card.addEventListener('pointermove', function (e) {
        var r = card.getBoundingClientRect();
        card.style.setProperty('--mx', (e.clientX - r.left) + 'px');
        card.style.setProperty('--my', (e.clientY - r.top) + 'px');
      });
      card.addEventListener('pointerleave', function () {
        card.style.removeProperty('--mx');
        card.style.removeProperty('--my');
      });
    });
  }

  // ----- Terminal tilts toward the cursor -----
  var tilt = document.querySelector('.tilt');
  var heroGrid = document.querySelector('.hero-grid');
  if (tilt && heroGrid && canHover && !reduceMotion) {
    heroGrid.addEventListener('pointermove', function (e) {
      var r = tilt.getBoundingClientRect();
      var dx = (e.clientX - (r.left + r.width / 2)) / window.innerWidth;
      var dy = (e.clientY - (r.top + r.height / 2)) / window.innerHeight;
      tilt.style.setProperty('--ry', (dx * 14).toFixed(2) + 'deg');
      tilt.style.setProperty('--rx', (-dy * 14).toFixed(2) + 'deg');
    });
    heroGrid.addEventListener('pointerleave', function () {
      tilt.style.removeProperty('--rx');
      tilt.style.removeProperty('--ry');
    });
  }

  // ----- Pipeline: select a stage (runs through the stages by itself until touched) -----
  var pipe = document.querySelector('.pipe');
  var stageItems = Array.prototype.slice.call(document.querySelectorAll('.pipeline .stage'));
  var detail = document.getElementById('stage-detail');
  var sdKicker = document.getElementById('sd-kicker');
  var sdTitle = document.getElementById('sd-title');
  var sdDesc = document.getElementById('sd-desc');
  var sdTools = document.getElementById('sd-tools');
  var current = 0;
  var autoTimer = null;

  function selectStage(i) {
    current = i;
    stageItems.forEach(function (li, n) {
      li.classList.toggle('active', n === i);
      li.classList.toggle('done', n < i);
      li.querySelector('.stage-btn').setAttribute('aria-pressed', String(n === i));
    });
    var d = stageItems[i].querySelector('.stage-btn').dataset;
    sdKicker.textContent = d.kicker;
    sdTitle.textContent = d.title;
    sdDesc.textContent = d.desc;
    sdTools.textContent = '';
    d.tools.split(',').forEach(function (t) {
      var li = document.createElement('li');
      li.textContent = t;
      sdTools.appendChild(li);
    });
    detail.classList.remove('swap');
    void detail.offsetWidth; // restart the entrance animation
    detail.classList.add('swap');
  }
  function stopAuto() {
    if (autoTimer) { clearInterval(autoTimer); autoTimer = null; }
  }
  function startAuto() {
    if (autoTimer || reduceMotion) return;
    autoTimer = setInterval(function () {
      selectStage((current + 1) % stageItems.length);
    }, 2600);
  }
  var userTookOver = false;
  function takeOver() {
    userTookOver = true;
    stopAuto();
    detail.setAttribute('aria-live', 'polite'); // announce changes only once the visitor is driving
  }
  stageItems.forEach(function (li, i) {
    li.querySelector('.stage-btn').addEventListener('click', function () {
      takeOver();
      selectStage(i);
    });
  });
  if (pipe) {
    pipe.addEventListener('focusin', takeOver);
    pipe.addEventListener('pointerenter', stopAuto);
    pipe.addEventListener('pointerleave', function () { if (!userTookOver) startAuto(); });
  }

  // ----- Skill filters -----
  var filterBtns = document.querySelectorAll('.filters button');
  var skillCards = document.querySelectorAll('.skill-group');
  filterBtns.forEach(function (btn) {
    btn.addEventListener('click', function () {
      var f = btn.dataset.filter;
      filterBtns.forEach(function (b) { b.setAttribute('aria-pressed', String(b === btn)); });
      skillCards.forEach(function (c) {
        c.hidden = !(f === 'all' || c.dataset.cat === f);
        c.classList.add('in');
      });
    });
  });

  // ----- Copy email -----
  var toast = document.getElementById('toast');
  var toastTimer;
  function showToast(msg) {
    toast.textContent = msg;
    toast.classList.add('show');
    clearTimeout(toastTimer);
    toastTimer = setTimeout(function () { toast.classList.remove('show'); }, 2600);
  }
  var copyBtn = document.getElementById('copy-email');
  copyBtn.addEventListener('click', function () {
    var email = copyBtn.dataset.email;
    function ok() { showToast('✓ Email copied: ' + email); }
    function fail() { showToast('Could not copy. Email: ' + email); }
    if (navigator.clipboard && navigator.clipboard.writeText) {
      navigator.clipboard.writeText(email).then(ok, fail);
    } else {
      fail();
    }
  });

  // ----- Scroll reveal, pipeline auto-run, active nav link -----
  var revealEls = document.querySelectorAll('.reveal');
  if (!('IntersectionObserver' in window)) {
    revealEls.forEach(function (el) { el.classList.add('in'); });
    return;
  }
  var revealObs = new IntersectionObserver(function (entries) {
    entries.forEach(function (entry) {
      if (entry.isIntersecting) {
        entry.target.classList.add('in');
        revealObs.unobserve(entry.target);
      }
    });
  }, { threshold: 0.12 });
  revealEls.forEach(function (el) { revealObs.observe(el); });

  if (pipe) {
    new IntersectionObserver(function (entries) {
      if (entries[0].isIntersecting && !userTookOver) startAuto();
      else stopAuto();
    }, { threshold: 0.4 }).observe(pipe);
  }

  var navLinks = document.querySelectorAll('.nav-links a');
  var navObs = new IntersectionObserver(function (entries) {
    entries.forEach(function (entry) {
      if (!entry.isIntersecting) return;
      navLinks.forEach(function (a) {
        a.classList.toggle('active', a.getAttribute('href') === '#' + entry.target.id);
      });
    });
  }, { rootMargin: '-45% 0px -50% 0px' });
  document.querySelectorAll('main section[id]').forEach(function (s) {
    if (s.id !== 'top') navObs.observe(s);
  });
})();
