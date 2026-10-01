#!/usr/bin/env python3
"""中英两套页面。
首页与 Zikaron 页的文字住本档;Wiki 与开发者指南一页一档,住 content/<wiki|dev>/<名>.<语>.html,
档头一段注释写标题。中文页落在根下,英文页落在 en/ 下,两边路径逐一对应。"""
import hashlib, html, os, re
from pathlib import Path

HERE = Path(__file__).resolve().parent
REPO = "https://github.com/kaptonia/zikaron"
CORE = "0xbecfb6f0d0f8b71c314f1b2efef414abfb6df74b711ca8f81efdef685d0132fc"
KIT = "0x3f8368ebc8b5b7c97e4b5c4240f57f6fc06421b4effbd5a7446d128434a20535"
CODEHASH = "0xfa97a1d9b22fab2b52f4e27c9a965b32734c40001b565ab365d05c887118f57d"
VER = "0.1.0"
# 0.1.0 的发布物,照发布清单 SHA256SUMS.txt 与实物抄录:(文件名, 大小, SHA-256, 种类, 指纹上链的那笔交易)
# 最后一项在记入项目的 Zikaron 账本、上链之后填上区块浏览器上的地址;留空时显示「发布时写入」
ANCHOR_TX = "https://etherscan.io/tx/0x028fdb5591635442bb0ca30dced70305438dac34434b7a02c9daa7f9054fd329"   # 0.1.0 的指纹上链的那笔交易(发布说明)
FILES = [(f"ZIKARON-{VER}-macos-arm64.dmg", "6.0 MB", "033cccae949d3d37d6c2c8674ae32419a01790c523ab34b84ea54211cc78d1dd", "dmg", ANCHOR_TX),
         (f"ZIKARON-{VER}-macos-arm64.pkg", "6.6 MB", "6f49a4cb35b7e7aeaa2fc724382ff650bd9a6e6a6a5347d598533e8ee5f5464a", "pkg", ANCHOR_TX),
         (f"zikaron-{VER}-src.tar.gz", "10.0 MB", "383b08847004b3409275c388dd6e1b8bb76c63fab1e73d0d2734e6c6720b81f5", "src", ANCHOR_TX)]
# 登记合约的两处已知部署(应用内置,README 与手册附录 A)
MAINNET = ("0x36Ea8A857a5FE813429d4D9947000C644A88809A", "26087229")
SEPOLIA = ("0xC29410B882c4C3b77e33659d2f06ac563e7B08a3", "11715660")
BASE = os.environ.get("SITE_BASE", "/")              # 站在域名下的根路径,只有 404 页用它
def ver(name):  # 引用带内容指纹,改了就换地址,不吃旧缓存
    data = JS.encode() if name == "site.js" else (HERE / name).read_bytes()
    return f"{name}?v={hashlib.sha1(data).hexdigest()[:8]}"

LANGS = ("zh", "en")
L = "zh"                                   # 正在出的那一语
def t(zh, en): return zh if L == "zh" else en
def root(depth):                           # 到站根(资源住那里)
    return "../" * (depth + (1 if L == "en" else 0))
def home(depth):                           # 到本语的根(页与页之间的链接)
    return "../" * depth
def other(rel, depth):                     # 同一页的另一语
    return root(depth) + ("en/" + rel if L == "zh" else rel)

COPY = '<svg width="14" height="14" viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.4" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><polyline points="5,5 14,5 14,14 5,14 5,5"/><polyline points="2,11 2,2 11,2"/></svg>'
def cmd(s, block=False):
    s = s.strip("\n") if block else s.strip()
    e = html.escape(s, quote=True)
    return f'<div class="cmd{" block" if block else ""}"><code>{e}</code><button class="cp" type="button" data-copy="{e}" aria-label="{t("复制", "Copy")}" title="{t("复制", "Copy")}">{COPY}</button></div>'

FONTS = ('<link rel="preconnect" href="https://fonts.googleapis.com"><link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>'
         '<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Hanken+Grotesk:ital,wght@0,400..700;1,400..700&family=JetBrains+Mono:wght@300;400;500;700&display=swap">')

TITLE = ("去中心化法权基础设施", "Decentralized Infrastructure of Right")
def plain(s): return re.sub(r"<[^>]+>", "", s)
def Z(s): return s.replace("Zikaron", '<b class="zk">Zikaron</b>')

# 标签页上的小图标:三块垒起的河石
# 站不留标志:标签页给一个透明的空图标,只剩标题文字
ICON = "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 32 32'%3E%3C/svg%3E"
DESC = ("一组开源的协议与工具:押下的钱由合约看管,争议由双方事先挑定的人裁断,证据由每个人自己留存、任何人都能核验。",
        "A set of open-source protocols and tools: staked money is held by a smart contract, disputes are decided by someone both sides picked beforehand, and evidence is kept by each person and checkable by anyone.")

# 有沙画的页:正文先藏着,等沙画接管(或确定跑不了)再露出,免得先闪一下普通排版的字;脚本没来,三秒后照常显示
WAIT = ";document.documentElement.classList.add('sand-wait');setTimeout(function(){document.documentElement.classList.remove('sand-wait')},3000)"
def head(title, rel, depth, body_cls="", canvas="", desc=None):
    alt = "en" if L == "zh" else "zh"
    d = html.escape(plain(desc or t(*DESC)), quote=True)
    return f"""<!doctype html>
<html lang="{L}">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1,viewport-fit=cover">
<meta name="color-scheme" content="light dark">
<title>{title}</title>
<meta name="description" content="{d}">
<meta property="og:title" content="{html.escape(title, quote=True)}">
<meta property="og:description" content="{d}">
<meta property="og:type" content="website">
<link rel="icon" href="{ICON}">
<script>document.documentElement.classList.add('js'){WAIT if canvas else ""}</script>
<link rel="alternate" hreflang="{alt}" href="{other(rel, depth)}">
{FONTS}
<link rel="stylesheet" href="{root(depth)}{ver('style.css')}">
</head>
<body class="{body_cls}">
{canvas}"""

def DEV():  # 窄屏上英文只留前一个词,顶栏才放得下
    return t("开发者指南", 'Developer<span class="xw"> guide</span>')

def lang_link(rel, depth):
    o = "en" if L == "zh" else "zh"
    return f'<a class="lang" href="{other(rel, depth)}" lang="{o}" hreflang="{o}">{t("EN", "中文")}</a>'

