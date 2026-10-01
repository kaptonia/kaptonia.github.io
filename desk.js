/* 功能四块:照 Zikaron Desk 的界面重做的片段,四块共用一本示例账本。
   全是示例:不连链,不用钥匙。唯一真算的是拖入文件的指纹,在浏览器里算 SHA-256,文件不离开本机。
   界面上的话两语都在这里,按页面的 lang 取;英文用词照 Desk 的英文手册。 */
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
const day = s => s == null ? '--' : when(s).slice(0, 10);
const TO = T(' 至 ', ' to '), N = (n, one, many) => n + ' ' + (n === 1 ? one : many);
const spanS = (a, b) => when(a).slice(5, 10) + TO + when(b).slice(5, 10);
const sa = a => a.slice(0, 6) + '…' + a.slice(-4);
const hex = (n, len = 64) => { let x = '0x', seed = (n * 7919 + 104729) % 233280; const c = '0123456789abcdef'; for (let i = 0; i < len; i++) { seed = (seed * 9301 + 49297) % 233280; x += c[Math.floor(seed / 233280 * 16)]; } return x; };
const now = () => Math.floor(Date.now() / 1000);
const DAY = 86400, HE = '0x8a5e669081c6056c13f06dcfea606a30142bdd4d', TERMS = T('授权条款-2026.pdf', 'grant-terms-2026.pdf'), LIMIT = 256 * 1048576;
const GL = {
  inbox: [[[2, 9], [4, 3], [12, 3], [14, 9], [14, 14], [2, 14], [2, 9]], [[2, 9], [6, 9], [7, 11], [9, 11], [10, 9], [14, 9]]],
  ok: [[[3, 8.5], [6.5, 12], [13, 4.5]]],
};
const gl = (n, size = 16) => `<svg class="zd-gl" width="${size}" height="${size}" viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${GL[n].map(p => `<polyline vector-effect="non-scaling-stroke" points="${p.map(q => q.join(',')).join(' ')}"/>`).join('')}</svg>`;
/* 每种状态:胶囊的颜色、灯的样子、胶囊上的字、完整的说法(英文胶囊放不下整句时,整句在悬停提示里) */
const LAMPS = {
  ok: ['ok', 'ok', T('已确认', 'Confirmed'), T('已确认', 'Confirmed')],
  inc: ['warn', 'live', T('确认中', 'Confirming'), T('确认中', 'Confirming')],
  sub: ['warn', 'live', T('正在等待上链', 'Waiting'), T('正在等待上链', 'Waiting to go on chain')],
  q: ['warn', 'grey', T('待上链', 'Pending'), T('待上链', 'Pending')],
};
const pillOf = k => `<span class="zd-pill ${LAMPS[k][0]}" title="${LAMPS[k][3]}">${LAMPS[k][1] === 'live' ? '<span class="zd-spin"></span>' : ''}${LAMPS[k][2]}</span>`;
const SIX = EN ? ['Grant signature', 'Issuer ledger intact', 'In the issuer’s ledger', 'Confirmed on chain', 'Within validity', 'Not revoked']
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
const verdict = v => v[5] === 'bad' ? ['bad', T('已被撤销', 'Revoked by issuer'), T('签发者已撤销这份授权', 'The issuer has revoked this grant')]
  : v[4] === 'bad' ? ['bad', T('未通过', 'Failed'), T('这份授权已过有效期', 'This grant is past its validity')]
  : v[3] === 'bad' ? ['bad', T('未通过', 'Failed'), T('先让这份授权上链', 'Put this grant on chain first')]
  : v.includes('warn') ? ['warn', T('有缺项', 'Has gaps'), T('这份授权正在等待上链确认', 'This grant is waiting to be confirmed on chain')]
  : ['ok', T('全部通过', 'All passed'), T('这份授权有效', 'This grant is valid')];

