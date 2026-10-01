/* 每一幕的角色与编排。build 摆好角色,返回 tick(t):t 是这一幕开演后的秒数,tick 每帧改角色的位置、角度、透明、变形与吸空。
   首页与 Zikaron 页每页一件东西,由插画撒成沙;首页第 7 页是一条河,工具与深入了解是面朝大海的海滩,Zikaron 的末页与词源是黎明时吉甲的十二块立石。 */
window.SAND = (function () {
  'use strict';
  var PT = window.PAINT, P = PT.api, C = PT.C;

  /* ───────── 舞台 ───────── */
  function stage(sc, V, small, image) {
    var list = [], seed = 1;
    var S = {
      V: V, isSmall: small, image: image,
      add: function (o) {
        var a = {
          paint: o.paint || null, box: o.box, parent: o.parent || null, z: o.z || 0,
          x: o.x || 0, y: o.y || 0, r: o.r || 0, sx: o.sx == null ? 1 : o.sx, sy: o.sy == null ? 1 : o.sy, a: o.a == null ? 1 : o.a, m: o.m || 0,
          vR: 0, vx: 0, vy: 0, flags: o.flags || 0, raw: o.raw || null, blur: o.blur, moving: !!o.moving, weight: o.weight || (o.moving ? 3.6 : 1.8), seed: seed++ * 7919
        };
        list.push(a); return a;
      },
      bg: function (paint, o) { o = o || {}; return S.add({ paint: paint, box: [V.X0 - 30, V.Y0 - 30, V.X1 + 30, V.Y1 + 30], z: o.z || 0, blur: o.blur == null ? 3.2 : o.blur, weight: 1 }); }
    };
    var tick = sc.build(S, P, V) || function () {};
    return { actors: list, tick: tick };
  }
  /* ───────── 首页:每一页一件东西,白底 ───────── */
  var HOME = [];

  // 插画撒成的沙:白底上的一件东西,离白纸越远的地方沙越多;取景按东西本身占的范围(sand.js 的 'O')
  function picture(o) {
    o = o || {};
    return function (S, P, V) {
      var im = S.image;
      S.bg(function (P) { P.g().drawImage(im, 0, 0, V.vw, V.vh); P.sandify({ sheen: true }); }, { blur: o.blur == null ? 2.2 : o.blur });
      return function () {};
    };
  }
  var PIC = { lay: 'O', vw: 1138, vh: 640, still: 1, dur: 2.2, atmo: true, shed: true, sheen: .32, ground: ['#fbfaf7', '#141312'] };
  function pic(o) { var s = {}; for (var k in PIC) s[k] = PIC[k]; for (k in o) s[k] = o[k]; return s; }
  // 每一幅都活着:一道光慢慢扫过亮处,风把表面的细沙一粒粒吹起、飘向字那边;脚下是一层沙床,空中飘着细尘(sand.js)
  // 首屏:一只锚,锚链每一节都不一样
  HOME.push(pic({ id: 'hero', cap: 'hero', img: 'ill/hero.jpg', glow: [1, .9, .7], sheen: .5, still: 6, dur: 2.6, sweep: { type: 'r', c: [.72, .62], spread: .75 }, build: picture() }));

  // 7:一条抽象的河,横贯全屏:从右上角屏外流进来,一个大 S 弯,从字的下方绕过,从左下角流出去。
  // 河身画在一条直带子上(横是顺流,竖是横过河面,中间深、两岸浅,顺流的长流线);结绳的三种颜色是河里三道淡淡的色流,只轻轻交织。
  // sand.js 把带子弯到 0 号角色给的河道上(六个点,屏幕比例),1 号角色给两头的宽、流速与水面的扰动;沙顺流一直淌,中间快两岸慢。
  var LANES = [
    { body: true, base: 0, wa: 0, wf: 0, ph: 0, hw: 1, spd: 1, w: 3.2 },
    { base: -.42, wa: .16, wf: .6, ph: 0, hw: .15, spd: 1.08, n: 625, w: .6, cols: ['#45706b', '#57807b'] },
    { base: .04, wa: .2, wf: .5, ph: 2.2, hw: .13, spd: 1.14, n: 535, w: .6, cols: ['#a3603f', '#955237'] },
    { base: .44, wa: .15, wf: .7, ph: 4.1, hw: .14, spd: 1.04, n: 535, w: .6, cols: ['#c49e5e', '#b28a48'] }
  ];
  var RIVER = { edge: '#9cc2c0', shallow: '#98c0bf', mid: '#5a959c', deep: '#3a7886', light: ['#c6ddd9', '#a8cac6'], dark: ['#76a9af', '#2e6b79', '#a2c7c5', '#4d8994'], bank: '#9d8b6d', glint: '#fff3d6', glints: 150 };
  // 带子首尾相接(sand.js 让沙沿它一路往前淌,x 与 x+1000 是同一处):每一笔跨过一头的,从另一头接着画完,整圈各处一样密,接缝看不出
  function loop(x, w, draw) { draw(x); if (x + w > 1000) draw(x - 1000); if (x - w < 0) draw(x + 1000); }
  function riverPaint(d) {
    return function (P) {
      var g = P.g(), k, x, y, L, c = d.pal || RIVER;
      function line(x, y, L, dy1, dy2, w, col, o) { loop(x, L, function (x0) { P.stroke([[x0, y], [x0 + L * .5, y + dy1], [x0 + L, y + dy2]], w, col, o); }); }
      if (d.body) {
        g.fillStyle = P.lg(0, -50, 0, 50, [[0, c.edge, 0], [.07, c.shallow, .5], [.28, c.mid, .74], [.5, c.deep, .82], [.72, c.mid, .74], [.93, c.shallow, .5], [1, c.edge, 0]]);
        g.fillRect(-20, -50, 1040, 100);
        // 顺流的长流线:两岸浅,河心深;离河心越远,浅色线越多,由深到浅一路渐变
        for (k = 0; k < 1700; k++) { y = (P.R() * 2 - 1) * 44; x = P.rnd(0, 1000); L = P.rnd(90, 340); var lt = Math.min(1, Math.max(0, (Math.abs(y) - 12) / 32)); lt = lt * lt * (3 - 2 * lt); line(x, y, L, P.rnd(-1.2, 1.2), P.rnd(-2, 2), P.rnd(.8, 2), P.vary(P.pick(P.R() < lt ? c.light : c.dark), .02), { a: P.rnd(.2, .5) }); }
        // 两岸一道浅浅的湿沙边
        [-1, 1].forEach(function (sg) { for (k = 0; k < 500; k++) { var yb = sg * P.rnd(45, 50), rx = P.rnd(3, 9), ry = P.rnd(.8, 1.5), ab = P.rnd(.2, .38); loop(P.rnd(0, 1000), rx, function (x0) { P.dab(x0, yb, rx, ry, 0, c.bank, ab); }); } });
        // 水面上的光:细而短
        for (k = 0; k < c.glints; k++) { x = P.rnd(0, 1000); y = P.rnd(-28, 28); L = P.rnd(6, 16); (function (y, L) { loop(x, L, function (x0) { P.stroke([[x0, y], [x0 + L, y]], P.rnd(.7, 1.2), c.glint, { a: .85, beh: 3 }); }); })(y, L); }
        return;
      }
      // 一道色流:只有顺流的长线,中间浓两边淡
      for (k = 0; k < d.n; k++) { y = (P.R() + P.R() - 1) * 42; x = P.rnd(0, 1000); L = P.rnd(120, 380); line(x, y, L, P.rnd(-1, 1), P.rnd(-1.5, 1.5), P.rnd(1, 2.4), P.vary(P.pick(d.cols), .02), { a: P.rnd(.25, .55) * (1 - Math.abs(y) / 46) }); }
    };
  }
  function riverScene() {
    return function (S, P, V) {
      var tall = V.tall;
      S.add({ raw: tall ? [1.3, .04, .86, .13, .62, .3, .46, .46, .18, .56, -.35, .63] : [1.2, .1, .86, .2, .68, .42, .56, .66, .3, .83, -.22, .91] });
      S.add({ raw: tall ? [.07, .12, .026, .003, 0, 0, 0, 0, 0, 0, 0, 0] : [.11, .21, .026, .004, 0, 0, 0, 0, 0, 0, 0, 0] });
      LANES.forEach(function (d, i) {
        S.add({ paint: riverPaint(d), box: [0, -54, 1000, 54], moving: true, weight: d.w, blur: .8, z: i, raw: [d.base, d.wa, d.wf, d.ph, d.hw, d.spd, 1, 0, 0, 0, i * .17, 64] });
      });
      return function () {};
    };
  }

  // 九页,每页一件东西;换页时沙整片扬起,按各页扫过的方向先后飞成下一件
  var SWEEP = { p1: { type: 'x', spread: .6 }, p2: { type: '-y', spread: .6 }, p3: { type: 'r', c: [.7, .3], spread: .5 }, p4: { type: 'x', spread: .6 }, p5: { type: '-x', spread: .6 },
    p6: { type: 'y', spread: .6 }, p7: { type: 'y', spread: .6 }, p8: { type: '-y', spread: .65 }, p9: { type: 'x', spread: .6 } };
  ['p1', 'p2', 'p3', 'p4', 'p5', 'p6', 'p7', 'p8', 'p9'].forEach(function (id) {
    if (id === 'p7') HOME.push(pic({ id: id, cap: id, lay: 'F', full: true, nobed: true, areaFrac: .15, ambient: false, shed: false, sheen: 0, glow: [1, .93, .76], still: 8, dur: 2.4, sweep: SWEEP[id], build: riverScene() }));
    else HOME.push(pic({ id: id, cap: id, img: 'ill/' + id + '.jpg', sweep: SWEEP[id], build: picture() }));
  });

  // 工具:面朝大海。海平线在屏幕中间偏下,上面是海,下面是沙滩;浪头一道道朝你推过来,浪边涌上沙滩又退回;
  // 右边的海平线上一轮浅浅的落日,半沉在海里,海面上从落日到脚下一条闪动的光路。上一页的工具卷散开,落成这一切。
  // 海画在一条直带子上:横是沿岸,竖是离浪边多远(0 是浪边的白沫,300 是海平线);sand.js 按透视把它贴在海平线与浪边之间
  function seaPaint(foam) {
    return function (P) {
      var g = P.g(), k, x, y, L;
      P.mark(P.box(-20, -4, 1020, 304), 7, true, 0, false);
      if (foam) {
        // 浪边:白沫靠海的一侧一道浪影,上面一条不齐的白沫花边;退下去的浪在水面留一张白沫网
        for (k = 0; k < 900; k++) { x = P.rnd(-20, 1020); y = P.rnd(14, 24); P.dab(x, y, P.rnd(3, 8), P.rnd(1, 2.2), 0, '#4a8288', P.rnd(.25, .45)); }
        for (k = 0; k < 2600; k++) { x = P.rnd(-20, 1020); y = Math.abs(P.R() + P.R() - 1) * 16; P.dab(x, y, P.rnd(2.5, 7), P.rnd(1, 2.4), P.rnd(-.25, .25), P.pick(['#fffdf7', '#fbf9f1', '#f1f5f1']), P.rnd(.75, 1)); }
        for (k = 0; k < 800; k++) { x = P.rnd(-20, 1020); y = P.rnd(20, 80); L = P.rnd(10, 40); P.stroke([[x, y], [x + L * .4, y + P.rnd(-4, 4)], [x + L, y + P.rnd(-2, 2)]], P.rnd(.8, 1.6), '#f8faf5', { a: P.rnd(.4, .85) * (1 - (y - 20) / 70) }); }
        return;
      }
      // 近处浅而绿,远处深而蓝,海平线上蒙一层暖雾
      g.fillStyle = P.lg(0, 0, 0, 300, [[0, '#8cc3bd', .7], [.12, '#5f9ea2', .8], [.4, '#3b7a88', .86], [.78, '#35657a', .8], [.93, '#8aa3aa', .55], [1, '#d9c3b0', .5]]);
      g.fillRect(-20, 0, 1040, 300);
      // 顺着海岸的细浪纹:近处粗、远处细;近处浅绿的纹往远处渐渐换成深蓝
      for (k = 0; k < 2600; k++) { y = Math.pow(P.R(), .8) * 292; x = P.rnd(-20, 1020); L = P.rnd(18, 110) * (1 - y / 400); var ft = Math.min(1, Math.max(0, (y - 25) / 75)); ft = ft * ft * (3 - 2 * ft); P.stroke([[x, y], [x + L * .5, y + P.rnd(-1.2, 1.2)], [x + L, y]], P.rnd(.7, 2.2) * (1 - y / 360), P.vary(P.pick(P.R() < ft ? ['#78a9b0', '#4a8a96', '#28596c', '#96bfc2'] : ['#cfe9e3', '#a2d0c8', '#7cb8b3']), .03), { a: P.rnd(.25, .55) }); }
      for (k = 0; k < 360; k++) { x = P.rnd(-20, 1020); y = P.rnd(24, 200); P.dab(x, y, P.rnd(2, 6), P.rnd(.7, 1.5), 0, '#eef4f0', P.rnd(.15, .4)); }
      // 海平线:一道细细的深色
      P.stroke([[-20, 296], [1020, 296]], 3, '#5b7580', { a: .55 });
    };
  }
  // 落日的光路:落日下方一条竖着的闪光,近处宽、远处窄,一闪一闪
  function glitterPaint(sx) {
    return function (P) {
      for (var k = 0; k < 900; k++) {
        var y = Math.pow(P.R(), 1.4) * 290, half = 12 + (300 - y) * .45, x = sx * 1000 + (P.R() + P.R() - 1) * half;
        P.stroke([[x, y], [x + P.rnd(4, 14) * (1 - y / 380), y]], P.rnd(.7, 1.8) * (1 - y / 360), P.pick(['#ffe6bf', '#ffd49c', '#f9c48a']), { a: P.rnd(.6, 1), beh: 3 });
      }
    };
  }
  // 落日与晚霞:画在屏幕比例坐标里(0–1000),圆要按屏幕宽高比压扁才是圆的
  function sunPaint(V, sx) {
    return function (P) {
      var g = P.g(), asp = V.asp, hy = V.hz * 1000, cx = sx * 1000, R = 52;
      g.save(); g.translate(cx, hy); g.scale(1 / asp, 1);
      g.fillStyle = P.rg(0, 0, 0, 320, [[0, '#f6cfa4', .62], [.22, '#f5d6b6', .34], [.6, '#f3e1cc', .1], [1, '#f3e3d0', 0]]);
      g.beginPath(); g.arc(0, 0, 320, Math.PI, 0); g.fill();
      g.beginPath(); g.rect(-60, -60, 120, 60); g.clip();
      g.fillStyle = P.rg(0, -8, 0, R, [[0, '#fbdcb2', 1], [.7, '#f4c08a', .92], [1, '#eeac72', .6]]);
      g.beginPath(); g.arc(0, 0, R, 0, 6.2832); g.fill();
      g.restore();
      // 海平线上几缕淡淡的晚霞
      for (var k = 0; k < 14; k++) { var y = hy - P.rnd(18, 150), x = cx + P.rnd(-260, 200) / asp * 1.6, L = P.rnd(60, 220); P.stroke([[x, y], [x + L * .5, y + P.rnd(-2, 2)], [x + L, y]], P.rnd(2, 5), P.pick(['#f1d2bb', '#ecc9b4', '#f4dccb']), { a: P.rnd(.15, .35) }); }
    };
  }
  // 沙滩:浪边以下,靠水一条湿沙(浪涌到的地方),往下是干沙,一道道风纹越近越疏;零星几颗石子和贝壳
  function sandPaint(V) {
    return function (P) {
      var g = P.g(), k, x, y, top = V.shore[0] * 1000 - 14, wet = (V.shore[0] + V.shore[1]) * 1000 + 16;
      g.fillStyle = P.lg(0, top, 0, 1010, [[0, '#a8906a', .8], [(wet - top) / (1010 - top), '#b09872', .72], [Math.min(1, (wet - top) / (1010 - top) + .08), '#d8c298', .6], [1, '#d0b788', .7]]);
      g.fillRect(-20, top, 1040, 1030 - top);
      for (k = 0; k < 60; k++) { y = wet + 10 + Math.pow(k / 60, 1.5) * (1000 - wet); var pts = [], ph = P.rnd(0, 6.28), amp = P.rnd(1.5, 4); for (x = -20; x <= 1020; x += 20) pts.push([x, y + Math.sin(x * .012 + ph) * amp]); P.stroke(pts, P.rnd(1, 2.2), P.pick(['#bfa272', '#b3966a', '#c9ae80']), { a: .3 }); P.stroke(pts.map(function (q) { return [q[0], q[1] + 2.5]; }), 1.2, '#efe2c8', { a: .3 }); }
      // 湿沙上映着天光的几道亮
      for (k = 0; k < 60; k++) { x = P.rnd(0, 1000); y = P.rnd(top + 8, wet); P.stroke([[x, y], [x + P.rnd(20, 70), y]], P.rnd(1, 2.2), '#e3d8c6', { a: P.rnd(.2, .45) }); }
      for (k = 0; k < 22; k++) { x = P.rnd(0, 1000); y = P.rnd(wet, wet + 90); P.stone(x, y, P.rnd(3, 7), P.rnd(2, 4.5), P.pick(['#9d8f80', '#8a7d70', '#b3a391', '#7d746c']), {}); }
      for (k = 0; k < 12; k++) { x = P.rnd(0, 1000); y = P.rnd(wet, wet + 120); P.fill(P.ellP(x, y, P.rnd(3, 6), P.rnd(2, 3.5), P.rnd(-.6, .6), 10), P.pick(['#f3e7d6', '#ead3c2', '#f6efe4']), { a: .9 }); }
    };
  }
  function beachScene() {
    return function (S, P, V) {
      var sx = V.tall ? .7 : .74, scr = [0, 0, 0, 0, 0, 0, 1, 0, 0, 0, 0, 32], sea = [0, 0, 0, 0, 0, 0, 1, 0, 0, 0, 0, 16];
      S.add({ paint: sunPaint(V, sx), box: [-20, V.hz * 1000 - 360, 1020, V.hz * 1000 + 4], moving: true, weight: .5, blur: 1.2, z: 0, raw: scr });
      S.add({ paint: sandPaint(V), box: [-20, V.shore[0] * 1000 - 16, 1020, 1030], moving: true, weight: .85, blur: .9, z: 1, raw: scr });
      S.add({ paint: seaPaint(false), box: [-20, -4, 1020, 304], moving: true, weight: 1.1, blur: .8, z: 2, raw: sea });
      S.add({ paint: glitterPaint(sx), box: [-20, -4, 1020, 304], moving: true, weight: 2.2, blur: .5, z: 3, raw: sea });
      S.add({ paint: seaPaint(true), box: [-20, -4, 1020, 110], moving: true, weight: 2.4, blur: .6, z: 4, raw: sea });
      return function () {};
    };
  }
  // 工具与深入了解是同一片海滩(world 相同):从一幕滚到另一幕,沙不动、浪照常涌,只换上面的字和卡片
  function beach(o) { var b = { lay: 'F', world: 'beach', atmo: true, beach: true, bed: [.5, .54], areaFrac: .62, glow: [1, .9, .74], ground: ['#fbfaf8', '#141312'], dur: 2.4, sync: true, sweep: { type: 'y', spread: .6 }, still: 4, build: beachScene() }; for (var k in o) b[k] = o[k]; return b; }
  HOME.push(beach({ id: 'tools', cap: 'tools' }));
  HOME.push(beach({ id: 'rest', cap: 'rest' }));

  /* ───────── Zikaron 页:三页,每页一件东西;功能一段只有细尘;末页与点开才出现的词源是吉甲的立石 ───────── */
  var ZIK = [];
  // 1 留证基础设施:十二块河石垒成的石堆;沙从最底下一块往上垒,一道淡光隔一阵从底层一路亮到顶层
  ZIK.push(pic({ id: 'zhero', cap: 'zhero', img: 'ill/z1.jpg', sheen: .45, sheenD: [0, 1.2], glow: [1, .93, .76], dur: 2.8, sweep: { type: '-y', spread: .85 }, build: picture() }));
  // 2 创作与授权:错开的一叠手稿,从最潦草的一张凝结到完成的一张
  ZIK.push(pic({ id: 'z2', cap: 'z2', img: 'ill/z2.jpg', dur: 2.6, sweep: { type: 'x', spread: .8 }, build: picture() }));
  // 3 交易与履约:封好的包裹,蜡印和铜牌上的光隔一阵闪过
  ZIK.push(pic({ id: 'z3', cap: 'z3', img: 'ill/z3.jpg', sheen: .4, sweep: { type: 'r', c: [.7, .5], spread: .6 }, build: picture() }));

  /* ───────── Zikaron 页末:吉甲的十二块立石 ───────── */
  // 约书亚记 4:20:从约旦河中取来的十二块石头,约书亚立在吉甲。天刚亮,面朝东方:天边一道平平的摩押高原,太阳刚从山上露出来;
  // 约旦河在山脚是一线银光,河谷里卧着晨雾;原野空旷,十二块石头围成一圈立在原上,背着光,朝着太阳的边上一道暖光;
  // 长长的影子朝人这边铺开,两边都指向天边的太阳。全是屏幕比例坐标(0–1000),横向的宽按宽高比换算,圆与石头才不走形
  function lcg(a) { return function () { a = (Math.imul(a, 1664525) + 1013904223) >>> 0; return a / 4294967296; }; }
  function sm(x) { x = Math.max(0, Math.min(1, x)); return x * x * (3 - 2 * x); }
  function gilgal(V) {
    var t = V.tall, base = V.hz * 1000 + (t ? 40 : 0), G = { base: base, asp: V.asp, tall: t };
    G.sun = [t ? 790 : 838, 0, t ? 14 : 17];
    G.ring = t ? [480, base + 62, 290, 28] : [590, base + 72, 205, 35];
    G.sun[1] = moab(G, G.sun[0], 0) - G.sun[2] * .62;
    G.stones = ringStones(G);
    return G;
  }
  // 摩押高原:远看是天边一道大体平的山,右边略高;坡上一道道沟;前面一层低矮的山脚
  function moab(G, x, near) {
    var B = G.base;
    if (near) return B - (8 + 9 * P.fbm(x * .009 + 4.2) + 3.5 * P.fbm(x * .031 + 1.1));
    var u = x / 1000;
    return B - (28 + 7 * P.fbm(x * .0028 + 2.3) + 3 * P.fbm(x * .012 + 8.8) + 1.4 * P.fbm(x * .05 + 3) + 12 * sm((u - .12) / .7) + 11 * Math.exp(-Math.pow((u - .6) / .09, 2)) - 7 * Math.exp(-Math.pow((u - .36) / .035, 2)) - 5 * Math.exp(-Math.pow((u - .9) / .03, 2)));
  }
  // 十二块石头:围成一圈,近大远小,每块露出天边的那一截一样;形状各不相同:斜顶的石板、细高的石柱、宽而矮的石块、顶上断过的一块
  function ringStones(G) {
    var r = lcg(12), out = [], R = G.ring;
    for (var i = 0; i < 12; i++) {
      var a = -1.15 + i / 12 * 6.2832 + (r() - .5) * .2, x = R[0] + Math.cos(a) * R[2] * (1 + (r() - .5) * .1), y = R[1] + Math.sin(a) * R[3] * (1 + (r() - .5) * .12);
      var ty = i === 7 ? 3 : r() < .3 ? 1 : r() < .45 ? 2 : 0, k = ty === 1 ? .2 + .07 * r() : ty === 2 ? .46 + .1 * r() : ty === 3 ? .34 : .3 + .1 * r();
      var h = (y - G.base) / .66 * (ty === 2 ? .72 : ty === 3 ? .6 : .88 + .26 * r()), w = h * k / G.asp;
      out.push({ x: x, y: y, h: h, w: w, ty: ty, lean: (r() - .5) * .06, top: r(), slope: (r() - .5), seed: i * 3.7 + 1, near: (Math.sin(a) + 1) / 2 });
    }
    out.sort(function (p, q) { return p.y - q.y; });
    out.forEach(function (st) { outline(st, G.asp); });
    return out;
  }
  // 一块石头的轮廓:左边从下往上、顶上一道不齐的脊、右边从上往下;底宽上收,两边微微鼓,细处有风化的缺口
  function outline(st, asp) {
    var x = st.x, y = st.y, h = st.h, hw = st.w / 2, ty = st.ty, ln = st.lean * h / asp, k, t, u, L = [], Rr = [], top = [];
    var taper = ty === 1 ? .86 : ty === 2 ? .84 : .74, sl = st.slope * (ty === 2 ? .12 : .26) * h, sh = h * (ty === 2 ? .86 : .92);
    var hL = sh + Math.min(0, sl), hR = sh - Math.max(0, sl);
    function wob(t, s) { return 1 + .045 * Math.sin(t * 5.3 + st.seed * s) + .02 * Math.sin(t * 17 + st.seed * 2 * s); }
    for (k = 0; k <= 10; k++) { t = k / 10; L.push([x - hw * (1 - (1 - taper) * t) * wob(t, 1) + ln * t, y - hL * t]); }
    for (k = 0; k <= 10; k++) { t = k / 10; Rr.push([x + hw * (1 - (1 - taper) * t) * wob(t, 1.7) + ln * t, y - hR * t]); }
    var a = L[10], b = Rr[10];
    for (k = 1; k < 10; k++) {
      u = k / 10;
      var crest = Math.sin(u * Math.PI) * h * (ty === 3 ? .02 : ty === 1 ? .1 : .05 + .04 * st.top), jag = h * (ty === 3 ? .045 : .012) * Math.sin(u * 13 + st.seed * 3);
      top.push([a[0] + (b[0] - a[0]) * u, a[1] + (b[1] - a[1]) * u - crest - jag]);
    }
    st.L = L; st.R = Rr; st.top = top; st.pts = L.concat(top, Rr.slice().reverse());
  }
  function gSky(G) {
    return function (P) {
      var g = P.g(), B = G.base, sx = G.sun[0], sy = G.sun[1], k;
      // 天:高处是白纸,留给字与卡片;天边一带越近越暖
      g.fillStyle = P.lg(0, B - 250, 0, B + 8, [[0, '#f3e6da', 0], [.4, '#f4d9c2', .22], [.72, '#f3cba8', .52], [.9, '#f0bd93', .72], [1, '#ecb286', .82]]);
      g.fillRect(-20, B - 250, 1040, 258);
      // 太阳四周一大团晨光,贴着天边往两边铺开
      g.save(); g.translate(sx, sy); g.scale(1 / G.asp, 1);
      g.fillStyle = P.rg(0, 0, 0, 520, [[0, '#f4b878', .9], [.07, '#f5c38c', .7], [.2, '#f5d2ac', .32], [.5, '#f2e0d0', .07], [1, '#f2e7de', 0]]); g.fillRect(-540, -540, 1080, 1080);
      g.scale(1, .15); g.fillStyle = P.rg(0, 0, 0, 1000, [[0, '#f1b37a', .72], [.35, '#f3c79c', .32], [1, '#f3dfcc', 0]]); g.beginPath(); g.arc(0, 0, 900, 0, 6.2832); g.fill();
      g.restore();
      // 贴着天边的几道层云,底下被晨光照亮,离太阳越近越亮
      for (k = 0; k < 24; k++) {
        var y = B - 34 - 150 * Math.pow(P.R(), 1.5), x0 = P.rnd(300, 1000), Lw = P.rnd(60, 260) * (1.2 - (B - y) / 400), ns = Math.max(0, 1 - Math.abs(x0 + Lw / 2 - sx) / 420);
        P.stroke([[x0, y], [x0 + Lw * .5, y + P.rnd(-1, 1)], [x0 + Lw, y + P.rnd(-.8, .8)]], P.rnd(.8, 2.2), P.mix('#dccbd3', '#f1bd88', ns * ns), { a: P.rnd(.12, .3) * (.5 + .5 * ns) });
        if (ns > .3) P.stroke([[x0 + Lw * .1, y + 1.2], [x0 + Lw * .9, y + 1.4]], .8, '#f2bb7e', { a: .45 * ns });
      }
    };
  }
  // 太阳:刚从山上露出来,山后那一截不画;单独一层,沙聚得密,才是一轮亮的日头
  function gSun(G) {
    return function (P) {
      var g = P.g(), sx = G.sun[0], sy = G.sun[1], R = G.sun[2], x;
      g.save(); g.beginPath(); g.moveTo(-20, -20); g.lineTo(1020, -20); for (x = 1020; x >= -20; x -= 4) g.lineTo(x, moab(G, x, 0) + .5); g.closePath(); g.clip();
      g.translate(sx, sy); g.scale(1 / G.asp, 1);
      g.fillStyle = P.rg(0, 0, R * .9, R * 2.2, [[0, '#f5c182', .7], [.5, '#f6c890', .28], [1, '#f6cf9e', 0]]); g.beginPath(); g.arc(0, 0, R * 2.2, 0, 6.2832); g.fill();
      g.fillStyle = P.rg(0, -R * .15, R * .05, R, [[0, '#fbe6c0', 1], [.55, '#f8d49c', 1], [.85, '#f4bd79', 1], [1, '#efa866', .9]]); g.beginPath(); g.arc(0, 0, R, 0, 6.2832); g.fill();
      g.restore();
    };
  }
  // 远山:高原顶上一道亮边(近太阳处最亮);坡上一道道沟,背光的一面淡紫;前面一层低矮的山脚,底下化进河谷的雾
  function gHills(G) {
    return function (P) {
      var g = P.g(), B = G.base, sx = G.sun[0], x, k, far = [], near = [];
      for (x = -20; x <= 1020; x += 3) { far.push([x, moab(G, x, 0)]); near.push([x, moab(G, x, 1)]); }
      P.fill(far.concat([[1020, B + 10], [-20, B + 10]]), P.lg(0, B - 80, 0, B + 10, [[0, '#a69bbd', .8], [.5, '#b7abc6', .7], [.85, '#d3c8d0', .45], [1, '#e4d9d6', .3]]), { smooth: false });
      g.save(); P.trace(g, far.concat([[1020, B + 10], [-20, B + 10]]), true, false); g.clip();
      for (k = 0; k < 260; k++) {
        x = P.rnd(-10, 1010); var tp = moab(G, x, 0), d = (B - tp) * P.rnd(.25, .9), sl = P.rnd(-.5, .5);
        P.stroke([[x, tp + 1], [x + sl * d * .3, tp + d * .5], [x + sl * d * .5, tp + d]], P.rnd(.6, 2.4), P.R() < .6 ? '#9589ab' : '#d8cdd6', { a: P.rnd(.12, .3) });
      }
      g.fillStyle = P.lg(0, B - 20, 0, B + 10, [[0, '#ece4e2', 0], [1, '#ece4e2', .55]]); g.fillRect(-20, B - 20, 1040, 30);
      g.restore();
      for (x = sx - 240; x < sx + 240; x += 2) { var f = Math.max(0, 1 - Math.abs(x - sx) / 240); P.stroke([[x, moab(G, x, 0) + .6], [x + 2, moab(G, x + 2, 0) + .6]], .9 + 1.6 * f, '#f3bb7c', { a: .9 * f * f, beh: f > .5 ? 6 : 0 }); }
      P.fill(near.concat([[1020, B + 12], [-20, B + 12]]), P.lg(0, B - 30, 0, B + 12, [[0, '#a79aa8', .5], [.6, '#bcb0b8', .4], [1, '#dcd0cb', .22]]), { smooth: false });
    };
  }
  // 河谷:山脚下卧着一层晨雾;约旦河边的密林远看是一道灰绿;河是一线银光,近太阳的一段最亮,一闪一闪
  function gValley(G) {
    return function (P) {
      var B = G.base, sx = G.sun[0], k, x, y, L, pts = [];
      function ry(x) { return B + 11 + 2.2 * Math.sin(x * .011 + .7) + 1.4 * Math.sin(x * .027 + 2.1); }
      for (x = -20; x <= 1020; x += 5) pts.push([x, ry(x)]);
      P.stroke(pts.map(function (q) { return [q[0], q[1] - 2.3]; }), 3, '#8f937c', { a: .34 });
      P.stroke(pts.map(function (q) { return [q[0], q[1] + 2.4]; }), 2.2, '#aaa893', { a: .18 });
      for (x = -20; x < 1020; x += 4) { var ns = Math.max(0, 1 - Math.abs(x - sx) / 300); P.stroke([[x, ry(x)], [x + 4, ry(x + 4)]], 1.1 + 1 * ns, P.mix('#9cafba', '#eeb674', ns), { a: .58 + .4 * ns }); }
      for (k = 0; k < 120; k++) { x = P.rnd(0, 1000); var n2 = Math.max(0, 1 - Math.abs(x - sx) / 340); if (P.R() > .18 + n2) continue; P.stroke([[x, ry(x)], [x + P.rnd(3, 8), ry(x) + .2]], P.rnd(.6, 1.1), '#f4c688', { a: P.rnd(.6, 1), beh: 3 }); }
      for (k = 0; k < 150; k++) { y = B + P.rnd(-6, 24); x = P.rnd(-60, 1000); L = P.rnd(80, 320); P.stroke([[x, y], [x + L * .5, y + P.rnd(-1, 1)], [x + L, y]], P.rnd(2, 6), '#f6f0e9', { a: P.rnd(.06, .16), beh: 5 }); }
    };
  }
  // 细草:一丛细长的草茎,几乎直立,微微弯;横向的散开按宽高比收拢,不会摊成一个叉
  function blades(P, x, y, sc, n, cols, asp, beh) {
    for (var k = 0; k < n; k++) {
      var h = (3 + 22 * sc) * P.rnd(.5, 1), bx = x + P.rnd(-2.4, 2.4) * (.4 + sc) / asp, lean = P.rnd(-.16, .2) * h / asp, bend = P.rnd(-.08, .08) * h / asp;
      P.stroke([[bx, y], [bx + lean * .35 + bend, y - h * .55], [bx + lean, y - h]], P.rnd(.35, .7) * (.45 + sc), P.pick(cols), { a: P.rnd(.35, .75), beh: beh });
    }
  }
  // 原野:远处浅而雾,近处暖而实;太阳底下的一片地被晨光照亮;细横纹远密近疏;几道低缓的起伏;
  // 零星的碎石与细草;一条踩出来的小路弯向石圈
  function gPlain(G) {
    return function (P) {
      var g = P.g(), B = G.base, sx = G.sun[0], k, x, y;
      g.fillStyle = P.lg(0, B, 0, 1010, [[0, '#e6d6bd', .52], [.12, '#dac6a6', .63], [.5, '#ccb58e', .75], [1, '#b69e77', .85]]);
      g.fillRect(-20, B, 1040, 1030 - B);
      g.save(); g.translate(sx, B + 4); g.scale(1 / G.asp, .18);
      g.fillStyle = P.rg(0, 0, 0, 1200, [[0, '#f3cf9f', .5], [.25, '#f2d7b3', .2], [1, '#f0dcc4', 0]]); g.beginPath(); g.arc(0, 0, 1200, 0, 6.2832); g.fill(); g.restore();
      for (k = 0; k < 3800; k++) {
        var r = Math.pow(P.R(), 1.6), sc = .12 + .88 * r; y = B + 5 + r * (1000 - B); x = P.rnd(-20, 1020);
        P.stroke([[x, y], [x + P.rnd(6, 30) * sc, y + P.rnd(-.5, .5)]], P.rnd(.4, 1.2) * (.4 + sc), P.vary(P.pick(['#bda982', '#ad9d75', '#cab890', '#a2966f', '#d9caa6']), .03), { a: P.rnd(.14, .36) });
      }
      for (k = 0; k < 22; k++) {
        var r3 = Math.pow(P.R(), 1.2), y3 = B + 24 + r3 * (1000 - B), w3 = 60 + 260 * r3, x3 = P.rnd(-100, 1100);
        g.save(); g.translate(x3, y3); g.scale(1 / G.asp, .11);
        g.fillStyle = P.rg(0, -w3 * .3, 0, w3, [[0, '#eadcc0', .26], [1, '#eadcc0', 0]]); g.beginPath(); g.arc(0, 0, w3, 0, 6.2832); g.fill();
        g.fillStyle = P.rg(0, w3 * .35, 0, w3, [[0, '#a3916b', .2], [1, '#a3916b', 0]]); g.beginPath(); g.arc(0, 0, w3, 0, 6.2832); g.fill(); g.restore();
      }
      // 背着光,近处的地暗一些,两角更暗
      g.fillStyle = P.lg(0, B + (1000 - B) * .45, 0, 1010, [[0, '#9d8b69', 0], [1, '#9d8b69', .3]]); g.fillRect(-20, B + (1000 - B) * .45, 1040, 600);
      // 小路:从脚下弯向石圈的前沿,越近越宽,颜色比两边浅一点
      var R = G.ring, a0 = [G.tall ? 250 : 300, 1030], a1 = [R[0] - R[2] * .1, R[1] + R[3] + 3];
      for (k = 0; k < 1100; k++) {
        var u = Math.pow(P.R(), .8), px = a0[0] + (a1[0] - a0[0]) * (1 - Math.pow(1 - u, 1.7)) + 36 * Math.sin(u * 3.1) * (1 - u), py = a0[1] + (a1[1] - a0[1]) * u, wd = (1 - u) * 24 + 2.5;
        P.stroke([[px + P.rnd(-1, 1) * wd / G.asp, py], [px + P.rnd(-1, 1) * wd / G.asp + P.rnd(4, 14) * (1 - u * .7), py + P.rnd(-.4, .4)]], P.rnd(.5, 1.3) * (1.2 - u), P.pick(['#c4ad86', '#bba47d', '#cbb690']), { a: P.rnd(.12, .26) });
      }
      // 碎石:原上零星几块,低而圆,背光,各拖一道短影
      for (k = 0; k < 16; k++) {
        var r4 = Math.pow(P.R(), 1.3), y4 = B + 30 + r4 * (1000 - B - 30), s4 = .8 + 5 * r4, x4 = P.rnd(0, 1000), t4 = 2.2 + r4;
        P.fill([[x4 - s4 / G.asp, y4], [x4 + s4 / G.asp, y4], [sx + (x4 + s4 / G.asp - sx) * t4, B + (y4 - B) * t4], [sx + (x4 - s4 / G.asp - sx) * t4, B + (y4 - B) * t4]], P.lg(0, y4, 0, B + (y4 - B) * t4, [[0, '#7f7988', .2], [1, '#7f7988', 0]]), { smooth: false });
        P.fill(P.ellP(x4, y4 - s4 * .35, s4 * 1.1 / G.asp, s4 * .55, P.rnd(-.2, .2), 14), P.mix('#8f877e', '#bdb2a4', 1 - r4), { a: .85 });
        P.stroke([[x4 - s4 * .3 / G.asp, y4 - s4 * .85], [x4 + s4 * .8 / G.asp, y4 - s4 * .6]], .6 + s4 * .12, '#f6dcb2', { a: .6 });
      }
      var GR = ['#a39a6a', '#b3a676', '#8e8a5e', '#9c9068', '#b7a87c', '#c4b58a'];
      for (k = 0; k < 170; k++) { var r2 = Math.pow(P.R(), 1.1), sc2 = .06 + .6 * r2; blades(P, P.rnd(0, 1000), B + 14 + r2 * (1000 - B), sc2, 4 + Math.round(9 * sc2), GR, G.asp, 4); }
    };
  }
  // 影子:从石头脚下朝人这边铺开,两条边都指向天边的太阳脚下;软、淡,越远越淡,半路就化进地里;石头脚下一小块压暗
  function gShadows(G) {
    return function (P) {
      var g = P.g(), B = G.base, fx = G.sun[0];
      G.stones.forEach(function (st) {
        var y0 = st.y, xl = st.x - st.w * .5, xr = st.x + st.w * .5, end = y0 + st.h * (.5 + .3 * st.near), t = (end - B) / (y0 - B);
        var el = fx + (xl - fx) * t, er = fx + (xr - fx) * t;
        P.fill([[xl, y0], [xr, y0], [er, end], [el, end]], P.lg(0, y0, 0, end, [[0, '#686279', .4], [.3, '#716b83', .24], [.7, '#7c768c', .08], [1, '#8a8496', 0]]), { smooth: false });
        g.save(); g.translate(st.x, y0 + 1); g.scale(1 / G.asp, .24);
        var rr = st.w * G.asp * .9; g.fillStyle = P.rg(0, 0, 0, rr, [[0, '#5d5866', .38], [1, '#5d5866', 0]]); g.beginPath(); g.arc(0, 0, rr, 0, 6.2832); g.fill(); g.restore();
      });
    };
  }
  // 一块立石:背着光。朝太阳的一侧受一点侧光、偏暖,另一侧偏冷偏暗,底下更暗,远的蒙一层天光;
  // 石灰岩的几道层理、一道道风化的细纹、细小的坑与极淡的地衣;朝太阳的边与顶上一线亮(beh 6,一道光隔一阵扫过);脚下几丛细草
  function drawStone(P, G, st) {
    var g = P.g(), x = st.x, y = st.y, h = st.h, hw = st.w / 2, k, sunR = x < G.sun[0], haze = (1 - st.near) * .34;
    var lit = P.mix('#d2ad7d', '#dccfc2', haze), mid = P.mix('#857e7a', '#cdc5c1', haze), dk = P.mix('#625d5c', '#c3bbb9', haze);
    var xs = sunR ? x + hw : x - hw, xo = sunR ? x - hw : x + hw;
    P.fill(st.pts, P.lg(xs, 0, xo, 0, [[0, lit, 1], [.12, P.mix(lit, mid, .55), 1], [.45, mid, 1], [1, dk, 1]]), { a: .96 });
    g.save(); P.trace(g, st.pts, true, true); g.clip();
    g.fillStyle = P.lg(0, y - h, 0, y, [[0, '#b9b8c2', .16], [.35, '#b9b8c2', 0], [.75, '#5a544f', 0], [1, '#5a544f', .4]]); g.fillRect(x - hw * 2, y - h * 1.2, hw * 4, h * 1.3);
    var area = st.w * G.asp * h;
    for (k = 0; k < 3 + Math.round(h / 30); k++) { var yy = y - h * P.rnd(.08, .85), tl = P.rnd(-.06, .06) * h; P.stroke([[x - hw * 1.1, yy + tl], [x, yy + P.rnd(-1, 1)], [x + hw * 1.1, yy - tl]], P.rnd(.5, 1.1), P.pick(['#6a6461', '#b4aa9c']), { a: P.rnd(.1, .2) }); }
    for (k = 0; k < Math.round(area * .35); k++) {
      var fx = x + P.rnd(-hw, hw), fy = y - P.rnd(0, h), Lk = P.rnd(2, 9) * (h / 110);
      P.stroke([[fx, fy], [fx + P.rnd(-.2, .2) * Lk / G.asp, fy - Lk]], P.rnd(.35, .8) * (.5 + st.near * .5), P.pick(P.R() < .6 ? ['#6c6663', '#625c5a', '#77706b'] : ['#b3aa9e', '#a59c92', '#c0b6a8']), { a: P.rnd(.08, .22) });
    }
    for (k = 0; k < Math.round(area * .03); k++) P.dab(x + P.rnd(-hw, hw), y - P.rnd(h * .05, h * .9), P.rnd(.4, 1.2) / G.asp, P.rnd(.4, 1), 0, '#5d5753', P.rnd(.15, .35));
    for (k = 0; k < Math.round(area * .012); k++) P.dab(x + P.rnd(-hw, hw) * .8, y - h * P.rnd(.55, .92), P.rnd(.8, 2.2) / G.asp, P.rnd(.5, 1.3), 0, P.pick(['#bdbba8', '#c3bfa9', '#b2b09a']), P.rnd(.14, .3));
    g.restore();
    // 一线亮:朝太阳的边从下往上越来越亮,接着沿顶上走到另一头变淡
    var side = sunR ? st.R : st.L, crest = sunR ? st.top.slice().reverse() : st.top, lw = (1 + 1.1 * st.near) * (h / 150 + .6), nx = sunR ? -.3 : .3, m = side.length;
    for (k = 2; k < m - 1; k++) { var f = (k - 2) / (m - 3); P.stroke([side[k], side[k + 1]], lw, '#f2c68c', { a: .3 + .68 * f, beh: 6 }); }
    var ct = [side[m - 1]].concat(crest);
    for (k = 0; k < ct.length - 1; k++) { var f2 = 1 - k / (ct.length - 1); P.stroke([ct[k], ct[k + 1]], lw * (.55 + .45 * f2), '#f4cd98', { a: .35 + .6 * f2, beh: 6 }); }
    P.stroke(side.slice(3).map(function (q) { return [q[0] + nx * lw * 1.6 / G.asp, q[1]]; }), lw * 2.6, '#e8b97e', { a: .18 });
    for (k = 0; k < 3 + Math.round(5 * st.near); k++) blades(P, x + P.rnd(-1.2, 1.2) * hw, y + P.rnd(-.5, 1.5), .1 + .22 * st.near, 5, ['#8e8a5e', '#a39a6a', '#7b7d56', '#b3a676'], G.asp, 4);
  }
  function gStones(G) { return function (P) { G.stones.forEach(function (st) { drawStone(P, G, st); }); }; }
  // 石头脚下与原上的一层薄雾:长而淡,慢慢漂(beh 5)
  function gMist(G) {
    return function (P) {
      var B = G.base, R = G.ring, k, x, y, L;
      for (k = 0; k < 110; k++) { y = R[1] + R[3] * P.rnd(-1.4, 1.3); x = R[0] - R[2] * 1.9 + P.rnd(0, R[2] * 3.8); L = P.rnd(40, 170); P.stroke([[x, y], [x + L * .5, y + P.rnd(-.6, .6)], [x + L, y]], P.rnd(1.6, 4.2), '#f7f2eb', { a: P.rnd(.07, .18), beh: 5 }); }
      for (k = 0; k < 80; k++) { y = B + 24 + P.rnd(0, 60); x = P.rnd(-40, 1000); L = P.rnd(90, 280); P.stroke([[x, y], [x + L * .5, y + P.rnd(-.8, .8)], [x + L, y]], P.rnd(2, 5), '#f6f0e8', { a: P.rnd(.05, .14), beh: 5 }); }
    };
  }
  // 近处:几丛高一些的干草,随风轻摆
  function gNear(G) {
    return function (P) {
      var B = G.base, k;
      for (k = 0; k < 46; k++) { var r = .72 + .28 * P.R(), y = B + r * (1000 - B) + 24; blades(P, P.rnd(-10, 1010), y, .55 + .5 * P.R(), 9 + Math.round(12 * P.R()), ['#9c9068', '#b3a676', '#8e8a5e', '#c2b385', '#7f7a55', '#d0c197'], G.asp, 4); }
    };
  }
  function gilgalScene() {
    return function (S, P, V) {
      var G = gilgal(V), B = G.base, scr = [0, 0, 0, 0, 0, 0, 1, 0, 0, 0, 0, 32], R = G.ring, st0 = G.stones.reduce(function (m, s) { return Math.min(m, s.y - s.h * 1.05); }, B);
      S.add({ paint: gSky(G), box: [-20, B - 480, 1020, B + 12], moving: true, weight: .4, blur: 1.4, z: 0, raw: scr });
      S.add({ paint: gSun(G), box: [G.sun[0] - G.sun[2] * 2.4 / G.asp, G.sun[1] - G.sun[2] * 2.4, G.sun[0] + G.sun[2] * 2.4 / G.asp, G.sun[1] + G.sun[2] * 2.4], moving: true, weight: 5, blur: .5, z: .5, raw: scr });
      S.add({ paint: gHills(G), box: [-20, B - 80, 1020, B + 14], moving: true, weight: .9, blur: .8, z: 1, raw: scr });
      S.add({ paint: gPlain(G), box: [-20, B - 4, 1020, 1030], moving: true, weight: .75, blur: .8, z: 2, raw: scr });
      S.add({ paint: gValley(G), box: [-60, B - 8, 1020, B + 32], moving: true, weight: 1.5, blur: .5, z: 3, raw: scr });
      S.add({ paint: gShadows(G), box: [-20, R[1] - R[3] * 1.3, 1020, 1040], moving: true, weight: .7, blur: 2, z: 4, raw: scr });
      S.add({ paint: gStones(G), box: [R[0] - R[2] * 1.3, st0 - 8, R[0] + R[2] * 1.3, R[1] + R[3] * 1.3 + 12], moving: true, weight: 2.2, blur: .4, z: 5, raw: scr });
      S.add({ paint: gMist(G), box: [-40, B + 10, 1020, R[1] + R[3] * 2 + 10], moving: true, weight: .3, blur: 2, z: 6, raw: scr });
      S.add({ paint: gNear(G), box: [-20, B + (1000 - B) * .6, 1020, 1030], moving: true, weight: .9, blur: .5, z: 7, raw: scr });
      return function () {};
    };
  }
  // 功能一段:沙停在交易与履约,在原地淡去,只留空中的细尘,四块界面像浮在上面;翻到最后一页,沙从包裹原来的位置直接铺开成吉甲的立石,像是停下的一幕接着演
  ZIK.push({ id: 'zfeat', cap: 'zfeat', lay: 'F', vanish: true, atmo: true, nobed: true, ground: ['#fbfbfa', '#141312'] });
  // 末页与词源是同一幅画:末页的三张卡片随沙一起出来,词源的经文先出来、画随后成形
  function gilgalAt(o) { var g = { lay: 'F', full: true, atmo: true, ambient: true, nobed: true, shed: false, sheen: .34, sheenD: [1.3, -.25], res: 1.6, fine: 1.45, areaFrac: .66, glow: [1, .9, .72], ground: ['#fbfaf6', '#141311'], dur: 2.8, sweep: { type: 'r', c: [.63, .72], spread: .7 }, still: 6, build: gilgalScene() }; for (var k in o) g[k] = o[k]; return g; }
  ZIK.push(gilgalAt({ id: 'zend', cap: 'zend', sync: true }));
  // 词源:不随滚动,点开才演
  ZIK.push(gilgalAt({ id: 'etym', cap: 'etym' }));

  /* ───────── 下载页:只有空中的细尘 ───────── */
  var DL = [{ id: 'dl', cap: 'dl', lay: 'F', vanish: true, atmo: true, nobed: true, ground: ['#fbfbfa', '#141312'] }];

  return { stage: stage, paint: PT.paint, scenes: { home: HOME, zikaron: ZIK, download: DL } };
})();