def top(rel, depth, on=""):
    h = home(depth)
    items = (("tools", t("工具", "Tools"), f"{h}index.html#tools"), ("download", t("下载", "Download"), f"{h}download.html"), ("wiki", "Wiki", f"{h}docs/wiki/index.html"), ("dev", DEV(), f"{h}docs/dev/index.html"))
    nav = "".join(f'<a href="{u}"{" class=on" if k == on else ""}>{n}</a>' for k, n, u in items)
    return f"""<header class="top"><div class="frame-w">
  <a class="handle" href="{h}index.html">@kaptonia</a>
  <nav class="nav">{nav}{lang_link(rel, depth)}</nav>
</div></header>
"""

def close(depth, scripts=()):   # 页面到最后一页或正文末尾即止,不设页脚
    r = root(depth)
    s = "".join(f'<script src="{r}{ver(x)}" defer></script>' for x in scripts)
    return f"""{s}
</body>
</html>
"""

def lead(s):
    """每段的主句(第一句;若整段只有一句,取到第一个分号)加深,其余是解释;文中有 ‖ 的,加深到 ‖ 为止"""
    if "‖" in s:
        a, b = s.split("‖", 1)
        return f'<span class="lead">{a}</span>{b}'
    dot, semi = (("。", "；") if L == "zh" else (". ", "; "))
    i = s.find(dot)
    if i < 0 or i + len(dot) >= len(s):
        i = s.find(semi)
    if i < 0:
        return f'<span class="lead">{s}</span>'
    i += 1
    return f'<span class="lead">{s[:i]}</span>{s[i:]}'

def cap(cid, pos, inner, cls=""):
    return f'<div class="cap at-{pos}{cls}" data-cap="{cid}">{inner}</div>'

def canvas(page, depth):
    return f'<canvas id="sand" data-page="{page}" data-base="{root(depth)}" aria-hidden="true"></canvas>'

# ───────── 首页 ─────────
HERO = (["在只有国家才有强制执行契约能力的时代，秩序的锚点被国家垄断，人们除了整个接受以外别无选择。",
         "本系统希望成为每个人都可以使用和参与建设的开放秩序市场：在这里与他人达成自由选择的契约，并借助区块链基础设施保证其执行，使每一次建造信任的行为，都被市场认可和定价。"],
        ["For as long as only the state could enforce a contract, the anchor of order was the state’s monopoly, and people had no choice but to accept it whole.",
         "This system sets out to be an open market for order that anyone can use and help build: a place to enter freely chosen contracts with others, to have blockchain infrastructure guarantee their execution, and to see every act of building trust recognized and priced by the market."])
# 九页,每页一件东西(第 7 页是一片流水)
PAGES = [
    ("契约有利于共同和长远的利益，背叛契约却往往意味着短期的好处。如果契约没有保证其强制执行的机制，那么任何大规模、长时间协作都不可能进行下去。",
     "A contract serves shared and long-term interests, while breaking one often pays in the short term. Without a mechanism that guarantees enforcement, no cooperation at scale or over time can be sustained."),
    ("人类社会因此进化出了一种初级担保机制：大规模的有组织暴力，即国家机器。无论何种政治形式，国家从来都是一个终极担保人：它的作用在于强制执行一种公认的规则。",
     "So human societies evolved a rudimentary mechanism of guarantee: organized violence at scale, the machinery of the state. Whatever its political form, the state has always been the guarantor of last resort: its function is to enforce a commonly recognized set of rules."),
    ("公正是国家这一担保组织存在的根本价值。国家因其公正而存在，因其不公而停止存在。因此，认真地制定法律、公平地执行法律，是人类数千年来政治的绝对主题。",
     "Justice is the fundamental value on which the state, as a guarantor, rests. A state exists because it is just, and ceases to exist when it is not. To make law with care and to enforce it fairly has therefore been the overriding theme of politics for thousands of years."),
    ("人们敬畏公正的统治者，他们带来繁荣，因为人们相信规则能被执行而积极地相互合作；人们厌恶腐败的统治者，他们带来萧条和动乱，人们因害怕背叛而不敢再相互合作。",
     "People revere just rulers, who bring prosperity, because those who trust that the rules will be enforced cooperate readily; they detest corrupt rulers, who bring depression and unrest, because those who fear betrayal no longer dare to cooperate."),
    ("然而，背叛带来短期的好处，这对国家也同样成立。当担保人的位置被背叛者占据，社会契约被撕毁，国家便成为赤裸的压迫形式。人们变得不再敢彼此合作，先前的繁荣也往往化为泡影。这件事在人类历史上，曾不断地重复。",
     "Yet betrayal pays in the short term, and that holds for the state as well. When a betrayer takes the guarantor’s seat and the social contract is torn up, the state becomes oppression laid bare. People no longer dare to cooperate, and the prosperity that went before tends to vanish. In human history this has happened again and again."),
    ("区块链的出现创造了崭新的技术可能：人们可以自由结成契约，并以数学保证其得到执行。担保与信任，这一曾经需要大规模有组织暴力的昂贵、稀缺的产品，第一次可以变成一个人人都能触及到的市场。被国家垄断的单一主权，也有了以细分领域形式被个人承担的可能。",
     "The blockchain opens a new technical possibility: people can enter contracts freely and have mathematics guarantee their execution. Guarantee and trust, once a scarce and costly product that took organized violence at scale, can for the first time become a market within everyone’s reach. Sovereignty, once a single whole monopolized by the state, can now be borne by individuals as well, in the form of distinct domains."),
    ("秩序曾经是一座座建起来又倒塌的城堡。而现在，它可以成为一条河流：不同的信任生态在其中像水一样流动。‖人们既可以选择，也可以参与。在这个时代，个人不再是国家的附属物，个人可以真正代替国家。",
     "Order used to be castles that rose and fell one after another. Now it can be a river, in which different ecologies of trust flow like water.‖ People can choose among them, and they can take part. In this age the individual is no longer an appendage of the state; the individual can truly take its place."),
    ("任何秩序或人类产品价值的衡量，在打破了国家捆绑主权的垄断后，将不再以中心化的分配标准为准绳，而是以每个需求者的选择为标准；社会博弈的策略，将从“找到现行分配体制的卡点”，变成“创造他人愿意选择的产物”。",
     "Once the monopoly of bundled sovereignty is broken, the worth of any order, and of anything people make, will be measured no longer by a central standard of allocation but by the choice of each person who needs it; and the strategy of the social game will shift from “finding the chokepoints of the current allocation system” to “making what others are willing to choose”."),
    ("去中心化法权基础设施的形态是开放的。协议标准不只有一个，产品也不只有一种。所有的产品完全开源，任何人可以取用，并做出自己的修改与完善，一切由人们自己去选择。",
     "The Decentralized Infrastructure of Right is open in form. There is more than one protocol standard, and more than one kind of product. Every product is fully open source: anyone may take it, change it and improve it, and everything is left for people to choose."),
]