function reset() {
  gen++;
  if (menu) { menu.pop.remove(); menu = null; }
  const t = now(), T0 = t - t % DAY - 20 * DAY + 9 * 3600 + 12 * 60 + 40;
  E = [
    { seq: 0, type: 'genesis', tag: '创建账本', lamp: 'ok', at: T0 },
    { seq: 1, type: 'history', tag: '存证', name: T('第一章手稿', 'Chapter 1'), file: T('第一章手稿.pdf', 'chapter-1.pdf'), h: hex(2), lamp: 'ok', at: T0 + 1180 },
    { seq: 2, type: 'history', tag: '存证', name: T('封面设计', 'Cover design'), file: T('封面设计.png', 'cover.png'), h: hex(4), lamp: 'ok', at: T0 + 3390 },
    { seq: 3, type: 'grant', tag: '授权', rec: 1, to: HE, from: T0 + 3 * DAY, until: T0 + 33 * DAY, lamp: 'ok', at: T0 + 3 * DAY + 600 },
    { seq: 4, type: 'history', tag: '存证', name: T('第二章手稿', 'Chapter 2'), file: T('第二章手稿.pdf', 'chapter-2.pdf'), h: hex(5), lamp: 'q', at: null },
    { seq: 5, type: 'history', tag: '存证', name: T('第一章手稿 · 交付', 'Chapter 1 · delivery'), file: T('第一章手稿.pdf', 'chapter-1.pdf'), h: hex(2), lamp: 'q', at: null },
  ];
  S = { rec: {}, send: '', sample: 0, gf: { rec: 1, win: 1 }, kit: new Set([1]), chk: { seq: 3, shown: 3, step: 6, id: 0, vec: six(byseq(3)).join() } };
  seen = {};
  $$('[data-zd]').forEach(e => { e.__h = null; e.__v = null; });
  render();
}

/* ── 动作 ── */
async function addRecord(f) {
  if (S.rec.busy) return;
  if (f.size > LIMIT) { S.rec = { err: T('示例里只算 256 MB 以内的文件', 'The sample handles files up to 256 MB') }; render(); return; }
  const g = gen;
  S.rec = { busy: true };
  render();
  let h;
  try {
    const d = await crypto.subtle.digest('SHA-256', await f.arrayBuffer());
    h = '0x' + [...new Uint8Array(d)].map(x => x.toString(16).padStart(2, '0')).join('');
  } catch (err) {
    if (g === gen) { S.rec = { err: T('读不了这一份：示例里只收单个文件', 'This item could not be read: the sample takes single files') }; render(); }
    return;
  }
  if (g !== gen) return;
  const e = { seq: E.length, type: 'history', tag: '存证', name: f.name.replace(/\.[^.]+$/, '') || f.name, file: f.name, size: f.size, h, lamp: 'q', at: null };
  E.push(e);
  S.rec = { seq: e.seq, h };
  emit();
}
function addSample() {
  const i = S.sample++, n = SAMPLES[i % SAMPLES.length], name = i < SAMPLES.length ? n : n.replace(/(\.[^.]+)$/, `-${Math.floor(i / SAMPLES.length) + 1}$1`);
  addRecord(new File([`Zikaron sample · ${name} · ${Date.now()}`], name, { type: 'text/plain' }));
}
function anchor() {
  const rows = queue();
  if (!rows.length || S.send) return;
  S.send = T('签名', 'Signing'); emit();
  later(380, () => { S.send = T('广播交易', 'Broadcasting'); emit(); });
  later(900, () => { rows.forEach(e => e.lamp = 'sub'); S.send = T('等待确认', 'Waiting for confirmation'); emit(); });
  later(2100, () => { rows.forEach(e => e.lamp = 'inc'); emit(); });
  later(3400, () => { const t = now(); rows.forEach(e => { e.lamp = 'ok'; e.at = t; }); S.send = ''; emit(); });
}
function sign() {
  const r = byseq(S.gf.rec);
  if (!r || r.lamp !== 'ok') return;
  const t = now(), g = { seq: E.length, type: 'grant', tag: '授权', rec: r.seq, to: HE, from: t, until: t + [7, 30, 90][S.gf.win] * DAY, lamp: 'q', at: null };
  E.push(g);
  S.chk.seq = g.seq;
  emit();
}
function revoke(seq) {
  const g = byseq(seq);
  if (!g || g.revokedBy != null) return;
  const r = { seq: E.length, type: 'revocation', tag: '撤销', target: g.seq, lamp: 'q', at: null };
  E.push(r);
  g.revokedBy = r.seq;
  S.chk.seq = g.seq;
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
    if (c.step < 6) later(230, tick); else emit();
  };
  later(420, tick);
}
/* 账本一动,四块一起重画;正在看的那份授权若结果变了,核验自己重跑一遍 */
function emit() {
  render();
  const c = S.chk, g = byseq(c.seq);
  if (g && c.step >= 6 && (c.shown !== c.seq || six(g).join() !== c.vec)) runCheck();
}

