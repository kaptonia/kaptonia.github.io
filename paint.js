/* 笔法:扁平、意会。每样东西只用一两块平涂的颜色,形状取最简单的轮廓,边缘是虚的;
   人是没有脸的一截色块加一个圆,山是一条色带。画完再模糊一遍,由 sand.js 撒成沙。 */
window.PAINT = (function () {
  'use strict';
  var g, b, R, SP = 1;

  /* ───────── 随机与噪声 ───────── */
  function rng(a) { return function () { a |= 0; a = a + 0x6D2B79F5 | 0; var t = Math.imul(a ^ a >>> 15, 1 | a); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; }; }
  function hash(n) { n = Math.sin(n * 127.1 + 311.7) * 43758.5453; return n - Math.floor(n); }
  function noise(x) { var i = Math.floor(x), f = x - i, u = f * f * (3 - 2 * f); return hash(i) * (1 - u) + hash(i + 1) * u; }
  function fbm(x) { return noise(x) * .6 + noise(x * 2.3 + 17) * .28 + noise(x * 5.1 + 41) * .12; }
  function bind(ctx, bctx, seed, sp) { g = ctx; b = bctx; R = rng(seed || 1); SP = sp || 1; }
  function rnd(a, c) { return a + (c - a) * R(); }

  /* ───────── 颜色:低饱和、彼此相亲的几块 ───────── */
  var C = {
    skyLow: '#f3e1c6', skyMid: '#f0e2da', skyTop: '#f1eeea', dusk: '#e6cfd2', night: '#c9ccdc', rosewash: '#f0d8d0', lilac: '#e3dce8', blue: '#dbe5ea',
    far: '#cdc4d6', far2: '#d3c6c4', hill: '#bcc29e', hill2: '#cdb98e', meadow: '#b3bd92', grass: '#a9b388', rose: '#d4a89c',
    ochre: '#d7b688', umber: '#b8977a', earth: '#c9ab86', sand: '#e5d1a8', sandSh: '#cdb48d', dune: '#dec59d',
    water: '#abc4d0', water2: '#94afbf', waterHi: '#e6eeef',
    stone: '#d4c7b2', stoneLit: '#e6dccb', stoneDk: '#b7a994', ash: '#c7c1ba',
    skin: '#ddbda1', skinDk: '#c4a086', hair: '#6f5d52',
    madder: '#b96f60', indigo: '#667694', olive: '#939060', ochreR: '#cea060', linen: '#ece2cf', umberR: '#8d6e5b', roseR: '#d09f97', slate: '#858e9a', teal: '#71908c', wine: '#8c5c62', saffron: '#dba95a',
    gold: '#e4bf74', gold2: '#f3d89a', fire: '#f1a65e', fire2: '#ffdaa0', leaf: '#a6b68f', leaf2: '#8b9e7b', leafLit: '#c4cc9a', bark: '#8f7765', terra: '#c98f75', moon: '#f2e9d4'
  };
  function hx(c) { if (Array.isArray(c)) return c; if (c[0] === '#') return [parseInt(c.slice(1, 3), 16), parseInt(c.slice(3, 5), 16), parseInt(c.slice(5, 7), 16)]; return c.match(/[\d.]+/g).slice(0, 3).map(Number); }
  function rgba(c, a) { c = hx(c); return 'rgba(' + Math.round(c[0]) + ',' + Math.round(c[1]) + ',' + Math.round(c[2]) + ',' + (a == null ? 1 : a) + ')'; }
  function mix(c1, c2, t) { var a = hx(c1), d = hx(c2); return [a[0] + (d[0] - a[0]) * t, a[1] + (d[1] - a[1]) * t, a[2] + (d[2] - a[2]) * t]; }
  var LIGHT = [255, 236, 206], SHADOW = [92, 86, 108];
  function lit(c, k) { return k >= 0 ? mix(c, LIGHT, k) : mix(c, SHADOW, -k); }
  function vary(c, amt) { c = hx(c); var v = (R() - .5) * amt; return [c[0] + v * 255, c[1] + v * 255, c[2] + v * 255]; }
  function pick(list) { return list[(R() * list.length) | 0]; }

  /* ───────── 基本笔 ───────── */
  function trace(ctx, p, closed, smooth) {
    ctx.beginPath(); var n = p.length, i;
    if (!smooth || n < 3) { ctx.moveTo(p[0][0], p[0][1]); for (i = 1; i < n; i++) ctx.lineTo(p[i][0], p[i][1]); if (closed) ctx.closePath(); return; }
    if (closed) { ctx.moveTo((p[0][0] + p[1][0]) / 2, (p[0][1] + p[1][1]) / 2); for (i = 1; i <= n; i++) { var a = p[i % n], c = p[(i + 1) % n]; ctx.quadraticCurveTo(a[0], a[1], (a[0] + c[0]) / 2, (a[1] + c[1]) / 2); } ctx.closePath(); }
    else { ctx.moveTo(p[0][0], p[0][1]); for (i = 1; i < n - 1; i++) { var d = p[i], e = p[i + 1]; ctx.quadraticCurveTo(d[0], d[1], (d[0] + e[0]) / 2, (d[1] + e[1]) / 2); } ctx.lineTo(p[n - 1][0], p[n - 1][1]); }
  }
  function mark(p, beh, closed, w, smooth) {
    if (!beh) return; trace(b, p, closed, smooth !== false);
    var s = 'rgb(' + beh * 36 + ',0,0)';
    if (closed) { b.fillStyle = s; b.fill(); } else { b.strokeStyle = s; b.lineWidth = w; b.lineCap = 'round'; b.lineJoin = 'round'; b.stroke(); }
  }
  function fill(p, paint, o) {
    o = o || {}; trace(g, p, true, o.smooth !== false);
    g.globalAlpha = o.a == null ? 1 : o.a; g.fillStyle = typeof paint === 'string' || paint instanceof CanvasGradient ? paint : rgba(paint); g.fill(); g.globalAlpha = 1;
    mark(p, o.beh, true, 0, o.smooth);
  }
  function stroke(p, w, c, o) {
    o = o || {}; trace(g, p, false, o.smooth !== false);
    g.globalAlpha = o.a == null ? 1 : o.a; g.strokeStyle = typeof c === 'string' || c instanceof CanvasGradient ? c : rgba(c); g.lineWidth = w; g.lineCap = 'round'; g.lineJoin = 'round'; g.stroke(); g.globalAlpha = 1;
    mark(p, o.beh, false, w, o.smooth);
  }
  function lg(x0, y0, x1, y1, stops) { var gr = g.createLinearGradient(x0, y0, x1, y1); stops.forEach(function (s) { gr.addColorStop(s[0], rgba(s[1], s[2] == null ? 1 : s[2])); }); return gr; }
  function rg(x, y, r0, r1, stops) { var gr = g.createRadialGradient(x, y, r0, x, y, r1); stops.forEach(function (s) { gr.addColorStop(s[0], rgba(s[1], s[2] == null ? 1 : s[2])); }); return gr; }
  function ellP(cx, cy, rx, ry, rot, n) { var p = []; n = n || 18; rot = rot || 0; for (var i = 0; i < n; i++) { var a = i / n * 6.2832, x = Math.cos(a) * rx, y = Math.sin(a) * ry; p.push([cx + x * Math.cos(rot) - y * Math.sin(rot), cy + x * Math.sin(rot) + y * Math.cos(rot)]); } return p; }
  function dab(x, y, rx, ry, ang, c, a) { g.save(); g.translate(x, y); g.rotate(ang || 0); g.globalAlpha = a == null ? 1 : a; g.fillStyle = rgba(c); g.beginPath(); g.ellipse(0, 0, Math.max(.3, rx), Math.max(.3, ry), 0, 0, 6.2832); g.fill(); g.restore(); }
  function dabs(p, n, o) {
    o = o || {}; var x0 = 1e9, y0 = 1e9, x1 = -1e9, y1 = -1e9;
    p.forEach(function (q) { x0 = Math.min(x0, q[0]); y0 = Math.min(y0, q[1]); x1 = Math.max(x1, q[0]); y1 = Math.max(y1, q[1]); });
    g.save(); trace(g, p, true, o.smooth !== false); g.clip();
    var sz = o.size || [2, 6], cols = o.cols || ['#888'], al = o.a || [.3, .7], st = o.stretch || 2.2, an = o.ang || 0;
    for (var i = 0; i < n; i++) dab(rnd(x0, x1), rnd(y0, y1), rnd(sz[0], sz[1]) * st, rnd(sz[0], sz[1]), an + (R() - .5) * (o.jit == null ? .5 : o.jit), vary(pick(cols), .04), rnd(al[0], al[1]));
    g.restore(); if (o.beh) mark(p, o.beh, true, 0, o.smooth);
  }
  function glow(x, y, r, c, a, beh) {
    g.fillStyle = rg(x, y, 0, r, [[0, c, a == null ? .8 : a], [.5, c, (a == null ? .8 : a) * .3], [1, c, 0]]); g.beginPath(); g.arc(x, y, r, 0, 6.2832); g.fill();
    if (beh) { b.fillStyle = 'rgb(' + beh * 36 + ',0,0)'; b.beginPath(); b.arc(x, y, r * .4, 0, 6.2832); b.fill(); }
  }
  function box(x0, y0, x1, y1) { return [[x0, y0], [x1, y0], [x1, y1], [x0, y1]]; }
  // 两块平涂:整块一个色,亮的一侧再盖一块浅的
  function two(p, c, o) { o = o || {}; c = hx(c); fill(p, lit(c, -(o.dk == null ? .1 : o.dk)), { smooth: o.smooth, beh: o.beh }); g.save(); trace(g, p, true, o.smooth !== false); g.clip(); var bb = bounds(p), sx = o.split == null ? .52 : o.split; g.fillStyle = rgba(lit(c, o.lt == null ? .12 : o.lt)); g.fillRect(bb.x0 + (bb.x1 - bb.x0) * sx, bb.y0 - 2, (bb.x1 - bb.x0) * (1 - sx) + 4, bb.y1 - bb.y0 + 4); g.restore(); }
  function bounds(p) { var x0 = 1e9, y0 = 1e9, x1 = -1e9, y1 = -1e9; p.forEach(function (q) { x0 = Math.min(x0, q[0]); y0 = Math.min(y0, q[1]); x1 = Math.max(x1, q[0]); y1 = Math.max(y1, q[1]); }); return { x0: x0, y0: y0, x1: x1, y1: y1 }; }

  /* ───────── 天与地:一片天,几条色带 ───────── */
  function sky(V, o) {
    o = o || {}; var hz = o.hz || 480, top = hz - (o.height || 460), low = o.low || C.skyLow, mid = o.mid || C.skyMid;
    g.fillStyle = lg(0, hz + 10, 0, top, [[0, low, .92], [.5, mid, .5], [1, mid, 0]]);
    g.fillRect(V.X0 - 20, top, V.X1 - V.X0 + 40, hz - top + 30);
    if (o.sun) glow(o.sun[0], o.sun[1], o.sun[2] || 260, o.glow || '#fbe6c2', .42);
    if (o.clouds) o.clouds.forEach(function (c) { cloud(c[0], c[1], c[2], c[3]); });
  }
  function cloud(x, y, w, c) { c = c || '#f6efe6'; fill(ellP(x, y, w * .5, w * .13, 0, 20), c, { a: .7 }); fill(ellP(x + w * .12, y - w * .07, w * .26, w * .1, 0, 16), c, { a: .7 }); }
  function curve(V, y, amp, fr, sd, yEnd) {
    var p = [], x0 = V.X0 - 60, x1 = V.X1 + 60, n = Math.max(10, Math.ceil((x1 - x0) / 30));
    for (var i = 0; i <= n; i++) { var x = x0 + (x1 - x0) * i / n; p.push([x, y + amp * (Math.sin(x * fr + sd) * .65 + Math.sin(x * fr * 2.1 + sd * 1.9) * .35)]); }
    p.push([x1, yEnd]); p.push([x0, yEnd]); return p;
  }
  function ridgePts(V, y, amp, fr, sd, yEnd) { return curve(V, y, amp, fr * .7, sd, yEnd); }
  function land(V, y, o) {
    o = o || {}; var yEnd = o.yEnd == null ? V.Y1 + 60 : o.yEnd, p = curve(V, y, o.amp == null ? 14 : o.amp, o.fr || .004, o.sd || 1, yEnd);
    fill(p, o.top || C.hill, { a: o.a, beh: o.beh });
    return p;
  }
  function haze(V, y, h, c, a) { g.fillStyle = lg(0, y - h, 0, y + h, [[0, c, 0], [.5, c, a], [1, c, 0]]); g.fillRect(V.X0 - 40, y - h, V.X1 - V.X0 + 80, h * 2); }
  function sun(x, y, r, o) { o = o || {}; glow(x, y, r * 4, o.halo || '#fbe7c4', .42); fill(ellP(x, y, r, r, 0, 28), o.c || '#f5dba8', { beh: 3 }); }
  function water(pts, w, o) {
    o = o || {}; var c = o.c || C.water;
    stroke(pts, w, c, { a: o.a == null ? 1 : o.a, beh: 1 });
    for (var k = 0; k < (o.n == null ? 7 : Math.min(9, Math.round(o.n / 12))); k++) {
      var j = Math.floor(R() * (pts.length - 1)), a = pts[j], d = pts[j + 1], f = R() * .5, y = rnd(-w * .28, w * .28);
      stroke([[a[0] + (d[0] - a[0]) * f, a[1] + (d[1] - a[1]) * f + y], [a[0] + (d[0] - a[0]) * (f + .45), a[1] + (d[1] - a[1]) * (f + .45) + y]], Math.max(1.2, w * .08), C.waterHi, { a: .75, beh: 1 });
    }
  }
  function pool(cx, cy, rx, ry, o) { o = o || {}; fill(ellP(cx, cy, rx, ry, 0, 24), o.c || C.water, { beh: 1 }); stroke([[cx - rx * .5, cy - ry * .2], [cx + rx * .3, cy - ry * .25]], Math.max(1.2, ry * .18), C.waterHi, { a: .8, beh: 1 }); }
  // 树:一根干,一团平涂的冠,亮的一侧浅一点;冠上的沙随风轻摆
  function tree(x, y, h, o) {
    o = o || {}; var lc = hx(o.col || C.leaf), w = h * (o.wide || .55);
    fill([[x - h * .028, y], [x - h * .016, y - h * .56], [x + h * .016, y - h * .56], [x + h * .028, y]], C.bark);
    fill(ellP(x, y - h * .78, w * .78, h * .36, 0, 22), lit(lc, -.1), { beh: 4 });
    fill(ellP(x + w * .16, y - h * .86, w * .5, h * .23, -.2, 20), lit(lc, .14), { beh: 4, a: .92 });
  }
  function palm(x, y, h, o) {
    o = o || {}; var lean = o.lean == null ? .12 : o.lean, tx = x + h * lean, ty = y - h, trunk = [];
    for (var i = 0; i <= 8; i++) { var t = i / 8; trunk.push([x + h * lean * t * t, y - h * t]); }
    stroke(trunk, h * .04, C.bark);
    [[-1, .12], [-.62, -.2], [-.18, -.3], [.3, -.26], [.72, -.1], [1, .16]].forEach(function (f, j) {
      var ex = tx + f[0] * h * .42, ey = ty + f[1] * h * .3 + h * .08, mx = tx + f[0] * h * .22, my = ty - h * .07 + f[1] * h * .12, nx = -(ey - ty), ny = ex - tx, L = Math.hypot(nx, ny) || 1;
      fill([[tx, ty], [mx + nx / L * h * .035, my + ny / L * h * .035], [ex, ey], [mx - nx / L * h * .03, my - ny / L * h * .03]], j % 2 ? C.leaf2 : C.leaf, { beh: 4 });
    });
  }
  function reeds(x0, x1, y, h) { var n = Math.round((x1 - x0) / 16); for (var i = 0; i < n; i++) { var x = x0 + (x1 - x0) * R(), hh = h * rnd(.5, 1); stroke([[x, y], [x + rnd(-2, 3), y - hh * .6], [x + rnd(-1, 5), y - hh]], rnd(1.2, 2.2), pick([C.grass, C.leaf2, C.hill2]), { a: rnd(.5, .85), beh: 4 }); } }
  function birds(x, y, n, s, c) { for (var i = 0; i < n; i++) { var bx = x + i * s * 2.6 + (i % 2) * s, by = y + (i % 3) * s * .7; stroke([[bx - s, by - s * .35], [bx, by], [bx + s, by - s * .35]], s * .16, c || '#7a6f68', { a: .8 }); } }
  function bird(s, c) { stroke([[-s, -s * .35], [0, 0], [s, -s * .35]], s * .18, c || '#7a6f68', { a: .85 }); }
  function stars(list, c) { list.forEach(function (p) { glow(p[0], p[1], p[2] || 6, c || '#f6eed8', .9, 3); }); }

  /* ───────── 人:一截色块、一个圆,没有脸 ───────── */
  // 人面朝右;原点在脚下的地面
  function figure(o) {
    var h = o.h, child = !!o.child, r = h * (child ? .1 : .068), robe = hx(o.robe || C.madder), mantle = o.mantle ? hx(o.mantle) : null;
    var pose = o.pose || 'stand', sit = pose === 'sit', kneel = pose === 'kneel';
    var hy = sit ? -h * .66 + r : kneel ? -h * .78 + r : -h + r, y0 = hy + r * 1.3, sw = r * (child ? 1.25 : 1.42), hw = r * (child ? 1.5 : 1.85);
    var ua = r * 2.7, fa = r * 2.55;
    var d = { h: h, hh: h / 7.2, r: r, yS: y0, ua: ua, fa: fa, hand: fa * .9, shN: [sw * .5, y0 + r * .45], shF: [-sw * .42, y0 + r * .45], head: [r * .15, hy] };
    function shoulders(bot) { return [[-sw * .95, y0 + r * .55], [-sw * .72, y0 + r * .05], [0, y0 - r * .12], [sw * .72, y0 + r * .05], [sw * .95, y0 + r * .55]].concat(bot); }
    function head() {
      var x = d.head[0], cl = o.cloth ? hx(o.cloth) : lit(robe, .3);
      fill(ellP(x, hy, r * .92, r, 0, 20), o.headCol ? hx(o.headCol) : C.skin);
      if (o.head === 'cloth' || o.head === 'veil' || o.head === 'hood') {
        var L = o.head === 'veil' ? r * 3.4 : o.head === 'hood' ? r * 1.7 : r * 1.9;
        fill([[x + r * .7, hy - r * .5], [x + r * .1, hy - r * 1.06], [x - r * .8, hy - r * .9], [x - r * 1.12, hy], [x - r * 1.25, hy + L], [x - r * .4, hy + L * .82], [x - r * .3, hy + r * .5], [x + r * (o.head === 'hood' ? .78 : .52), hy - r * .1]], cl);
      } else fill([[x - r * .95, hy + r * .3], [x - r * 1.0, hy - r * .4], [x - r * .1, hy - r * 1.05], [x + r * .75, hy - r * .72], [x + r * .5, hy - r * .36], [x - r * .3, hy - r * .3], [x - r * .5, hy + r * .55]], o.hair ? hx(o.hair) : C.hair);
      if (o.crown) fill([[x - r * .75, hy - r * .85], [x - r * .8, hy - r * 1.6], [x - r * .35, hy - r * 1.18], [x, hy - r * 1.75], [x + r * .35, hy - r * 1.18], [x + r * .8, hy - r * 1.6], [x + r * .75, hy - r * .85]], C.gold, { smooth: false, beh: 3 });
    }
    function standBody() {
      if (mantle) fill([[-sw * .92, y0 + r * .5], [-sw * .3, y0 - r * .05], [-sw * .12, y0 + r * 4], [-hw * .55, -r * 1.3], [-hw * 1.04, -r * .5]], lit(mantle, -.06));
      fill(shoulders([[hw * .9, -r * .75], [hw, 0], [-hw, 0], [-hw * .9, -r * .75]]), robe);
      if (mantle) fill([[sw * .92, y0 + r * .5], [sw * .2, y0 - r * .1], [-sw * .4, y0 + r * .6], [-sw * .05, y0 + r * 3.4], [sw * .78, y0 + r * 3.9]], mantle, { a: .96 });
      if (o.sash) fill([[-sw * .86, y0 + r * 3.3], [sw * .88, y0 + r * 3.3], [sw * .9, y0 + r * 3.72], [-sw * .88, y0 + r * 3.72]], hx(o.sash), { smooth: false });
    }
    function sitBody() {
      fill([[-sw * 1.8, 0], [-sw * 1.9, -r * .9], [-sw * 1.1, -r * 1.7], [sw * .6, -r * 1.85], [sw * 2.1, -r * 1.25], [sw * 2.45, -r * .3], [sw * 2.35, 0]], robe);
      fill(shoulders([[sw * 1.1, -r * 1.3], [-sw * 1.15, -r * 1.3]]), robe);
      if (mantle) fill([[-sw * .92, y0 + r * .5], [-sw * .2, y0 - r * .05], [-sw * .1, -r * 1.4], [-sw * 1.2, -r * 1.2]], mantle);
      if (o.sash) fill([[-sw * .97, y0 + r * 2.9], [sw, y0 + r * 2.9], [sw * 1.02, y0 + r * 3.3], [-sw * 1.02, y0 + r * 3.3]], hx(o.sash), { smooth: false });
    }
    function kneelBody() {
      fill([[-sw * 1.9, 0], [-sw * 1.8, -r * 1.1], [-sw * .9, -r * 1.8], [sw * .8, -r * 1.3], [sw * 1.7, -r * .4], [sw * 1.6, 0]], robe);
      fill(shoulders([[sw * .9, -r * 1.4], [-sw * 1.1, -r * 1.3]]), robe);
    }
    function body() { if (sit) sitBody(); else if (kneel) kneelBody(); else standBody(); head(); }
    function sleeve(far) { var c = o.sleeve ? hx(o.sleeve) : (mantle && !far ? mantle : robe); return far ? lit(c, -.12) : c; }
    function upper(far) { return function () { stroke([[0, 0], [0, ua]], r * .8, sleeve(far)); }; }
    function fore(far, hold) { return function () { stroke([[0, 0], [0, fa * .78]], r * .72, sleeve(far)); fill(ellP(0, fa * .9, r * .36, r * .42, 0, 12), far ? C.skinDk : C.skin); if (hold) hold(0, fa); }; }
    return {
      d: d, body: body, upper: upper, fore: fore,
      box: sit ? [-sw * 3.4, -h, sw * 3.4, r] : [-r * 4.6, -h - r * 2.3, r * 4.2, r * 1.2],
      ubox: [-r, -r, r, ua + r], fbox: [-r * 2.4, -r, r * 2.4, fa + r * 3.4],
      whole: function (armF, armN, hold) {
        return function () {
          function arm(far, ang) {
            var sh = far ? d.shF : d.shN;
            [g, b].forEach(function (c) { c.save(); c.translate(sh[0], sh[1]); c.rotate(ang[0]); }); upper(far)();
            [g, b].forEach(function (c) { c.translate(0, ua); c.rotate(ang[1]); }); fore(far, far ? null : hold)();
            [g, b].forEach(function (c) { c.restore(); });
          }
          arm(true, armF || [.12, .1]); body(); arm(false, armN || [-.1, -.1]);
        };
      }
    };
  }

  /* ───────── 器物 ───────── */
  function stone(x, y, rx, ry, c, o) { o = o || {}; c = hx(c || C.stone); fill(ellP(x, y, rx, ry, o.rot || 0, 16), lit(c, -.14), { beh: o.beh }); fill(ellP(x + rx * .16, y - ry * .2, rx * .7, ry * .62, o.rot || 0, 14), lit(c, .1), { beh: o.beh }); }
  function cairn(x, y, s, o) {
    o = o || {}; var rows = [5, 4, 2, 1], k = 0, cols = [C.stone, C.ash, lit(C.stone, .05), '#cdbfa8'];
    if (o.glow) glow(x, y - s * .5, s * 1.25, '#f7e3b6', .42 * (o.a == null ? 1 : o.a));
    rows.forEach(function (n, r) { for (var i = 0; i < n; i++) { var cx = x + (i - (n - 1) / 2) * s * .42 + (r % 2) * s * .03, cy = y - s * .16 - r * s * .29; stone(cx, cy, s * .22, s * .15, cols[(k++) % 4], { beh: o.glow ? 3 : 0 }); } });
  }
  function basket(x, y, s) { fill(ellP(x, y, s * .5, s * .3, 0, 18), C.ochreR); fill(ellP(x, y - s * .22, s * .38, s * .12, 0, 14), C.saffron); }
  function jar(x, y, s, c) { c = hx(c || C.terra); fill([[x - s * .15, y - s * .82], [x + s * .15, y - s * .82], [x + s * .36, y - s * .5], [x + s * .28, y], [x - s * .28, y], [x - s * .36, y - s * .5]], c); fill([[x + s * .05, y - s * .7], [x + s * .3, y - s * .48], [x + s * .22, y - s * .1], [x + s * .08, y - s * .1]], lit(c, .14)); }
  function sack(x, y, s, c) { c = hx(c || C.sand); fill([[x - s * .34, y], [x - s * .4, y - s * .45], [x - s * .1, y - s * .8], [x + s * .1, y - s * .82], [x + s * .38, y - s * .5], [x + s * .34, y]], c); }
  function fire(x, y, s) {
    glow(x, y - s * .4, s * 3, '#ffcb88', .5, 0);
    stroke([[x - s * .5, y], [x + s * .5, y - s * .08]], s * .14, C.bark);
    fill([[x - s * .34, y - s * .06], [x - s * .2, y - s * .6], [x, y - s * .95], [x + s * .2, y - s * .6], [x + s * .34, y - s * .06]], C.fire, { beh: 2 });
    fill([[x - s * .15, y - s * .08], [x, y - s * .55], [x + s * .15, y - s * .08]], C.fire2, { beh: 2 });
  }
  function lantern(x, y, s, c, on) { stroke([[x, y - s * .95], [x, y - s * .56]], s * .05, C.umber); if (on) glow(x, y - s * .32, s * 1.3, '#ffd08c', .45, 0); fill(ellP(x, y - s * .32, s * .2, s * .25, 0, 16), on ? lit(c, .3) : c, { beh: on ? 3 : 0 }); }
  function boat(x, y, s, lamp) { fill([[x - s * .62, y - s * .1], [x + s * .62, y - s * .12], [x + s * .42, y + s * .1], [x - s * .4, y + s * .1]], C.bark); if (lamp) lantern(x + s * .3, y - s * .1, s * .55, C.fire2, true); }
  function heap(x, base, w, h, c) {
    c = hx(c || C.dune); var p = [], n = 16;
    for (var i = 0; i <= n; i++) { var t = i / n; p.push([x - w / 2 + w * t, base - h * Math.pow(Math.sin(t * Math.PI), 1.3)]); }
    two(p, c, { split: .55, dk: .06, lt: .1 });
  }
  // 石碑:一块平涂的石板,亮的一侧浅一点,几道刻痕
  function stele(x, base, w, h, o) {
    o = o || {}; var c = hx(o.c || C.stone), top = base - h * .86;
    fill(box(x - w * .64, base - h * .06, x + w * .64, base), lit(c, -.14), { smooth: false });
    var p = [[x - w / 2, base - h * .06], [x - w / 2, top]];
    for (var i = 1; i < 12; i++) { var a = Math.PI + i / 12 * Math.PI; p.push([x + Math.cos(a) * w / 2, top + Math.sin(a) * w * .44]); }
    p.push([x + w / 2, top]); p.push([x + w / 2, base - h * .06]);
    two(p, c, { smooth: false, split: .6, dk: .08, lt: .1 });
    var n = o.lines == null ? 8 : o.lines;
    for (var j = 0; j < n; j++) { var yy = top + w * .14 + j * (h * .66) / Math.max(1, n); stroke([[x - w * .3, yy], [x + w * .3, yy]], w * .03, lit(c, -.3), { a: .75 }); }
    if (o.glow) glow(x, top - w * .08, w * .7, '#f7d99e', .65, 3);
  }

  /* ───────── 插画撒成沙 ───────── */
  // 画上每一点离白纸越远,沙越多;近白的地方只剩一层薄雾。颜色压深一点,半透明的沙落在白纸上会变浅。
  // sheen:亮处记下来,一道光会慢慢扫过
  function tone(c, l, sat, dk, lift) { c = (l + (c - l) * sat) * dk; return Math.max(0, Math.min(255, c + (255 - c) * lift)); }
  function sandify(o) {
    o = o || {}; var cw = g.canvas.width, ch = g.canvas.height, id = g.getImageData(0, 0, cw, ch), d = id.data, bid = null, bd = null;
    if (o.sheen) { bid = b.getImageData(0, 0, cw, ch); bd = bid.data; }
    var PR = 251, PG = 250, PB = 247, sat = o.sat || 1.16, dk = o.dk || .88, reach = o.reach || 100;
    // 夜里、暗室里的画:先把明暗拉到白天的范围(色阶),保住对比,再偏暖一点
    if (o.day) {
      var hist = new Uint32Array(256), cnt = 0, j;
      for (j = 0; j < d.length; j += 16) if (d[j + 3]) { hist[((d[j] + d[j + 1] + d[j + 2]) / 3) | 0]++; cnt++; }
      function pct(q) { var acc = 0; for (var v = 0; v < 256; v++) { acc += hist[v]; if (acc >= cnt * q) return v; } return 255; }
      var lo = pct(.02), hi = Math.max(lo + 20, pct(.985)), T0 = 92, T1 = 246;
      for (j = 0; j < d.length; j += 4) {
        if (!d[j + 3]) continue;
        var L = (d[j] + d[j + 1] + d[j + 2]) / 3, u = Math.max(0, Math.min(1, (L - lo) / (hi - lo))), L2 = T0 + (T1 - T0) * Math.pow(u, .78), k = L2 / Math.max(8, L), w = (1 - u) * o.day;
        d[j] = Math.min(255, d[j] * k + 16 * w); d[j + 1] = Math.min(255, d[j + 1] * k + 6 * w); d[j + 2] = Math.min(255, d[j + 2] * k - 12 * w);
      }
    }
    for (var i = 0; i < d.length; i += 4) {
      var a0 = d[i + 3]; if (!a0) continue;
      var r = d[i], gg = d[i + 1], bb = d[i + 2];
      // 沙量按原画离白纸多远来定:白底一粒沙也不撒,压暗颜色不会把白底变灰
      var dist = Math.sqrt(((PR - r) * (PR - r) + (PG - gg) * (PG - gg) + (PB - bb) * (PB - bb)) / 3), ink = Math.min(1, Math.pow(Math.max(0, dist - (o.floor == null ? 9 : o.floor)) / reach, .8));
      var l = (r + gg + bb) / 3, l0 = l, dark = 1 - l / 255, lift = .26 * dark * dark;   // 最暗的地方提一点亮,像隔着一层回忆
      r = tone(r, l, sat, dk, lift); gg = tone(gg, l, sat, dk, lift); bb = tone(bb, l, sat, dk, lift);
      d[i] = r; d[i + 1] = gg; d[i + 2] = bb;
      d[i + 3] = Math.round(ink * a0);
      if (bd && ink > .3 && l0 > (o.sheen.lo || 118)) { bd[i] = 6 * 36; bd[i + 3] = 255; }
    }
    g.putImageData(id, 0, 0); if (bd) b.putImageData(bid, 0, 0);
  }

  /* ───────── 画的入口 ───────── */
  function paint(fn, ctx, bctx, ac, sp) { bind(ctx, bctx, ac && ac.seed || 1, sp); fn(API, ac); }
  var API = {
    C: C, R: function () { return R(); }, rnd: rnd, pick: pick, noise: noise, fbm: fbm, hx: hx, rgba: rgba, mix: mix, lit: lit, vary: vary,
    g: function () { return g; }, trace: trace, fill: fill, stroke: stroke, lg: lg, rg: rg, ellP: ellP, dab: dab, dabs: dabs, glow: glow, box: box, mark: mark, two: two,
    sky: sky, cloud: cloud, land: land, curve: curve, ridgePts: ridgePts, haze: haze, sun: sun, water: water, pool: pool, tree: tree, palm: palm, reeds: reeds, birds: birds, bird: bird, stars: stars,
    sandify: sandify, figure: figure, stone: stone, cairn: cairn, basket: basket, jar: jar, sack: sack, fire: fire, lantern: lantern, boat: boat, heap: heap, stele: stele
  };
  return { paint: paint, api: API, C: C };
})();