def index():
    rel = "index.html"
    beats = "".join(
        f'<section class="beat" data-scene="p{i}">{cap(f"p{i}", "L", f"<span class=pno>{i:02d} / {len(PAGES):02d}</span><p>{lead(t(*p))}</p>", " page-cap")}</section>'
        for i, p in enumerate(PAGES, 1))
    go = t("打开 →", "Open →")
    tools = cap("tools", "L", f"""<h2>{t("工具", "Tools")}</h2>
  <div class="tools">
    <a class="tool" href="zikaron.html"><b class="zk">Zikaron</b><span>{t("留证基础设施", "Evidence infrastructure")}</span><em>{go}</em></a>
    <div class="tool soon"><b>{t("还有更多", "More to come")}</b></div>
  </div>""")
    rest = cap("rest", "L", f"""<h2>{t("深入了解", "Learn more")}</h2>
  <div class="tools">
    <a class="tool" href="docs/wiki/index.html"><b>Wiki</b><span>{t("原理、概念与常见问题", "Principles, concepts and common questions")}</span><em>{go}</em></a>
    <a class="tool" href="docs/dev/index.html"><b>{t("开发者指南", "Developer guide")}</b><span>{t("校验、法文、命令行与合约", "Verification, law, command line, contract")}</span><em>{go}</em></a>
  </div>""")
    body = f"""<main class="theater">
<section class="beat hero-beat" data-scene="hero">{cap("hero", "L", f'<p class="en" lang="{t("en", "zh")}">{t(TITLE[1], TITLE[0])}</p><h1>{t(*TITLE)}</h1>' + "".join(f'<p class="lede">{x}</p>' for x in t(*HERO)), " hero-cap")}</section>
{beats}
<section class="beat" id="tools" data-scene="tools">{tools}</section>
<section class="beat" data-scene="rest">{rest}</section>
</main>
"""
    return head(t(*TITLE), rel, 0, canvas=canvas("home", 0)) + top(rel, 0) + body + close(0, ("paint.js", "scenes.js", "sand.js", "site.js"))

# ───────── ZIKARON ─────────
# 三页滚动:每页一件东西(ill/z1–z3)
ZPAGES = [
    (("留证基础设施", "Evidence infrastructure"),
     ("去中心化法权体系的通用留证协议，证据的妥善留存是链上仲裁者公正判断的基础。任何人都能通过 Zikaron 把要留住的证据做成可查验的记录，锚在区块链上，争议与判决都以它为证据地基；任何留证条目都可以登记为他人可查验的授权。",
      "The general evidence protocol of the Decentralized Infrastructure of Right: evidence properly kept is the ground on which on-chain arbiters rule fairly. With Zikaron, anyone can turn what they want kept into a record that others can check, anchored on a blockchain, so that disputes and rulings rest on it; and any record can be registered as a grant that others can check.")),
    (("创作与授权", "Creation and grants"),
     ("创作者把作品的内容摘要记进 Zikaron 账本，版本迭代就是一条接一条的创作过程记录；向他人授权时，登记授权的对象、摘要和条款。买方、平台或与创作权相关的仲裁者，也可以通过 Zikaron 核对创作权与授权的有效性。适用于一切数字内容的留证与授权。",
      "A creator records the content digest of a work in a Zikaron ledger, and each new version adds one more entry to the record of how it was made; to grant rights to someone, the creator registers the grantee, the digest and the terms. Buyers, platforms, and arbiters hearing questions of authorship can check through Zikaron who made a work and whether a grant is valid. It serves digital content of every kind, for keeping evidence and for granting rights.")),
    (("交易与履约", "Trade and performance"),
     ("链下的交付物、往来沟通、履约承诺，在交付那一刻就可以通过 Zikaron 做成记录包留证，不等争议发生。当争议进入托管时，当事人能够提交早已锚上链的记录包与时间锚点，供仲裁者核验和权衡证据。事后补造的伪证，因此无法混入决策。",
      "Deliverables, correspondence and commitments made off chain can be recorded with Zikaron and packed into a record kit at the moment of delivery, before any dispute arises. When a dispute reaches escrow, the parties can submit record kits anchored long before, together with their time anchors, for the arbiter to verify and weigh. Evidence fabricated after the fact therefore cannot find its way into the decision.")),
]
# 词源:点开才出现;只贴经文(约书亚记 4:4–7)
SCRIPTURE = ("约书亚召集了他从以色列人中选出的十二个人，每支派一人，对他们说：“你们走到你们神耶和华的约柜前，进入约旦河中间。每个人要按以色列支派的数目，扛一块石头在肩上，作为你们中间的记号。日后，当你们的子孙问你们‘这些石头是什么意思’时，你们就告诉他们：‘因为约旦河的水在耶和华的约柜前断流了；约柜过约旦河的时候，约旦河的水就断流了。’这些石头要给以色列人作永远的纪念。”",
             "Joshua summoned the twelve men he had picked from the people of Israel, one man from each tribe, and said to them: “Pass on before the ark of the LORD your God into the midst of the Jordan, and let each of you take up a stone upon his shoulder, as many as the tribes of Israel, that it may be a sign among you. In time to come, when your children ask you, ‘What do these stones mean to you?’, you shall tell them: ‘The waters of the Jordan were cut off before the ark of the covenant of the LORD; when it passed through the Jordan, the waters of the Jordan were cut off.’ And these stones shall be a memorial for the people of Israel for ever.”")
GLOSS = ("名词,阳性:纪念,纪念物,使人记起的记号;现代希伯来语里也指「记忆」。",
         "Noun, masculine: a memorial, a remembrance, a sign that calls something to mind; in modern Hebrew also “memory”.")
