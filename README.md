# 怎么出页面

站是静态文件,由 `gen.py` 生成。中文页落在根下,英文页落在 `en/` 下,两边路径逐一对应。

```sh
python3 gen.py
```

改过任何 `.js` 或 `style.css` 之后重跑一遍:页面引用资源时带内容指纹,文件变了地址才换。

## 文字住在哪里

| 内容 | 位置 |
|---|---|
| 首页、Zikaron 页 | `gen.py` 里的 `HERO`、`PAGES`、`ZPAGES`、`SCRIPTURE`、`GLOSS`、`FEATS`,每条一对(中文,英文) |
| 下载页 | `gen.py` 的 `download()`;每个产品一个选项卡,文件表取 `FILES` |
| Wiki | `content/wiki/<名>.zh.html` 与 `<名>.en.html` |
| 开发者指南 | `content/dev/<名>.zh.html` 与 `<名>.en.html` |
| 功能四块界面里的字 | `desk.js` 里的 `T('中文', 'English')` |
| 下载页校验的提示 | `gen.py` 里的 `JS` |

文档页一页一档。档头一段注释写标题,其下是正文的 HTML:

```html
<!--
title: 账本与条目
-->
<p class="lede">……</p>
<h2 id="entry">……</h2>
```

两语的档逐段对应,`h2` 的 `id` 两边相同。侧栏的分组与次序在 `gen.py` 的 `NAV` 里。

正文里可用的记号:

| 记号 | 出来的东西 |
|---|---|
| `{{Z}}` | 字标 Zikaron |
| `{{REPO}}`、`{{CORE}}`、`{{KIT}}`、`{{CODEHASH}}`、`{{VER}}`、`{{FILE0}}` | 仓库地址、两部法的摘要、合约代码哈希、版本号、第一个发布包的文件名 |
| `{{cmd:一行命令}}` | 带复制键的一行命令 |
| `{{code:` 换行 多行 换行 `}}` | 带复制键的多行代码 |

中文档里的标点写半角即可,生成时挨着汉字的逗号、冒号、分号、问号、叹号与括号换成全角;代码里的原样保留。

## 加一页

1. 在 `content/wiki/` 或 `content/dev/` 下写 `<名>.zh.html` 与 `<名>.en.html`。
2. 把 `<名>` 加进 `gen.py` 的 `NAV`。
3. 跑 `python3 gen.py`。

## 环境变量

| 变量 | 用途 |
|---|---|
| `SITE_BASE` | 站在域名下的根路径,默认 `/`;只有 `404.html` 用它 |
