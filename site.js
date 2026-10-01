(function(){
var en=document.documentElement.lang==='en',T=function(a,b){return en?b:a};
var tp=document.querySelector('.top');if(tp){var on=function(){tp.classList.toggle('scrolled',scrollY>8)};on();addEventListener('scroll',on,{passive:true});}
document.addEventListener('click',function(e){var b=e.target.closest&&e.target.closest('[data-copy]');if(!b)return;var t=b.getAttribute('data-copy'),ok=function(){b.classList.add('did');setTimeout(function(){b.classList.remove('did')},1200)},sel=function(){var r=document.createRange();r.selectNodeContents(b.parentNode.querySelector('code'));var s=getSelection();s.removeAllRanges();s.addRange(r)};if(navigator.clipboard&&navigator.clipboard.writeText)navigator.clipboard.writeText(t).then(ok,sel);else sel();});
document.addEventListener('click',function(e){if(document.documentElement.classList.contains('sand-on'))return;var o=e.target.closest&&e.target.closest('[data-etym]');if(!o)return;e.preventDefault();document.documentElement.classList.toggle('etym-open');});
var sd=document.querySelector('[data-side]');if(sd)sd.addEventListener('click',function(){var o=sd.parentNode.classList.toggle('open');sd.setAttribute('aria-expanded',o)});
// 文档侧栏:产品一组可折叠,折叠与否记在本机(每个空间各记各的);当前页所在的一组总是展开。当前一项在侧栏里露出来
var side=document.querySelector('.side[data-space]');if(side){var sk='side:'+side.getAttribute('data-space');
side.addEventListener('click',function(e){var h=e.target.closest&&e.target.closest('.sp-h');if(!h)return;var g=h.parentNode,o=!g.classList.toggle('closed');h.setAttribute('aria-expanded',o);try{var m=JSON.parse(localStorage.getItem(sk)||'{}');m[g.getAttribute('data-proj')]=o?1:0;localStorage.setItem(sk,JSON.stringify(m))}catch(x){}});
var cur=side.querySelector('.side-ii a.on');if(cur&&side.scrollHeight>side.clientHeight+4){var r=cur.getBoundingClientRect(),q=side.getBoundingClientRect();if(r.bottom>q.bottom-24||r.top<q.top+24)side.scrollTop+=r.top-q.top-side.clientHeight*.4}}
// 按产品分的选项卡:选中的产品记在本机,各页共用;地址里带着产品名的,选中那一项;底下一块滑到选中的那一项;本页目录跟着换
var PK='proj';
function pmove(box,anim){var b=box.querySelector('.ptabs [role=tab][aria-selected=true]'),ind=box.querySelector('.pind');if(!b||!ind)return;if(!anim)ind.style.transition='none';ind.style.width=b.offsetWidth+'px';ind.style.transform='translateX('+b.offsetLeft+'px)';ind.style.opacity=1;if(!anim){void ind.offsetWidth;ind.style.transition=''}}
function pset(box,p,anim){var ts=[].slice.call(box.querySelectorAll('.ptabs [role=tab]'));if(!ts.some(function(b){return b.getAttribute('data-p')===p}))return;
ts.forEach(function(b){var s=b.getAttribute('data-p')===p;b.setAttribute('aria-selected',s);b.tabIndex=s?0:-1});
[].forEach.call(box.querySelectorAll('.pane'),function(pn){var s=pn.getAttribute('data-p')===p;if(s&&pn.hidden){pn.hidden=false;if(anim){pn.classList.remove('in');void pn.offsetWidth;pn.classList.add('in')}}else if(!s)pn.hidden=true});
[].forEach.call(document.querySelectorAll('.toc a[data-p]'),function(a){a.hidden=a.getAttribute('data-p')!==p});pmove(box,anim)}
function pinit(root){[].forEach.call(root.querySelectorAll('.proj'),function(box){var st=null;try{st=localStorage.getItem(PK)}catch(e){}var first=box.querySelector('.ptabs [role=tab]'),hp=location.hash.slice(1);if(!first)return;if(hp&&box.querySelector('.ptabs [role=tab][data-p="'+hp+'"]'))st=hp;pset(box,st||first.getAttribute('data-p'),false);
var bar=box.querySelector('.ptabs');bar.addEventListener('click',function(e){var b=e.target.closest('[role=tab]');if(!b)return;var p=b.getAttribute('data-p');pset(box,p,true);try{localStorage.setItem(PK,p)}catch(x){}});
bar.addEventListener('keydown',function(e){var ts=[].slice.call(bar.querySelectorAll('[role=tab]')),i=ts.indexOf(document.activeElement);if(i<0)return;var j=e.key==='ArrowRight'?i+1:e.key==='ArrowLeft'?i-1:e.key==='Home'?0:e.key==='End'?ts.length-1:null;if(j==null)return;e.preventDefault();j=(j+ts.length)%ts.length;ts[j].focus();ts[j].click()})})}
pinit(document);
// 原理各页:一屏主干,一屏说明。视口正中落在哪一屏,那一屏的字淡入,离开时淡出;说明屏的画框挂在字的右边
var PIO=null;
function psInit(root){var ss=root.querySelectorAll('.ps');if(!ss.length)return;
if(!('IntersectionObserver' in window)){[].forEach.call(ss,function(x){x.classList.add('on')});return}
if(!PIO)PIO=new IntersectionObserver(function(es){es.forEach(function(e){e.target.classList.toggle('on',e.isIntersecting)})},{rootMargin:'-50% 0px -50% 0px'});
[].forEach.call(ss,function(x){PIO.observe(x)})}
// 画框挂在字的右沿与窗口右沿之间的正中,中心对齐顶栏下沿到窗口底边的正中;两边各留至少 48,宽度最多 340;放不下 220 的窄窗口,画框改放在字的下面
function psGeo(){var R=document.documentElement,i=document.querySelector('.ps-i');if(!i)return;var r=i.getBoundingClientRect(),x0=r.left+r.width,gap=innerWidth-x0,w=Math.min(340,Math.round(gap-96));R.classList.toggle('fr-side',w>=220);R.style.setProperty('--gw',w+'px');R.style.setProperty('--gx',Math.round(x0+(gap-w)/2)+'px')}
document.documentElement.classList.add('ps-live');psInit(document);psGeo();addEventListener('resize',psGeo);if(document.fonts&&document.fonts.ready)document.fonts.ready.then(psGeo);
function prelay(){[].forEach.call(document.querySelectorAll('.proj'),function(b){pmove(b,false)})}
addEventListener('resize',prelay);if(document.fonts&&document.fonts.ready)document.fonts.ready.then(prelay);
// 文档连读:读到一页末尾之前,把下一页取来接在后面,中间留一段空白;滑进哪一页,地址、标题、侧栏、语言键就换成哪一页,右侧目录淡出换新再淡入
var stream=document.querySelector('.stream');if(stream&&window.fetch&&window.DOMParser&&'IntersectionObserver' in window)(function(){
var first=stream.querySelector('.art'),tocEl=document.querySelector('.toc'),langA=document.querySelector('.dtop .lang'),sideT=document.querySelector('.side-t b');if(!first)return;
first.__toc=tocEl?tocEl.innerHTML:'';first.__title=document.title;first.__lang=langA?langA.getAttribute('href'):null;
var arts=[first],curA=first,busy=false,done=!first.getAttribute('data-next'),busyUp=false,doneUp=!first.getAttribute('data-prev'),tocOn=null;
if('scrollRestoration' in history)history.scrollRestoration='manual';
document.body.classList.add('streaming');
function tocMark(id){if(!tocEl)return;var a=tocEl.querySelector('a[href="#'+id+'"]');if(a===tocOn)return;if(tocOn)tocOn.classList.remove('on');tocOn=a;if(a)a.classList.add('on')}
function tocNow(){var hs=curA.querySelectorAll('h2[id]'),id=null;for(var i=0;i<hs.length;i++){if(hs[i].getBoundingClientRect().top<innerHeight*.3)id=hs[i].id}if(id)tocMark(id);else if(tocOn){tocOn.classList.remove('on');tocOn=null}}
function tocProj(){var b=curA.querySelector('.proj .ptabs [role=tab][aria-selected=true]'),p=b&&b.getAttribute('data-p');if(p&&tocEl)[].forEach.call(tocEl.querySelectorAll('a[data-p]'),function(x){x.hidden=x.getAttribute('data-p')!==p})}
function setCur(a){if(a===curA)return;curA=a;var slug=a.getAttribute('data-slug');
try{history.replaceState(null,'',slug+'.html')}catch(e){}
document.title=a.__title;if(langA&&a.__lang)langA.setAttribute('href',a.__lang);
if(side){var on=side.querySelector('.side-ii a.on');if(on){on.classList.remove('on');on.removeAttribute('aria-current')}
var n=side.querySelector('.side-ii a[href="'+slug+'.html"]');if(n){n.classList.add('on');n.setAttribute('aria-current','page');if(sideT)sideT.innerHTML=n.innerHTML;
var g=n.closest('.sp');if(g&&g.classList.contains('closed')){g.classList.remove('closed');g.firstChild.setAttribute('aria-expanded','true')}
if(side.scrollHeight>side.clientHeight+4){var r=n.getBoundingClientRect(),q=side.getBoundingClientRect();if(r.bottom>q.bottom-24||r.top<q.top+24)side.scrollTo({top:side.scrollTop+r.top-q.top-side.clientHeight*.4,behavior:'smooth'})}}}
if(tocEl){tocEl.classList.add('fade');clearTimeout(tocEl.__t);tocEl.__t=setTimeout(function(){tocEl.innerHTML=curA.__toc;tocOn=null;tocProj();tocNow();tocEl.scrollTop=0;void tocEl.offsetWidth;tocEl.classList.remove('fade')},230)}}
// 换页的淡出淡入,跟着滚动走:上一页正文的末尾从屏高四成处滑到顶端,整页由实到透明;下一页的页眉从屏底升到屏高五成半处,由透明到实,并从下方轻轻浮上来
var calm=matchMedia('(prefers-reduced-motion: reduce)').matches;
function sm(x){x=x<0?0:x>1?1:x;return x*x*(3-2*x)}
function endOf(a){for(var c=a.lastElementChild;c;c=c.previousElementSibling)if(c.offsetHeight)return c.getBoundingClientRect().bottom;return a.getBoundingClientRect().bottom}
function fade(){if(calm)return;var H=innerHeight;for(var i=0;i<arts.length;i++){var a=arts[i],r=a.getBoundingClientRect(),o=1,ty=0;if(r.bottom<-H||r.top>2*H){if(a.__o!==1){a.__o=1;a.style.opacity='';a.style.transform=''}continue}
if(i>0){var f=sm((H*.95-a.querySelector('.kick').getBoundingClientRect().top)/(H*.4));o=f;ty=(1-f)*28}
if(i<arts.length-1)o=Math.min(o,sm(endOf(a)/(H*.4)));
a.__ty=ty;o=Math.round(o*1000)/1000;if(o===a.__o&&!ty)continue;a.__o=o;a.style.opacity=o<1?o:'';a.style.transform=ty>.2?'translateY('+ty.toFixed(1)+'px)':''}}
function pick(){fade();var y=innerHeight*.35,c=arts[0];for(var i=0;i<arts.length;i++)if(arts[i].getBoundingClientRect().top<=y)c=arts[i];setCur(c);if(!tocEl||!tocEl.classList.contains('fade'))tocNow();if(!busy&&!done&&sent.getBoundingClientRect().top<innerHeight+1600)more();if(!busyUp&&!doneUp&&arts[0].getBoundingClientRect().top>-2*innerHeight)less()}
// 前后几页:先取来接上;页内的 id 与页内链接加上页名作前缀,免得和别的页重名
var sent=document.createElement('div');sent.className='sent';stream.appendChild(sent);
var raf=0;addEventListener('scroll',function(){if(!raf)raf=requestAnimationFrame(function(){raf=0;pick()})},{passive:true});addEventListener('resize',function(){fade()});tocNow();
function grab(url){return fetch(url).then(function(r){if(!r.ok)throw 0;return r.text()}).then(function(h){var d=new DOMParser().parseFromString(h,'text/html'),a=d.querySelector('.stream .art');if(!a)throw 0;
var pre=a.getAttribute('data-slug')+'--',fix=function(root){[].forEach.call(root.querySelectorAll('a[href^="#"]'),function(x){x.setAttribute('href','#'+pre+x.getAttribute('href').slice(1))})};
[].forEach.call(a.querySelectorAll('[id]'),function(x){x.id=pre+x.id});
[].forEach.call(a.querySelectorAll('[aria-controls],[aria-labelledby]'),function(x){['aria-controls','aria-labelledby'].forEach(function(k){var v=x.getAttribute(k);if(v)x.setAttribute(k,pre+v)})});
fix(a);var t=d.querySelector('.toc');if(t)fix(t);var l=d.querySelector('.dtop .lang');
a=document.adoptNode(a);a.__toc=t?t.innerHTML:'';a.__title=d.title;a.__lang=l?l.getAttribute('href'):null;return a})}
function jump(y){try{scrollTo({top:y,behavior:'instant'})}catch(e){scrollTo(0,y)}}
function more(){if(busy||done)return;var last=arts[arts.length-1],nx=last.getAttribute('data-next');if(!nx){done=true;return}busy=true;
grab(nx).then(function(a){last.classList.add('gap');stream.insertBefore(a,sent);arts.push(a);pinit(a);psInit(a);psGeo();prelay();fade();busy=false;if(!a.getAttribute('data-next'))done=true;
if(sent.getBoundingClientRect().top<innerHeight+1600)more()}).catch(function(){busy=false;done=true;last.classList.add('keep')})}
// 前一页接在上方:插进去之后把滚动位置补回来,眼前的画面一动不动
function less(){if(busyUp||doneUp)return;var f=arts[0],pv=f.getAttribute('data-prev');if(!pv){doneUp=true;return}busyUp=true;
grab(pv).then(function(a){var k=f.querySelector('.kick'),ref=k.getBoundingClientRect().top;a.classList.add('gap');stream.insertBefore(a,f);arts.unshift(a);pinit(a);psInit(a);psGeo();prelay();var dy=k.getBoundingClientRect().top-ref;if(dy)jump(scrollY+dy);fade();busyUp=false;if(!a.getAttribute('data-prev'))doneUp=true;
if(arts[0].getBoundingClientRect().top>-2*innerHeight)less()}).catch(function(){busyUp=false;doneUp=true})}
new IntersectionObserver(function(es){if(es[0].isIntersecting)more()},{rootMargin:'0px 0px 1600px 0px'}).observe(sent);
// 目录里点一节:平滑滚过去,地址写成那一页自己的锚点;侧栏里点已接上来的页,滚过去,不重新打开
function goTo(el){var a=el.closest('.art'),t=(a&&a.__ty)||0,y=el.getBoundingClientRect().top,off=el.classList.contains('ps')?60:76;if(el.classList.contains('kick')&&a&&a.querySelector('.pr')){y=a.getBoundingClientRect().top;off=60}scrollTo({top:y-t+scrollY-off,behavior:'smooth'})}
if(tocEl)tocEl.addEventListener('click',function(e){var x=e.target.closest('a[href^="#"]');if(!x)return;var id=x.getAttribute('href').slice(1),el=document.getElementById(id);if(!el)return;e.preventDefault();goTo(el);var slug=curA.getAttribute('data-slug'),pre=slug+'--';try{history.replaceState(null,'',slug+'.html#'+(id.indexOf(pre)===0?id.slice(pre.length):id))}catch(z){}});
// 点侧栏、卡片或正文里指向本空间别的页的链接:那一页已接在阅读流里,就平滑滚过去;还没接上的,照常打开,由页面过渡淡出淡入
document.addEventListener('click',function(e){if(e.defaultPrevented||e.button||e.metaKey||e.ctrlKey||e.shiftKey||e.altKey)return;var x=e.target.closest&&e.target.closest('a[href]');if(!x||x.target)return;var h=x.getAttribute('href')||'';if(!h||h.charAt(0)==='#'||h.indexOf('/')>=0||h.indexOf(':')>=0)return;
var q=h.split('#'),slug=q[0].replace('.html',''),frag=q[1]||'';for(var i=0;i<arts.length;i++)if(arts[i].getAttribute('data-slug')===slug){e.preventDefault();if(side)side.classList.remove('open');var el=frag?document.getElementById(arts[i]===first?frag:slug+'--'+frag):null;if(el)goTo(el);else if(i===0)scrollTo({top:0,behavior:'smooth'});else goTo(arts[i].querySelector('.kick'));return}});
pick();
})();
// 沙画的几页:一次手势翻一页,不论滑多滑少;同一次手势余下的惯性吞掉。页里只有固定在屏上的字与沙,翻页直接跳到下一页的位置。
// 最后一页就是页面的底;拖滚动条停在两页之间的,落到最近的一页
// 页与页之间可以夹一段照常滚动的正文(.flow):翻进来停在它的上沿(从下面翻回来停在下沿),在里面照常滚,滚到上下两头即停;下一次手势先让它淡出,再翻到相邻的一页
var th=document.querySelector('.theater');if(th)(function(){
var R=document.documentElement,bs=[].slice.call(th.children).filter(function(b){return b.classList.contains('beat')}),fl=th.querySelector('.flow'),F=null,FI=-1,out=0,wasIn=false,tT=0,turnAt=-1e9,stops=null,cur=0,prevY=scrollY,gT=0,used=false,acc=0,peak=0,tail=1e9,last=0,t0=null,tDir=0,tMode=0,st=null;
if(!bs.length)return;
function on(){return R.classList.contains('sand-on')}
function S(){if(!stops){var y=scrollY;stops=bs.map(function(b,k){return k?Math.round(b.getBoundingClientRect().top+y):0});
if(fl){var r=fl.getBoundingClientRect(),a=Math.round(r.top+y);F=[a,Math.max(a,Math.round(r.bottom+y-innerHeight))];FI=0;while(FI<stops.length&&stops[FI]<a)FI++}}return stops}
function L(){var s=S();return s[s.length-1]}
function inF(y){S();return !!F&&y>F[0]-2&&y<F[1]+2}
function near(y){var s=S(),b=0;for(var k=1;k<s.length;k++)if(Math.abs(s[k]-y)<Math.abs(s[b]-y))b=k;return b}
function jump(y){try{scrollTo({top:y,behavior:'instant'})}catch(e){scrollTo(0,y)}}
function leave(k){var s=S();if(k<0||k>=s.length)return;out=1;fl.classList.add('away');setTimeout(function(){cur=k;wasIn=false;jump(S()[k]);prevY=scrollY;fl.classList.remove('away');out=0},460)}
function page(d){var s=S(),y=scrollY,k;
if(F){if(inF(y)){leave(d>0?FI:FI-1);return}k=near(y);if(d>0&&k===FI-1&&y<F[0]){cur=-1;jump(F[0]);return}if(d<0&&k===FI&&y>F[1]){cur=-1;jump(F[1]);return}}
k=Math.max(0,Math.min(s.length-1,near(y)+d));cur=k;jump(s[k])}
function inside(d){var y=scrollY,l=L();if(inF(y))return d>0?y>=F[1]-2:y<=F[0]+2;return y<l-2||(d<0&&y<=l+2)}
// 在正文一段里滚过它的上下两头:停在那一头,这次手势余下的吞掉
function edge(y,dy){if(!inF(y))return null;if(dy>0&&y<F[1]-2&&y+dy>F[1])return F[1];if(dy<0&&y>F[0]+2&&y+dy<F[0])return F[0];return null}
addEventListener('wheel',function(e){
if(!on()||e.ctrlKey)return;var dy=e.deltaY*(e.deltaMode===1?16:e.deltaMode===2?innerHeight:1);if(!dy)return;
// 新的一次手势:停了 0.18 秒以上;或惯性已衰减下去,滚动量又突然回升(惯性里再划一下)。
// 翻页那一刻沙画要备下一幕,事件会被拖后:翻页后 0.7 秒内、以及 1.6 秒内比这次峰值弱一截的,都算这次手势的惯性
var now=performance.now(),a=Math.abs(dy),tailing=used&&(now-turnAt<700||(now-turnAt<1600&&a<peak*.6));
if((now-gT>180&&!tailing)||(used&&tail<peak*.35&&a>12&&a>tail*4&&a>last*1.5)){used=false;acc=0;peak=0;tail=1e9}
gT=now;peak=Math.max(peak,a);if(a<peak*.35)tail=Math.min(tail,a);last=a;
// 正文一段淡出、还没翻过去:这次手势照样记着,余下的惯性吞掉,翻过去以后也不会再翻一页
if(out){e.preventDefault();used=true;return}
var y=scrollY,l=L(),cross=dy<0&&y>l+2&&y+dy<l,ed=edge(y,dy);
if(!inside(dy)&&!cross&&ed==null&&!used)return;
e.preventDefault();if(used)return;
if(cross){cur=S().length-1;jump(l);used=true;return}
if(ed!=null){jump(ed);used=true;return}
acc+=dy;if(Math.abs(acc)<12)return;page(acc>0?1:-1);used=true;turnAt=now;
},{passive:false});
addEventListener('touchstart',function(e){t0=on()&&e.touches.length===1?e.touches[0].clientY:null;tDir=0;tMode=0;tT=performance.now()},{passive:true});
addEventListener('touchmove',function(e){
if(t0==null||e.touches.length!==1)return;var d=t0-e.touches[0].clientY;
if(out){if(e.cancelable)e.preventDefault();return}
if(!tMode){var y=scrollY,l=L();if(y<l-2&&!inF(y))tMode=1;else{if(Math.abs(d)<6)return;tMode=inside(d)?1:2}}
if(tMode===1){if(e.cancelable)e.preventDefault();tDir=d}
},{passive:false});
addEventListener('touchend',function(){if(tMode===1&&Math.abs(tDir)>30)page(tDir>0?1:-1);t0=null;tMode=0;tT=performance.now()});
addEventListener('keydown',function(e){
if(!on()||e.defaultPrevented||e.altKey||e.ctrlKey||e.metaKey)return;var g=e.target;if(g&&(g.isContentEditable||/^(INPUT|TEXTAREA|SELECT|BUTTON)$/.test(g.tagName)))return;
var k=e.key,d=k==='ArrowDown'||k==='PageDown'||(k===' '&&!e.shiftKey)?1:k==='ArrowUp'||k==='PageUp'||(k===' '&&e.shiftKey)?-1:0;
if(d&&out){e.preventDefault();return}
if(d&&inside(d)){e.preventDefault();page(d)}
});
function settle(){if(!on()||out)return;var s=S(),y=scrollY,l=s[s.length-1];
if(y>=l-2||y<=2){if(y<=2)cur=0;else if(y<=l+2)cur=s.length-1;prevY=y;return}
if(inF(y)){cur=-1;prevY=y;return}
var b=prevY>l+2?s.length-1:near(y),to=s[b];cur=b;
if(F){[F[0],F[1]].forEach(function(f){if(Math.abs(f-y)<Math.abs(to-y)){to=f;cur=-1}})}
if(Math.abs(to-y)>2)jump(to);prevY=scrollY}
// 滚轮与手指带着的滚动(浏览器平滑滚动、惯性)冲过正文一段的上下沿:停在沿上,这次手势余下的吞掉;拖滚动条的不管,由 settle 落位
addEventListener('scroll',function(){if(F&&on()&&!out){var y=scrollY,now=performance.now();if(wasIn&&(now-gT<400||now-tT<1200)&&(y>F[1]+2||y<F[0]-2)){jump(y>F[1]?F[1]:F[0]);used=true;gT=now}wasIn=inF(scrollY)}clearTimeout(st);st=setTimeout(settle,160)},{passive:true});
var rt=null;addEventListener('resize',function(){clearTimeout(rt);rt=setTimeout(function(){var was=scrollY<=L()+2;stops=null;if(on()&&was&&cur>=0)jump(S()[cur])},220)});
if(window.ResizeObserver)new ResizeObserver(function(){stops=null}).observe(th);
setTimeout(function(){cur=inF(scrollY)?-1:near(scrollY);settle()},300);
})();
// 下载页:在 dmg 与 pkg 两种安装包之间切换,安装步骤跟着换
var gv=document.querySelectorAll('.get [data-f]');if(gv.length)(function(){
function pick(f){if(!f)return;[].forEach.call(gv,function(v){v.hidden=v.getAttribute('data-f')!==f})}
function os(o){[].forEach.call(document.querySelectorAll('.seg [data-os]'),function(b){b.setAttribute('aria-selected',b.getAttribute('data-os')===o)});[].forEach.call(document.querySelectorAll('.osp[data-os]'),function(p){p.hidden=p.getAttribute('data-os')!==o})}
document.addEventListener('click',function(e){var b=e.target.closest&&e.target.closest('[data-to]');if(b){e.preventDefault();var f=b.getAttribute('data-to');pick(f);var v=document.querySelector('.get [data-f="'+f+'"]');if(v)os(v.getAttribute('data-os'));return}
var s=e.target.closest&&e.target.closest('.seg [data-os]');if(s){os(s.getAttribute('data-os'));var w=[].filter.call(gv,function(x){return x.getAttribute('data-os')===s.getAttribute('data-os')})[0];if(w)pick(w.getAttribute('data-f'))}});
})();
var z=document.querySelector('.drop[data-verify]');if(!z)return;
var inp=z.querySelector('input'),out=document.getElementById('verify-out'),list={};
document.querySelectorAll('[data-sha]').forEach(function(e){list[e.getAttribute('data-file')]=e.getAttribute('data-sha')});
z.addEventListener('dragover',function(e){e.preventDefault();z.classList.add('hot')});
z.addEventListener('dragleave',function(){z.classList.remove('hot')});
z.addEventListener('drop',function(e){e.preventDefault();z.classList.remove('hot');if(e.dataTransfer.files[0])run(e.dataTransfer.files[0])});
inp.addEventListener('change',function(){if(inp.files[0])run(inp.files[0])});
function esc(s){return s.replace(/[&<>"]/g,function(c){return{'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]})}
function row(k,v){return '<div><span class="k">'+k+'</span>'+v+'</div>'}
function run(f){out.hidden=false;out.innerHTML=row(T('结果','Result'),'<span>'+T('正在计算…','Computing…')+'</span>');
f.arrayBuffer().then(function(b){return crypto.subtle.digest('SHA-256',b)}).then(function(d){var h=Array.prototype.map.call(new Uint8Array(d),function(x){return('0'+x.toString(16)).slice(-2)}).join(''),w=list[f.name];
var v=w===undefined?'<span class="bad">'+T('这个文件在发布清单之外','This file is outside the release list')+'</span>':w===h?'<span class="ok">'+T('与发布清单一致','Matches the release list')+'</span>':'<span class="bad">'+T('与发布清单不一致。请删掉它，重新下载。','Does not match the release list. Delete it and download again.')+'</span>';
out.innerHTML=row(T('结果','Result'),v)+row(T('文件','File'),'<span>'+esc(f.name)+'</span>')+row('SHA-256','<span class="hash">'+h+'</span>');},function(){out.innerHTML=row(T('结果','Result'),'<span class="bad">'+T('这个文件读取失败','This file could not be read')+'</span>');});}
})();