# 功能四块:名称、界面片段的名字(desk.js 照应用界面画)、说明(第一句是主句)
FEATS = [
    (("存证", "Record"), "record",
     ("把文件、文件夹或代码仓库用 Zikaron 记下它此刻的指纹。多条记录可以一笔锚上链，证明这份内容最迟在那一刻已经存在，gas 费用由你自己的地址支付。",
      "Record with Zikaron the fingerprint of a file, a folder or a code repository as it stands at this moment. Several records can be anchored on chain in a single transaction, proving that the content existed by that moment at the latest; the gas is paid from your own address.")),
    (("授权", "Grant"), "grant",
     ("按一份条款，把一件作品授权给他人。写明期限与范围，可以随时撤销，对方也可以转授权。对方的授权凭证可以通过文字和二维码提供给任何人核验。",
      "Grant rights in a work to someone else under a set of terms. State the period and the scope; the grant can be revoked at any time, and the grantee can sublicense it. The grantee’s credential can be given to anyone for checking, as text or as a QR code.")),
    (("出示", "Present"), "kit",
     ("需要拿出证据时，将提前留证的几条记录导出一个记录包。包里是这几条、它们的原文件和上链证明。",
      "When evidence is called for, export the records kept in advance as a record kit. The kit holds those records, their original files and their on-chain proofs.")),
    (("核验", "Verify"), "check",
     ("任何收到授权凭证或记录包的人都可以亲自核验。签名、账本、上链、期限与撤销均可核验，也可以读链查看任意地址的整本账本记录。",
      "Anyone who receives a credential or a record kit can check it for themselves. Signature, ledger, anchoring, validity and revocation can all be checked, and the chain can be read to see the whole ledger of any address.")),
]

def zikaron():
    rel = "zikaron.html"
    n = len(ZPAGES) - 1   # 主页不标页码,后面几页从 01 数起
    beats = "".join(
        f'<section class="beat" data-scene="z{i + 1}">{cap(f"z{i + 1}", "L", f"<span class=pno>{i:02d} / {n:02d}</span><h2>{t(*h)}</h2><p>{lead(Z(t(*s)))}</p>", " page-cap")}</section>'
        for i, (h, s) in enumerate(ZPAGES[1:], 1))
    feats = "".join(
        f'<article class="feat fi" style="--k:{min(i + 1, 4)}"><header><span class="pno">{i:02d}</span><h3>{t(*h)}</h3></header><p>{lead(Z(t(*s)))}</p><div class="zd" data-zd="{k}"></div></article>'
        for i, (h, k, s) in enumerate(FEATS, 1))
    h, s = ZPAGES[0]
    hero = cap("zhero", "L", f"""<h1 class="pname"><span class="zk">Zikaron</span></h1>
    <p class="tag">{t(*h)}</p>
    <p>{lead(Z(t(*s)))}</p>
    <p class="net">{t("默认部署于以太坊主网", "Deployed on Ethereum mainnet by default")}</p>
    <a class="etym" href="#etym" data-etym>{t("词源", "Etymology")}</a>""", " page-cap zcap")
    etym = cap("etym", "T", f"""<div class="heword"><span class="he" lang="he" dir="rtl">זִכָּרוֹן</span><span class="gloss"><i>zikkārôn</i><br>{t(*GLOSS)}</span></div>
    <p class="scripture">{t(*SCRIPTURE)}</p>
    <p class="cite">{t("约书亚记 4:4–7", "Joshua 4:4–7")}</p>""", " etym-cap")
    go = t("打开 →", "Open →")
    end = cap("zend", "T", f"""<div class="tools t3">
    <a class="tool" href="download.html"><b>{t("下载", "Download")}</b><span>Zikaron Desk {VER}</span><em>{go}</em></a>
    <a class="tool" href="docs/wiki/zikaron.html"><b>{t("使用说明", "User guide")}</b><span>Wiki</span><em>{go}</em></a>
    <a class="tool" href="docs/dev/index.html#map"><b>{t("开发者指南", "Developer guide")}</b><span>{t("校验、法文、命令行与合约", "Verification, law, command line, contract")}</span><em>{go}</em></a>
  </div>""")
    # 功能一段照常滚动:从交易与履约翻下来时淡入,翻到最后一页时淡出(site.js 的翻页与 style.css 的 .flow)
    body = f"""<main class="theater">
<section class="beat" data-scene="zhero">{hero}{etym}</section>
{beats}
<section class="flow" data-scene="zfeat" id="features">
<div class="frame-w blk">
  <h2 class="fi" style="--k:0">{t("功能", "Features")}</h2><p class="sub fi" style="--k:1">{t("下面四块界面是示例,共用一本示例账本,只在本页里运行。", "The four panels below are samples. They share one sample ledger and run entirely inside this page.")}<button class="relink" type="button" data-zd-reset>{t("重置", "Reset")}</button></p>
  <div class="feats">{feats}</div>
</div>
</section>
<section class="beat" data-scene="zend">{end}</section>
</main>
"""
    return head(f"Zikaron · {t(*TITLE)}", rel, 0, canvas=canvas("zikaron", 0), desc=t(*ZPAGES[0][1])) + top(rel, 0, "tools") + body + close(0, ("paint.js", "scenes.js", "sand.js", "site.js", "desk.js"))

# ───────── 下载:每个产品一个选项卡(现在只有 Zikaron) ─────────
# 发布包里的名字,照 0.1.0 的实物核对
APP = "ZIKARON"                 # macOS 上是 ZIKARON.app
SIGNER = "Kaptonia"             # 发布包签名证书的 CN(自签,未经 Apple 公证)
CERT = "a6ddc371e855197c5021ef44ab0802749cda318bc12d0138ccac9f46a4d46905"   # 这张证书的 SHA-256 指纹(DER)
CERT_TO = "2036-09-23"          # 证书有效期至
ARROW = '<svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M8 2.5v8M4.5 7 8 10.5 11.5 7M3 13.5h10"/></svg>'
FILEICON = '<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.3" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M6 3h8l4 4v14H6z"/><path d="M14 3v4h4"/><path d="M9 13h6M9 16.5h4"/></svg>'
def anchor(u):   # 这个文件的指纹上链的那笔交易;还没上链时留着这一格
    lab = t("Zikaron 证明", "Zikaron record")   # 窄屏上这一格换到文件名下面,前面带上栏名
    if not u: return f'<span class="an dim" data-l="{lab}">{t("发布时写入", "Written at release")}</span>'
    h = u.rstrip("/").rsplit("/", 1)[-1]
    return f'<span class="an" data-l="{lab}"><a href="{u}">{h[:8]}…{h[-6:]}</a></span>'
