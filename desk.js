/* 功能四块:照 Zikaron Desk 0.1.4 的界面重做的片段,四块共用一本示例账本。
   全是示例:不连链,不用钥匙。唯一真算的是拖入文件的指纹,在浏览器里算 SHA-256,文件不离开本机。
   界面上的话两语都在这里,按页面的 lang 取;字照应用的 lang.rs。控件、圆角、高度照 0.1.4 的 zikaron-ui。 */
(() => {
'use strict';
const $$ = (s, r = document) => [...r.querySelectorAll(s)];
const box = {};
$$('[data-zd]').forEach(e => box[e.dataset.zd] = e);
if (!box.record) return;
const EN = document.documentElement.lang === 'en', T = (zh, en) => EN ? en : zh;

const esc = s => String(s ?? '').replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
const pad = n => String(n).padStart(2, '0');
const when = s => { if (s == null) return '—'; const d = new Date(s * 1000); return `${d.getUTCFullYear()}-${pad(d.getUTCMonth() + 1)}-${pad(d.getUTCDate())} ${pad(d.getUTCHours())}:${pad(d.getUTCMinutes())}:${pad(d.getUTCSeconds())}`; };
const day = s => s == null ? '—' : when(s).slice(0, 10);
const TO = T(' 至 ', ' to ');
const sa = a => a.slice(0, 6) + '…' + a.slice(-4);
const sh = h => h.slice(0, 8) + '…' + h.slice(-6);
const hex = (n, len = 64) => { let x = '0x', seed = (n * 7919 + 104729) % 233280; const c = '0123456789abcdef'; for (let i = 0; i < len; i++) { seed = (seed * 9301 + 49297) % 233280; x += c[Math.floor(seed / 233280 * 16)]; } return x; };
const size = b => b < 1024 ? b + ' B' : b < 1048576 ? (b / 1024).toFixed(1) + ' KB' : (b / 1048576).toFixed(1) + ' MB';
const now = () => Math.floor(Date.now() / 1000);
const DAY = 86400, HE = '0x8a5e669081c6056c13f06dcfea606a30142bdd4d', ME = '0x3be672658efa08b9820bbebaf7c4f0e77433f878', LIMIT = 256 * 1048576;
const TERMS = [T('授权条款-2026.pdf', 'grant-terms-2026.pdf'), 182400];
const MONTH = m => EN ? ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'][m] : (m + 1) + '月';

/* 图标:照应用的线描图标,16 格,线宽 1.5 */
const GL = {
  inbox: 'M2 9 4 3h8l2 6v5H2zM2 9h4l1 2h2l1-2h4',
  doc: 'M4 1.5h5.5l3 3v10H4zM9.5 1.5v3h3',
  ok: 'M3 8.5 6.5 12 13 4.5',
  copy: 'M5 5h9v9H5zM2 11V2h9',
  folder: 'M1.5 4V13h13V5.5H7.5L6 4z',
  box: 'M2 5l6-3 6 3v6.5l-6 3-6-3zM2 5l6 3 6-3M8 8v6.5',
  chev: 'M6 3.5 10.5 8 6 12.5',
  down: 'M4 6.5 8 10.5 12 6.5',
  shield: 'M8 1.5 13.5 3.5V8c0 3.2-2.4 5.6-5.5 6.5C4.9 13.6 2.5 11.2 2.5 8V3.5z',
  info: 'M8 1.5a6.5 6.5 0 1 0 0 13 6.5 6.5 0 0 0 0-13zM8 7.2V11.5M8 4.6v.1',
};
const gl = (n, s = 16, cls = '') => `<svg class="zd-gl ${cls}" width="${s}" height="${s}" viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path vector-effect="non-scaling-stroke" d="${GL[n]}"/></svg>`;
/* 状态标(18px):圆底取 wash 色,记号取本色;Busy 是链上进行中的琥珀转圈,Todo 是虚线圈 */
const mark = k => k === 'busy' ? '<span class="zd-mk busy"><i></i></span>' : k === 'todo' ? '<span class="zd-mk todo"></span>'
  : `<span class="zd-mk ${k}"><svg width="18" height="18" viewBox="0 0 18 18" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="${k === 'ok' ? 'M5.5 9.3 7.9 11.6 12.6 6.6' : k === 'warn' ? 'M9 5.2v4.6M9 12.6v.1' : 'M6.4 6.4l5.2 5.2M11.6 6.4l-5.2 5.2'}"/></svg></span>`;
/* 上链状态的胶囊:待上链灰,正在等待上链蓝带转圈,确认中蓝,已确认绿 */
const LAMP = {
  ok: ['ok', 0, T('已确认', 'Confirmed'), 'ok'],
  inc: ['blue', 0, T('确认中', 'Confirming'), 'busy'],
  sub: ['blue', 1, T('正在等待上链', 'Waiting to go on chain'), 'busy'],
  q: ['grey', 0, T('待上链', 'Pending'), 'todo'],
};
const pill = (tone, text, spin) => `<span class="zd-pill ${tone}">${spin ? '<span class="zd-spin"></span>' : ''}${text}</span>`;
const pillOf = k => pill(LAMP[k][0], LAMP[k][2], LAMP[k][1]);
const SIX = EN ? ['Grant signature', 'Issuer ledger intact', "In the issuer's ledger", 'Confirmed on chain', 'Within validity', 'Not revoked']
  : ['授权签名', '签发者账本完整', '在签发者账本里', '上链已确认', '在有效期内', '未被撤销'];
const SAMPLES = EN ? ['chapter-3.pdf', 'illustration-01.png', 'interview.m4a', 'contract-signed.pdf', 'score-demo.wav']
  : ['第三章手稿.pdf', '插图-01.png', '访谈录音.m4a', '合同-签字页.pdf', '配乐小样.wav'];

/* ── 示例账本 ── */
let E, S, gen = 0;
const recs = () => E.filter(e => e.type === 'history');
const grants = () => E.filter(e => e.type === 'grant');
const byseq = s => E.find(e => e.seq === +s);
const queue = () => E.filter(e => e.lamp === 'q');
const later = (ms, fn) => { const g = gen; setTimeout(() => { if (g === gen) fn(); }, ms); };
const gstate = g => g.revokedBy != null ? ['grey', T('已撤销', 'Revoked')] : now() > g.until ? ['warn', T('已到期', 'Expired')] : ['ok', T('有效', 'Active')];
const six = g => ['ok', 'ok', 'ok', g.lamp === 'ok' ? 'ok' : g.lamp === 'q' ? 'bad' : 'warn', now() <= g.until ? 'ok' : 'bad', g.revokedBy != null ? 'bad' : 'ok'];
const verdict = v => { const bad = v.filter(x => x === 'bad').length; return bad ? ['bad', T(`${bad} 项不符`, `${bad} do not match`)] : v.includes('warn') ? ['warn', T('未全部核成', 'Not everything could be checked')] : ['ok', T('全部相符', 'All match')]; };

function reset() {
  gen++;
  const t = now(), T0 = t - t % DAY - 20 * DAY + 9 * 3600 + 12 * 60 + 40;
  E = [
    { seq: 0, type: 'genesis', lamp: 'ok', at: T0 },
    { seq: 1, type: 'history', name: T('第一章手稿.pdf', 'chapter-1.pdf'), size: 1320000, h: hex(2), lamp: 'ok', at: T0 + 1180 },
    { seq: 2, type: 'history', name: T('封面设计.png', 'cover.png'), size: 2480000, h: hex(4), lamp: 'ok', at: T0 + 3390 },
    { seq: 3, type: 'grant', rec: 1, to: HE, from: T0 + 3 * DAY, until: T0 + 33 * DAY, lamp: 'ok', at: T0 + 3 * DAY + 600 },
    { seq: 4, type: 'history', name: T('第二章手稿.pdf', 'chapter-2.pdf'), size: 1410000, h: hex(5), lamp: 'q', at: null },
  ];
  S = { rec: {}, send: '', sample: 0, gf: { rec: 1, win: 1 }, kit: new Set([1]), folder: false, sealed: false, made: null,
    chk: { seq: 3, shown: 3, step: 6, id: 0, vec: six(byseq(3)).join() }, vtab: 0, rtab: 0, vk: null, took: 0, sheet: null, flash: null };
  render();
}

/* ── 动作 ── */
async function addRecord(f) {
  if (S.rec.busy) return;
  if (f.size > LIMIT) { S.rec = { err: T('示例里只算 256 MB 以内的文件', 'The sample handles files up to 256 MB') }; render(); return; }
  const g = gen;
  S.rec = { busy: true };
  S.sheet = { on: 'record', kind: 'new', name: f.name, size: f.size, h: null };
  render();
  let h;
  try {
    const d = await crypto.subtle.digest('SHA-256', await f.arrayBuffer());
    h = '0x' + [...new Uint8Array(d)].map(x => x.toString(16).padStart(2, '0')).join('');
  } catch (err) {
    if (g === gen) { S.rec = { err: T('读不了这一份：示例里只收单个文件', 'This item could not be read: the sample takes single files') }; S.sheet = null; render(); }
    return;
  }
  if (g !== gen || !S.sheet || S.sheet.kind !== 'new') return;
  S.sheet.h = h; S.rec = {};
  render();
}
function commitRecord() {
  const sh = S.sheet, inp = box.record.querySelector('[data-f="name"]');
  const name = (inp && inp.value.trim()) || sh.name;
  const e = { seq: E.length, type: 'history', name, size: sh.size, h: sh.h, lamp: 'q', at: null };
  E.push(e);
  S.rec = { seq: e.seq, h: sh.h };
  S.sheet = null;
  emit();
}
function addSample() {
  const i = S.sample++, n = SAMPLES[i % SAMPLES.length], name = i < SAMPLES.length ? n : n.replace(/(\.[^.]+)$/, `-${Math.floor(i / SAMPLES.length) + 1}$1`);
  addRecord(new File([`Zikaron sample · ${name} · ${Date.now()}`], name, { type: 'text/plain' }));
}
function anchor() {
  const rows = queue();
  if (!rows.length || S.send) return;
  S.sheet = null;
  S.send = T('签名', 'Sign'); emit();
  later(380, () => { S.send = T('广播交易', 'Broadcast the transaction'); emit(); });
  later(900, () => { rows.forEach(e => e.lamp = 'sub'); S.send = ''; emit(); flash('send'); });
  later(2100, () => { rows.forEach(e => e.lamp = 'inc'); emit(); });
  later(3400, () => { const t = now(); rows.forEach(e => { e.lamp = 'ok'; e.at = t; }); emit(); });
}
function sign() {
  const r = byseq(S.gf.rec);
  if (!r || r.lamp !== 'ok') return;
  const t = now(), g = { seq: E.length, type: 'grant', rec: r.seq, to: HE, from: t, until: t + [7, 30, 90][S.gf.win] * DAY, lamp: 'q', at: null };
  E.push(g);
  S.chk.seq = g.seq;
  S.sheet = null;
  emit();
}
function revoke(seq) {
  const g = byseq(seq);
  if (!g || g.revokedBy != null) return;
  const r = { seq: E.length, type: 'revocation', target: g.seq, lamp: 'q', at: null };
  E.push(r);
  g.revokedBy = r.seq;
  S.chk.seq = g.seq;
  S.sheet = null;
  emit();
}
function runCheck() {
  const c = S.chk, id = ++c.id;
  c.step = 0;
  render();
  const tick = () => {
    if (id !== c.id) return;
    c.step++;
    if (c.step >= 6) { c.step = 6; c.shown = c.seq; c.vec = six(byseq(c.seq)).join(); }
    render();
    if (c.step < 6) later(230, tick); else { emit(); if (c.step >= 6) flash('check'); }
  };
  later(420, tick);
}
/* 导出:照所选条目做一个包,记下它,核验页拿它来核 */
function kitSel() { return recs().filter(e => S.kit.has(e.seq)); }
function exportKit() {
  const sel = kitSel(), id = (sel[0] ? sel[0].h : hex(77)).slice(2, 10);
  S.made = { name: S.sealed ? 'kit.zkit' : `kit-${id}${S.folder ? '' : '.zkit'}`, seqs: sel.map(e => e.seq), entries: sel.length + 1, files: sel.length, sealed: S.sealed };
  S.sheet = null;
  render();
}
function verifyKit() {
  const k = S.made || { name: `kit-${(kitSel()[0] || { h: hex(77) }).h.slice(2, 10)}.zkit`, seqs: kitSel().map(e => e.seq), entries: kitSel().length + 1, files: kitSel().length };
  S.vk = { kit: k, step: 0, id: (S.vk ? S.vk.id : 0) + 1 };
  S.took = 0;
  render();
  const id = S.vk.id;
  later(520, () => {
    if (!S.vk || S.vk.id !== id) return;
    S.vk.step = 1; render();
    // 打不开的包:拖入区摇一下,照应用的失败
    if (S.vk.kit.sealed) { const d = box.check.querySelector('.zd-drop'); if (d) run(d, [{ transform: 'none' }, { transform: 'translateX(-5px)', offset: .2 }, { transform: 'translateX(4px)', offset: .45 }, { transform: 'translateX(-2px)', offset: .7 }, { transform: 'none' }], { duration: 360, easing: 'ease' }); }
  });
}
/* 长动作的键:做完时对勾画出来,停一会儿再回到原样 */
function flash(k) { S.flash = k; render(); later(650, () => { if (S.flash === k) { S.flash = null; render(); } }); }
const fst = k => S.flash === k ? 'is-done' : '';
/* 弹窗里写账本的键:先转一会儿,对勾画出,再落下 */
function work(fn, ms = 520) {
  const s = S.sheet;
  if (!s || s.busy || s.done) return;
  s.busy = true; render();
  later(ms, () => { if (S.sheet !== s) return; s.busy = false; s.done = true; render(); later(420, () => { if (S.sheet === s) fn(); }); });
}
const kst = () => S.sheet && S.sheet.busy ? 'is-busy' : S.sheet && S.sheet.done ? 'is-done' : '';
const shut = () => { if (S.sheet && (S.sheet.busy || S.sheet.done)) return; S.sheet = null; if (S.rec.busy) S.rec = {}; render(); };
/* 账本一动,四块一起重画;正在看的那份授权若结果变了,核验自己重跑一遍 */
function emit() {
  render();
  const c = S.chk, g = byseq(c.seq);
  if (g && c.step >= 6 && (c.shown !== c.seq || six(g).join() !== c.vec)) runCheck();
}

/* ── 画:照应用的做法原地改。留下来的节点只改属性和字,滑块、开关、胶囊的过渡照常走;
   新来的、改了的、走了的记下来,照应用补一笔:行与卡片撑开或收拢,字从无色渐显,状态标弹一下,块的高度跟着滑过去 ── */
const GLIDE = 'cubic-bezier(.22,1,.36,1)';
const SPRING = window.CSS && CSS.supports && CSS.supports('transition-timing-function', 'linear(0, 1)')
  ? 'linear(0,.04 2.5%,.16 6%,.34 10%,.55 15%,.74 21%,.87 27%,.95 34%,.99 42%,1.008 51%,1.011 60%,1.006 72%,1.002 85%,1)' : 'cubic-bezier(.2,.9,.3,1.12)';
const RM = matchMedia('(prefers-reduced-motion: reduce)'), calm = () => RM.matches;
const run = (e, kf, o) => calm() || !e.animate ? null : e.animate(kf, Object.assign({ duration: 300, easing: GLIDE }, o));
const frag = html => { const t = document.createElement('template'); t.innerHTML = html; return t.content.firstElementChild; };
const kOf = n => n.nodeType === 1 && n.hasAttribute('data-k') ? n.getAttribute('data-k').split('|')[0] : null;
const leaving = n => n.nodeType === 1 && n.hasAttribute('data-leaving');
const fxNew = anim => ({ anim, added: [], gone: [], changed: [], words: new Set(), togs: [] });
function morph(live, want, fx) {
  for (const a of [...live.attributes]) if (!want.hasAttribute(a.name)) live.removeAttribute(a.name);
  for (const a of [...want.attributes]) {
    if (live.getAttribute(a.name) === a.value) continue;
    if (a.name === 'data-k') fx.changed.push(live);
    if (a.name === 'class' && live.classList.contains('zd-tog') && live.classList.contains('on') !== /(^| )on( |$)/.test(a.value)) fx.togs.push(live);
    live.setAttribute(a.name, a.value);
    if (a.name === 'value' && 'value' in live) live.value = a.value;
  }
  const kids = [...live.childNodes], L = kids.filter(n => !leaving(n)), W = [...want.childNodes];
  const byKey = new Map(); L.forEach(n => { const k = kOf(n); if (k != null) byKey.set(k, n); });
  const used = new Set(), out = []; let li = 0;
  for (const w of W) {
    const k = kOf(w); let m = null;
    if (k != null) { m = byKey.get(k) || null; if (m && (m.tagName !== w.tagName || used.has(m))) m = null; }
    else {
      while (li < L.length && (used.has(L[li]) || kOf(L[li]) != null)) li++;
      if (li < L.length && L[li].nodeType === w.nodeType && (w.nodeType !== 1 || L[li].tagName === w.tagName)) m = L[li++];
    }
    if (!m) { fx.added.push(w); out.push(w); continue; }
    used.add(m); out.push(m);
    if (m.nodeType === 3) { if (m.data !== w.data) { m.data = w.data; fx.words.add(live); } }
    else if (m.nodeType === 1) morph(m, w, fx);
  }
  // 走了的元素先留在原处,收拢后再拿掉;字与其余的当即拿掉
  const after = new Map(); let anchor = null;
  for (const n of kids) {
    if (used.has(n)) { anchor = n; continue; }
    if (leaving(n) || (fx.anim && n.nodeType === 1)) { if (!leaving(n)) fx.gone.push(n); if (!after.has(anchor)) after.set(anchor, []); after.get(anchor).push(n); }
  }
  const seq = [...(after.get(null) || [])];
  out.forEach(o => { seq.push(o); (after.get(o) || []).forEach(x => seq.push(x)); });
  let cur = live.firstChild;
  for (const n of seq) { if (n === cur) cur = cur.nextSibling; else live.insertBefore(n, cur); }
  while (cur) { const nx = cur.nextSibling; live.removeChild(cur); cur = nx; }
}
const BLOCK = '.zd-tr,.zd-row,.zd-okline,.zd-callout,.zd-card,.zd-gh,.zd-hintline,.zd-empty,.zd-drop,.zd-field,.zd-pg';
const gapOf = p => { if (!p) return 0; const cs = getComputedStyle(p); return /flex|grid/.test(cs.display) ? parseFloat(cs.rowGap) || 0 : 0; };
const rel = (n, el) => { const a = n.getBoundingClientRect(), b = el.getBoundingClientRect(); return { top: a.top - b.top, left: a.left - b.left, width: a.width }; };
function grow(n, h) {
  const cs = getComputedStyle(n), g = n.previousElementSibling || n.nextElementSibling ? gapOf(n.parentElement) : 0;
  n.style.overflow = 'hidden';
  const a = run(n, [{ height: '0px', minHeight: '0px', paddingTop: '0px', paddingBottom: '0px', marginTop: -g + 'px', opacity: 0 },
    { height: h + 'px', minHeight: cs.minHeight, paddingTop: cs.paddingTop, paddingBottom: cs.paddingBottom, marginTop: cs.marginTop, opacity: 1 }], { duration: 360 });
  if (a) a.onfinish = a.oncancel = () => { n.style.overflow = ''; };
}
function leave(n) {
  let a;
  if (n.classList.contains('zd-pg')) a = run(n, [{ opacity: 1 }, { opacity: 0 }], { duration: 140, easing: 'ease', fill: 'forwards' });
  else {
    const cs = getComputedStyle(n), g = gapOf(n.parentElement);
    n.style.overflow = 'hidden'; n.style.pointerEvents = 'none';
    a = run(n, [{ height: n.offsetHeight + 'px', minHeight: cs.minHeight, paddingTop: cs.paddingTop, paddingBottom: cs.paddingBottom, marginTop: cs.marginTop, opacity: 1 },
      { height: '0px', minHeight: '0px', paddingTop: '0px', paddingBottom: '0px', marginTop: -g + 'px', opacity: 0 }], { duration: 300, fill: 'forwards' });
  }
  if (a) a.onfinish = () => n.remove(); else n.remove();
}
/* 提示条照应用的提示:从一粒胶囊横着展开,字随后显出 */
function capsule(n) {
  run(n, [{ transform: 'translateY(-14px) scaleX(.55)', opacity: 0 }, { transform: 'none', opacity: 1 }], { duration: 500 });
  [...n.children].forEach(c => run(c, [{ opacity: 0 }, { opacity: 1 }], { duration: 200, delay: 120, easing: 'ease', fill: 'backwards' }));
}
/* 状态标与概况色块落定时弹一下,对勾顺笔画出来 */
function pop(e, ms) {
  run(e, [{ transform: 'scale(.85)' }, { transform: 'none' }], { duration: ms, easing: SPRING });
  const p = e.matches('.zd-mk.ok') && e.querySelector('path');
  if (p) run(p, [{ strokeDasharray: '11', strokeDashoffset: '11' }, { strokeDasharray: '11', strokeDashoffset: '0' }], { duration: 340, delay: 60, easing: 'ease', fill: 'backwards' });
}
/* 选中的滑块:前沿先到、后沿跟上,路上拉长,落定回原宽,不回弹 */
function stretchTo(el, a0, s0, a1, s1) {
  const d = a1 - a0;
  if (!d || calm() || !el.animate) return;
  const extra = Math.min(Math.abs(d) * .62, 56); let a, s;
  if (d > 0) { const lead = a0 + s0 + .8 * (a1 + s1 - (a0 + s0)); s = s0 + (s1 - s0) * .5 + extra; a = lead - s; }
  else { a = a0 + .8 * d; s = s0 + (s1 - s0) * .5 + extra; }
  el.style.transition = 'none';
  el.animate([{ transform: `translateX(${a0}px)`, width: s0 + 'px' }, { offset: .42, transform: `translateX(${a}px)`, width: s + 'px' }, { transform: `translateX(${a1}px)`, width: s1 + 'px' }], { duration: 320, easing: GLIDE }).onfinish = () => { el.style.transition = ''; };
}
function effects(fx, hs, el) {
  const sel = getComputedStyle(el).getPropertyValue('--z-accent-wash').trim();
  fx.added.forEach((n, i) => {
    if (n.nodeType !== 1) { if (n.parentElement) fx.words.add(n.parentElement); return; }
    if (n.classList.contains('zd-pg')) { [...n.children].forEach((c, j) => run(c, [{ opacity: 0, transform: 'translateY(4px)' }, { opacity: 1, transform: 'none' }], { duration: 360, delay: Math.min(j * 18, 120), fill: 'backwards' })); return; }
    if (!n.matches(BLOCK)) { run(n, [{ opacity: 0 }, { opacity: 1 }], { duration: 240, easing: 'ease-out' }); return; }
    grow(n, hs[i]);
    if (n.classList.contains('zd-tr')) run(n, [{ backgroundColor: sel }, { backgroundColor: sel, offset: .3 }, { backgroundColor: 'transparent' }], { duration: 2400, easing: 'ease', composite: 'add' });
    if (n.classList.contains('zd-okline')) capsule(n);
    n.querySelectorAll('.zd-ico').forEach(c => pop(c, 600));
  });
  fx.gone.forEach(leave);
  fx.changed.forEach(n => {
    if (!n.isConnected) return;
    const f = n.getAttribute('data-fx');
    if (f === 'roll') run(n, [{ opacity: 0, transform: 'translateY(6px)' }, { opacity: 1, transform: 'none' }], { duration: 360 });
    else if (f === 'badge') run(n, [{ transform: 'scale(1.18)' }, { transform: 'none' }], { duration: 300 });
    else if (f === 'toast') capsule(n);
    const mk = n.matches('.zd-mk') ? n : n.querySelector('.zd-mk.ok,.zd-mk.warn,.zd-mk.bad');
    if (mk) pop(mk, 500);
    n.querySelectorAll('.zd-ico').forEach(c => pop(c, 600));
  });
  const fresh = fx.added.filter(n => n.nodeType === 1);
  fx.words.forEach(e => { if (!e.isConnected || fresh.some(a => a.contains(e))) return; run(e, [{ color: 'transparent' }, { color: getComputedStyle(e).color }], { duration: 240, easing: 'ease-out' }); });
  fx.togs.forEach(t => { t.classList.add('moving'); setTimeout(() => t.classList.remove('moving'), 230); });
}
function put(name, html) {
  const el = box[name];
  if (!el) return;
  const first = !el.__v;
  if (first) { el.textContent = ''; el.__v = el.appendChild(document.createElement('div')); el.__v.className = 'zd-view'; }
  const h0 = el.offsetHeight;
  if (el.__ha) { el.__ha.cancel(); el.__ha = null; }
  const pre = new Map($$('.zd-pg', el).map(p => [p, rel(p, el)]));
  const segs = $$('.zd-seg', el.__v).map(s => [s, +s.style.getPropertyValue('--i') || 0]);
  const fx = fxNew(!first);
  if (el.__h !== html) { el.__h = html; morph(el.__v, frag(`<div class="zd-view">${html}</div>`), fx); }
  const sfx = sheetOf(name, fx.anim);
  const gone = fx.gone.concat(sfx ? sfx.fx.gone : []), added = fx.added.concat(sfx ? sfx.fx.added : []);
  // 量终态:走了的先不占地方(换页的那一页浮在原位淡去),新来的照自己的高度
  gone.forEach(n => { if (!n.matches(BLOCK)) n.remove(); else if (n.classList.contains('zd-pg')) { const r = pre.get(n) || rel(n, el); Object.assign(n.style, { position: 'absolute', top: r.top + 'px', left: r.left + 'px', width: r.width + 'px', margin: 0, pointerEvents: 'none', zIndex: 1 }); } else n.style.display = 'none'; });
  const keep = gone.filter(n => n.isConnected);
  fx.gone = fx.gone.filter(n => n.isConnected); if (sfx) sfx.fx.gone = sfx.fx.gone.filter(n => n.isConnected);
  el.style.minHeight = '';
  if (el.__s) { const need = el.__s.firstElementChild.offsetHeight + 28; if (need > el.__v.offsetHeight) el.style.minHeight = need + 'px'; }
  const hs = added.map(n => n.nodeType === 1 ? n.offsetHeight : 0), h1 = el.offsetHeight;
  keep.forEach(n => { if (n.style.display === 'none') n.style.display = ''; });
  if (first || calm()) { keep.forEach(n => n.remove()); return; }
  effects(fx, hs.slice(0, fx.added.length), el);
  if (sfx) effects(sfx.fx, hs.slice(fx.added.length), el);
  segs.forEach(([s, i0]) => { if (!s.isConnected) return; const i1 = +s.style.getPropertyValue('--i') || 0, th = s.querySelector('.thumb'); if (i1 !== i0 && th) { const w = th.offsetWidth; stretchTo(th, i0 * w, w, i1 * w, w); } });
  if (Math.abs(h1 - h0) > 1) { const a = el.__ha = run(el, [{ height: h0 + 'px' }, { height: h1 + 'px' }], { duration: 360 }); if (a) a.onfinish = () => { if (el.__ha === a) el.__ha = null; }; }
}
const tag = () => `<span class="zd-tag">${T('示例', 'Sample')}</span>`;
const title = (t, right = '') => `<div class="zd-title"><h4>${t}</h4><span class="grow"></span>${right}${tag()}</div>`;
const OKS = '<svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M3.6 8.4 6.6 11.4 12.4 5"/></svg>';
const key = (label, cls = '', attrs = '') => `<button class="zd-key ${cls}" ${attrs}><span class="lbl">${label}</span><span class="kbar"><i></i></span><span class="kok">${OKS}</span></button>`;
const row = (k, v, extra = '') => `<div class="zd-row">${extra}<span class="k">${k}</span><span class="v">${v}</span></div>`;
function batch() {
  const n = queue().length, busy = !!S.send, k = n || E.filter(e => e.lamp === 'sub' || e.lamp === 'inc').length;
  return `<div class="zd-gh">${T('本批', 'This batch')}</div><div class="zd-card form"><div class="zd-row act">
    <span class="k">${!n && !busy ? T('没有待上链的条目', 'Nothing pending') : T(`${k} 条 · Gas 费估算 0.00004 ETH`, `${k} entries · gas estimate 0.00004 ETH`)}${busy ? `<span class="sub" data-k="st|${S.send}">${S.send}</span>` : ''}</span>
    ${key(T('全部上链', 'Put all on chain'), `guide ${busy ? 'is-busy' : fst('send')}`, `data-act="send" data-zdo="record" ${n || busy || S.flash === 'send' ? '' : 'disabled'}`)}</div></div>`;
}
function drawRecord() {
  const r = S.rec, rows = recs().slice().reverse();
  const line = r.err ? `${mark('bad')}<span>${esc(r.err)}</span>`
    : r.h ? `${mark('ok')}<span>${T(`第 ${r.seq} 条已加入账本 · 指纹 `, `Entry ${r.seq} added to the ledger · fingerprint `)}<span class="mono">${sh(r.h)}</span></span>` : '';
  const nq = queue().length, tabs = `<div class="zd-tools"><span class="zd-seg" style="--n:2;--i:${S.rtab}"><span class="thumb"></span><button class="${S.rtab === 0 ? 'on' : ''}" data-act="rtab" data-i="0">${T('全部', 'All')}</button><button class="${S.rtab === 1 ? 'on' : ''}" data-act="rtab" data-i="1">${T('待上链', 'Pending')}${nq ? ` <span class="cnt mono" data-k="cnt|${nq}" data-fx="badge">${nq}</span>` : ''}</button></span><span class="grow"></span>${key(T('用示例文件', 'Use a sample file'), '', 'data-act="sample"')}</div>`;
  if (S.rtab === 1) { put('record', title(T('记录存证', 'Records')) + `<div class="zd-body">${tabs}<div class="zd-pg" data-k="pg1|1">
    <div class="zd-card list">${queue().length ? queue().map(e => `<div class="zd-tr zd-q3" data-k="q${e.seq}|1"><span class="mono t">#${e.seq}</span><span class="el">${e.type === 'history' ? esc(e.name) : e.type === 'grant' ? T('授权', 'Grant') : T('撤销', 'Revocation')}</span>${pillOf(e.lamp)}</div>`).join('') : `<div class="zd-empty">${T('没有待上链的条目', 'Nothing pending')}</div>`}</div>
    ${batch()}</div></div>`); return; }
  put('record', title(T('记录存证', 'Records')) + `<div class="zd-body">${tabs}<div class="zd-pg" data-k="pg0|1">
    <label class="zd-drop line" data-drop>${gl('inbox', 22)}<b>${T('拖入文件以存证', 'Drop files to record them')}</b><span>${T('或点按选择', 'or click to choose')}</span><input type="file" data-act="file" hidden></label>
    ${line ? `<div class="zd-okline" data-k="note|${r.err || r.h}" data-fx="toast">${line}</div>` : ''}
    <div class="zd-card list"><div class="zd-th zd-t3"><span>${T('记录', 'Entry')}</span><span>${T('上链状态', 'On-chain state')}</span><span>${T('首锚区块时刻', 'First anchor block time')}</span></div>
      ${rows.map(e => `<div class="zd-tr zd-t3" data-k="r${e.seq}|1"><span class="el nm">${esc(e.name)}</span><span data-k="rp${e.seq}|${e.lamp}">${pillOf(e.lamp)}</span><span class="mono t" data-k="ra${e.seq}|${e.at}" data-fx="roll">${when(e.at)}</span></div>`).join('')}</div></div></div>`);
}
function dateBlock(t, k) { const d = new Date(t * 1000); return `<span class="zd-dblk"${k ? ` data-k="${k}|${day(t)}" data-fx="roll"` : ''}><i>${MONTH(d.getUTCMonth())}</i><b>${d.getUTCDate()}</b></span>`; }
function drawGrant() {
  const f = S.gf, ok = recs().filter(r => r.lamp === 'ok');
  if (!byseq(f.rec) || byseq(f.rec).lamp !== 'ok') f.rec = ok.length ? ok[0].seq : null;
  const rec = f.rec != null ? byseq(f.rec) : null, t = now(), days = [7, 30, 90][f.win], until = t + days * DAY, rows = grants().slice().reverse();
  put('grant', title(T('新建授权', 'New grant')) + `<div class="zd-body">
    <div class="zd-card form pad">
      <div class="zd-field"><label>${T('被授权方', 'Grantee')}</label><div class="zd-in mono"><span class="el">${HE}</span></div></div>
      <div class="zd-field"><label>${T('哪一条记录', 'Which record')}</label><div class="zd-in withkey">${gl('doc', 17, 'lead')}<span class="el ${rec ? '' : 'ph'}">${rec ? `#${rec.seq} · ${esc(rec.name)}` : T('从已上链的记录中选择', 'Choose from records on chain')}</span><span class="sep"></span><button class="zd-mini face" data-act="pickrec">${rec ? T('更换', 'Change') : T('选择记录', 'Choose a record')}</button></div></div>
      <div class="zd-field"><label>${T('条款文件', 'Terms file')}</label><div class="zd-in">${gl('doc', 17, 'lead')}<span class="el">${TERMS[0]} · ${size(TERMS[1])}</span></div></div>
      <div class="zd-field"><label>${T('有效期', 'Validity')}</label><div class="zd-winrow"><span class="zd-seg" style="--n:3;--i:${f.win}"><span class="thumb"></span>${(EN ? ['7 days', '30 days', '90 days'] : ['7 天', '30 天', '90 天']).map((l, i) => `<button class="${i === f.win ? 'on' : ''}" data-act="gfwin" data-i="${i}">${l}</button>`).join('')}</span>
        <span class="zd-dates">${dateBlock(t)}<span class="dd" data-k="dd|${days}" data-fx="roll">${T(`${days} 天`, `${days} days`)}</span>${dateBlock(until, 'du')}</span></div>
        <div class="zd-hint">${mark(rec ? 'ok' : 'todo')}<span>${rec ? T('时段重叠的有效授权:0', 'Overlapping live grants: 0') : T('选择记录后检查重叠授权', 'Choose a record to check for overlaps')}</span></div></div>
      <div class="zd-foot">${key(T('确认', 'Confirm'), 'guide', `data-act="gconfirm" ${rec ? '' : 'disabled'}`)}</div>
    </div>
    <div class="zd-card list">${rows.length ? rows.map(g => { const st = gstate(g); return `<button class="zd-tr zd-g4 click" data-act="grow" data-seq="${g.seq}" data-k="g${g.seq}|1"><span class="el">${esc(byseq(g.rec).name)}</span><span class="mono t">${day(g.from).slice(5)}${TO}${day(g.until).slice(5)}</span><span data-k="gs${g.seq}|${st[1]}">${pill(st[0], st[1])}</span><span data-k="gl${g.seq}|${g.lamp}">${mark(LAMP[g.lamp][3])}</span></button>`; }).join('') : `<div class="zd-empty">${T('还没有授权', 'No grants yet')}</div>`}</div>
  </div>`);
}
function depth(r) {
  const H = recs().filter(e => e.h === r.h), A = H.filter(e => e.lamp === 'ok'), s0 = Math.min(...H.map(e => e.seq)), s1 = Math.max(...H.map(e => e.seq));
  return { earliest: A.length ? Math.min(...A.map(e => e.at)) : null, deepest: A.length, span: s1 - s0 + 1, anchored: E.filter(e => e.seq >= s0 && e.seq <= s1 && e.lamp === 'ok').length };
}
const tog = (on, act, dis) => `<button class="zd-tog ${on ? 'on' : ''}" role="switch" aria-checked="${on}" data-act="${act}" ${dis ? 'disabled' : ''}></button>`;
function drawKit() {
  const sel = kitSel(), un = sel.filter(e => e.lamp !== 'ok'), first = sel[0], d = first ? depth(first) : null, m = S.made;
  put('kit', title(T('导出记录包', 'Export record kit')) + `<div class="zd-body">
    ${m ? `<div class="zd-okline big" data-k="made|${m.name}" data-fx="toast">${mark('ok')}<span>${T(`记录包已导出 · ${m.entries} 个条目 · ${m.files} 个文件`, `Record kit exported · ${m.entries} entries · ${m.files} files`)}</span></div>` : ''}
    <div class="zd-card form">
      <div class="zd-row act"><span class="k">${T('条目范围', 'Entry range')}</span><span class="v" data-k="n|${sel.length}">${sel.length ? T(`已选 ${sel.length} 条`, `${sel.length} selected`) : T(`全部 ${E.length} 条`, `All ${E.length}`)}</span>${key(T('选择', 'Select'), '', 'data-act="kitpick"')}</div>
      ${un.length ? `<div class="zd-callout" data-k="un|${un.length}">${gl('info', 16)}<div><p>${T(`所选里有 ${un.length} 条还没上链:包里没有这几条的上链证明`, `${un.length} selected entries are not on chain yet: the package holds no on-chain proof for them`)}</p>${key(T('现在上链', 'Put on chain now'), `guide ${S.send ? 'is-busy' : fst('send')}`, 'data-act="send" data-zdo="kit"')}</div></div>` : ''}
      <div class="zd-row act"><span class="k">${T('导出为文件夹', 'Export as a folder')}</span>${tog(S.folder && !S.sealed, 'kfolder', S.sealed)}</div>
      <div class="zd-row act"><span class="k">${T('启用记录包加密', 'Encrypt the record package')}</span>${tog(S.sealed, 'ksealed')}</div>
    </div>
    <div class="zd-gh">${T('读数与基准(不进包)', 'Readings and reference (not in the package)')}</div>
    <div class="zd-card form">${d ? row(T('读的是', 'Reading for'), `#${first.seq} · ${esc(first.name)}`) + row(T('首次存证', 'First recorded'), `<span class="mono" data-k="d1|${d.earliest}">${day(d.earliest)}</span>`) + row(T('最大深度', 'Max depth'), `<span data-k="d2|${d.deepest}">${d.deepest}</span>`) + row(T('连续上链', 'Continuity'), `<span data-k="d3|${d.anchored}/${d.span}">${d.anchored} / ${d.span}</span>`)
      : row(T('读的是', 'Reading for'), '<span class="ph">—</span>')}</div>
    <div class="zd-foot end">${key(T('核验并导出', 'Verify and export'), 'primary', `data-act="kitgo" ${sel.length ? '' : 'disabled'}`)}</div>
  </div>`);
}
function drawCheck() {
  const tabs = `<span class="zd-seg wide" style="--n:2;--i:${S.vtab}"><span class="thumb"></span><button class="${S.vtab === 0 ? 'on' : ''}" data-act="vtab" data-i="0">${T('核验授权', 'Verify grant')}</button><button class="${S.vtab === 1 ? 'on' : ''}" data-act="vtab" data-i="1">${T('核验记录', 'Verify record')}</button></span>`;
  put('check', title(T('核验', 'Verify')) + `<div class="zd-body">${tabs}<div class="zd-pg" data-k="pg${S.vtab}|1">${S.vtab === 0 ? checkGrant() : checkKit()}</div></div>`);
}
function summary(tone, icon, head, sub, cells, right = '', k = 'sum|1') {
  return `<div class="zd-card form sum" data-k="${k}"><div class="zd-sumh"><span class="zd-ico ${tone}">${gl(icon, 21)}</span><div class="tx"><b>${head}</b>${sub ? `<span>${sub}</span>` : ''}</div>${right}</div>
    <div class="zd-cells">${cells.map(([k, v]) => `<div><i>${k}</i><b>${v}</b></div>`).join('')}</div>`;
}
function checkGrant() {
  const c = S.chk, g = byseq(c.seq), v = six(g), done = c.step >= 6, vd = verdict(v), code = 'zikaron-grant:' + btoa(hex(9000 + g.seq, 40)).replace(/=+$/, '');
  return `<div class="zd-card form pad">
      <div class="zd-field"><label>${T('授权码', 'Grant code')}</label><div class="zd-in mono"><span class="el">${code}</span></div></div>
      <div class="zd-foot end">${key(T('核验', 'Verify'), `primary ${done ? fst('check') : 'is-busy'}`, 'data-act="check"')}</div></div>
    ${done ? summary(vd[0], vd[0] === 'ok' ? 'shield' : 'info', `<span data-k="vd|${c.id}.${vd[1]}">${vd[1]}</span>`, esc(byseq(g.rec).name), [[T('授权方', 'Grantor'), `<span class="mono">${sa(ME)}</span>`], [T('有效期', 'Validity'), `${day(g.from).slice(5)}${TO}${day(g.until).slice(5)}`], [T('首锚区块时刻', 'First anchor block time'), `<span class="mono" data-k="at|${g.at}">${g.at ? when(g.at).slice(0, 16) : '—'}</span>`]], '', `sum|${c.id}`) + '</div>'
      : `<div class="zd-card form sum" data-k="sum|skel"><div class="zd-sumh"><span class="zd-skel" style="width:40px;height:40px;border-radius:12px"></span><div class="tx"><span class="zd-skel" style="width:120px"></span><span class="zd-skel" style="width:80px;margin-top:6px"></span></div></div></div>`}
    <div class="zd-gh">${T('六项核验', 'Six checks')}</div>
    <div class="zd-card form">${SIX.map((x, i) => `<div class="zd-row"><span class="k">${x}</span><span data-k="c${i}|${c.id}.${i < c.step ? v[i] : i === c.step ? 'live' : 'todo'}">${mark(i < c.step ? v[i] : i === c.step ? 'busy' : 'todo')}</span></div>`).join('')}</div>`;
}
function checkKit() {
  const vk = S.vk;
  const drop = `<button class="zd-drop tall" data-act="vkit">${gl('box', 26)}<b>${T('拖入记录包或记录文件', 'Drop a record kit or record file')}</b><span>${T('或点按选择', 'or click to choose')}${S.made ? '' : ''}</span></button>`;
  if (!vk) return drop + `<div class="zd-hintline">${T('点按即核验「导出记录包」里那一包', 'Click to verify the package from “Export record kit”')}</div>`;
  if (!vk.step) return drop + `<div class="zd-card form sum" data-k="sum|skel"><div class="zd-sumh"><span class="zd-skel" style="width:40px;height:40px;border-radius:12px"></span><div class="tx"><span class="zd-skel" style="width:160px"></span><span class="zd-skel" style="width:90px;margin-top:6px"></span></div></div></div>`;
  if (vk.kit.sealed) return drop + `<div class="zd-okline" data-k="deny|${vk.id}" data-fx="toast">${mark('bad')}<span>${T('本机的身份都不是这份记录包的接收方', 'No identity on this machine is the recipient of this record package')}</span></div>`;
  const items = vk.kit.seqs.map(byseq).filter(Boolean), un = items.filter(e => e.lamp !== 'ok'), first = items[0], d = first ? depth(first) : null;
  const tone = un.length ? 'warn' : 'ok', took = S.took;
  return drop + summary(tone, un.length ? 'info' : 'shield', T('记录包完整,签名有效', 'Record kit intact, signatures valid'), esc(vk.kit.name),
      [[T('首次存证', 'First recorded'), `<span class="mono">${d ? day(d.earliest) : '—'}</span>`], [T('最大深度', 'Max depth'), d ? d.deepest : '—'], [T('连续上链', 'Continuity'), d ? `${d.anchored} / ${d.span}` : '—']],
      key(T('取出原件', 'Take out originals'), '', `data-act="extract" ${items.length ? '' : 'disabled'}`), `sum|${vk.id}`)
    + (un.length ? `<div class="zd-row">${mark('warn')}<span class="k">${T('上链状态', 'On-chain state')}</span><span class="v">${T(`${un.length} 条未上链`, `${un.length} not on chain`)}</span></div>` : '') + '</div>'
    + (took ? `<div class="zd-okline" data-k="took|${took}" data-fx="toast">${mark('ok')}<span>${T(`已取出 ${took} 份原件`, `Took out ${took} originals`)}</span></div>` : '')
    + `<div class="zd-gh">${T('逐条记录', 'Record by record')}</div><div class="zd-card form">${items.map(e => `<div class="zd-row"><span class="k el">${esc(e.name)}</span><span class="v">${e.lamp === 'ok' ? T('已上链', 'On chain') : T('未上链', 'Not on chain')}</span>${mark(e.lamp === 'ok' ? 'ok' : 'warn')}</div>`).join('')}</div>`;
}

/* ── 弹窗:照应用的弹窗,玻璃底、遮罩、标题、一组行、底栏键从右往左排;挂在块上,不随块重画 ── */
const SH = {
  new: s => ({ zd: 'record', w: 460, title: T('新建存证', 'New record'),
    body: `<div class="zd-rows">${row(T('文件', 'File'), `${gl('doc', 15)}<span class="el">${esc(s.name)}</span><i>${size(s.size)}</i>`)}${row(T('内容指纹', 'Content fingerprint'), s.h ? `<span class="mono">${sh(s.h)}</span><span class="zd-copy" title="${s.h}">${gl('copy', 15)}</span>` : `<span class="zd-skel" style="width:120px"></span>`)}${row(T('费用', 'Cost'), T('上链时计费', 'Charged when put on chain'))}</div>
      <div class="zd-field"><label>${T('记录名称', 'Record name')}</label><input class="zd-in" data-f="name" value="${esc(s.name)}"></div>`,
    keys: key(T('加入账本', 'Add to ledger'), `commit ${s.h ? kst() : 'is-busy'}`, 'data-sa="commitrec"') }),
  rec: () => ({ zd: 'grant', w: 520, title: T('选择记录', 'Choose a record'),
    body: `<div class="zd-rows sel">${recs().slice().reverse().map(r => { const why = r.lamp === 'ok' ? '' : r.lamp === 'q' ? T('上链后才能授权', 'Grant after it is on chain') : T('上链中,请稍等', 'Going on chain, please wait');
      return `<button class="zd-row pick ${why ? 'dis' : ''}" data-sa="pickrec" data-seq="${r.seq}" ${why ? 'disabled' : ''}><span class="n mono">#${r.seq}</span><span class="k el">${esc(r.name)}</span>${why ? pill('warn', why) : `<span class="t mono">${when(r.at).slice(0, 10)}</span>${r.seq === S.gf.rec ? gl('ok', 15, 'ck') : ''}`}</button>`; }).join('')}</div>`, keys: '' }),
  gconfirm: () => { const r = byseq(S.gf.rec), t = now(); return { zd: 'grant', w: 460, title: T('签发授权', 'Sign grant'),
    body: `<div class="zd-rows">${row(T('被授权方', 'Grantee'), `<span class="mono">${sa(HE)}</span>`)}${row(T('记录', 'Entry'), `#${r.seq} · ${esc(r.name)}`)}${row(T('有效期', 'Validity'), `${day(t)}${TO}${day(t + [7, 30, 90][S.gf.win] * DAY)}`)}${row(T('所附条款文件', 'Attached terms file'), TERMS[0])}${row(T('独占、转授权与范围', 'Exclusivity, sublicense and scope'), T('非独占 · 无上游 · 未写范围', 'Non-exclusive · No upstream · No scope'))}</div>`,
    keys: key(T('加入账本', 'Add to ledger'), `commit ${kst()}`, 'data-sa="sign"') }; },
  revoke: s => { const g = byseq(s.seq); return { zd: 'grant', w: 460, title: T('撤销这份授权', 'Revoke this grant'),
    body: `<div class="zd-rows">${row(T('记录', 'Entry'), esc(byseq(g.rec).name))}${row(T('原有效期', 'Original validity'), `${day(g.from)}${TO}${day(g.until)}`)}${row(T('被授权方', 'Grantee'), `<span class="mono">${sa(g.to)}</span>`)}</div>${g.revokedBy != null ? '' : `<div class="zd-field"><label>${T('裁决文件指纹(可选)', 'Ruling file fingerprint (optional)')}</label><input class="zd-in mono" placeholder="0x"></div>`}`,
    keys: g.revokedBy != null ? '' : key(T('确认撤销', 'Revoke'), `commit ${kst()}`, `data-sa="revoke" data-seq="${g.seq}"`) }; },
  kitpick: () => ({ zd: 'kit', w: 460, title: T('条目范围', 'Entry range'),
    body: `<div class="zd-rows">${recs().map(e => `<div class="zd-row"><span class="n mono">#${e.seq}</span><span class="k el">${esc(e.name)}</span>${pillOf(e.lamp)}${tog(S.kit.has(e.seq), 'kpick" data-seq="' + e.seq)}</div>`).join('')}</div>`, keys: '' }),
  kitgo: () => { const sel = kitSel(), id = (sel[0] ? sel[0].h : hex(77)).slice(2, 10); return { zd: 'kit', w: 460, title: T('导出记录包', 'Export record kit'),
    body: `<div class="zd-rows">${row(T('条目', 'Entry count'), T(`${sel.length + 1} 条`, `${sel.length + 1} entries`))}${row(T('保存位置', 'Saved to'), `${gl('folder', 15)}<span class="mono el">~/Documents/${S.sealed ? 'kit.zkit' : `kit-${id}${S.folder ? '' : '.zkit'}`}</span>`)}</div>
      ${S.sealed ? `<div class="zd-field"><label>${T('记录接收方地址', 'Recipient address')}</label><div class="zd-in mono"><span class="el">${HE}</span></div></div><div class="zd-field dim"><label>${T('记录接收方公钥', 'Recipient public key')}</label><div class="zd-in mono ph">0x</div></div>` : ''}`,
    keys: key(T('导出', 'Export'), `primary ${kst()}`, 'data-sa="export"') }; },
  send: s => { const n = queue().length; return { zd: s.zd, w: 460, title: T('上链', 'Put on chain'),
    body: `<div class="zd-rows">${row(T('条目', 'Entry count'), T(`${n} 条`, `${n} entries`))}${row(T('Gas 费估算', 'Gas estimate'), '<span class="mono">0.00004 ETH</span>')}${row(T('Gas 费上限', 'Gas cap'), '<span class="mono">0.0001 ETH</span>')}</div>`,
    keys: key(T('确认上链', 'Confirm and send'), 'commit', 'data-sa="anchor"') }; },
  extract: () => { const items = S.vk.kit.seqs.map(byseq).filter(Boolean); return { zd: 'check', w: 460, title: T('取出原件', 'Take out originals'),
    body: `<div class="zd-rows">${row(T('取出到', 'Take out to'), `${gl('folder', 15)}<span class="mono el">~/Downloads/${T('原件', 'originals')}</span>`)}${row(T('将取出', 'Taking out'), T(`${items.length} 份原件`, `${items.length} originals`))}${items.map(e => `<div class="zd-row sub">${gl('doc', 15)}<span class="k el">${esc(e.name)}</span></div>`).join('')}</div>`,
    keys: key(T('确认取出', 'Take out'), `primary ${kst()}`, 'data-sa="took"') }; },
};
/* 弹窗从按下的那一点凝出来,内容晚一拍显出;开着时内容一变就原地改;关时缩一点淡去。块不够高时撑到放得下 */
let lastPtr = null;
function sheetOf(name, anim) {
  const el = box[name], s = S.sheet, want = s && SH[s.kind](s), mine = want && want.zd === name;
  if (!mine) {
    if (el.__s) {
      const o = el.__s; el.__s = null; o.style.pointerEvents = 'none';
      run(o.firstElementChild, [{ opacity: 1, transform: 'none' }, { opacity: 0, transform: 'scale(.97)' }], { duration: 140, easing: 'ease', fill: 'forwards' });
      const a = run(o, [{ opacity: 1 }, { opacity: 0 }], { duration: 180, easing: 'ease', fill: 'forwards' });
      if (a) a.onfinish = () => o.remove(); else o.remove();
    }
    return null;
  }
  const html = `<div class="zd-sheet" role="dialog" aria-modal="true" style="--w:${want.w}px"><h5>${want.title}</h5>${want.body}<div class="zd-sfoot">${want.keys}${key(T('取消', 'Cancel'), '', 'data-sa="close"')}</div></div>`;
  const fx = fxNew(anim);
  if (!el.__s) {
    const o = el.__s = document.createElement('div'); o.className = 'zd-scrim'; o.__h = html; o.innerHTML = html; el.appendChild(o);
    const sh = o.firstElementChild;
    if (anim && !calm()) {
      const r = sh.getBoundingClientRect(), p = lastPtr || { x: r.left + r.width / 2, y: r.top + r.height / 2 };
      sh.style.transformOrigin = `${Math.max(0, Math.min(r.width, p.x - r.left))}px ${Math.max(0, Math.min(r.height, p.y - r.top))}px`;
      run(o, [{ opacity: 0 }, { opacity: 1 }], { duration: 250, easing: 'ease' });
      run(sh, [{ opacity: 0, transform: 'scale(.92)' }, { opacity: 1, transform: 'none' }], { duration: 440 });
      [...sh.children].forEach(c => run(c, [{ opacity: 0 }, { opacity: 1 }], { duration: 240, delay: 70, easing: 'ease', fill: 'backwards' }));
    }
  } else if (el.__s.__h !== html) { el.__s.__h = html; morph(el.__s.firstElementChild, frag(html), fx); }
  return { fx };
}
function render() { drawRecord(); drawGrant(); drawKit(); drawCheck(); }

/* ── 接线 ── */
document.addEventListener('click', e => {
  if (e.target.closest('[data-zd-reset]')) { reset(); return; }
  const sa = e.target.closest('.zd [data-sa]');
  if (sa) {
    const k = sa.dataset.sa;
    if (k === 'close') shut();
    else if (k === 'commitrec') work(commitRecord);
    else if (k === 'pickrec') { S.gf.rec = +sa.dataset.seq; S.sheet = null; render(); }
    else if (k === 'sign') work(sign);
    else if (k === 'revoke') work(() => revoke(+sa.dataset.seq));
    else if (k === 'export') work(exportKit, 700);
    else if (k === 'anchor') anchor();
    else if (k === 'took') work(() => { S.took = S.vk.kit.seqs.length; S.sheet = null; render(); });
    return;
  }
  if (e.target.classList.contains('zd-scrim')) { shut(); return; }
  const a = e.target.closest('.zd [data-act]');
  if (!a || a.disabled) return;
  const k = a.dataset.act;
  if (k === 'sample') addSample();
  else if (k === 'send') { S.sheet = { kind: 'send', zd: a.dataset.zdo }; render(); }
  else if (k === 'rtab') { S.rtab = +a.dataset.i; render(); }
  else if (k === 'gfwin') { S.gf.win = +a.dataset.i; render(); }
  else if (k === 'pickrec') { S.sheet = { kind: 'rec' }; render(); }
  else if (k === 'gconfirm') { S.sheet = { kind: 'gconfirm' }; render(); }
  else if (k === 'grow') { S.sheet = { kind: 'revoke', seq: +a.dataset.seq }; render(); }
  else if (k === 'kitpick') { S.sheet = { kind: 'kitpick' }; render(); }
  else if (k === 'kpick') { const s = +a.dataset.seq; S.kit.has(s) ? S.kit.delete(s) : S.kit.add(s); S.made = null; render(); }
  else if (k === 'kfolder') { S.folder = !S.folder; render(); }
  else if (k === 'ksealed') { S.sealed = !S.sealed; render(); }
  else if (k === 'kitgo') { S.sheet = { kind: 'kitgo' }; render(); }
  else if (k === 'check') runCheck();
  else if (k === 'vtab') { S.vtab = +a.dataset.i; render(); }
  else if (k === 'vkit') verifyKit();
  else if (k === 'extract') { S.sheet = { kind: 'extract' }; render(); }
});
document.addEventListener('change', e => {
  const a = e.target.closest('.zd [data-act="file"]');
  if (a && a.files[0]) addRecord(a.files[0]);
});
document.addEventListener('keydown', e => { if (e.key === 'Escape' && S.sheet) shut(); });
/* 指针下的一点光:键与可点的行在指针所在处亮一小片 */
document.addEventListener('pointermove', e => {
  const el = e.target.closest && e.target.closest('.zd-key, .zd-tr.click, .zd-rows.sel .zd-row');
  if (!el) return;
  const r = el.getBoundingClientRect();
  el.style.setProperty('--mx', (e.clientX - r.left) + 'px'); el.style.setProperty('--my', (e.clientY - r.top) + 'px');
}, { passive: true });
document.addEventListener('pointerdown', e => { if (e.target.closest && e.target.closest('.zd')) lastPtr = { x: e.clientX, y: e.clientY }; }, true);
const dz = box.record;
dz.addEventListener('dragover', e => { e.preventDefault(); const d = dz.querySelector('[data-drop]'); if (d) d.classList.add('hot'); });
dz.addEventListener('dragleave', e => { if (dz.contains(e.relatedTarget)) return; const d = dz.querySelector('[data-drop]'); if (d) d.classList.remove('hot'); });
dz.addEventListener('drop', e => { e.preventDefault(); const d = dz.querySelector('[data-drop]'); if (d) d.classList.remove('hot'); const f = e.dataTransfer.files[0]; if (f) addRecord(f); });

reset();
})();
