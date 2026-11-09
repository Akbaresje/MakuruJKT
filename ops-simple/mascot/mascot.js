/* ============================================================
   makuru. mascot — behaviour
   - eyes follow the pointer, then wander on their own when idle
   - random blinks (sometimes a double blink)
   - click: squash + hop + happy mouth
   - one shared rAF loop for every mascot on the page
   No dependencies. Exposes window.MakuruMascot.
   ============================================================ */
(function (w) {
  'use strict';

  var SVG = [
    '<svg class="mk-svg" viewBox="0 0 200 200" aria-hidden="true" focusable="false">',
      '<g class="mk-steam">',
        '<path class="mk-puff mk-puff--a" d="M93 31 C89 22 99 18 93 7" stroke-width="2.5"/>',
        '<path class="mk-puff mk-puff--b" d="M108 31 C104 23 114 18 109 9"/>',
      '</g>',
      '<g class="mk-feet">',
        '<path d="M82 168 L82 180 C82 184 76 185 71 185 C64 185 64 180 71 180 L82 180"/>',
        '<path d="M118 168 L118 180 C118 184 124 185 129 185 C136 185 136 180 129 180 L118 180"/>',
      '</g>',
      '<g class="mk-arm mk-arm--l"><path d="M42 125 C30 128 26 136 29 144 C31 149 39 148 44 142"/></g>',
      '<g class="mk-arm mk-arm--r"><path d="M158 125 C170 128 174 136 171 144 C169 149 161 148 156 142"/></g>',
      '<path class="mk-body" d="M100 36 C125 36 168 62 172 112 C176 156 142 170 100 170 C58 170 24 156 28 112 C32 62 75 36 100 36 Z"/>',
      '<g class="mk-crown">',
        '<path class="mk-topknot" d="M96 38 C94 25 102 21 106 28 C108 34 100 36 98 42"/>',
        '<path class="mk-pleat" d="M84 46 C77 56 74 68 72 78 M94 45 C92 56 90 68 89 80 M106 45 C108 56 110 68 111 80 M116 46 C123 56 126 68 128 78"/>',
      '</g>',
      '<ellipse class="mk-blush" cx="61" cy="128" rx="10" ry="5.5"/>',
      '<ellipse class="mk-blush" cx="139" cy="128" rx="10" ry="5.5"/>',
      '<g class="mk-mouths">',
        '<path class="mk-mouth" d="M91 123 C91 134 109 134 109 123 Z"/>',
        '<path class="mk-mouth-happy" d="M88 121 C88 141 112 141 112 121 Z"/>',
      '</g>',
      '<g class="mk-eye mk-eye--l">',
        '<circle class="mk-eye-white" cx="75" cy="114" r="8.5"/>',
        '<g class="mk-pupil"><circle cx="75" cy="114" r="6"/><circle class="mk-glint" cx="73" cy="112" r="1.8"/></g>',
      '</g>',
      '<g class="mk-eye mk-eye--r">',
        '<circle class="mk-eye-white" cx="125" cy="114" r="8.5"/>',
        '<g class="mk-pupil"><circle cx="125" cy="114" r="6"/><circle class="mk-glint" cx="123" cy="112" r="1.8"/></g>',
      '</g>',
    '</svg>'
  ].join('');

  var CALM = !!(window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches);
  var POINTER = { x: -9999, y: -9999, moved: 0, active: false };
  var INSTANCES = [];
  var LOOPING = false;

  addEventListener('pointermove', function (e) {
    POINTER.x = e.clientX; POINTER.y = e.clientY;
    POINTER.active = true; POINTER.moved = performance.now();
  }, { passive: true });
  addEventListener('pointerleave', function () { POINTER.active = false; });

  function rand(a, b) { return a + Math.random() * (b - a); }
  function clamp(v, a, b) { return v < a ? a : (v > b ? b : v); }

  function Mascot(host, opts) {
    var self = this;
    this.o = {
      size: 120, fixed: false, follow: !CALM, blink: true, steam: true,
      bob: true, react: !CALM, bubble: '', greet: 0, label: 'makuru mascot'
    };
    Object.keys(opts || {}).forEach(function (k) { if (k in self.o) self.o[k] = opts[k]; });

    var el = document.createElement('div');
    el.className = 'mk' + (this.o.fixed ? ' mk--fixed' : ' mk--inline');
    el.style.setProperty('--mk-size', this.o.size + 'px');
    el.innerHTML = '<div class="mk-shadow" aria-hidden="true"></div>' +
      '<div class="mk-hop"><div class="mk-tilt"><div class="mk-bob"><div class="mk-squash">' + SVG + '</div></div></div></div>' +
      '<button class="mk-hit" type="button" aria-label="' + this.o.label + '"></button>' +
      '<div class="mk-bubble" role="status" aria-live="polite"></div>';
    (host || document.body).appendChild(el);

    this.el = el;
    this.pupils = el.querySelectorAll('.mk-pupil');
    this.hit = el.querySelector('.mk-hit');
    this.bubbleEl = el.querySelector('.mk-bubble');
    this.lx = 0; this.ly = 0;      // current pupil offset
    this.tx = 0; this.ty = 0;      // wanted offset
    this.tilt = 0; this.tiltT = 0;
    this.wanderAt = 0;
    this.apply(opts || {});

    this.hit.addEventListener('click', function () { self.cheer(); });
    this.hit.addEventListener('pointerenter', function () { self.wave(); });

    this.blinkTimer = setTimeout(function () { self.blinkLoop(); }, rand(1400, 3200));
    INSTANCES.push(this);
    start();
    if (this.o.greet && this.o.bubble) {
      setTimeout(function () { self.say(self.o.bubble, self.o.greet); }, 1200);
    }
  }

  Mascot.prototype.apply = function (o) {
    var el = this.el;
    if ('size' in o) { this.o.size = o.size; el.style.setProperty('--mk-size', o.size + 'px'); }
    if ('follow' in o) this.o.follow = CALM ? false : o.follow;
    if ('steam' in o) { this.o.steam = o.steam; el.classList.toggle('no-steam', !o.steam); }
    if ('bob' in o) { this.o.bob = o.bob; el.classList.toggle('no-bob', !o.bob); }
    if ('blink' in o) { this.o.blink = o.blink; el.classList.toggle('no-blink', !o.blink); }
    if ('react' in o) this.o.react = o.react;
    if ('bubble' in o) this.o.bubble = o.bubble;
    if ('fixed' in o) {
      this.o.fixed = !!o.fixed;
      el.classList.toggle('mk--fixed', this.o.fixed);
      el.classList.toggle('mk--inline', !this.o.fixed);
    }
  };

  /* ---------- eye loop ---------- */
  Mascot.prototype.step = function (now) {
    var box = this.el.getBoundingClientRect();
    if (!box.width) return;
    var cx = box.left + box.width / 2;
    var cy = box.top + box.height * 0.58;
    var dx, dy;

    if (this.o.follow && POINTER.active && now - POINTER.moved < 2600) {
      dx = POINTER.x - cx;
      dy = POINTER.y - cy;
    } else {
      if (now > this.wanderAt) {
        this.wanderAt = now + rand(1700, 3400);
        this.wx = rand(-1, 1);
        this.wy = rand(-.6, .9);
      }
      dx = (this.wx || 0) * 300;
      dy = (this.wy || 0) * 300;
    }

    var d = Math.max(1, Math.hypot(dx, dy));
    var reach = Math.min(d / 190, 1) * 3.4;
    this.tx = dx / d * reach;
    this.ty = dy / d * reach;
    this.lx += (this.tx - this.lx) * 0.18;
    this.ly += (this.ty - this.ly) * 0.18;

    var tr = 'translate(' + this.lx.toFixed(2) + 'px,' + this.ly.toFixed(2) + 'px)';
    this.pupils[0].style.transform = tr;
    this.pupils[1].style.transform = tr;

    this.tiltT = clamp((POINTER.active ? dx : this.tx * 60) / 900, -1, 1) * 4.5;
    this.tilt += (this.tiltT - this.tilt) * 0.09;
    this.el.querySelector('.mk-tilt').style.transform = 'rotate(' + this.tilt.toFixed(2) + 'deg)';
  };

  /* ---------- blink ---------- */
  Mascot.prototype.blink = function () {
    var self = this;
    if (!this.o.blink) return;
    this.el.classList.add('is-blink');
    setTimeout(function () { self.el.classList.remove('is-blink'); }, 120);
    if (Math.random() < 0.22) {
      setTimeout(function () {
        self.el.classList.add('is-blink');
        setTimeout(function () { self.el.classList.remove('is-blink'); }, 110);
      }, 240);
    }
  };
  Mascot.prototype.blinkLoop = function () {
    var self = this;
    this.blink();
    this.blinkTimer = setTimeout(function () { self.blinkLoop(); }, rand(2400, 5600));
  };

  /* ---------- reactions ---------- */
  Mascot.prototype.cheer = function () {
    var el = this.el;
    if (CALM) { el.classList.add('is-happy'); setTimeout(function () { el.classList.remove('is-happy'); }, 1400); return; }
    if (!this.o.react) return;
    el.classList.add('is-squash', 'is-happy');
    setTimeout(function () {
      el.classList.remove('is-squash');
      el.classList.add('is-hop');
    }, 90);
    setTimeout(function () { el.classList.remove('is-hop'); }, 760);
    setTimeout(function () { el.classList.remove('is-happy'); }, 1100);
  };
  Mascot.prototype.hop = function () {
    var el = this.el;
    if (CALM) return;
    el.classList.add('is-hop');
    setTimeout(function () { el.classList.remove('is-hop'); }, 760);
  };
  Mascot.prototype.wave = function () {
    var el = this.el;
    if (CALM) return;
    el.classList.add('is-wave', 'is-happy');
    setTimeout(function () { el.classList.remove('is-wave'); }, 1900);
    setTimeout(function () { el.classList.remove('is-happy'); }, 1100);
  };
  Mascot.prototype.wiggle = function () {
    var el = this.el;
    if (CALM) return;
    el.classList.add('is-wiggle');
    setTimeout(function () { el.classList.remove('is-wiggle'); }, 740);
  };
  Mascot.prototype.say = function (text, ms) {
    var el = this.el;
    this.bubbleEl.textContent = text || '';
    if (!text) { el.classList.remove('is-talking'); return; }
    el.classList.add('is-talking');
    var bub = this.bubbleEl;
    requestAnimationFrame(function () {
      bub.style.setProperty('--shift', '0px');
      var b = bub.getBoundingClientRect();
      var shift = 0;
      if (b.right > innerWidth - 10) shift = (innerWidth - 10) - b.right;
      else if (b.left < 10) shift = 10 - b.left;
      bub.style.setProperty('--shift', shift.toFixed(1) + 'px');
    });
    clearTimeout(this.sayTimer);
    var self = this;
    this.sayTimer = setTimeout(function () { el.classList.remove('is-talking'); }, ms || 2600);
  };
  Mascot.prototype.show = function (on) {
    this.el.style.display = on === false ? 'none' : '';
  };
  Mascot.prototype.destroy = function () {
    clearTimeout(this.blinkTimer);
    clearTimeout(this.sayTimer);
    this.el.remove();
    INSTANCES = INSTANCES.filter(function (m) { return m !== this; }, this);
  };

  function tick(now) {
    if (document.hidden) { requestAnimationFrame(tick); return; }
    for (var i = 0; i < INSTANCES.length; i++) INSTANCES[i].step(now);
    if (INSTANCES.length) requestAnimationFrame(tick);
    else LOOPING = false;
  }
  function start() {
    if (LOOPING) return;
    LOOPING = true;
    requestAnimationFrame(tick);
  }

  w.MakuruMascot = {
    create: function (host, opts) { return new Mascot(host, opts); },
    version: '1.0.0'
  };
})(window);