def kind(k):   # 种类的说法:(类型, 小注, 挑这个包时的说法)
    return {"dmg": (t("磁盘映像", "Disk image"), "Apple 芯片" if L == "zh" else "Apple silicon", t(".dmg 磁盘映像", ".dmg disk image")),
            "pkg": (t("安装包", "Installer"), "Apple 芯片" if L == "zh" else "Apple silicon", t(".pkg 安装包,连同命令行", ".pkg installer, with the command line")),
            "src": (t("源码", "Source"), "tar.gz", t("源码包", "Source archive"))}[k]
def download():
    rel = "download.html"
    url = lambda f: f"{REPO}/releases/download/v{VER}/{f}"
    pk = [x for x in FILES if x[3] in ("dmg", "pkg")]
    def variant(n, f, size, k):
        alt = "".join(f'<button type="button" data-to="{g}">{kind(gk)[2]}</button>' for g, _, _, gk, _ in pk if g != f)
        return (f'<div class="get-v" data-f="{f}" data-os="{k}"{"" if n == 0 else " hidden"}>'
                f'<div class="os">macOS · {t("Apple 芯片", "Apple silicon")} · {kind(k)[2]}</div>'
                f'<a class="btn" href="{url(f)}"><span>{ARROW}{t("下载", "Download")} {APP} Desk</span><span class="sz">{size}</span></a>'
                f'<div class="fn">{f}</div>'
                f'<div class="alt"><span>{t("另有", "Also")}</span>{alt}<a href="#files">{t("全部文件", "All files")}</a></div></div>')
    card = ('<div class="get rise" style="--k:3">' + "".join(variant(n, f, size, k) for n, (f, size, _, k, _) in enumerate(pk))
            + f'<p class="need">{t("需要 Apple 芯片的 Mac，macOS 11 或更新的版本。x86_64 的 Linux 从源码构建,见", "Needs a Mac with Apple silicon and macOS 11 or later. On x86_64 Linux, build from source; see")} <a href="docs/dev/build.html">{t("从源码构建", "Building from source")}</a>{t("。", ".")}</p></div>')
    rows = "".join(f'<div class="tr" data-file="{f}" data-sha="{h}"><span class="os">{kind(k)[0]}<i>{kind(k)[1]}</i></span><span class="fl"><a href="{url(f)}">{f}</a></span>{anchor(u)}<span class="r">{size}</span></div>' for f, size, h, k, u in FILES)
    table = (f'<div class="tbl"><div class="tr h"><span class="os">{t("类型", "Type")}</span><span class="fl">{t("文件", "File")}</span><span class="an">{t("Zikaron 证明", "Zikaron record")}</span><span class="r">{t("大小", "Size")}</span></div>{rows}</div>'
             f'<p class="t sums">{t("发布清单:", "Release list: ")}<a href="{url("SHA256SUMS.txt")}">SHA256SUMS.txt</a>{t(" · 第三方许可:", " · Third-party licences: ")}<a href="{url("THIRD-PARTY-LICENSES.txt")}">THIRD-PARTY-LICENSES.txt</a></p>')
    dmg, pkg = pk[0][0], pk[1][0]
    path = t("命令里的路径按你实际下载的位置改。", "Change the paths to wherever you downloaded the files.")
    def sumstep(f): return f'<li><b>{t("核对 SHA-256,结果应与下方「核对」里列出的一致:", "Check the SHA-256; it should match the value listed under Check below:")}</b>{cmd(f"shasum -a 256 ~/Downloads/{f}")}</li>'
    def qstep(f, then): return f'<li><b>{t("在「终端」里去掉下载时系统加上的隔离标记:", "In Terminal, remove the quarantine flag macOS adds to downloads:")}</b>{cmd(f"xattr -d com.apple.quarantine ~/Downloads/{f}")}<p class="t">{then}</p></li>'
    mac_dmg = f"""<ol class="steps">
      {sumstep(dmg)}
      {qstep(dmg, t("这一步在打开 dmg 之前做。", "Do this before you open the dmg."))}
      <li><b>{t(f"打开 dmg,把 {APP}.app 拖进「应用程序」,再打开它。", f"Open the dmg, drag {APP}.app to Applications, then open it.")}</b>
        <p class="t">{t("已经先拖进去了的,改为运行这一条:", "If you dragged the app in first, run this instead:")}</p>{cmd(f"xattr -dr com.apple.quarantine /Applications/{APP}.app")}
        <p class="t">{t(f"命令行 zikaron 在应用包内:{APP}.app/Contents/MacOS/zikaron。", f"The zikaron command line is inside the app bundle: {APP}.app/Contents/MacOS/zikaron.")}</p></li>
    </ol>
    <p class="t path">{path}</p>"""
    mac_pkg = f"""<ol class="steps">
      {sumstep(pkg)}
      {qstep(pkg, t("这一步在双击安装之前做。", "Do this before you double-click it."))}
      <li><b>{t("双击安装。", "Double-click the pkg to install.")}</b>
        <p class="t">{t(f"安装程序把应用装进 /Applications,把命令行装到 /usr/local/bin/zikaron。", f"The installer puts the app in /Applications and the command line at /usr/local/bin/zikaron.")}</p></li>
    </ol>
    <p class="t path">{path}</p>"""
    why = t(f"为什么有这一步:应用由 {SIGNER} 的自签证书签名,在 Apple 公证之外发出。从浏览器下载的文件带着 macOS 的隔离标记,系统会拒绝打开;在较新的 macOS 上,「系统设置 › 隐私与安全性」里的「仍要打开」时常失灵。先核对文件,再去掉隔离标记,就是向系统确认你信任这份核对过的文件。",
            f"Why this step: the app is signed with {SIGNER}’s self-signed certificate and is outside Apple’s notarization. Files downloaded in a browser carry macOS’s quarantine flag, and macOS refuses to open them; on recent macOS, Open Anyway in System Settings › Privacy & Security works only some of the time. Checking the file and then removing the flag tells the system you trust the file you have checked.")
    sums = "".join(f'<div><span class="k">{kind(k)[0]}</span><span class="hash">{h}</span></div>' for f, size, h, k, u in FILES)
    zk = f"""<section data-p="zikaron">
  <div class="hero-dl">
    <div class="rise" style="--k:2">
      <h2 class="pname"><span class="zk">Zikaron</span><span class="d">Desk</span></h2>
      <p class="tag">{t("留证基础设施", "Evidence infrastructure")}</p>
      <p class="meta"><span>{t("版本", "Version")} {VER}</span><a href="{REPO}/releases/tag/v{VER}">{t("发布说明", "Release notes")}</a><a href="{REPO}/releases">{t("历史版本", "All releases")}</a><a href="{REPO}">{t("源码", "Source")}</a></p>
    </div>
    {card}
  </div>
  <div class="sec rise" id="files" style="--k:4"><h2>{t("全部文件", "All files")}</h2>{table}</div>
  <div class="sec rise" id="install" style="--k:5"><h2>{t("安装", "Install")}</h2>
    <div class="seg" role="tablist" aria-label="{t("安装包", "Package")}"><button type="button" role="tab" data-os="dmg" aria-selected="true">.dmg</button><button type="button" role="tab" data-os="pkg" aria-selected="false">.pkg</button></div>
    <div class="osp" data-os="dmg">{mac_dmg}</div>
    <div class="osp" data-os="pkg" hidden>{mac_pkg}</div>
    <p class="why">{why}</p>
    <p class="t">{t('x86_64 的 Linux:0.1.0 从源码构建,见<a href="docs/dev/build.html">开发者指南 · 从源码构建</a>。', 'x86_64 Linux: build 0.1.0 from source; see <a href="docs/dev/build.html">Developer guide · Building from source</a>.')}</p>
  </div>
  <div class="sec rise" id="check" style="--k:6"><h2>{t("核对", "Check")}</h2>
    <div class="vgrid">
      <div class="vmain"><label class="drop" data-verify>{FILEICON}<b>{t("把下载的文件拖到这里", "Drop the downloaded file here")}</b><span>{t("在浏览器里算 SHA-256,与发布清单比对;文件留在这台机器上", "SHA-256 is computed in your browser and compared with the release list; the file stays on this machine")}</span><input type="file"></label>
      <div class="out" id="verify-out" hidden></div>
      <div class="kv sha">{sums}</div></div>
      <div class="vside">
        <div class="kv"><div><span class="k">{t("签名者", "Signer")}</span><span>{SIGNER}</span></div><div><span class="k">{t("证书指纹", "Certificate")}</span><span class="hash">{CERT}</span></div><div><span class="k">{t("有效期至", "Valid until")}</span><span>{CERT_TO}</span></div></div>
        <p class="t">{t(f"应用和 dmg 都由这张证书签名。装好之后在终端里查看,输出里的 Authority 应为 {SIGNER}:", f"Both the app and the dmg are signed with this certificate. Once installed, check in Terminal; the Authority in the output should read {SIGNER}:")}</p>
        {cmd(f'codesign -dvv /Applications/{APP}.app')}
        <p class="t">{t('pkg 以 SHA-256 核对。终端里的更多核对方法,见<a href="docs/dev/verify.html">开发者指南 · 校验</a>。', 'Check the pkg by its SHA-256. For more checks in the terminal, see <a href="docs/dev/verify.html">Developer guide · Checksums</a>.')}</p>
      </div>
    </div>
  </div>
  <div class="sec rise" id="next" style="--k:6"><h2>{t("接下来", "Next")}</h2>
    <div class="tools t3">
      <a class="tool" href="docs/wiki/start.html"><b>{t("上手", "Getting started")}</b><span>Wiki</span><em>{t("打开 →", "Open →")}</em></a>
      <a class="tool" href="docs/dev/verify.html"><b>{t("校验", "Checksums")}</b><span>{t("开发者指南", "Developer guide")}</span><em>{t("打开 →", "Open →")}</em></a>
      <a class="tool" href="{REPO}"><b>{t("源码", "Source")}</b><span>GitHub · kaptonia/zikaron</span><em>{t("打开 →", "Open →")}</em></a>
    </div>
  </div>
</section>"""
    body = f"""<main class="dl" data-scene="dl"><div class="frame-w">
<h1 class="rise" style="--k:0">{t("下载", "Download")}</h1>
{projtabs(f'<div class="proj">{zk}</div><!--/proj-->')}
</div></main>
"""
    return head(f'{t("下载", "Download")} · {t(*TITLE)}', rel, 0, canvas=canvas("download", 0), desc=t("各个客户端的下载、安装与核对。", "Downloads, installation and checks for each client.")) + top(rel, 0, "download") + body + close(0, ("paint.js", "scenes.js", "sand.js", "site.js"))