/* ── 画 ── */
let seen = {};
function put(name, html) {
  const el = box[name];
  if (!el || el.__h === html) return;
  const first = el.__h == null;
  el.__h = html;
  if (!el.__v) { el.textContent = ''; el.__v = el.appendChild(document.createElement('div')); el.__v.className = 'zd-view'; }
  el.__v.innerHTML = html;
  const prev = seen[name] || {}, cur = {};
  $$('[data-k]', el.__v).forEach(x => {
    const i = x.dataset.k.indexOf('|'), k = x.dataset.k.slice(0, i), v = x.dataset.k.slice(i + 1);
    cur[k] = v;
    if (!first && prev[k] !== v) x.classList.add(prev[k] === undefined ? 'zd-in' : 'zd-pop');
  });
  seen[name] = cur;
}
const head = (title, extra = '') => `<div class="zd-head"><b>${title}</b><span class="grow"></span>${extra}<i class="zd-demo">${T('示例', 'Sample')}</i></div>`;
function bar() {
  const n = queue().length, busy = !!S.send;
  if (!n && !busy) return `<div class="zd-card zd-bar"><span class="zd-small">${T('没有待上链的条目', 'Nothing pending')}</span></div>`;
  const k = n || E.filter(e => e.lamp === 'sub' || e.lamp === 'inc').length;
  return `<div class="zd-card zd-bar"><div class="grow"><div>${T(`本批 ${k} 条 · 一笔上链`, `This batch: ${N(k, 'entry', 'entries')} · one transaction`)}</div>
    ${busy ? `<div class="zd-stage"><span class="dot"></span>${S.send}</div>` : `<div class="zd-small">${T('Gas 费上限约 0.0012 ETH', 'Gas cap about 0.0012 ETH')}</div>`}</div>
    <button class="zd-btn guide ${busy ? 'is-busy' : ''}" data-act="anchor"><span class="lbl">${T('全部上链', 'Put all on chain')}</span><span class="busy"><i></i></span></button></div>`;
}
function drawRecord() {
  const r = S.rec, rows = recs().slice().reverse();
  const line = r.busy ? `<span class="zd-skel" style="width:180px"></span>`
    : r.err ? esc(r.err)
    : r.h ? `<span class="zd-lamp ok"></span><span class="el">${T(`第 ${r.seq} 条已加入账本 · 指纹`, `Entry ${r.seq} added to the ledger · fingerprint`)} <span class="mono">${r.h.slice(2, 10)}…${r.h.slice(-6)}</span></span>`
    : T('文件留在这台机器上，指纹在浏览器里算', 'Files stay on this machine; fingerprints are computed in your browser');
  put('record', head(T('记录存证', 'Records'), `<button class="zd-btn link" data-act="sample">${T('用示例文件', 'Use a sample file')}</button>`) + `<div class="zd-body">
    <label class="zd-drop" data-drop>${gl('inbox', 22)}<span><b>${T('新建存证', 'New record')}</b><span class="zd-note">${T('拖入文件，或点按选择', 'Drop a file, or click to choose')}</span></span><input type="file" data-act="file" hidden></label>
    <div class="zd-okline ${r.err ? 'bad' : ''}" data-k="note|${r.busy ? 'b' : r.err || r.h || ''}">${line}</div>
    <div class="zd-list fill" style="--rows:176px"><div class="zd-th zd-t4"><span>${T('记录', 'Record')}</span><span>${T('上链状态', 'On-chain state')}</span><span class="t">${T('首锚区块时刻', 'First anchor block time')}</span><span class="r">${T('编号', 'No.')}</span></div>
      <div class="zd-scroll">${rows.map(e => `<div class="zd-tr zd-t4" data-k="r${e.seq}|1"><span class="el nm">${esc(e.name)}</span><span data-k="rp${e.seq}|${e.lamp}">${pillOf(e.lamp)}</span><span class="t mono zd-small">${when(e.at)}</span><span class="r mono zd-small">#${e.seq}</span></div>`).join('')}</div></div>
    ${bar()}</div>`);
}
function drawGrant() {
  const f = S.gf, ok = recs().filter(r => r.lamp === 'ok');
  if (!byseq(f.rec) || byseq(f.rec).lamp !== 'ok') f.rec = ok.length ? ok[0].seq : null;
  const rec = f.rec != null ? byseq(f.rec) : null, t = now(), until = t + [7, 30, 90][f.win] * DAY, rows = grants().slice().reverse();
  put('grant', head(T('授权', 'Grant')) + `<div class="zd-body">
    <div class="zd-card pad0">
      <div class="zd-fr"><span class="k">${T('哪一条记录', 'Which record')}</span><span class="v"><span class="el">${rec ? `#${rec.seq} ${esc(rec.name)}` : T('先让一条记录上链', 'Put a record on chain first')}</span><button class="zd-btn sm" data-menu="rec" aria-haspopup="menu" aria-expanded="${menu && menu.key === 'rec'}">${T('选择记录', 'Choose a record')}</button></span></div>
      <div class="zd-fr"><span class="k">${T('被授权方', 'Grantee')}</span><span class="v mono">${sa(HE)}</span></div>
      <div class="zd-fr"><span class="k">${T('条款文件', 'Terms file')}</span><span class="v"><span class="el">${TERMS}</span></span></div>
      <div class="zd-fr"><span class="k">${T('有效期', 'Validity')}</span><span class="v"><span class="zd-seg">${(EN ? ['7 days', '30 days', '90 days'] : ['7 天', '30 天', '90 天']).map((l, i) => `<button class="${i === f.win ? 'on' : ''}" data-act="gfwin" data-i="${i}">${l}</button>`).join('')}</span></span></div>
      <div class="zd-fr end"><span class="k">${day(t)}${TO}${day(until)} · ${T('签发后只能撤销', 'Once signed, a grant can only be revoked')}</span><button class="zd-btn guide" data-act="sign" ${rec ? '' : 'disabled'}>${T('签发授权', 'Issue grant')}</button></div>
    </div>
    <div class="zd-list fill" style="--rows:88px"><div class="zd-scroll">${rows.length ? rows.map(g => { const st = gstate(g); return `<div class="zd-tr zd-g5" data-k="g${g.seq}|1"><span class="el">${esc(byseq(g.rec).name)}</span><span class="t mono zd-small">${spanS(g.from, g.until)}</span><span data-k="gs${g.seq}|${st[1]}"><span class="zd-pill ${st[0]}">${st[1]}</span></span><span class="zd-lamp ${LAMPS[g.lamp][1]}" title="${LAMPS[g.lamp][3]}" data-k="gl${g.seq}|${g.lamp}"></span><span class="r">${g.revokedBy != null ? '' : `<button class="zd-btn sm" data-act="revoke" data-seq="${g.seq}">${T('撤销', 'Revoke')}</button>`}</span></div>`; }).join('') : `<div class="zd-tr empty">${T('还没有授权', 'No grants yet')}</div>`}</div></div>
    ${bar()}</div>`);
}
function depth(r) {
  const H = recs().filter(e => e.h === r.h), A = H.filter(e => e.lamp === 'ok'), s0 = Math.min(...H.map(e => e.seq)), s1 = Math.max(...H.map(e => e.seq));
  return { earliest: A.length ? Math.min(...A.map(e => e.at)) : null, deepest: A.length, span: s1 - s0 + 1, anchored: E.filter(e => e.seq >= s0 && e.seq <= s1 && e.lamp === 'ok').length };
}
function drawKit() {
  const sel = recs().filter(e => S.kit.has(e.seq)), un = sel.filter(e => e.lamp !== 'ok'), first = sel[0];
  const inside = sel.length ? [byseq(0), ...sel] : E, files = sel.length ? sel.length : recs().length, proofs = inside.filter(e => e.lamp === 'ok').length;
  const d = first ? depth(first) : null;
  put('kit', head(T('导出记录包', 'Export record kit')) + `<div class="zd-body">
    <div class="zd-card pad0">
      <div class="zd-fr"><span class="k">${T('条目范围', 'Entry range')}</span><span class="v" data-k="n|${sel.length}">${sel.length ? T(`已选 ${sel.length} 条`, `${sel.length} selected`) : T(`全部 ${E.length} 条`, `All ${E.length}`)}</span></div>
      <div class="zd-picks zd-scroll">${recs().map(e => `<div class="zd-pick ${S.kit.has(e.seq) ? 'on' : ''}" data-act="pick" data-seq="${e.seq}"><button class="zd-tog ${S.kit.has(e.seq) ? 'on' : ''}" role="switch" aria-checked="${S.kit.has(e.seq)}" aria-label="${esc(e.name)}"></button><span class="mono zd-small" style="text-align:right">#${e.seq}</span><span class="el">${esc(e.name)}</span><span data-k="kp${e.seq}|${e.lamp}">${pillOf(e.lamp)}</span></div>`).join('')}</div>
      <div class="zd-fr"><span class="k">${T('包内', 'In the kit')}</span><span class="v" data-k="in|${inside.length}.${files}.${proofs}">${T(`${inside.length} 个条目 · ${files} 个原件 · ${proofs} 枚上链证明`, `${N(inside.length, 'entry', 'entries')} · ${N(files, 'file', 'files')} · ${N(proofs, 'proof', 'proofs')}`)}</span></div>
    </div>
    <div class="zd-red">${un.length ? T(`所选里有 ${un.length} 条还没上链：包里没有这几条的上链证明`, `${un.length} selected ${un.length === 1 ? 'entry is' : 'entries are'} not on chain yet: the kit holds no on-chain proof for ${un.length === 1 ? 'it' : 'them'}`) : ''}</div>
    <div class="zd-card flat fill"><div class="zd-tcard">${T('读数与基准(不进包)', 'Readings and reference (not in the kit)')}</div>
      ${d ? `<div class="zd-small">${T('读的是', 'Reading')} #${first.seq} · ${esc(first.name)}</div><div class="zd-stats">
        <div><div class="l">${T('首次存证', 'First recorded')}</div><div class="f mono" data-k="d1|${d.earliest}">${day(d.earliest)}</div></div>
        <div><div class="l">${T('最大深度', 'Max depth')}</div><div class="f" data-k="d2|${d.deepest}">${d.deepest}</div></div>
        <div><div class="l">${T('连续上链', 'Continuity')}</div><div class="f" data-k="d3|${d.anchored}/${d.span}">${d.anchored} / ${d.span}</div></div></div>`
      : `<div class="zd-small" style="margin-top:4px">${T('选择记录以查看读数', 'Choose a record to see its readings')}</div>`}</div></div>`);
}
function drawCheck() {
  const c = S.chk, g = byseq(c.seq), v = six(g), done = c.step >= 6, vd = verdict(v), code = 'zikaron-grant:' + btoa(hex(9000 + g.seq, 40)).replace(/=+$/, '');
  put('check', head(T('核验授权', 'Verify grant')) + `<div class="zd-body">
    <div><div class="zd-lab">${T('授权码', 'Grant code')}</div><div class="zd-inrow"><div class="zd-input"><span class="mono el">${code}</span></div><button class="zd-btn" data-menu="chk" aria-haspopup="menu" aria-expanded="${menu && menu.key === 'chk'}">${T('换一份', 'Choose another')}</button><button class="zd-btn primary ${done ? '' : 'is-busy'}" data-act="check"><span class="lbl">${T('核验', 'Verify')}</span><span class="busy"><i></i></span></button></div></div>
    <div class="zd-card fill">
      <div class="zd-res"><div style="min-width:0"><div class="k">${T('授权', 'Grant')}</div><div class="d el">${esc(byseq(g.rec).name)} · ${spanS(g.from, g.until)}</div></div>${done ? `<span class="zd-pill ${vd[0]}" data-k="vd|${c.id}.${vd[1]}">${vd[1]}</span>` : `<span class="zd-skel" style="width:56px;height:22px;border-radius:11px"></span>`}</div>
      <div class="zd-checks">${SIX.map((x, i) => `<span><span class="zd-lamp ${i < c.step ? v[i] : i === c.step ? 'live' : 'grey'}" data-k="c${i}|${c.id}.${i < c.step ? v[i] : i === c.step ? 'live' : 'grey'}"></span><span class="el">${x}</span></span>`).join('')}</div>
      <div class="zd-rule"></div>
      <div class="zd-kv"><span class="k">${T('作品', 'Work')}</span><span class="v el">${esc(byseq(g.rec).name)}</span><span class="k">${T('有效期', 'Validity')}</span><span class="v">${day(g.from)}${TO}${day(g.until)}</span><span class="k">${T('首锚区块时刻', 'First anchor block time')}</span><span class="v mono" data-k="at|${g.at}">${when(g.at)}</span></div>
      <div class="zd-rule"></div>
      <div class="zd-banner ${done ? vd[0] : 'wait'}">${done ? (vd[0] === 'ok' ? gl('ok', 16) : '') + vd[2] : T('正在核验…', 'Verifying…')}</div>
    </div></div>`);
}
/* 菜单:照应用里的「选择记录」,挂在块上,不随块重画;账本变了,菜单里的项跟着变 */
let menu = null;
const MENUS = {
  rec: {
    zd: 'grant',
    items: () => recs().slice().reverse().map(r => {
      const why = r.lamp === 'ok' ? '' : r.lamp === 'q' ? T('上链后才能授权', 'Grant after it is on chain') : T('上链中，请稍等', 'Going on chain, please wait');
      return { v: r.seq, on: r.seq === S.gf.rec, dis: !!why, html: `<span class="el grow">${esc(r.name)}</span>${why ? `<span class="zd-pill warn">${why}</span>` : `<span class="n">#${r.seq}</span>`}` };
    }),
    pick: v => { S.gf.rec = v; render(); },
  },
  chk: {
    zd: 'check',
    items: () => grants().slice().reverse().map(g => {
      const st = gstate(g);
      return { v: g.seq, on: g.seq === S.chk.seq, html: `<span class="el grow">${esc(byseq(g.rec).name)} <span class="zd-small">${spanS(g.from, g.until)}</span></span><span class="zd-pill ${st[0]}">${st[1]}</span>` };
    }),
    pick: v => { S.chk.seq = v; emit(); },
  },
};
function menuHTML() {
  return MENUS[menu.key].items().map(x => `<button class="mi ${x.dis ? 'dis' : ''}" role="menuitemradio" aria-checked="${x.on}" ${x.dis ? 'aria-disabled="true"' : ''} data-mv="${x.v}"><span class="ck">${x.on ? gl('ok', 14) : ''}</span>${x.html}</button>`).join('');
}
function placeMenu() {
  const zd = box[MENUS[menu.key].zd], btn = zd.querySelector(`[data-menu="${menu.key}"]`);
  if (!btn) { closeMenu(); return; }
  const zr = zd.getBoundingClientRect(), br = btn.getBoundingClientRect();
  const h = menuHTML();
  if (menu.h !== h) { menu.h = h; menu.pop.innerHTML = h; }
  /* 靠按钮右缘对齐;左边放不下就往右挪,整个菜单留在框里 */
  const pw = menu.pop.offsetWidth, r = Math.max(12, Math.round(zr.right - br.right));
  menu.pop.style.top = Math.round(br.bottom - zr.top + 4) + 'px';
  menu.pop.style.right = Math.min(r, Math.max(12, Math.round(zr.width - 12 - pw))) + 'px';
}
function openMenu(key) {
  closeMenu();
  const pop = document.createElement('div');
  pop.className = 'zd-menu';
  pop.setAttribute('role', 'menu');
  box[MENUS[key].zd].appendChild(pop);
  menu = { key, pop };
  render();
  const on = pop.querySelector('.mi[aria-checked="true"]:not(.dis)') || pop.querySelector('.mi:not(.dis)');
  if (on) on.focus({ preventScroll: true });
}
function closeMenu(refocus) {
  if (!menu) return;
  const key = menu.key;
  menu.pop.remove();
  menu = null;
  render();
  if (refocus) { const b = box[MENUS[key].zd].querySelector(`[data-menu="${key}"]`); if (b) b.focus({ preventScroll: true }); }
}
function render() { drawRecord(); drawGrant(); drawKit(); drawCheck(); if (menu) placeMenu(); }

/* ── 接线 ── */
document.addEventListener('click', e => {
  const rs = e.target.closest('[data-zd-reset]');
  if (rs) { reset(); return; }
  const mi = e.target.closest('.zd-menu .mi');
  if (mi) { if (!mi.classList.contains('dis')) { const m = MENUS[menu.key]; closeMenu(true); m.pick(+mi.dataset.mv); } return; }
  const mb = e.target.closest('.zd [data-menu]');
  if (mb) { menu && menu.key === mb.dataset.menu ? closeMenu() : openMenu(mb.dataset.menu); return; }
  if (menu && !e.target.closest('.zd-menu')) closeMenu();
  const a = e.target.closest('.zd [data-act]');
  if (!a) return;
  const k = a.dataset.act;
  if (k === 'sample') addSample();
  else if (k === 'anchor') anchor();
  else if (k === 'gfwin') { S.gf.win = +a.dataset.i; render(); }
  else if (k === 'sign') sign();
  else if (k === 'revoke') revoke(+a.dataset.seq);
  else if (k === 'pick') { const s = +a.dataset.seq; S.kit.has(s) ? S.kit.delete(s) : S.kit.add(s); render(); }
  else if (k === 'check') runCheck();
});
document.addEventListener('change', e => {
  const a = e.target.closest('.zd [data-act]');
  if (!a) return;
  const k = a.dataset.act;
  if (k === 'file') { if (a.files[0]) addRecord(a.files[0]); }
});
document.addEventListener('keydown', e => {
  if (!menu) return;
  if (e.key === 'Escape') { e.preventDefault(); closeMenu(true); return; }
  if (e.key !== 'ArrowDown' && e.key !== 'ArrowUp') return;
  const its = [...menu.pop.querySelectorAll('.mi:not(.dis)')];
  if (!its.length) return;
  e.preventDefault();
  const i = its.indexOf(document.activeElement);
  its[(i + (e.key === 'ArrowDown' ? 1 : -1) + its.length) % its.length].focus();
});
addEventListener('resize', () => { if (menu) placeMenu(); });
const dz = box.record;
dz.addEventListener('dragover', e => { e.preventDefault(); const d = dz.querySelector('[data-drop]'); if (d) d.classList.add('hot'); });
dz.addEventListener('dragleave', e => { if (dz.contains(e.relatedTarget)) return; const d = dz.querySelector('[data-drop]'); if (d) d.classList.remove('hot'); });
dz.addEventListener('drop', e => { e.preventDefault(); const d = dz.querySelector('[data-drop]'); if (d) d.classList.remove('hot'); const f = e.dataTransfer.files[0]; if (f) addRecord(f); });

reset();
})();
