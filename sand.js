/* 沙画引擎。一幕由若干「角色」组成,每个角色先在屏外画成一张柔和的画,再撒成沙,
   每颗沙记住自己属于谁、落在它身上的哪一点。一幕之内,角色动,沙跟着走;流水的沙沿着水的走向一直淌。
   换幕时沙整片扬起,带着涡流飞成下一幕;开场时沙从四周聚拢成形。角色与编排在 scenes.js(window.SAND),笔法在 paint.js。
   没有 WebGL2、或屏幕太矮时,整块不出现,页面照常可读。
   为了换幕不卡:画好之后撒沙、排序的算术在后台线程里做(与主线程同一份源码,结果逐字节相同);
   主线程只在沙落定之后、按角色切成小段作画;一路滑过去的页不画,停下的那一页才备;段落位置与海平线量一次存着,不每帧重排。 */
(function () {
  'use strict';
  // 从这里到 sand-on 加上是同一段同步代码,中间不会画出一帧;跑不了沙画的,也就此照常显示
  document.documentElement.classList.remove('sand-wait');
  var cvs = document.getElementById('sand');
  if (!cvs || !window.SAND) return;
  var PAGE = cvs.getAttribute('data-page') || 'home';
  var BASE = cvs.getAttribute('data-base') || '';
  var gl = cvs.getContext('webgl2', { alpha: true, antialias: false, premultipliedAlpha: true, powerPreference: 'high-performance' });
  if (!gl || !gl.getExtension('EXT_color_buffer_float')) { cvs.parentNode.removeChild(cvs); return; }
  var root = document.documentElement;
  var reduced = matchMedia('(prefers-reduced-motion: reduce)').matches;
  var small = Math.min(screen.width, screen.height) < 700;
  var TW = small ? 256 : 512, TH = small ? 384 : 640, N = TW * TH, MAXA = 256;
  var STAGE = window.SAND, SCENES = STAGE.scenes[PAGE];

  function prng(a) { return function () { a |= 0; a = a + 0x6D2B79F5 | 0; var t = Math.imul(a ^ a >>> 15, 1 | a); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; }; }
  var R = prng(7);
  var SEED = new Float32Array(N * 4); for (var i = 0; i < N * 4; i++) SEED[i] = R();

  /* ───────── 视口与版式 ───────── */
  var W, H, dpr, portrait, on;
  function measure() { dpr = Math.min(window.devicePixelRatio || 1, small ? 1.5 : 2); W = innerWidth; H = innerHeight; portrait = H > W * 1.05; }
  // 横着拿的手机太矮,放不下画和字:这时退回静态排版,转回来再演
  function applyOn() { on = portrait || H >= 480; root.classList.toggle('sand-on', on); cvs.style.display = on ? '' : 'none'; }
  // 接管的这一刻关掉字的过渡:普通排版里看得见的字直接换成沙画版式里藏着的样子,不在露出时淡出一下
  root.classList.add('sand-init');
  measure(); applyOn();
  var caps = [].slice.call(document.querySelectorAll('.cap'));
  // 字一个一个像沙一样聚拢、落定;离开时顺着风散开。汉字各自一格,西文按词,标点跟着前一个字
  function splitText(el, n) {
    var PUN = /[，。、；：？！”’）》」』…—,.;:?!)]/, OPEN = /^[“‘(（「『《]+$/;
    [].slice.call(el.childNodes).forEach(function (nd) {
      if (nd.nodeType === 1) { if (nd.tagName !== 'A') n = splitText(nd, n); return; }
      if (nd.nodeType !== 3) return;
      var t = nd.nodeValue, frag = document.createDocumentFragment(), toks = t.match(/[“‘(]*[A-Za-z0-9][A-Za-z0-9'’\-–:\/&]*[,.;:?!)”’]*|\s+|./g) || [];
      for (var k = 0; k < toks.length; k++) {
        var tk = toks[k]; if (/^\s+$/.test(tk)) { frag.appendChild(document.createTextNode(tk)); continue; }
        while (OPEN.test(tk) && k + 1 < toks.length && !/^\s+$/.test(toks[k + 1])) tk += toks[++k];
        while (k + 1 < toks.length && PUN.test(toks[k + 1])) tk += toks[++k];
        var sp = document.createElement('span'), hsh = Math.sin(n * 12.9898) * 43758.5453, r = hsh - Math.floor(hsh);
        sp.className = 'g'; sp.textContent = tk; sp.setAttribute('aria-hidden', 'true');
        sp.style.cssText = '--i:' + n + ';--dx:' + (6 + r * 12).toFixed(1) + 'px;--dy:' + ((r * 7 % 1) * 8 - 3).toFixed(1) + 'px'; frag.appendChild(sp); n++;
      }
      nd.parentNode.replaceChild(frag, nd);
    });
    return n;
  }
  caps.forEach(function (c) {
    if (!c.classList.contains('page-cap') && !c.classList.contains('hero-cap') || c.classList.contains('etym-cap')) return;
    [].slice.call(c.querySelectorAll('h1,p')).forEach(function (el) { el.setAttribute('aria-label', el.textContent); });
    splitText(c, 0); c.classList.add('split');
  });
  function capOf(si) { var id = SCENES[si] && SCENES[si].cap; return caps.filter(function (c) { return c.getAttribute('data-cap') === id; })[0]; }
  function capRect(si) {
    var c = capOf(si); if (!c) return null;
    var r = c.getBoundingClientRect(), dy = c.classList.contains('on') || c.classList.contains('split') ? 0 : 12;
    return { x0: r.left, y0: r.top - dy, x1: r.right, y1: r.bottom - dy };
  }
  // 沙床的上沿(占视口高的比例):桌面固定;竖屏在东西脚下、字的上方
  var BED = .855;
  function bedOf(si) {
    if (!portrait) return [BED, 1.02 - BED];
    var r = capRect(si); return [r ? (r.y0 - 16) / H - .07 : .66, .055];
  }
  function box(lay, si) {
    // 白底的一件东西:桌面放在字右边的一大块里,竖屏放在页头与字之间;东西按自己占的范围放进去,不裁
    if (lay === 'O') {
      var rc = capRect(si);
      if (portrait) { var t0 = 60 + H * .03, b0 = rc ? rc.y0 - 34 : H * .6; return { x: W * .06, y: t0, w: W * .88, h: Math.max(120, b0 - t0), lay: 'O' }; }
      var x0 = Math.max(W * .4, (rc ? rc.x1 : 0) + W * .045); return { x: x0, y: H * .1, w: W * .965 - x0, h: H * (BED - .1 + .02), lay: 'O' };
    }
    if (portrait && lay !== 'F') {
      // 竖屏:画占住页头与这一幕的字之间
      var top = 60 + H * .02, r = capRect(si), bot = r ? r.y0 - 18 : H * .62;
      return { x: 0, y: top, w: W, h: Math.max(120, bot - top), lay: 'P' };
    }
    switch (lay) {
      case 'L': return { x: W * .34, y: H * .1, w: W * .66, h: H * .9, lay: 'L' };
      case 'R': return { x: 0, y: H * .1, w: W * .66, h: H * .9, lay: 'R' };
      case 'T': return { x: W * .02, y: H * .28, w: W * .96, h: H * .72, lay: 'T' };
      case 'C': return { x: 0, y: 0, w: W, h: H, lay: 'C' };
      default: return { x: 0, y: 0, w: W, h: H, lay: 'F' };
    }
  }
  function fitOf(sc, bx) {
    var vw = sc.vw || 1000, vh = sc.vh || 640, lay = bx.lay, k, ox, oy;
    if (lay === 'O') { var b = sc.bb || [0, 0, vw, vh], bw = b[2] - b[0], bh = b[3] - b[1]; k = Math.min(bx.w / bw, bx.h / bh); ox = bx.x + (bx.w - bw * k) / 2 - b[0] * k; oy = bx.y + bx.h - bh * k - b[1] * k; }
    else if (lay === 'P') { var f = sc.focus || [0, vw]; k = Math.min(bx.w * .96 / (f[1] - f[0]), bx.h / vh); ox = bx.x + bx.w / 2 - (f[0] + f[1]) / 2 * k; oy = bx.y + bx.h - vh * k; }
    else if (lay === 'L' || lay === 'R') { k = bx.h / vh; ox = lay === 'L' ? bx.x + bx.w - vw * k : bx.x; oy = bx.y + bx.h - vh * k; }
    else if (lay === 'T') { k = bx.w / vw; ox = bx.x; oy = bx.y + bx.h - vh * k; }
    else if (lay === 'C') { k = Math.max(bx.w / vw, bx.h / vh); ox = (bx.w - vw * k) * (sc.fx == null ? .5 : sc.fx); oy = (bx.h - vh * k) * (sc.fy == null ? .5 : sc.fy); }
    else { k = Math.min(bx.w / vw, bx.h / vh); ox = bx.x + (bx.w - vw * k) / 2; oy = bx.y + bx.h - vh * k; }
    return { k: k, ox: ox, oy: oy, V: { X0: -ox / k, X1: (W - ox) / k, Y0: -oy / k, Y1: (H - oy) / k, vw: vw, vh: vh, portrait: lay === 'P', tall: portrait, asp: W / H, shore: shoreLine(), hz: horizon() } };
  }
  // 画在字的周围化进白纸里:字所在的一块留白,边缘是软的、不齐的
  // 插画:不在字的周围挖一块白,而是整幅画朝左上角(竖屏朝下方)慢慢淡进白纸,边缘是一道很宽的渐变
  function vigOf(si) {
    var r = capRect(si); if (!r || SCENES[si].lay === 'O' || SCENES[si].beach || SCENES[si].full) return [-1, -1, -1, -1];
    var pic = !!SCENES[si].img;
    if (portrait) return [-.2, (r.y0 - (pic ? 10 : 22)) / H, 1.2, 1.2];
    if (pic) return [-.4, -.4, (r.x1 - W * .07) / W, (r.y1 - H * .1) / H];
    var m = 34; return [(r.x0 - m) / W, (r.y0 - m) / H, (r.x1 + m) / W, (r.y1 + m) / H];
  }
  function feather(si) {
    var pic = si != null && SCENES[si] && !!SCENES[si].img;
    if (pic) return portrait ? [.1, .12, 0] : [.26, .3, 0];
    return portrait ? [70 / W, 60 / H, 1] : [124 / W, 110 / H, 1];
  }
  function vigJS(u, v, r, fe, hdr) {
    var m = 1;
    if (r[0] > -.5) {
      var cx = (r[0] + r[2]) / 2, cy = (r[1] + r[3]) / 2, hx = (r[2] - r[0]) / 2, hy = (r[3] - r[1]) / 2;
      var dx = (Math.abs(u - cx) - hx) / fe[0], dy = (Math.abs(v - cy) - hy) / fe[1];
      var wob = (fe[2] == null ? 1 : fe[2]) * (.22 * Math.sin(u * 41 + v * 13) + .18 * Math.sin(v * 33 - u * 19));
      var sd = Math.hypot(Math.max(dx, 0), Math.max(dy, 0)) + Math.min(Math.max(dx, dy), 0) + wob;
      var t = Math.max(0, Math.min(1, sd)); m = t * t * (3 - 2 * t);
    }
    var h = Math.max(0, Math.min(1, (v - hdr) / .07)); return m * h * h * (3 - 2 * h);
  }

  /* ───────── 把一幕撒成沙 ───────── */
  var off = document.createElement('canvas'), boff = document.createElement('canvas'), tmp = document.createElement('canvas');
  var cache = {}, GAM = .55;
  function hilbert(n, x, y) { var d = 0, rx, ry, s, t; for (s = n >> 1; s > 0; s >>= 1) { rx = (x & s) > 0 ? 1 : 0; ry = (y & s) > 0 ? 1 : 0; d += s * s * ((3 * rx) ^ ry); if (ry === 0) { if (rx === 1) { x = s - 1 - x; y = s - 1 - y; } t = x; x = y; y = t; } } return d; }
  function grain() { return Math.max(1.05, Math.min(2.8, Math.sqrt(W * H * .5 / N) * 1.45)); }
  // 模糊:缩小再放大,各浏览器一样
  function soften(cv, px) {
    if (!(px > .6)) return;
    var f = Math.max(.08, 1 / (1 + px * .55)), w = Math.max(1, Math.round(cv.width * f)), h = Math.max(1, Math.round(cv.height * f));
    tmp.width = w; tmp.height = h; var t = tmp.getContext('2d'); t.imageSmoothingEnabled = true; t.imageSmoothingQuality = 'high'; t.clearRect(0, 0, w, h); t.drawImage(cv, 0, 0, w, h);
    var c = cv.getContext('2d'); c.setTransform(1, 0, 0, 1, 0, 0); c.clearRect(0, 0, cv.width, cv.height); c.imageSmoothingEnabled = true; c.imageSmoothingQuality = 'high'; c.drawImage(tmp, 0, 0, cv.width, cv.height);
  }
  function paintInto(fn, bb, sp, ac, blur) {
    var cw = Math.max(2, Math.ceil((bb[2] - bb[0]) * sp)), ch = Math.max(2, Math.ceil((bb[3] - bb[1]) * sp));
    off.width = boff.width = cw; off.height = boff.height = ch;
    var g = off.getContext('2d', { willReadFrequently: true }), b = boff.getContext('2d', { willReadFrequently: true });
    [g, b].forEach(function (c) { c.setTransform(1, 0, 0, 1, 0, 0); c.clearRect(0, 0, cw, ch); c.setTransform(sp, 0, 0, sp, -bb[0] * sp, -bb[1] * sp); });
    STAGE.paint(fn, g, b, ac, sp);
    soften(off, blur * sp);
    return { rgba: g.getImageData(0, 0, cw, ch).data, beh: b.getImageData(0, 0, cw, ch).data, w: cw, h: ch };
  }
  function drained() {
    var P = new Float32Array(N * 4), Q = new Float32Array(N * 4), rr = prng(4242);
    for (var k = 0; k < N; k++) { P[k * 4] = Q[k * 4] = rr(); P[k * 4 + 1] = Q[k * 4 + 1] = 1.06 + rr() * .12; P[k * 4 + 3] = .01; }
    var ident = { tx: 0, ty: 0, m00: 1, m01: 0, m10: 0, m11: 1, al: 1, m: 0, vR: 0, vx: 0, vy: 0, flags: 0 };
    return { P: P, Q: Q, actors: [ident], tick: function () {}, lay: [0, 0, 1, 1], vig: [-1, -1, -1, -1], drain: true };
  }
  // 插画:先载入,载入之前这一幕等着
  var IMG = {};
  SCENES.forEach(function (sc) { if (sc.img && !IMG[sc.img]) { var im = new Image(), rec = IMG[sc.img] = { el: im, ok: false }; im.onload = function () { rec.ok = true; }; im.src = BASE + sc.img; } });
  // 白底上的东西占哪一块:按离白的量,两头各去掉一点点零星的
  function inkBox(im, vw, vh) {
    var w = 256, h = Math.max(1, Math.round(256 * im.naturalHeight / im.naturalWidth)), c = document.createElement('canvas'); c.width = w; c.height = h;
    var x = c.getContext('2d', { willReadFrequently: true }); x.drawImage(im, 0, 0, w, h);
    var d = x.getImageData(0, 0, w, h).data, cx = new Float64Array(w), cy = new Float64Array(h), tot = 0;
    for (var p = 0; p < w * h; p++) { var k = Math.max(0, 720 - d[p * 4] - d[p * 4 + 1] - d[p * 4 + 2]); if (k) { cx[p % w] += k; cy[(p / w) | 0] += k; tot += k; } }
    function q(a, f) { var acc = 0; for (var i = 0; i < a.length; i++) { acc += a[i]; if (acc >= tot * f) return i; } return a.length - 1; }
    return [q(cx, .003) / w * vw, q(cy, .003) / h * vh, (q(cx, .997) + 1) / w * vw, (q(cy, .997) + 1) / h * vh];
  }
  // 一幕分两步备好:先在主线程摆好角色、把每个角色画出来(要用画布);其余全是算术,交给后台线程。
  // 后台线程跑的是下面 build 的同一份源码,算出来与在主线程算逐字节相同;没有后台线程时就地算。
  var inflight = {}, gen = 0, jobs = 0, worker = null, noWorker = !window.Worker || !window.Blob || !window.URL;
  function workerOf() {
    if (worker || noWorker) return worker;
    try {
      var src = 'var W, H, SW = ' + JSON.stringify(SW) + ';\n' + [prng, hilbert, byKey, vigJS, riverAt, sweepF, build].map(String).join('\n') +
        '\nonmessage = function (e) { var J = e.data; W = J.W; H = J.H; var r = build(J); postMessage(r, [r.P.buffer, r.Q.buffer]); };';
      worker = new Worker(URL.createObjectURL(new Blob([src], { type: 'text/javascript' })));
      worker.onmessage = function (e) { finish(e.data); pump(); };
      // 后台线程起不来:在途的几幕作废,由主线程重来
      worker.onerror = function () { noWorker = true; worker = null; inflight = {}; gen++; };
    } catch (err) { noWorker = true; worker = null; }
    return worker;
  }
  function begin(si) {
    var sc = SCENES[si];
    if (sc.img && !IMG[sc.img].ok) return null;
    if (sc.img && sc.lay === 'O' && !sc.bb) sc.bb = inkBox(IMG[sc.img].el, sc.vw, sc.vh);
    var bx = box(sc.lay, si), F = fitOf(sc, bx), vg = vigOf(si), fe = feather(si);
    var st = STAGE.stage(sc, F.V, small, sc.img ? IMG[sc.img].el : null);
    var acts = st.actors; st.tick(sc.t0 || 0, 0); world(acts);
    var cs = Math.min(1, 900 / W), sp = F.k * cs * (sc.res || 1);   // res:要画得更细的一幕(词源风景)
    return { si: si, id: ++jobs, gen: gen, sc: sc, F: F, vg: vg, fe: fe, st: st, acts: acts, cs: cs, sp: sp, i: 0, parts: [],
      bed: sc.bed ? (portrait ? [sc.bed[0] + .06, sc.bed[1] - .06] : sc.bed) : bedOf(si) };
  }
  // 画下一个角色;返回 true 表示全部画完
  function paintNext(j) {
    var acts = j.acts;
    while (j.i < acts.length && !acts[j.i].paint) { j.parts.push(null); j.i++; }
    if (j.i >= acts.length) return true;
    var ac = acts[j.i], A = paintInto(ac.paint, ac.box, j.sp, ac, ac.blur == null ? 1.2 : ac.blur);
    j.parts.push({ rgba: A.rgba, beh: A.beh, w: A.w, h: A.h });
    j.i++;
    return j.i >= acts.length;
  }
  // 交给后台线程的只有算术要的东西
  function jobOf(j) {
    var sc = j.sc, J = { si: j.si, id: j.id, gen: j.gen, W: W, H: H, N: N, GAM: GAM, sp: j.sp, cs: j.cs, F: { k: j.F.k, ox: j.F.ox, oy: j.F.oy }, vg: j.vg, fe: j.fe, hdr: 58 / H, hz: horizon(), sl: shoreLine(),
      sc: { img: !!sc.img, beach: !!sc.beach, full: !!sc.full, fine: sc.fine, areaFrac: sc.areaFrac, area: sc.area, sweep: sc.sweep || null, obj: !!sc.bb } };
    J.acts = j.acts.map(function (a) { return { box: a.box, m00: a.m00, m01: a.m01, m10: a.m10, m11: a.m11, tx: a.tx, ty: a.ty, weight: a.weight, moving: !!a.moving, raw: a.raw ? Array.prototype.slice.call(a.raw) : null, z: a.z || 0 }; });
    J.parts = j.parts;
    return J;
  }
  function build(J) {
    var W = J.W, H = J.H, N = J.N, GAM = J.GAM, F = J.F, sp = J.sp, vg = J.vg, fe = J.fe, hdr = J.hdr, sc = J.sc, acts = J.acts, parts = J.parts, inkTot = 0;
    // 按不透明度记下每个角色能撒多少沙
    parts.forEach(function (pt, ai) {
      if (!pt) return;
      var ac = acts[ai], n = pt.w * pt.h, cdf = new Float64Array(n), tot = 0, rgba = pt.rgba, bb = ac.box;
      for (var p = 0; p < n; p++) {
        var a = rgba[p * 4 + 3] / 255;
        if (a > .02 && !ac.moving) {
          var lx = bb[0] + ((p % pt.w) + .5) / sp, ly = bb[1] + (((p / pt.w) | 0) + .5) / sp;
          var wx = ac.m00 * lx + ac.m01 * ly + ac.tx, wy = ac.m10 * lx + ac.m11 * ly + ac.ty;
          a *= vigJS((F.ox + wx * F.k) / W, (F.oy + wy * F.k) / H, vg, fe, hdr);
        }
        // 淡处多撒、每颗更淡:虚的地方是一层薄雾,不是稀疏的颗粒
        tot += a > .02 ? Math.pow(a, GAM) * (ac.weight || 1) : 0; cdf[p] = tot;
      }
      pt.cdf = cdf; pt.tot = tot; inkTot += tot;
    });
    // 分配沙数
    var counts = parts.map(function (pt) { return pt ? Math.floor(N * pt.tot / inkTot) : 0; }), sum = counts.reduce(function (a, b) { return a + b; }, 0), big = 0;
    counts.forEach(function (c, i) { if (c > counts[big]) big = i; }); counts[big] += N - sum;
    // 沙粒大小按这一幕实际铺开的面积定:铺满整屏的插画,颗粒大一点、叠两层,白纸不从缝里透出来
    var dense = sc.img || sc.beach || sc.full, fine = sc.fine || (dense ? 1.95 : 1.5), inkPx = sc.areaFrac ? sc.areaFrac * W * H : sc.area ? sc.area * F.k * F.k : inkTot / (J.cs * J.cs), pt0 = Math.max(1.05, Math.min(3.6, Math.sqrt(inkPx / N) * fine)), cover = N * pt0 * pt0 / inkPx, af = Math.max(.14, Math.min(.95, (dense ? 1.75 : 1.3) / cover));
    // 按先后(远在前、近在后)排好,同一个角色里按希尔伯特曲线排,换幕时相邻的沙大致还相邻;位置先抖一抖,飞的时候不成方块
    var order = acts.map(function (a, i) { return i; }).filter(function (i) { return parts[i] && counts[i] > 0; });
    order.sort(function (a, b) { return (acts[a].z || 0) - (acts[b].z || 0) || a - b; });
    var P = new Float32Array(N * 4), Q = new Float32Array(N * 4), at = 0, rr = prng(1000 + J.si * 37), fsm = [], hz = J.hz, sl = J.sl;
    order.forEach(function (ai) {
      var ac = acts[ai], pt = parts[ai], n = counts[ai], bb = ac.box, cdf = pt.cdf, pw = pt.w, rgba = pt.rgba, bh8 = pt.beh, wd = ac.weight || 1;
      var LX = new Float64Array(n), LY = new Float64Array(n), CC = new Float64Array(n), BH = new Float64Array(n), AL = new Float64Array(n), KEY = new Uint32Array(n);
      // 按墨量取样:取样点随 k 递增,指针一路往前走,不必每颗都二分
      var lo = 0, last = cdf.length - 1;
      for (var k = 0; k < n; k++) {
        var u = (k + rr()) / n * pt.tot;
        while (lo < last && cdf[lo] < u) lo++;
        var o = lo * 4, wgt = (cdf[lo] - (lo > 0 ? cdf[lo - 1] : 0)) / wd, ae = Math.pow(Math.max(wgt, 1e-4), 1 / GAM), beh = Math.round(bh8[o] / 36);
        if (!beh && ae < .4) beh = 5;   // 虚处:沙会轻轻漂
        LX[k] = bb[0] + ((lo % pw) + rr()) / sp; LY[k] = bb[1] + (((lo / pw) | 0) + rr()) / sp;
        CC[k] = rgba[o] * 65536 + rgba[o + 1] * 256 + rgba[o + 2]; BH[k] = beh; AL[k] = Math.pow(ae, 1 - GAM);
      }
      var raw = ac.raw, fl = raw ? raw[11] : 0;
      for (k = 0; k < n; k++) {
        var lx = LX[k], ly = LY[k], wx = ac.m00 * lx + ac.m01 * ly + ac.tx, wy = ac.m10 * lx + ac.m11 * ly + ac.ty;
        if (fl & 64) { var rv = riverAt(acts[0].raw, acts[1].raw, raw, lx, ly); wx = (rv[0] * W - F.ox) / F.k; wy = (rv[1] * H - F.oy) / F.k; }
        if (fl & 32) { wx = (lx * .001 * W - F.ox) / F.k; wy = (ly * .001 * H - F.oy) / F.k; }
        if (fl & 16) { wx = ((-.02 + lx * .00104) * W - F.ox) / F.k; wy = ((hz + (sl[0] - hz) * Math.pow(1 - Math.min(1, ly / 300), 1.7)) * H - F.oy) / F.k; }
        var sx = Math.max(0, Math.min(1023, ((F.ox + wx * F.k) / W * 1024 + (rr() - .5) * 60) | 0)), sy = Math.max(0, Math.min(1023, ((F.oy + wy * F.k) / H * 1024 + (rr() - .5) * 60) | 0));
        KEY[k] = hilbert(1024, sx, sy);
        if (((at + k) % 13) === 0) fsm.push(sweepF(sc, sx / 1024, sy / 1024));
      }
      var ord = byKey(KEY, n);
      for (k = 0; k < n; k++) {
        var q = ord[k], j = (at + k) * 4;
        P[j] = LX[q]; P[j + 1] = LY[q]; P[j + 2] = CC[q]; P[j + 3] = BH[q] + Math.max(.021, Math.min(.99, af * AL[q]));
        Q[j] = LX[q]; Q[j + 1] = LY[q]; Q[j + 2] = ai; Q[j + 3] = CC[q];
      }
      at += n;
    });
    fsm.sort(function (a, b) { return a - b; });
    var out = { si: J.si, id: J.id, gen: J.gen, P: P, Q: Q, pt0: pt0, dense: !!dense, sw: fsm.length ? [fsm[(fsm.length * .02) | 0], fsm[(fsm.length * .98) | 0]] : [0, 1] };
    // 东西的平均颜色:给四周的沙雾用
    if (sc.obj) {
      var cr = 0, cg = 0, cb = 0, cn = 0;
      for (var m2 = 0; m2 < N; m2 += 97) { var cv = P[m2 * 4 + 2], wa = P[m2 * 4 + 3] % 1; cr += Math.floor(cv / 65536) * wa; cg += Math.floor(cv / 256) % 256 * wa; cb += cv % 256 * wa; cn += wa; }
      if (cn) out.objC = [cr / cn / 255, cg / cn / 255, cb / cn / 255];
    }
    return out;
  }
  function finish(r) {
    var f = inflight[r.si]; if (!f || f.id !== r.id || r.gen !== gen) return;
    delete inflight[r.si];
    var sc = f.sc, F = f.F;
    var out = { sw: r.sw, P: r.P, Q: r.Q, actors: f.acts, tick: f.st.tick, lay: [F.ox / W, F.oy / H, F.k / W, F.k / H], vig: f.vg, fe: f.fe, sc: sc, pt: r.pt0, pv: r.dense ? .3 : 1, bed: f.bed };
    // 东西在屏上的中心与大小:给四周的沙雾用
    if (sc.bb) {
      var bb2 = sc.bb;
      out.obj = [(F.ox + (bb2[0] + bb2[2]) / 2 * F.k) / W, (F.oy + (bb2[1] + bb2[3]) / 2 * F.k) / H, (bb2[2] - bb2[0]) * F.k / W * .62, (bb2[3] - bb2[1]) * F.k / H * .62];
      if (r.objC) out.objC = r.objC;
    }
    cache[r.si] = out;
    if (f.done) f.done(out);
  }
  function send(f) {
    var w = workerOf();
    while (!paintNext(f)) {}
    if (!w) { finish(build(jobOf(f))); return; }
    var J = jobOf(f); f.sent = true;
    w.postMessage(J, J.parts.reduce(function (t, pt) { if (pt) t.push(pt.rgba.buffer, pt.beh.buffer); return t; }, []));
  }
  // 要演的这一幕:交出去,备好之前返回 null,下一帧再来问;now 为真时当场在主线程做完(调试用)
  function prepare(si, now) {
    if (cache[si]) return cache[si];
    var sc = SCENES[si];
    if (sc.drain || sc.vanish) return (cache[si] = drained());
    var f = inflight[si];
    if (now) { f = begin(si); if (!f) return null; inflight[si] = f; while (!paintNext(f)) {} finish(build(jobOf(f))); return cache[si]; }
    if (f && f.gen === gen) { if (!f.sent) send(f); return cache[si] || null; }
    f = begin(si); if (!f) return null;
    inflight[si] = f; send(f);
    return cache[si] || null;
  }
  // 河里的沙在开演那一刻落在哪里(与着色器里的河道同一算法,不含扰动):换幕时按这里排先后,邻近的沙飞向邻近的地方
  function riverAt(E, Wd, A, lx, ly) {
    var nl = Math.max(-1.2, Math.min(1.2, ly * .02)), s = ((lx * .001 + A[10]) % 1 + 1) % 1, n = A[0] + A[1] * Math.sin(6.2832 * A[2] * s + A[3]) + nl * A[4], asp = W / H;
    function pt(i) { i = Math.max(0, Math.min(5, i)); return [E[i * 2], E[i * 2 + 1]]; }
    function K(t) {
      var f = Math.max(0, Math.min(1, t)) * 5, i = Math.min(4, f | 0), u = f - i, a = pt(i - 1), b = pt(i), c = pt(i + 1), d = pt(i + 2), o = [0, 0];
      for (var k = 0; k < 2; k++) o[k] = .5 * (2 * b[k] + (c[k] - a[k]) * u + (2 * a[k] - 5 * b[k] + 4 * c[k] - d[k]) * u * u + (3 * b[k] - a[k] - 3 * c[k] + d[k]) * u * u * u);
      return [o[0] * asp, o[1]];
    }
    var c0 = K(s - .003), c1 = K(s + .003), tx = c1[0] - c0[0], ty = c1[1] - c0[1], tl = Math.hypot(tx, ty) || 1, wd = (Wd[0] + (Wd[1] - Wd[0]) * s) * (1 + .12 * Math.sin(s * 11 + 1.3));
    return [((c0[0] + c1[0]) / 2 - ty / tl * n * wd * .5) / asp, (c0[1] + c1[1]) / 2 + tx / tl * n * wd * .5];
  }
  // 一颗沙在扫向上排第几:与着色器里的 delayOf 同一算法(未归一)
  function sweepF(sc, u, v) {
    var w = sc.sweep || {}, t = SW[w.type || 'x'], c = w.c || [.5, .5];
    return t === 0 ? u : t === 1 ? 1 - u : t === 2 ? v : t === 3 ? 1 - v : Math.hypot((u - c[0]) * W / H, v - c[1]) / 1.3;
  }
  // 按希尔伯特键排出次序:稳定的基数排序,两趟各 10 位(键小于 2^20)
  function byKey(KEY, n) {
    var a = new Uint32Array(n), b = new Uint32Array(n), cnt = new Uint32Array(1025), i, sh, t;
    for (i = 0; i < n; i++) a[i] = i;
    for (sh = 0; sh < 20; sh += 10) {
      cnt.fill(0);
      for (i = 0; i < n; i++) cnt[((KEY[a[i]] >>> sh) & 1023) + 1]++;
      for (i = 0; i < 1024; i++) cnt[i + 1] += cnt[i];
      for (i = 0; i < n; i++) { t = a[i]; b[cnt[(KEY[t] >>> sh) & 1023]++] = t; }
      t = a; a = b; b = t;
    }
    return a;
  }
  // 角色的世界变换:先父后子
  function world(list) {
    for (var i = 0; i < list.length; i++) {
      var a = list[i];
      var c = Math.cos(a.r || 0), s = Math.sin(a.r || 0), sx = a.sx == null ? 1 : a.sx, sy = a.sy == null ? 1 : a.sy;
      var m00 = c * sx, m01 = -s * sy, m10 = s * sx, m11 = c * sy, tx = a.x || 0, ty = a.y || 0, al = a.a == null ? 1 : a.a, p = a.parent;
      if (p) {
        var n00 = p.m00 * m00 + p.m01 * m10, n01 = p.m00 * m01 + p.m01 * m11, n10 = p.m10 * m00 + p.m11 * m10, n11 = p.m10 * m01 + p.m11 * m11;
        var ntx = p.m00 * tx + p.m01 * ty + p.tx, nty = p.m10 * tx + p.m11 * ty + p.ty;
        m00 = n00; m01 = n01; m10 = n10; m11 = n11; tx = ntx; ty = nty; al *= p.al;
      }
      a.m00 = m00; a.m01 = m01; a.m10 = m10; a.m11 = m11; a.tx = tx; a.ty = ty; a.al = al;
    }
  }

  /* ───────── GL ───────── */
  function tex(data, w, h, half) {
    var t = gl.createTexture(); gl.bindTexture(gl.TEXTURE_2D, t);
    if (half) gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA16F, w, h, 0, gl.RGBA, gl.HALF_FLOAT, null);
    else gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA32F, w, h, 0, gl.RGBA, gl.FLOAT, data);
    var f = half ? gl.LINEAR : gl.NEAREST;
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, f); gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, f);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE); gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
    return t;
  }
  function fbo(t) { var f = gl.createFramebuffer(); gl.bindFramebuffer(gl.FRAMEBUFFER, f); gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, gl.TEXTURE_2D, t, 0); return f; }
  // 开场:沙先散在整页四周(看不见),第一幕开演时从四周聚拢成形
  function scattered() {
    var P = new Float32Array(N * 4), rr = prng(99);
    for (var k = 0; k < N; k++) { P[k * 4] = -.25 + rr() * 1.5; P[k * 4 + 1] = -.2 + rr() * 1.4; P[k * 4 + 3] = .01; }
    var ident = { tx: 0, ty: 0, m00: 1, m01: 0, m10: 0, m11: 1, al: 1, m: 0, vR: 0, vx: 0, vy: 0, flags: 0 };
    return { P: P, Q: new Float32Array(P), actors: [ident], tick: function () {}, lay: [0, 0, 1, 1], vig: [-1, -1, -1, -1], drain: true };
  }
  var START = scattered(), init = new Float32Array(N * 4);
  for (i = 0; i < N; i++) { init[i * 4] = (START.P[i * 4] * 2 - 1) * W / H; init[i * 4 + 1] = 1 - START.P[i * 4 + 1] * 2; }
  var st = [tex(init, TW, TH), tex(init, TW, TH)], fb = st.map(fbo), tSeed = tex(SEED, TW, TH);
  // 换幕被打断时的快照:两套轮流,一套读、一套写
  function snapSet() { var a = tex(null, TW, TH), b = tex(null, TW, TH), f = gl.createFramebuffer(); gl.bindFramebuffer(gl.FRAMEBUFFER, f); gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, gl.TEXTURE_2D, a, 0); gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT1, gl.TEXTURE_2D, b, 0); return { a: a, b: b, fb: f }; }
  var snaps = [snapSet(), snapSet()], snapK = 0, snapOn = 0;
  function slotTex() { return { tP: tex(null, TW, TH), tQ: tex(null, TW, TH), tA: tex(null, MAXA * 3, 1), data: null, t0: 0 }; }
  var slots = [slotTex(), slotTex()], from = slots[0], to = slots[1];
  var acc = null, accFb = null;

  var COMMON = [
    '#version 300 es', 'precision highp float;', 'precision highp int;',
    'uniform sampler2D uState,uSeed,uP0,uQ0,uA0,uP1,uQ1,uA1;uniform int uTW,uSweep;uniform float uTime,uT0,uDur,uSpread,uAspect,uMotion,uDt,uTm0,uTm1,uHdr,uVigT,uCurl,uAmb0,uAmb1,uShed0,uShed1,uSheen0,uSheen1,uSnap;uniform vec2 uC,uSheenD0,uSheenD1,uSw;uniform vec3 uFe0,uFe1;uniform vec4 uLay0,uLay1,uVig0,uVig1;',
    'vec3 m289(vec3 x){return x-floor(x*(1./289.))*289.;}vec4 m289(vec4 x){return x-floor(x*(1./289.))*289.;}',
    'vec4 perm(vec4 x){return m289(((x*34.)+1.)*x);}vec4 tis(vec4 r){return 1.79284291400159-.85373472095314*r;}',
    'float sn(vec3 v){const vec2 C=vec2(1./6.,1./3.);const vec4 D=vec4(0.,.5,1.,2.);vec3 i=floor(v+dot(v,C.yyy));vec3 x0=v-i+dot(i,C.xxx);vec3 g=step(x0.yzx,x0.xyz);vec3 l=1.-g;vec3 i1=min(g.xyz,l.zxy);vec3 i2=max(g.xyz,l.zxy);vec3 x1=x0-i1+C.xxx;vec3 x2=x0-i2+C.yyy;vec3 x3=x0-D.yyy;i=m289(i);vec4 p=perm(perm(perm(i.z+vec4(0.,i1.z,i2.z,1.))+i.y+vec4(0.,i1.y,i2.y,1.))+i.x+vec4(0.,i1.x,i2.x,1.));float n_=.142857142857;vec3 ns=n_*D.wyz-D.xzx;vec4 j=p-49.*floor(p*ns.z*ns.z);vec4 x_=floor(j*ns.z);vec4 y_=floor(j-7.*x_);vec4 x=x_*ns.x+ns.yyyy;vec4 y=y_*ns.x+ns.yyyy;vec4 h=1.-abs(x)-abs(y);vec4 b0=vec4(x.xy,y.xy);vec4 b1=vec4(x.zw,y.zw);vec4 s0=floor(b0)*2.+1.;vec4 s1=floor(b1)*2.+1.;vec4 sh=-step(h,vec4(0.));vec4 a0=b0.xzyw+s0.xzyw*sh.xxyy;vec4 a1=b1.xzyw+s1.xzyw*sh.zzww;vec3 p0=vec3(a0.xy,h.x);vec3 p1=vec3(a0.zw,h.y);vec3 p2=vec3(a1.xy,h.z);vec3 p3=vec3(a1.zw,h.w);vec4 nm=tis(vec4(dot(p0,p0),dot(p1,p1),dot(p2,p2),dot(p3,p3)));p0*=nm.x;p1*=nm.y;p2*=nm.z;p3*=nm.w;vec4 m=max(.6-vec4(dot(x0,x0),dot(x1,x1),dot(x2,x2),dot(x3,x3)),0.);m=m*m;return 42.*dot(m*m,vec4(dot(p0,x0),dot(p1,x1),dot(p2,x2),dot(p3,x3)));}',
    'vec2 curl(vec2 p,float t){float e=.02;float a=sn(vec3(p.x,p.y+e,t)),b=sn(vec3(p.x,p.y-e,t)),c=sn(vec3(p.x+e,p.y,t)),d=sn(vec3(p.x-e,p.y,t));return vec2(a-b,-(c-d))/(2.*e);}',
    'vec2 toW(vec2 uv){return vec2((uv.x*2.-1.)*uAspect,1.-uv.y*2.);}',
    // 河道:六个点(屏幕比例)连成的平滑曲线;换成宽高等比的坐标,横过河面的方向才是真的垂直
    'vec2 cpt(int i,vec4 e0,vec4 e1,vec4 e2){i=clamp(i,0,5);return i==0?e0.xy:i==1?e0.zw:i==2?e1.xy:i==3?e1.zw:i==4?e2.xy:e2.zw;}',
    'vec2 rvK(float s,vec4 e0,vec4 e1,vec4 e2){float f=clamp(s,0.,1.)*5.;int i=min(int(f),4);float t=f-float(i);vec2 a=cpt(i-1,e0,e1,e2),b=cpt(i,e0,e1,e2),c=cpt(i+1,e0,e1,e2),d=cpt(i+2,e0,e1,e2);' +
    'vec2 p=.5*(2.*b+(c-a)*t+(2.*a-5.*b+4.*c-d)*t*t+(3.*b-a-3.*c+d)*t*t*t);return vec2(p.x*uAspect,p.y);}',
    'float gFlow,gS;',
    // 海浪:浪边一阵阵涌上沙滩又退下去,沿岸各处先后不同;涌得快,退得慢,两层浪叠着
    'uniform vec2 uShore;uniform float uHz;float shore(float x,float t){float u=fract(t/7.+.12*sin(x*3.1+.7)+.06*sin(x*7.9+2.1)),v=fract(t/7.*1.37+.4+.1*sin(x*4.3+1.9));float f=u<.28?sin(u/.28*1.5708):.5+.5*cos((u-.28)/.72*3.14159),g=v<.28?sin(v/.28*1.5708):.5+.5*cos((v-.28)/.72*3.14159);return uShore.x+uShore.y*(.72*f+.28*g);}',
    // 起飞的先后:按扫向排,在这一幕的沙实际铺开的范围里量(uSw),换页一开始就有沙在动,不会先空等
    'float delayOf(vec2 uv,float r){float f;if(uSweep==0)f=uv.x;else if(uSweep==1)f=1.-uv.x;else if(uSweep==2)f=uv.y;else if(uSweep==3)f=1.-uv.y;else f=length((uv-uC)*vec2(uAspect,1.))/1.3;f=(f-uSw.x)/max(.05,uSw.y-uSw.x);return clamp(f,0.,1.)*uSpread+r*.22;}',
    // 字周围的留白:软的、不齐的边;页头底下也淡出
    'float vigm(vec2 uv,vec4 r,vec3 fe){float m=1.;if(r.x>-.5){vec2 c=(r.xy+r.zw)*.5,h=(r.zw-r.xy)*.5;vec2 d=(abs(uv-c)-h)/fe.xy;float wob=fe.z*(.22*sin(uv.x*41.+uv.y*13.)+.18*sin(uv.y*33.-uv.x*19.));float s=length(max(d,0.))+min(max(d.x,d.y),0.)+wob;m=smoothstep(0.,1.,s);}return m*smoothstep(uHdr,uHdr+.07,uv.y);}',
    // 一颗沙此刻该在哪里:角色的变换、变形、被吸走
    'void resolve(vec4 p,vec4 q,sampler2D A,vec4 lay,float tm,out vec2 uv,out float al,out float u,out float dk){float ai=floor(q.z),stg=fract(q.z)/.998;int i3=int(ai)*3;' +
    'vec4 a0=texelFetch(A,ivec2(i3,0),0),a1=texelFetch(A,ivec2(i3+1,0),0),a2=texelFetch(A,ivec2(i3+2,0),0);float fl=a2.w,m=a1.w;al=a1.z;dk=0.;u=0.;vec2 loc=p.xy;gFlow=0.;gS=1.;' +
    // 贴在屏上的一层(沙滩、落日):位置就是屏幕比例
    'if(mod(floor(fl/32.),2.)>=1.){uv=p.xy*.001;gFlow=2.;return;}' +
    // 海:面朝大海。沙在一条直带子上的位置(沿岸、离浪边多远)按透视贴在海平线与此刻的浪边之间:越远越挤,浪边随浪涌上沙滩又退回
    'if(mod(floor(fl/16.),2.)>=1.){float x=-.02+p.x*.00104,d=clamp(p.y/300.,0.,1.),ys=shore(x,uTime);x+=.0025*sin(d*25.+uTime*.9+p.x*.013)*(1.-d);uv=vec2(x,uHz+(ys-uHz)*pow(1.-d,1.7));gFlow=2.;return;}' +
    // 河:沙在一条直带子上的位置(顺流、横过河面)弯到河道上;顺流一直往前,中间快两岸慢,流出屏外再从上游进来;色流轻轻左右摆
    'if(mod(floor(fl/64.),2.)>=1.){vec4 e0=texelFetch(A,ivec2(0,0),0),e1=texelFetch(A,ivec2(1,0),0),e2=texelFetch(A,ivec2(2,0),0),w0=texelFetch(A,ivec2(3,0),0);' +
    'float nl=clamp(p.y*.02,-1.2,1.2),s=fract(p.x*.001+a2.z+tm*w0.z*a1.y*(1.-.35*nl*nl));float n=a0.x+a0.y*sin(6.2832*a0.z*s+a0.w+tm*.05)+nl*a1.x;' +
    'vec2 c0=rvK(s-.003,e0,e1,e2),c1=rvK(s+.003,e0,e1,e2),tg=normalize(c1-c0);float wd=mix(w0.x,w0.y,s)*(1.+.12*sin(s*11.+1.3));' +
    'vec2 q=(c0+c1)*.5+vec2(-tg.y,tg.x)*n*wd*.5;q+=w0.w*vec2(sn(vec3(q*3.,tm*.2)),sn(vec3(q*3.+9.,tm*.2)));' +
    'al*=smoothstep(1.2,.96,abs(n))*smoothstep(0.,.06,s);gFlow=1.;gS=s;uv=vec2(q.x/uAspect,q.y);return;}' +
    'if(mod(fl,2.)>=1.){al*=smoothstep(stg-.03,stg+.03,m);}' +
    'else if(mod(floor(fl/4.),2.)>=1.){float d=stg-m;al*=.28+.72*exp(-d*d*160.);}' +
    'else{float uu=clamp((m-stg*.5)/.5,0.,1.);u=mod(floor(fl/2.),2.)>=1.?uu*uu:uu*uu*(3.-2.*uu);loc=mix(p.xy,q.xy,u);}' +
    'vec2 w=a0.xy+vec2(a0.z*loc.x+a0.w*loc.y,a1.x*loc.x+a1.y*loc.y);' +
    'if(a2.x>.5){vec2 rel=w-a2.yz;float d=length(rel),c=clamp((a2.x-d)/max(18.,a2.x*.45),0.,1.),an=c*(2.2+tm*.7),cs=cos(an),sn2=sin(an);rel=vec2(cs*rel.x-sn2*rel.y,sn2*rel.x+cs*rel.y)*(1.-c*c);w=a2.yz+rel;al*=(1.-c)*(1.-c);dk=c;}' +
    'uv=lay.xy+w*lay.zw;}'
  ].join('\n');
  var QUAD_VS = '#version 300 es\nout vec2 vUV;void main(){vec2 p=vec2((gl_VertexID<<1)&2,gl_VertexID&2);vUV=p;gl_Position=vec4(p*2.-1.,0.,1.);}';
  var UPD_FS = COMMON + '\nout vec4 o;void main(){ivec2 ij=ivec2(gl_FragCoord.xy);vec4 s=texelFetch(uState,ij,0),sd=texelFetch(uSeed,ij,0),p1=texelFetch(uP1,ij,0),q1=texelFetch(uQ1,ij,0);' +
    'vec2 uv;float al,u,dk;resolve(p1,q1,uA1,uLay1,uTm1,uv,al,u,dk);float ts=uT0+uDur*delayOf(uv,sd.x);bool sw=uTime>=ts;float q=clamp((uTime-ts)/(uDur*.55),0.,1.);float beh=floor(p1.w);' +
    'bool hold=!sw&&uSnap>.5;if(!sw&&!hold){vec4 p0=texelFetch(uP0,ij,0),q0=texelFetch(uQ0,ij,0);resolve(p0,q0,uA0,uLay0,uTm0,uv,al,u,dk);beh=floor(p0.w);}' +
    // 被打断的换幕:还没轮到起飞的沙停在此刻的位置,当作上一幕的画;轮到了,照常起飞
    'vec2 T=hold?s.xy:toW(uv);if(hold)beh=0.;' +
    'float am=hold?0.:uMotion*(sw?uAmb1:uAmb0);if(beh==1.)T.x+=.004*sin(uTime*1.6+T.y*60.+sd.y*6.)*am;else if(beh==2.)T.y+=.012*pow(abs(sin(uTime*5.+sd.z*30.)),3.)*am;' +
    'else if(beh==4.)T.x+=.0045*sin(uTime*1.25+T.x*7.+sd.y*.8)*am;else if(beh==5.)T+=.009*vec2(sn(vec3(T*2.3,uTime*.12+sd.x)),sn(vec3(T*2.3+7.,uTime*.12+sd.y)))*am;' +
    'T+=.0009*vec2(sin(uTime*.7+sd.x*40.),cos(uTime*.6+sd.y*40.))*am;' +
    // 风把东西上的细沙一粒粒吹起,朝字那边飘散;过一阵落回原处
    'if(!hold&&sd.w<.07&&(sw?uShed1>.5&&q>=1.:uShed0>.5)){float ph=fract(uTime/13.+sd.x*9.1);if(ph>.6&&ph<.9){float e=(ph-.6)/.3;T+=vec2(-.9,.3)*e*e*.42+.05*e*vec2(sn(vec3(T*2.,uTime*.3+sd.y)),sn(vec3(T*2.+5.,uTime*.3+sd.z)));}}' +
    'vec2 p=s.xy,v=s.zw;float fly=(sw&&q<1.)?1.:0.;float k=mix(40.,mix(16.,6.,uCurl),fly),z=mix(1.,mix(1.,.75,uCurl),fly);if(hold)k=3.;' +
    'vec2 f=k*(T-p)-2.*sqrt(k)*z*v+curl(p*1.1+vec2(3.,0.),uTime*.15)*1.1*fly*(1.-q)*uMotion*uCurl;' +
    // 落进流动画面:海与贴屏的一层,沙飞到了先沿弹簧滑近再贴上,贴上以后一直贴着;河上的沙跟着流走,流出屏外从上游进来
    'v+=f*uDt;float sp=length(v);if(sp>4.5)v*=4.5/sp;p+=v*uDt;if(!hold&&gFlow>.5&&fly<.5){float dd=length(T-p);if(gFlow>1.5?s.z==0.&&s.w==0.||dd<.004:dd>.15&&gS<.01){p=T;v=vec2(0.);}}o=vec4(p,v);}';
  var PT_DECL = COMMON + '\nuniform float uDpr,uFade,uDecay,uPt0,uPt1,uVar0,uVar1,uVan;uniform vec3 uGlow0,uGlow1,uDark;uniform sampler2D uS1,uS2;' +
    'vec3 unpack(float v){float r=floor(v/65536.);float g=floor((v-r*65536.)/256.);float bb=v-r*65536.-g*256.;return vec3(r,g,bb)/255.;}';
  var PT_BODY = 'void main(){int id=gl_VertexID;ivec2 ij=ivec2(id%uTW,id/uTW);vec4 s=texelFetch(uState,ij,0),sd=texelFetch(uSeed,ij,0),p1=texelFetch(uP1,ij,0),q1=texelFetch(uQ1,ij,0),p0=texelFetch(uP0,ij,0);' +
    'vec2 uvB;float alB,uB,dkB;resolve(p1,q1,uA1,uLay1,uTm1,uvB,alB,uB,dkB);float ts=uT0+uDur*delayOf(uvB,sd.x);bool sw=uTime>=ts;float q=clamp((uTime-ts)/(uDur*.55),0.,1.);' +
    'vec3 cB=mix(unpack(p1.z),unpack(q1.w),uB);cB=mix(cB,uDark,2.*dkB*(1.-dkB));float aB=fract(p1.w)*alB*vigm(uvB,uVig1,uFe1);' +
    'vec3 col=cB;float af=aB;float beh=floor(p1.w);vec2 P=s.xy;float mq=1.,fA=0.,fB=floor(p1.w)==5.?1.:0.,zA=uPt0*mix(1.,.7+.75*sd.y,uVar0),zB=uPt1*mix(1.,.7+.75*sd.y,uVar1);' +
    // 换幕:每颗沙从上一幕飞到下一幕,路上带着涡流;按扫过的方向先后起飞。换幕被打断时,从每颗沙此刻的样子(快照)出发
    'if(!sw||q<1.){vec3 rA,rB=cB;float aA;' +
    'if(uSnap>.5){vec4 s1=texelFetch(uS1,ij,0),s2=texelFetch(uS2,ij,0);rA=s1.rgb;aA=s1.a;zA=s2.x;if(aA<.004)rA=rB;if(fract(p1.w)<.02)rB=rA;}' +
    'else{vec4 q0=texelFetch(uQ0,ij,0);vec2 uvA;float alA,uA,dkA;resolve(p0,q0,uA0,uLay0,uTm0,uvA,alA,uA,dkA);' +
    'vec3 cA=mix(unpack(p0.z),unpack(q0.w),uA);cA=mix(cA,uDark,2.*dkA*(1.-dkA));aA=fract(p0.w)*alA*vigm(uvA,uVig0,uFe0)*mix(1.,vigm(uvA,uVig1,uFe1),uVigT);' +
    'rA=cA;if(fract(p0.w)<.02)rA=rB;if(fract(p1.w)<.02)rB=rA;fA=floor(p0.w)==5.?1.:0.;}' +
    'mq=sw?smoothstep(0.,1.,q):0.;col=mix(rA,rB,mq);af=sw?mix(aA,aB,q):aA;beh=sw?floor(p1.w):uSnap>.5?0.:floor(p0.w);}' +
    'if(sd.w<.07&&(sw?uShed1>.5&&q>=1.:uShed0>.5)){float ph=fract(uTime/13.+sd.x*9.1);af*=ph<.6?1.:ph<.9?1.-(ph-.6)/.3:pow((ph-.9)/.1,2.);}';
  var PT_VS = PT_DECL + 'out vec4 vC;' + PT_BODY +
    // 一道光慢慢扫过东西的亮处
    // 一道道浪头朝岸边推过来
    'if(beh==7.){float dd=clamp(p1.y/300.,0.,1.),cp=fract(dd*2.4+uTime/5.5+.08*sin(p1.x*.006));col=mix(col,vec3(.98,.97,.93),smoothstep(.9,1.,cp)*(1.-dd*.8)*.7);}' +
    'vec3 gw=sw?uGlow1:uGlow0;col*=.95+.1*sd.z;if(beh==6.){float sb=fract(uTime*.085-dot(P,sw?uSheenD1:uSheenD0)*.2);col=mix(col,gw,(sw?uSheen1:uSheen0)*exp(-pow((sb-.5)*8.,2.)));}if(beh==3.)col=mix(col,gw,.3+.22*sin(uTime*1.7+sd.y*6.));if(beh==2.)col=mix(col,gw,.3+.25*sin(uTime*6.+sd.w*20.));' +
    // 原地消散:每颗沙朝自己的方向散开一点,同时很快淡去
    'if(uVan>0.){vec2 dv=vec2(cos(6.2832*sd.z),sin(6.2832*sd.z))*(.3+.7*sd.w);P+=dv*uVan*uVan*.09+.025*uVan*vec2(sin(sd.x*40.+uTime),cos(sd.y*40.+uTime));af*=pow(1.-uVan,1.6);}' +
    'float f5=mix(fA,fB,mq),al=af*uFade*(1.-.2*f5);al=al*(1.-uDecay)/(1.-uDecay*al);' +
    'gl_Position=vec4(P.x/uAspect,P.y,0.,1.);gl_PointSize=max(1.,mix(zA,zB,mq)*uDpr*(1.+.35*f5));vC=vec4(col*al,al);}';
  // 快照:把每颗沙此刻的底色、不透明度与点径写进两张和状态一样大的图,一颗沙一格;下一次换幕从这里渐变出去
  var SNAP_VS = PT_DECL + 'out vec4 vS1,vS2;' + PT_BODY +
    'if(uVan>0.)af*=pow(1.-uVan,1.6);float f5=mix(fA,fB,mq);vS1=vec4(col,af*uFade*(1.-.2*f5));vS2=vec4(mix(zA,zB,mq)*(1.+.35*f5),0.,0.,0.);' +
    'vec2 tz=vec2(textureSize(uState,0));gl_Position=vec4((vec2(ij)+.5)/tz*2.-1.,0.,1.);gl_PointSize=1.;}';
  var SNAP_FS = '#version 300 es\nprecision highp float;in vec4 vS1,vS2;layout(location=0) out vec4 o0;layout(location=1) out vec4 o1;void main(){o0=vS1;o1=vS2;}';
  var ATM_VS = '#version 300 es\nprecision highp float;uniform float uTime,uWT,uDpr,uGust,uAtmo,uDecay,uNB,uNH,uDk,uAspect,uObjA,uBeach,uBedA;uniform vec2 uBed;uniform vec4 uObj;uniform vec3 uObjC;out vec4 vC;' +
    'float hu(uint x){x^=x>>16;x*=0x7feb352dU;x^=x>>15;x*=0x846ca68bU;x^=x>>16;return float(x)/4294967295.;}' +
    'void main(){uint i=uint(gl_VertexID);float id=float(gl_VertexID),r1=hu(i*5u),r2=hu(i*5u+1u),r3=hu(i*5u+2u),r4=hu(i*5u+3u),r5=hu(i*5u+4u);vec2 uv;float a,sz;vec3 col;' +
    // 沙床:上沿软而起伏,越往下越厚,风吹出一道道细纹;靠字的一侧淡一些;带一点这件东西的颜色
    'if(id<uNB){float x=-.03+1.06*r1,top=uBed.x+.011*sin(x*11.+1.3)+.016*sin(x*4.1+.4),d=pow(r2,.8)*uBed.y;uv=vec2(x,top+d);' +
    'float rip=.5+.5*sin(d*430.+6.*sin(x*uAspect*4.3+1.7));a=(.12+.3*r3*r3)*smoothstep(0.,.05,d)*rip*(1.-.45*smoothstep(.45,0.,x));' +
    'col=mix(vec3(.86,.78,.64),vec3(.7,.6,.45),r4);col=mix(col,uObjC,.18*uObjA);sz=1.2+1.6*r5;' +
    // 海滩:浪涌到过的地方沙是湿的,颜色深一些
    'a*=uBedA;' +
    'a*=1.-uBeach;}' +
    // 东西四周的沙雾:颜色取自这件东西,朝外、朝字那边散开,随风微微起伏
    'else if(id<uNH){float rr=sqrt(-2.*log(max(r1,1e-4)))*.62,an=6.2832*r2;vec2 o=vec2(cos(an),sin(an))*rr;o.x*=1.+.5*step(o.x,0.);uv=uObj.xy+o*uObj.zw+.015*vec2(sin(uWT*.3+r3*6.283),cos(uWT*.27+r4*6.283));' +
    'a=(.035+.1*r4*r4)*exp(-rr*rr*.9)*uObjA;col=mix(uObjC,vec3(.86,.78,.64),.35+.3*r5);sz=1.6+2.4*r3;}' +
    // 空中的细尘:随风从右往左,上下起伏;换页时风大,卷起来;经过左上的光时一闪
    'else{float x=fract(r1-uWT*(.005+.014*r3)),y=.1+.88*pow(r2,.7);y+=.012*sin(uWT*.6+r4*6.283)+uGust*.035*sin(x*14.+uTime*2.1+r5*6.);x+=uGust*.02*sin(y*12.+uTime*1.7);uv=vec2(x,y);' +
    'a=(.14+.36*r4*r4)*smoothstep(0.,.06,x)*smoothstep(1.,.94,x);float tw=step(.86,r5)*max(0.,sin(uTime*1.3+r1*50.))*(1.-smoothstep(.25,.9,x+y*.5));a*=1.+1.2*tw;' +
    'col=mix(vec3(.7,.6,.44),vec3(.88,.79,.6),r3);col=mix(col,vec3(1.,.92,.74),tw*.7);sz=1.3+2.*r4*r4;}' +
    'a=clamp(a*uAtmo*mix(1.,.6,uDk),0.,1.);a=a*(1.-uDecay)/(1.-uDecay*a);gl_Position=vec4(uv.x*2.-1.,1.-uv.y*2.,0.,1.);gl_PointSize=sz*uDpr;vC=vec4(col*a,a);}';
  var NB = small ? 30000 : 96000, NH = NB + (small ? 5000 : 16000), NA = NH + (small ? 2500 : 6000);
  var PT_FS = '#version 300 es\nprecision highp float;in vec4 vC;out vec4 o;void main(){vec2 q=gl_PointCoord*2.-1.;float d=length(q);o=vC*(1.-smoothstep(.35,1.,d));if(o.a<.0005)discard;}';
  var FADE_FS = '#version 300 es\nprecision highp float;uniform float uDecay;out vec4 o;void main(){o=vec4(0.,0.,0.,1.-uDecay);}';
  var COPY_FS = '#version 300 es\nprecision highp float;uniform sampler2D uAcc;in vec2 vUV;out vec4 o;void main(){o=texture(uAcc,vUV);}';
  function prog(vs, fs) {
    function sh(t, s) { var x = gl.createShader(t); gl.shaderSource(x, s); gl.compileShader(x); if (!gl.getShaderParameter(x, gl.COMPILE_STATUS)) throw new Error(gl.getShaderInfoLog(x)); return x; }
    var p = gl.createProgram(); gl.attachShader(p, sh(gl.VERTEX_SHADER, vs)); gl.attachShader(p, sh(gl.FRAGMENT_SHADER, fs)); gl.linkProgram(p);
    if (!gl.getProgramParameter(p, gl.LINK_STATUS)) throw new Error(gl.getProgramInfoLog(p));
    var u = {}, n = gl.getProgramParameter(p, gl.ACTIVE_UNIFORMS);
    for (var k = 0; k < n; k++) { var info = gl.getActiveUniform(p, k); u[info.name.replace(/\[0\]$/, '')] = gl.getUniformLocation(p, info.name); }
    return { p: p, u: u };
  }
  var UPD, PT, SNAP, FADE, COPY, ATM;
  try { UPD = prog(QUAD_VS, UPD_FS); PT = prog(PT_VS, PT_FS); SNAP = prog(SNAP_VS, SNAP_FS); ATM = prog(ATM_VS, PT_FS); FADE = prog(QUAD_VS, FADE_FS); COPY = prog(QUAD_VS, COPY_FS); }
  catch (err) { console.warn('sand:', err.message); cvs.parentNode.removeChild(cvs); root.classList.remove('sand-on', 'sand-init'); return; }
  gl.bindVertexArray(gl.createVertexArray());

  function resizeGL() {
    cvs.width = Math.round(W * dpr); cvs.height = Math.round(H * dpr);
    if (acc) gl.deleteTexture(acc);
    acc = tex(null, cvs.width, cvs.height, true); accFb = fbo(acc);
    gl.clearColor(0, 0, 0, 0); gl.clear(gl.COLOR_BUFFER_BIT); gl.bindFramebuffer(gl.FRAMEBUFFER, null);
  }
  resizeGL();

  /* ───────── 幕的编排 ───────── */
  var van = 0, vanTo = 0, gust = 0, wt = 0, atmo = 0, bed = null, obj = [.7, .6, .2, .2], objC = [.8, .7, .55], objA = 0, beach = 0, bedA = 1;
  // 海滩:浪边(最靠上处、往下涌多远)与海平线,屏幕比例;scenes.js 从 V 里取同一份来画沙滩和落日
  // 海平线(Zikaron 页末的立石,是那片原野的天边):海和沙滩合起来占页面略多于三分之一;无论窗口多矮,总在卡片下方留一段空
  var toolsCap = caps.filter(function (x) { var c = x.getAttribute('data-cap'); return c === 'tools' || c === 'zend'; })[0], hzv = null;
  function horizon() {
    if (hzv == null) { var hz = portrait ? .6 : .63, b = toolsCap && toolsCap.offsetHeight ? toolsCap.offsetTop + toolsCap.offsetHeight : 0; hzv = b ? Math.min(.8, Math.max(hz, b / H + .06)) : hz; }
    return hzv;
  }
  function shoreLine() { var hz = horizon(); return [hz + (1 - hz) * .56, (1 - hz) * .13]; }
  var time = 0, t0 = -10, dur = 1.8, spread = .6, sweep = 0, sc = [.5, .5], decay = .2, curl = 1;
  var active = -1, captionAt = Infinity, scrollScene = -1, etym = false;
  function hideCaps() {
    caps.forEach(function (c) {
      if (!c.classList.contains('on')) return;
      c.classList.remove('on'); c.classList.add('off');
      setTimeout(function () { c.classList.remove('off'); }, 700);
    });
  }
  var SW = { x: 0, '-x': 1, y: 2, '-y': 3, r: 4 };
  function upload(t, data) { gl.bindTexture(gl.TEXTURE_2D, t); gl.texSubImage2D(gl.TEXTURE_2D, 0, 0, 0, TW, TH, gl.RGBA, gl.FLOAT, data); }
  var actBuf = new Float32Array(MAXA * 12);
  function writeActors(slot, tm) {
    var d = slot.data; if (!d) return;
    var acts = d.actors;
    if (!d.drain) { d.tick(reduced ? (d.sc.still != null ? d.sc.still : 30) : tm, time); world(acts); }
    for (var i = 0; i < acts.length && i < MAXA; i++) {
      var a = acts[i], o = i * 12;
      if (a.raw) { for (var j = 0; j < 12; j++) actBuf[o + j] = a.raw[j]; continue; }
      actBuf[o] = a.tx; actBuf[o + 1] = a.ty; actBuf[o + 2] = a.m00; actBuf[o + 3] = a.m01;
      actBuf[o + 4] = a.m10; actBuf[o + 5] = a.m11; actBuf[o + 6] = a.al; actBuf[o + 7] = a.m || 0;
      actBuf[o + 8] = a.vR || 0; actBuf[o + 9] = a.vx || 0; actBuf[o + 10] = a.vy || 0; actBuf[o + 11] = a.flags || 0;
    }
    gl.bindTexture(gl.TEXTURE_2D, slot.tA); gl.texSubImage2D(gl.TEXTURE_2D, 0, 0, 0, Math.min(acts.length, MAXA) * 3, 1, gl.RGBA, gl.FLOAT, actBuf.subarray(0, Math.min(acts.length, MAXA) * 12));
  }
  var pending = null, pendingAt = 0, urgent = false;
  function snapshot() {
    var w = 1 - snapK;
    gl.bindFramebuffer(gl.FRAMEBUFFER, snaps[w].fb); gl.drawBuffers([gl.COLOR_ATTACHMENT0, gl.COLOR_ATTACHMENT1]); gl.viewport(0, 0, TW, TH); gl.disable(gl.BLEND);
    gl.clearColor(0, 0, 0, 0); gl.clear(gl.COLOR_BUFFER_BIT);
    gl.useProgram(SNAP.p); bindSlots(SNAP); gl.uniform1f(SNAP.u.uFade, 1); gl.uniform1f(SNAP.u.uVan, van); if (SNAP.u.uDark) gl.uniform3f(SNAP.u.uDark, .2, .18, .22);
    gl.drawArrays(gl.POINTS, 0, N);
    gl.bindFramebuffer(gl.FRAMEBUFFER, null);
    snapK = w; snapOn = 1;
  }
  function play(si, quick) {
    if (si === active) { pending = null; return; }
    // 滑到只有正文的一幕:沙不飞走,原地散开淡去;从那里滑回刚才那一幕,沙在原地聚回来
    var tgt = SCENES[si];
    if (tgt.vanish && to.data && !to.data.drain) { active = si; vanTo = reduced ? 0 : 1; if (reduced) van = 1; captionAt = time + .05; hideCaps(); return; }
    if (vanTo && to.data && to.data.sc === tgt) { active = si; vanTo = 0; captionAt = time + .1; hideCaps(); return; }
    // 同一片景(工具与深入了解的海滩):沙不动,只换字和卡片
    var cur0 = SCENES[active], nx = SCENES[si];
    if (!quick && cur0 && nx.world && cur0.world === nx.world && to.data && to.data.sc && to.data.sc.world === nx.world) {
      var on0 = caps.some(function (c) { return c.classList.contains('on'); });
      active = si; captionAt = time + (on0 ? .3 : .05); hideCaps(); return;
    }
    var s = SCENES[si], w = s.sweep || {}, d = cache[si] || (s.drain || s.vanish ? prepare(si) : null);
    // 没备好:挂着等。开场、点开词源、窗口变了,要马上备;一路滑动时,停下来的那一页才备
    if (!d) { if (pending !== si) { pending = si; pendingAt = time; urgent = active < 0; } return; }
    pending = null;
    // 上一次换幕还没演完(或沙正在原地淡去)就换:以每颗沙此刻的样子为起点,当作上一幕的画;起飞先后、飞行与落定都和正常换幕一样
    var cut = !reduced && !!to.data && (time - t0 < dur * (spread + .22 + .55) + .3 || van > .01);
    if (cut) snapshot(); else snapOn = 0;
    van = 0; vanTo = 0;
    var samePage = active >= 0 && SCENES[active] && SCENES[active].cap === s.cap;
    var anyOn = caps.some(function (c) { return c.classList.contains('on'); });
    var old = to; from = old; to = slots[0] === old ? slots[1] : slots[0];
    to.data = d; to.t0 = time; upload(to.tP, d.P); upload(to.tQ, d.Q);
    // 字先出来,画随后成形:只看字的人不必等
    active = si; t0 = time + (s.sync ? 0 : .15);
    dur = reduced ? .01 : (quick ? .8 : (s.dur || 2.2)); spread = w.spread == null ? .55 : w.spread; sweep = SW[w.type || 'x']; sc = w.c || [.5, .5];
    // 旧字先顺着风散开,新字随后聚拢;都在画成形之前
    // sync 的一幕(海滩):沙一换页就散开,字和卡片稍后随着沙的散开一起出来
    if (!samePage) { captionAt = time + (s.sync ? .45 : anyOn ? .3 : .05); hideCaps(); }
    curl = 1;
    root.style.setProperty('--ground', s.ground ? s.ground[theme() ? 1 : 0] : '');
    root.setAttribute('data-mood', s.mood || '');
    prefetch();
  }
  // 往后几幕在空闲时先画好
  var pq = [], pumping = false, idle = window.requestIdleCallback || function (f) { return setTimeout(function () { var t = performance.now(); f({ timeRemaining: function () { return Math.max(0, 12 - (performance.now() - t)); } }); }, 50); };
  // 顶栏链接直达的几幕(首页的工具)也先备着:点下去就能从沙现在的位置直接飞过去,不必先等
  var navHot = null;
  function hot() {
    if (navHot) return navHot;
    navHot = [];
    [].forEach.call(document.querySelectorAll('.top a[href*="#"]'), function (a) {
      var id = a.getAttribute('href').split('#')[1], e = id && document.getElementById(id), host = e && e.closest('[data-scene]'), si = host ? sceneIndex(host.getAttribute('data-scene')) : -1;
      if (si >= 0 && navHot.indexOf(si) < 0) navHot.push(si);
    });
    // 点开才演的词源也先备着
    var ei = document.querySelector('[data-etym]') ? sceneIndex('etym') : -1;
    if (ei >= 0 && navHot.indexOf(ei) < 0) navHot.push(ei);
    return navHot;
  }
  function prefetch() {
    pq = [];
    for (var d = 1; d <= 4; d++) if (active + d < SCENES.length) pq.push(active + d);
    for (d = 1; d <= 2; d++) if (active - d >= 0) pq.push(active - d);
    hot().forEach(function (si) { if (si !== active && pq.indexOf(si) < 0) pq.push(si); });
    pump();
  }
  function settled() { return time - t0 > dur * (spread + .22 + .55) + .3; }
  // 后台线程一次只做一幕:它手上有活时,新的一幕排队
  function busy() { for (var k in inflight) if (inflight[k].sent && inflight[k].gen === gen) return true; return false; }
  function pump() {
    if (pumping) return; pumping = true;
    idle(function (dl) {
      pumping = false;
      if (busy()) return;   // 手上这一幕交回来时会再叫一次
      while (pq.length && (cache[pq[0]] || SCENES[pq[0]].drain || SCENES[pq[0]].vanish)) pq.shift();
      var si = pq[0]; if (si == null) return;
      // 沙在飞的时候不动手;落定之后按角色切成小段作画,塞进空闲时间
      if (!settled()) { setTimeout(pump, 120); return; }
      var f = inflight[si];
      if (!f || f.gen !== gen) { f = begin(si); if (!f) { pq.push(pq.shift()); setTimeout(pump, 300); return; } inflight[si] = f; }
      var doneAll = false;
      do { doneAll = paintNext(f); } while (!doneAll && dl.timeRemaining() > 6);
      if (doneAll) { pq.shift(); send(f); }
      pump();
    }, { timeout: 1500 });
  }

  var els = [].slice.call(document.querySelectorAll('[data-scene]')), tops = null;
  function measureTops() { var y = scrollY; tops = els.map(function (e) { return e.getBoundingClientRect().top + y; }); hzv = null; }
  function sceneIndex(id) { for (var k = 0; k < SCENES.length; k++) if (SCENES[k].id === id) return k; return -1; }
  function readScroll() {
    // 每一幕在它的段落顶端越过视口中线时开演;页尾的说明一露头,沙就先让开
    var idx = 0;
    if (!tops) measureTops();
    var y = scrollY;
    for (var k = 0; k < els.length; k++) if (tops[k] - y <= H * (els[k].classList.contains('after') ? .88 : .5)) idx = k;
    var si = sceneIndex(els[idx].getAttribute('data-scene'));
    if (si >= 0 && si !== scrollScene) { scrollScene = si; etym = false; root.setAttribute('data-act', SCENES[si].id); play(si); }
  }
  // 词源:不随滚动,点开才演
  document.addEventListener('click', function (e) {
    if (!on) return;
    var t = e.target.closest && e.target.closest('[data-etym]');
    if (t) { e.preventDefault(); var si = sceneIndex('etym'); if (si < 0) return; etym = true; active = -1; play(si); return; }
    var b = e.target.closest && e.target.closest('[data-etym-back]');
    if (b) { e.preventDefault(); etym = false; active = -1; play(scrollScene); }
  });
  var mqDark = matchMedia('(prefers-color-scheme: dark)'), dark = mqDark.matches;
  mqDark.addEventListener('change', function () { dark = mqDark.matches; });
  function theme() { var t = root.getAttribute('data-theme'); return t ? t === 'dark' : dark; }

  /* ───────── 循环 ───────── */
  var cur = 0, last = performance.now();
  function bindSlots(p) {
    var u = p.u, list = [[st[cur], 'uState'], [tSeed, 'uSeed'], [from.tP, 'uP0'], [from.tQ, 'uQ0'], [from.tA, 'uA0'], [to.tP, 'uP1'], [to.tQ, 'uQ1'], [to.tA, 'uA1']];
    for (var k = 0; k < list.length; k++) { gl.activeTexture(gl.TEXTURE0 + k); gl.bindTexture(gl.TEXTURE_2D, list[k][0]); if (u[list[k][1]]) gl.uniform1i(u[list[k][1]], k); }
    if (u.uS1) { gl.activeTexture(gl.TEXTURE8); gl.bindTexture(gl.TEXTURE_2D, snaps[snapK].a); gl.uniform1i(u.uS1, 8); gl.activeTexture(gl.TEXTURE9); gl.bindTexture(gl.TEXTURE_2D, snaps[snapK].b); gl.uniform1i(u.uS2, 9); }
    if (u.uSnap) gl.uniform1f(u.uSnap, snapOn);
    var fd = from.data || to.data, td = to.data;
    gl.uniform1i(u.uTW, TW); gl.uniform1i(u.uSweep, sweep); gl.uniform1f(u.uTime, time); gl.uniform1f(u.uT0, t0); gl.uniform1f(u.uDur, dur);
    gl.uniform1f(u.uSpread, spread); if (u.uSw) gl.uniform2fv(u.uSw, (to.data && to.data.sw) || [0, 1]); gl.uniform1f(u.uAspect, W / H); gl.uniform1f(u.uMotion, reduced ? 0 : 1); gl.uniform2f(u.uC, sc[0], sc[1]);
    if (u.uCurl) gl.uniform1f(u.uCurl, curl);
    // 各项按沙所在的那一幕取:还没起飞的沙照旧用上一幕的点径、高光与风,起飞后随自己的进度渐变到这一幕
    var l0 = look(fd), l1 = look(td);
    if (u.uAmb0) { gl.uniform1f(u.uAmb0, l0.amb); gl.uniform1f(u.uAmb1, l1.amb); } if (u.uShed0) { gl.uniform1f(u.uShed0, l0.shed); gl.uniform1f(u.uShed1, l1.shed); }
    if (u.uSheen0) { gl.uniform1f(u.uSheen0, l0.sheen); gl.uniform1f(u.uSheen1, l1.sheen); gl.uniform2fv(u.uSheenD0, l0.sheenD); gl.uniform2fv(u.uSheenD1, l1.sheenD); }
    if (u.uPt0) { gl.uniform1f(u.uPt0, l0.pt); gl.uniform1f(u.uPt1, l1.pt); gl.uniform1f(u.uVar0, l0.pv); gl.uniform1f(u.uVar1, l1.pv); gl.uniform3fv(u.uGlow0, l0.glow); gl.uniform3fv(u.uGlow1, l1.glow); }
    if (u.uShore) gl.uniform2fv(u.uShore, SHORE); if (u.uHz) gl.uniform1f(u.uHz, HZ);
    gl.uniform1f(u.uTm0, reduced ? 8 : time - from.t0); gl.uniform1f(u.uTm1, reduced ? 8 : time - to.t0); gl.uniform1f(u.uHdr, 58 / H);
    // 换幕时,上一幕的画先在新字的周围化开,和字的淡入同步
    if (u.uVigT) gl.uniform1f(u.uVigT, Math.max(0, Math.min(1, (time - t0 + .15) / .45)));
    gl.uniform4fv(u.uLay0, fd.lay); gl.uniform4fv(u.uLay1, td.lay); gl.uniform4fv(u.uVig0, fd.vig); gl.uniform4fv(u.uVig1, td.vig);
    var f0 = fd.fe || [.1, .1, 1], f1 = td.fe || [.1, .1, 1]; gl.uniform3f(u.uFe0, f0[0], f0[1], f0[2] == null ? 1 : f0[2]); gl.uniform3f(u.uFe1, f1[0], f1[1], f1[2] == null ? 1 : f1[2]);
  }
  // 一幕的点径、点径的参差、高光色、扫光、风吹细沙、原地微动;开场与散尽的那一份沙看不见,用默认值
  var LOOK0 = { pt: 1, pv: 1, glow: [.97, .78, .5], sheen: 0, sheenD: [1, -.8], shed: 0, amb: 1 };
  function look(d) {
    if (!d || !d.sc) { LOOK0.pt = grain(); return LOOK0; }
    if (!d.look) { var s = d.sc; d.look = { pt: d.pt || grain(), pv: d.pv != null ? d.pv : 1, glow: s.glow || LOOK0.glow, sheen: s.sheen || 0, sheenD: s.sheenD || LOOK0.sheenD, shed: s.shed && !reduced ? 1 : 0, amb: s.ambient === false ? 0 : 1 }; }
    return d.look;
  }
  var SHORE = new Float32Array(2), HZ = 0;
  function step(dt) {
    time += dt;
    var sl0 = shoreLine(); SHORE[0] = sl0[0]; SHORE[1] = sl0[1]; HZ = horizon();
    readScroll();
    // 等着的一幕:备好了就开演;还没备好,在这一页停够一会儿、后台线程也空着,才动手备它(一路滑过去的页不白画)
    if (pending != null) {
      var pp = pending, pf = inflight[pp];
      if (cache[pp]) { pending = null; play(pp); }
      else if (!(pf && pf.gen === gen && pf.sent) && (urgent || time - pendingAt > .12) && !busy()) prepare(pp);
    }
    if (!to.data) return;
    if (time >= captionAt) { captionAt = Infinity; var c = capOf(active); if (c) { c.classList.remove('off'); c.classList.add('on'); } }
    var moving = time - t0 < dur * (spread + .22 + .55) + .3;
    writeActors(to, time - to.t0);
    if (moving && from.data) writeActors(from, time - from.t0);
    decay += ((moving && !reduced ? .6 : .26) - decay) * Math.min(1, dt * 3);
    van += (vanTo - van) * Math.min(1, dt * (vanTo ? 5 : 3));
    // 换页时风起,落定后风停;沙床随这一幕挪到东西脚下
    var sa = SCENES[active] || {}, kk = Math.min(1, dt * 1.6);
    gust += ((moving && !reduced ? 1 : 0) - gust) * kk; wt += dt * (reduced ? 0 : 1 + 3 * gust);
    atmo += ((sa.atmo ? 1 : 0) - atmo) * Math.min(1, dt * (sa.vanish ? 6 : 1.2));
    var tb = to.data.bed || bedOf(active); if (!bed) bed = tb.slice(); bed[0] += (tb[0] - bed[0]) * kk; bed[1] += (tb[1] - bed[1]) * kk;
    // 沙雾跟着东西挪;没有东西的一幕,沙雾原地淡去,不缩成一团
    var to4 = to.data.obj || obj, tc = to.data.objC || objC;
    objA += ((to.data.obj && !sa.vanish ? 1 : 0) - objA) * kk; beach += ((sa.beach ? 1 : 0) - beach) * kk; bedA += ((sa.nobed ? 0 : 1) - bedA) * kk;
    for (var e = 0; e < 4; e++) obj[e] += (to4[e] - obj[e]) * kk * .8;
    for (e = 0; e < 3; e++) objC[e] += (tc[e] - objC[e]) * kk * .8;
    gl.useProgram(UPD.p); bindSlots(UPD); gl.uniform1f(UPD.u.uDt, dt);
    gl.bindFramebuffer(gl.FRAMEBUFFER, fb[1 - cur]); gl.viewport(0, 0, TW, TH); gl.disable(gl.BLEND); gl.drawArrays(gl.TRIANGLES, 0, 3);
    cur = 1 - cur;
  }
  function draw() {
    if (!to.data) return;
    gl.bindFramebuffer(gl.FRAMEBUFFER, accFb); gl.viewport(0, 0, cvs.width, cvs.height); gl.enable(gl.BLEND);
    gl.useProgram(FADE.p); gl.uniform1f(FADE.u.uDecay, decay); gl.blendFunc(gl.ZERO, gl.ONE_MINUS_SRC_ALPHA); gl.drawArrays(gl.TRIANGLES, 0, 3);
    gl.blendFunc(gl.ONE, gl.ONE_MINUS_SRC_ALPHA);
    if (atmo > .01 && bed) {
      var au = ATM.u; gl.useProgram(ATM.p);
      gl.uniform1f(au.uTime, time); gl.uniform1f(au.uWT, wt); gl.uniform1f(au.uDpr, dpr); gl.uniform1f(au.uGust, gust); gl.uniform1f(au.uAtmo, atmo); gl.uniform1f(au.uDecay, decay);
      gl.uniform1f(au.uNB, NB); gl.uniform1f(au.uNH, NH); gl.uniform1f(au.uObjA, objA); gl.uniform1f(au.uBeach, beach); gl.uniform1f(au.uBedA, bedA); gl.uniform4fv(au.uObj, obj); gl.uniform3fv(au.uObjC, objC); gl.uniform1f(au.uDk, theme() ? 1 : 0); gl.uniform1f(au.uAspect, W / H); gl.uniform2f(au.uBed, bed[0], bed[1]);
      gl.drawArrays(gl.POINTS, 0, NA);
    }
    gl.useProgram(PT.p); bindSlots(PT);
    gl.uniform1f(PT.u.uDpr, dpr); gl.uniform1f(PT.u.uFade, 1); gl.uniform1f(PT.u.uDecay, decay); gl.uniform3f(PT.u.uDark, .2, .18, .22); gl.uniform1f(PT.u.uVan, van);
    gl.drawArrays(gl.POINTS, 0, N);
    gl.bindFramebuffer(gl.FRAMEBUFFER, null); gl.viewport(0, 0, cvs.width, cvs.height); gl.disable(gl.BLEND); gl.clearColor(0, 0, 0, 0); gl.clear(gl.COLOR_BUFFER_BIT);
    gl.useProgram(COPY.p); gl.activeTexture(gl.TEXTURE0); gl.bindTexture(gl.TEXTURE_2D, acc); gl.uniform1i(COPY.u.uAcc, 0); gl.drawArrays(gl.TRIANGLES, 0, 3);
  }
  function frameLoop(now) {
    var dt = Math.min(1 / 30, Math.max(0, (now - last) / 1000)); last = now;
    if (on) { step(dt); draw(); }
    requestAnimationFrame(frameLoop);
  }
  // 开场:沙从下边升起
  slots.forEach(function (sl) { sl.data = START; upload(sl.tP, sl.data.P); upload(sl.tQ, sl.data.Q); writeActors(sl, 0); });
  var rt = null;
  addEventListener('resize', function () {
    clearTimeout(rt);
    rt = setTimeout(function () {
      var was = on; measure(); applyOn(); root.classList.toggle('portrait', portrait); resizeGL(); cache = {}; inflight = {}; gen++; measureTops();
      if (on && !was) { active = -1; scrollScene = -1; readScroll(); }
      else if (active >= 0) { var a = active; active = -1; play(a, true); }
    }, 180);
  });
  root.classList.toggle('portrait', portrait);
  void root.offsetHeight; getComputedStyle(caps[0] || root).opacity;
  setTimeout(function () { root.classList.remove('sand-init'); }, 60);
  // 页面高度一变(字体到了、下半截的内容长高了),段落的位置重量一次
  if (window.ResizeObserver) new ResizeObserver(function () { measureTops(); }).observe(document.body);
  // 地址带着某一幕的锚点(顶栏的「工具」):沙画换了版式,先照新版式落到那一幕的顶上再开演,免得先演一下别的幕
  var hashEl = location.hash.length > 1 && document.getElementById(decodeURIComponent(location.hash.slice(1))), hashHost = hashEl && hashEl.closest('[data-scene]');
  if (on && hashHost) { try { scrollTo({ top: hashHost.getBoundingClientRect().top + scrollY, behavior: 'instant' }); } catch (e) { scrollTo(0, hashHost.getBoundingClientRect().top + scrollY); } measureTops(); }
  if (on) readScroll();
  // 竖屏的画按字的高度取景;字体晚到、字高变了,就重新取景
  if (document.fonts && document.fonts.ready) document.fonts.ready.then(function () {
    measureTops();
    if (!on || active < 0 || !cache[active]) return;
    var v = vigOf(active), o = cache[active].vig;
    if (Math.abs(v[1] - o[1]) + Math.abs(v[2] - o[2]) + Math.abs(v[3] - o[3]) < .01) return;
    cache = {}; inflight = {}; gen++; var a = active; active = -1; play(a, true);
  });
  requestAnimationFrame(frameLoop);
  matchMedia('(prefers-color-scheme: dark)').addEventListener('change', function () { if (active >= 0) root.style.setProperty('--ground', SCENES[active].ground ? SCENES[active].ground[theme() ? 1 : 0] : ''); });
  window.__sand = {
    N: N, scenes: function () { return SCENES.map(function (s) { return s.id; }); }, state: function () { return { active: SCENES[active] && SCENES[active].id, time: time, tm: time - to.t0 }; },
    tick: function (n) { var k; for (k = 0; k < n - 30; k++) step(1 / 60); gl.bindFramebuffer(gl.FRAMEBUFFER, accFb); gl.clearColor(0, 0, 0, 0); gl.clear(gl.COLOR_BUFFER_BIT); for (k = 0; k < Math.min(30, n); k++) { step(1 / 60); draw(); } gl.finish(); },
    seek: function (tm) { to.t0 = time - tm; },
    frame: function () { step(1 / 60); draw(); gl.finish(); },
    digest: function (id, viaWorker) {
      var si = sceneIndex(id); delete cache[si]; delete inflight[si];
      var h32 = function (d) { var h = 2166136261 >>> 0, u = [new Uint32Array(d.P.buffer), new Uint32Array(d.Q.buffer)]; for (var a = 0; a < 2; a++) for (var k = 0; k < u[a].length; k++) { h ^= u[a][k]; h = Math.imul(h, 16777619) >>> 0; } return h.toString(16) + ':' + (d.sw || []).map(function (x) { return x.toFixed(6); }).join(','); };
      if (!viaWorker) { var d = prepare(si, true); return d ? h32(d) : null; }
      return new Promise(function (res) { var t = performance.now(), tick = function () { var d = prepare(si); if (d) res([h32(d), Math.round(performance.now() - t)]); else setTimeout(tick, 5); }; tick(); });
    },
    counts: function (id) { var d = prepare(sceneIndex(id), true), c = {}; for (var k = 0; k < N; k++) { var a = Math.floor(d.Q[k * 4 + 2]); c[a] = (c[a] || 0) + 1; } return c; },
    prepMs: function (id) { var si = sceneIndex(id), t = performance.now(); delete cache[si]; delete inflight[si]; prepare(si, true); return Math.round(performance.now() - t); },
    actorMs: function (id) { var si = sceneIndex(id), f = begin(si), out = []; if (!f) return null; while (f.i < f.acts.length) { var t = performance.now(), k = f.i; paintNext(f); out.push([k, Math.round(performance.now() - t)]); } return out; },
    mainMs: function (id) { var si = sceneIndex(id), t = performance.now(); if (SCENES[si].drain || SCENES[si].vanish) return null; delete cache[si]; delete inflight[si]; var f = begin(si); if (!f) return null; var t1 = performance.now(); while (!paintNext(f)) {} var t2 = performance.now(); jobOf(f); return { stage: Math.round(t1 - t), paint: Math.round(t2 - t1), job: Math.round(performance.now() - t2) }; }
  };
})();