# ───────── 文档:两个空间,一页一档 ─────────
# 每组:(中文组名, 英文组名, [页名…]);页的标题写在各档档头
# 文档分两层:项目一层的页直接列出(原理按节分成单页,收成可以折叠的一组);每个产品一组,可以折叠,组里可再分几段。以后多一个产品,在 PROJ 与各空间里各加一组
PROJ = {"zikaron": "Zikaron"}
NAV = {
    "wiki": [{"label": ("开始", "Start"), "pages": ["index"]},
             {"fold": "principles", "label": ("原理", "Principles"), "parts": [(None, ["principles"] + [f"principles-{x}" for x in ("cost", "failure", "apart", "now", "truth", "river", "rules", "limits")])]},
             {"proj": "zikaron", "parts": [(None, ["zikaron", "start", "ledger", "anchoring", "grants", "kits", "verify", "evidence", "keys", "data", "alerts"])]},
             {"label": ("参考", "Reference"), "pages": ["faq", "glossary"]}],
    "dev": [{"label": ("开始", "Start"), "pages": ["index"]},
            {"proj": "zikaron", "parts": [(("开发", "Build"), ["verify", "build", "layout", "cli", "law", "contract", "formats", "integrate"]),
                                          (("维护", "Maintain"), ["contributing", "compat", "security", "release", "fork"])]}],
}
def pages(space):
    return [x for g in NAV[space] for x in (g["pages"] if "pages" in g else [y for _, ss in g["parts"] for y in ss])]
def group_of(space, slug):
    for g in NAV[space]:
        if slug in pages_of(g): return Z(PROJ[g["proj"]]) if "proj" in g else t(*g["label"])
def pages_of(g): return g["pages"] if "pages" in g else [y for _, ss in g["parts"] for y in ss]
CHEV = '<svg class="cv" width="14" height="14" viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M6 3.5 10.5 8 6 12.5"/></svg>'
def sidebar(space, slug, labels):
    def link(s): return f'<a href="{s}.html"{" class=on aria-current=page" if s == slug else ""}>{Z(labels[s])}</a>'
    out = ""
    for g in NAV[space]:
        if "pages" in g:
            out += f'<div class="sg"><div class="g">{t(*g["label"])}</div>' + "".join(link(x) for x in g["pages"]) + "</div>"
            continue
        # 可以折叠的一组:每个产品一组;原理一篇也按节分成单页,收成一组
        pj = g.get("proj") or g["fold"]
        name = Z(PROJ[pj]) if "proj" in g else t(*g["label"])
        body = "".join((f'<div class="g2">{t(*lab)}</div>' if lab else "") + "".join(link(x) for x in ss) for lab, ss in g["parts"])
        out += (f'<div class="sp{"" if "proj" in g else " fold"}" data-proj="{pj}"><button class="sp-h" type="button" aria-expanded="true" aria-controls="sp-{pj}">{name}{CHEV}</button>'
                f'<div class="sp-b" id="sp-{pj}"><div class="sp-c"><div class="sp-i">{body}</div></div></div></div>')
    return out
# 按产品分的选项卡:内容里写 <div class="proj"><section data-p="zikaron">…</section></div><!--/proj-->,生成时补上选项卡
def projtabs(body):
    def rep(m):
        inner = m.group(1); ids = re.findall(r'<section data-p="(\w+)">', inner)
        tabs = "".join(f'<button type="button" role="tab" id="t-{x}" aria-controls="p-{x}" aria-selected="{"true" if k == 0 else "false"}" tabindex="{0 if k == 0 else -1}" data-p="{x}">{Z(PROJ[x])}</button>' for k, x in enumerate(ids))
        inner = re.sub(r'<section data-p="(\w+)">', lambda y: f'<section class="pane" role="tabpanel" id="p-{y.group(1)}" aria-labelledby="t-{y.group(1)}" data-p="{y.group(1)}"{"" if y.group(1) == ids[0] else " hidden"}>', inner)
        return f'<div class="proj"><div class="ptabs" role="tablist" aria-label="{t("产品", "Product")}"><span class="pind" aria-hidden="true"></span>{tabs}</div>{inner}</div>'
    return re.sub(r'<div class="proj">(.*?)</div><!--/proj-->', rep, body, flags=re.S)
SPACE = {"wiki": ("Wiki", "Wiki"), "dev": ("开发者指南", "Developer guide")}
VARS = {"REPO": REPO, "CORE": CORE, "KIT": KIT, "CODEHASH": CODEHASH, "VER": VER, "FILE0": FILES[0][0], "MAINNET": MAINNET[0], "SEPOLIA": SEPOLIA[0],
        "Z": '<b class="zk">Zikaron</b>'}

def load(space, slug):
    raw = (HERE / "content" / space / f"{slug}.{L}.html").read_text(encoding="utf-8")
    m = re.match(r"<!--(.*?)-->\s*", raw, re.S)
    meta = {k.strip(): v.strip() for k, v in (ln.split(":", 1) for ln in m.group(1).strip().splitlines())}
    body = raw[m.end():]
    body = re.sub(r"\{\{(\w+)\}\}", lambda x: VARS[x.group(1)], body)
    body = re.sub(r"\{\{code:\n(.*?)\n\}\}", lambda x: cmd(x.group(1), True), body, flags=re.S)
    body = re.sub(r"\{\{cmd:(.*?)\}\}", lambda x: cmd(x.group(1)), body, flags=re.S)
    assert "{{" not in body, (space, slug, L, body[body.index("{{"):][:60])
    return meta, projtabs(body)

def docpage(space, slug):
    depth, rel = 2, f"docs/{space}/{slug}.html"
    meta, inner = load(space, slug)
    # 原理各页:说明屏的画已经画好的(ill/principles/<名>.jpg),在这一屏末尾挂一个画框;还没画的一屏留白。
    # 只放画的一屏(全篇最后的蒲公英)不挂画框,画铺满全屏(清楚一些的 <名>.solo.jpg)
    def art(m):
        solo = "solo" in m.group(2)
        f = f"ill/principles/{m.group(3)}{'.solo' if solo else ''}.jpg"
        if not (HERE / f).exists(): return m.group(0)
        # 画的地址带内容指纹:换了画就换地址,浏览器不会沿用旧图
        if solo: return m.group(1) + f'<img class="pbg" src="{root(depth)}{ver(f)}" alt="" aria-hidden="true" decoding="async"></section>'
        return m.group(1) + f'<figure class="fr"><span class="fr-m"><img src="{root(depth)}{ver(f)}" alt="" loading="lazy" decoding="async"></span></figure></section>'
    inner = re.sub(r'(<section class="ps pg([^"]*)" data-art="(\w+)">.*?)</section>', art, inner, flags=re.S)
    order = pages(space)
    metas = {x: load(space, x)[0] for x in order}
    titles = {x: m["title"] for x, m in metas.items()}
    labels = {x: m.get("nav", m["title"]) for x, m in metas.items()}
    # 本页目录:选项卡里的小标题带上所属产品,换产品时目录跟着换
    panes = [(m.start(), m.end(), m.group(1)) for m in re.finditer(r'<section class="pane"[^>]*data-p="(\w+)"[^>]*>.*?</section>', inner, re.S)]
    # 目录取各节小标题;原理各页右侧不放目录,那一栏留给画框(各小节的 data-t 只作展签)
    toc = [(m.group(1), m.group(2), next((p for a, b, p in panes if a < m.start() < b), None)) for m in re.finditer(r'<h2 id="([^"]+)">(.*?)</h2>', inner)]
    here = t("本页", "On this page")
    # 目录总占着右边一栏(小节不足两个时是空的),连读时换页只换里面的内容
    toc_html = (f'<nav class="toc" aria-label="{here}">' + ((f'<div class="g">{here}</div>'
                + "".join(f'<a href="#{i}"{f" data-p={p}" if p else ""}{" hidden" if p and p != panes[0][2] else ""}>{plain(h)}</a>' for i, h, p in toc)) if len(toc) > 1 else "") + '</nav>')
    i = order.index(slug)
    prev, nxt = (order[i - 1] if i else None), (order[i + 1] if i + 1 < len(order) else None)
    pn = ('<div class="pn">' + (f'<a href="{prev}.html"><span>{t("上一页", "Previous")}</span>{Z(titles[prev])}</a>' if prev else '<span></span>')
          + (f'<a class="nx" href="{nxt}.html"><span>{t("下一页", "Next")}</span>{Z(titles[nxt])}</a>' if nxt else '') + '</div>')
    h = home(depth)
    tabs = f'<div class="dtabs"><a href="../wiki/index.html"{" class=on" if space == "wiki" else ""}>Wiki</a><a href="../dev/index.html"{" class=on" if space == "dev" else ""}>{DEV()}</a></div>'
    lede = re.search(r'<p class="lede">(.*?)</p>', inner, re.S)
    # 折叠过的产品组在画出来之前就收起,不闪;当前页所在的一组总是展开
    keep = ("<script>(function(){try{var s=JSON.parse(localStorage.getItem('side:" + space + "')||'{}');"
            "document.querySelectorAll('.side .sp').forEach(function(g){if(s[g.getAttribute('data-proj')]===0&&!g.querySelector('a.on')){g.classList.add('closed');g.firstChild.setAttribute('aria-expanded','false')}})}catch(e){}})()</script>")
    # 从文档以外的页进来(首页、下载页、直接打开):没有页面过渡,正文照文档页之间切换的样子从下方淡入浮上,侧栏与目录淡入。要在第一次绘制之前挂上,所以放在页头
    # 原理各页一屏一屏淡入:字先藏着,由 site.js 接手;脚本三秒还没来,照常显示
    enter = ("<script>(function(){var R=document.documentElement;R.classList.add('enter','ps-js');setTimeout(function(){if(!R.classList.contains('ps-live'))R.classList.remove('ps-js')},3000);"
             "addEventListener('pagereveal',function(e){if(e.viewTransition)R.classList.remove('enter')})})()</script>")
    # 文档页之间的跳转走浏览器的页面过渡(两头都要开这个开关):页眉与侧栏不动,正文淡出淡入
    return (head(f'{plain(meta["title"])} · {t(*SPACE[space])}', rel, depth, "doc-page", desc=lede.group(1) if lede else None).replace("</head>", "<style>@view-transition{navigation:auto}</style>" + enter + "</head>", 1)
            + f"""<header class="top dtop"><div class="frame-w">
  <div class="dleft"><a class="handle" href="{h}index.html">@kaptonia</a>{tabs}</div>
  <nav class="nav"><a href="{h}index.html">{t("回到首页", "Back to home")}</a>{lang_link(rel, depth)}</nav>
</div></header>
<div class="dwrap"><aside class="side" data-space="{space}"><button class="side-t" type="button" aria-expanded="false" data-side><span>{t("目录", "Contents")}</span><b>{Z(labels[slug])}</b>{CHEV}</button><div class="side-in"><div class="side-ii">{sidebar(space, slug, labels)}</div></div></aside>{keep}
<div class="stream"><article class="art{' pa' if 'class="pr"' in inner else ''}" data-slug="{slug}"{f' data-prev="{prev}.html"' if prev else ""}{f' data-next="{nxt}.html"' if nxt else ""}><div class="kick">{t(*SPACE[space])} · {group_of(space, slug)}</div><h1>{Z(meta["title"])}</h1>{inner}{pn}</article></div>{toc_html}</div>
""" + close(depth, ("site.js",)))

# ───────── 站上通用的小脚本(两语的话都在里面,按页面的 lang 取) ─────────
JS = """(function(){
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
"""

def zh(s):
    """中文页:挨着汉字的半角标点与括号换成全角;代码、脚本、样式里的不动"""
    FULL = {",": "，", ":": "：", ";": "；", "?": "？", "!": "！"}
    def fix(x):
        x = re.sub(r'(?<=[一-鿿」』》）])([,:;?!])', lambda m: FULL[m.group(1)], x)
        x = re.sub(r'([,:;?!])(?=[一-鿿「『《（“])', lambda m: FULL[m.group(1)], x)
        return x.replace("(", "（").replace(")", "）")
    out, skip = [], 0
    for part in re.split(r"(<[^>]+>)", s):
        if part.startswith("<"):
            if re.match(r"<(code|script|style|pre)\b", part): skip += 1
            if re.match(r"</(code|script|style|pre)>", part): skip -= 1
            out.append(re.sub(r'((?:aria-label|title|content)=")([^"]*)', lambda m: m.group(1) + fix(m.group(2)), part))
        else:
            out.append(part if skip else fix(part))
    return "".join(out)

def write(rel, page):
    p = HERE / ("en/" + rel if L == "en" else rel)
    p.parent.mkdir(parents=True, exist_ok=True)
    p.write_text(zh(page) if L == "zh" else page, encoding="utf-8")

def lost():
    """找不到的页:两语各一句,各给一条回去的路。GitHub Pages 对任何找不到的地址都回这一页,所以链接用绝对路径"""
    global L
    L = "zh"
    return (head("404 · " + TITLE[0], "index.html", 0).replace('href="style.css', f'href="{BASE}style.css').replace('hreflang="en" href="en/index.html"', f'hreflang="en" href="{BASE}en/index.html"')
            + f"""<main class="lost"><div class="frame-w">
<span class="pno">404</span>
<h1>这一页走散了</h1>
<p>地址可能已经更换。<a href="{BASE}index.html">回到首页</a>,或去 <a href="{BASE}docs/wiki/index.html">Wiki</a> 找找看。</p>
<h1 lang="en">This page has wandered off</h1>
<p lang="en">The address may have changed. <a href="{BASE}en/index.html">Return home</a>, or look for it in the <a href="{BASE}en/docs/wiki/index.html">Wiki</a>.</p>
</div></main>
</body>
</html>
""")

if __name__ == "__main__":
    (HERE / "site.js").write_text(JS, encoding="utf-8")
    for L in LANGS:
        write("index.html", index())
        write("zikaron.html", zikaron())
        write("download.html", download())
        for space in NAV:
            for slug in pages(space):
                write(f"docs/{space}/{slug}.html", docpage(space, slug))
    (HERE / "404.html").write_text(zh(lost()), encoding="utf-8")
    print("ok")
