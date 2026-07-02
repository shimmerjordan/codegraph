<div align="center">

# CodeGraph

[English](README.md) · **简体中文**

## 🎉 1.0 已发布!

已经安装过?运行 `codegraph upgrade`

在 X 上关注 [@getcodegraph](https://x.com/getcodegraph) 获取更新。

### 用语义化代码智能为 Claude Code、Cursor、Codex、OpenCode、Hermes Agent、Gemini、Antigravity 与 Kiro 全面提速

**精准上下文 · 更少工具调用 · 更快得到答案 · 100% 本地**

### [文档与官网 →](https://colbymchenry.github.io/codegraph/)

[![npm version](https://img.shields.io/npm/v/@colbymchenry/codegraph.svg)](https://www.npmjs.com/package/@colbymchenry/codegraph)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![Self-contained](https://img.shields.io/badge/Node.js-bundled%20%C2%B7%20none%20required-brightgreen.svg)](https://nodejs.org/)

[![Windows](https://img.shields.io/badge/Windows-supported-blue.svg)](#支持的平台)
[![macOS](https://img.shields.io/badge/macOS-supported-blue.svg)](#支持的平台)
[![Linux](https://img.shields.io/badge/Linux-supported-blue.svg)](#支持的平台)

[![Claude Code](https://img.shields.io/badge/Claude_Code-supported-blueviolet.svg)](#支持的-agent)
[![Cursor](https://img.shields.io/badge/Cursor-supported-blueviolet.svg)](#支持的-agent)
[![Codex](https://img.shields.io/badge/Codex-supported-blueviolet.svg)](#支持的-agent)
[![opencode](https://img.shields.io/badge/opencode-supported-blueviolet.svg)](#支持的-agent)
[![Hermes Agent](https://img.shields.io/badge/Hermes_Agent-supported-blueviolet.svg)](#支持的-agent)
[![Gemini](https://img.shields.io/badge/Gemini-supported-blueviolet.svg)](#支持的-agent)
[![Antigravity](https://img.shields.io/badge/Antigravity-supported-blueviolet.svg)](#支持的-agent)
[![Kiro](https://img.shields.io/badge/Kiro-supported-blueviolet.svg)](#支持的-agent)

<br>

**CodeGraph 平台即将到来** —— 对每一个 PR,你都能确切知道该测什么、什么可能会坏、哪些流程受影响、以及业务逻辑是否被破坏。

<a href="https://getcodegraph.com"><img alt="Join the waitlist for early beta access" src="https://raw.githubusercontent.com/colbymchenry/codegraph/main/assets/waitlist.svg?v=2" height="52"></a>

<sub>获取托管产品的 <b>早期 beta 访问权限</b> · <a href="https://getcodegraph.com">getcodegraph.com</a></sub>

</div>

## 开始使用

### 1. 安装 CLI

**无需 Node.js** —— 一条命令即可为你的操作系统抓取对应的构建:

```bash
# macOS / Linux
curl -fsSL https://raw.githubusercontent.com/colbymchenry/codegraph/main/install.sh | sh

# Windows (PowerShell)
irm https://raw.githubusercontent.com/colbymchenry/codegraph/main/install.ps1 | iex
```

<details>
<summary><b>已经装了 Node?那就用 npm(任意版本均可)</b></summary>

```bash
npm i -g @colbymchenry/codegraph
```

<sub>CodeGraph 自带运行时 —— 无需编译、无原生构建,在任何环境下行为一致。安装器会把 `codegraph` 放到你的 PATH 上,但**不会改动你当前的 shell** —— 请在下一步前新开一个终端,让命令能被解析到。</sub>

<sub>**随时升级**:`codegraph upgrade` —— 它会检测你的安装方式(bundle、npm 或 npx)并就地更新。加 `--check` 查看是否有可用更新,或用 `codegraph upgrade <version>` 固定到某个版本。</sub>

</details>

### 2. 接入你的 agent

在**一个新终端**里,运行安装器把 CodeGraph 连接到你使用的 agent:

```bash
codegraph install
```

<sub>会检测并自动配置 Claude Code、Cursor、Codex CLI、opencode、Hermes Agent、Gemini CLI、Antigravity IDE 与 Kiro —— 为每一个接入 CodeGraph 的 MCP 服务。**正是这一步把 CodeGraph 连到你的 agent;** 第 1 步安装 CLI 本身并不会自动完成它。它只接入你的 agent —— **不会**索引任何代码;构建每个项目的图谱是第 3 步里单独的 `codegraph init`。(捷径:`npx @colbymchenry/codegraph` 会一步下载并运行它。)</sub>

### 3. 初始化每个项目

```bash
cd your-project
codegraph init
```

<sub>`codegraph init` 会创建本地 `.codegraph/` 目录,并在同一步里构建完整图谱 —— 一条命令,搞定。</sub>

<div align="center">

![1_C_VYnhpys0UHrOuOgpgoyw](https://github.com/user-attachments/assets/f168182f-4d9a-44e0-94d7-08d018cc8a3a)

</div>

### 4. 无需再同步!

自动同步默认开启。CodeGraph 会监视项目,并在每次文件变更时更新图谱 —— 无论是你的 agent 在改代码,还是你自己新增、修改、删除文件。**索引永不过时,也没有任何东西需要重跑。**

### 卸载

改主意了?一条命令即可从它配置过的每个 agent 上移除 CodeGraph:

```bash
codegraph uninstall
```

<sub>它是安装器的逆操作 —— 从每个已配置的 agent 上剥除 CodeGraph 的 MCP 服务配置、说明与权限。你的项目索引(`.codegraph/`)会原样保留;要按项目移除请用 `codegraph uninit`。用 `--target` 从指定 agent 移除,或用 `--yes` 非交互式运行。</sub>

---

## 为什么用 CodeGraph?

当一个 AI agent 需要理解代码 —— 无论是回答问题还是做改动 —— 它是用最慢的方式去发现结构的:grep、glob、Read,一个文件一个文件地读,手动重建调用路径与依赖关系。在真正开始干活之前,这已经是一大堆工具调用和往返了。

**CodeGraph 一次调用就把 agent 所需的确切代码交到它手上。** 它是一张预先构建好的知识图谱,涵盖你代码库里的每一个符号、调用边和依赖关系 —— 于是 agent 不再爬文件,而是问一个问题就拿回相关源码、这些符号之间的调用路径(包括 grep 追不到的动态派发跳转),以及某处改动的影响半径。**精准上下文,而非逐文件搜索** —— 这意味着在任何代码库上(无论大小)都是更少的工具调用、更快的答案。

<img width="1536" height="1024" alt="token-cost-savings-scale" src="https://github.com/user-attachments/assets/eb74a11a-a3ab-4b01-80a6-19f78352ae8e" />

> **关于成本的说明:** CodeGraph 在*每一个*代码库上的胜势都是精准与速度 —— 更少工具调用、更快答案。它同样会削减 token 与金钱成本,但这部分节省是**随规模变化**的:在中等规模代码库上又小又不稳定,只有当仓库大而错综复杂时才显著 —— 到了 Google 或 Microsoft 级别的 monorepo 规模,再乘以整个团队每天的 agent 使用量 —— 才会累积成真正的开支项。在一个 500 文件的项目上,为速度而采用 CodeGraph;成本节省会在代码库(和团队)变大时才显现出来。

### 基准测试结果

在跨 7 种语言的 **7 个真实开源代码库** 上测试,对比一个 agent(Claude Code,无头模式)在**有**与**没有** CodeGraph 两种情况下回答同一个架构问题,取**每组 4 次运行的中位数**。_已在 Opus 4.8 上重新验证(2026-06-02),基于当前构建(以 `codegraph_explore` 为主工具)。_

> **普适的胜势 —— 每个仓库、每种规模:工具调用减少 58% · 快 22% · 文件读取砍到接近零。**

可靠且普适的收益是**精准上下文与速度**:CodeGraph 把 agent 的 grep/find/Read 爬取坍缩成几次直接查询 —— 即便你问的方法埋在一个几千行的文件里,也能精准返回 —— 于是它以**接近零的文件读取**给出答案,而没有 CodeGraph 的 agent 则把预算花在了探索上。**Tokens** 与 **Cost** 两列也是真实的,但 —— 如上所述 —— 它们**随规模变化**:单次查询又小又不稳定,只有在大代码库、高频使用的规模下才累积成真金白银。

| 代码库 | 语言 | 工具调用 | 时间 | 文件读取 | Tokens | 成本 |
|----------|----------|------------|------|------------|--------|------|
| **VS Code** | TypeScript · ~10k 文件 | 少 81% | 快 11% | 0 vs 9 | 少 64% | 省 18% |
| **Excalidraw** | TypeScript · ~640 | 少 40% | 快 27% | 0 vs 7 | 少 25% | 持平 |
| **Django** | Python · ~3k | 少 77% | 快 13% | 0 vs 9 | 少 60% | 省 8% |
| **Tokio** | Rust · ~790 | 少 57% | 快 18% | 0 vs 8 | 少 38% | 持平 |
| **OkHttp** | Java · ~645 | 少 50% | 快 31% | 0 vs 4 | 少 54% | 省 25% |
| **Gin** | Go · ~110 | 少 44% | 快 24% | 1 vs 6 | 少 23% | 省 19% |
| **Alamofire** | Swift · ~110 | 少 58% | 快 33% | 0 vs 9 | 少 64% | 省 40% |

<sub>**文件读取** = agent 在**有** vs **没有** CodeGraph 时打开文件数的中位数 —— 精准上下文的胜势浓缩在这一列。**Tokens** 与 **Cost** 是同样的有-无差值;它们是方向性的(每次运行都会浮动),且单次查询的绝对量很小 —— 所以只有在规模上才会成为开支项。`codegraph_explore` 还会把冗余的、可互换的实现坍缩成签名,因此响应的大小是按*答案*而非文件数量来衡量的。</sub>

<details>
<summary><strong>各仓库明细 —— 有 vs 没有(4 次中位数)</strong></summary>

**VS Code** · ~10k 文件
| 指标 | 有 cg | 没有 cg | Δ |
|---|---|---|---|
| 时间 | 1m 59s | 2m 13s | 快 11% |
| 文件读取 | 0 | 9 | −9 |
| Grep/Bash | 0 | 11 | −11 |
| 工具调用 | 4 | 21 | 少 81% |
| 总 token | 640k | 1.79M | 少 64% |
| 成本 | $0.68 | $0.83 | 省 18% |

**Excalidraw** · ~640 文件
| 指标 | 有 cg | 没有 cg | Δ |
|---|---|---|---|
| 时间 | 1m 32s | 2m 6s | 快 27% |
| 文件读取 | 0 | 7 | −7 |
| Grep/Bash | 1 | 8 | −7 |
| 工具调用 | 9 | 15 | 少 40% |
| 总 token | 1.27M | 1.69M | 少 25% |
| 成本 | $0.78 | $0.78 | 持平 |

**Django** · ~3k 文件
| 指标 | 有 cg | 没有 cg | Δ |
|---|---|---|---|
| 时间 | 1m 43s | 1m 58s | 快 13% |
| 文件读取 | 0 | 9 | −9 |
| Grep/Bash | 0 | 5 | −5 |
| 工具调用 | 3 | 13 | 少 77% |
| 总 token | 559k | 1.41M | 少 60% |
| 成本 | $0.57 | $0.62 | 省 8% |

**Tokio** · ~790 文件
| 指标 | 有 cg | 没有 cg | Δ |
|---|---|---|---|
| 时间 | 1m 55s | 2m 20s | 快 18% |
| 文件读取 | 0 | 8 | −8 |
| Grep/Bash | 0 | 6 | −6 |
| 工具调用 | 6 | 14 | 少 57% |
| 总 token | 1.08M | 1.73M | 少 38% |
| 成本 | $0.82 | $0.82 | 持平 |

**OkHttp** · ~645 文件
| 指标 | 有 cg | 没有 cg | Δ |
|---|---|---|---|
| 时间 | 1m 1s | 1m 29s | 快 31% |
| 文件读取 | 0 | 4 | −4 |
| Grep/Bash | 2 | 6 | −4 |
| 工具调用 | 5 | 10 | 少 50% |
| 总 token | 502k | 1.10M | 少 54% |
| 成本 | $0.41 | $0.55 | 省 25% |

**Gin** · ~110 文件
| 指标 | 有 cg | 没有 cg | Δ |
|---|---|---|---|
| 时间 | 1m 14s | 1m 37s | 快 24% |
| 文件读取 | 1 | 6 | −5 |
| Grep/Bash | 1 | 2 | −1 |
| 工具调用 | 5 | 9 | 少 44% |
| 总 token | 651k | 847k | 少 23% |
| 成本 | $0.46 | $0.57 | 省 19% |

**Alamofire** · ~110 文件
| 指标 | 有 cg | 没有 cg | Δ |
|---|---|---|---|
| 时间 | 1m 35s | 2m 21s | 快 33% |
| 文件读取 | 0 | 9 | −9 |
| Grep/Bash | 0 | 4 | −4 |
| 工具调用 | 5 | 12 | 少 58% |
| 总 token | 766k | 2.10M | 少 64% |
| 成本 | $0.57 | $0.95 | 省 40% |

</details>

<details>
<summary><strong>完整基准测试细节</strong></summary>

**方法论。** 每一组都是 `claude -p`(Claude Opus 4.8)以无头方式针对仓库运行,并带 `--strict-mcp-config`:**有** = 启用 CodeGraph 的 MCP 服务,**没有** = 空的 MCP 配置。内置的 Read/Grep/Bash 对两组都可用。每个仓库同一个问题,**每组 4 次运行,报告中位数**。成本 = 该次运行的 `total_cost_usd`;Tokens = 处理的总 token(输入含缓存 + 输出);时间 = 墙钟时间;工具调用 = 每一次工具调用,包括模型派生的任何子 agent 内部的调用。仓库以 `--depth 1` 克隆,并由为其服务的同一个 CodeGraph 构建来索引。已于 2026-06-02 在当前构建上重新验证。这些数字低于此前 Opus 4.7 的验证 —— 这不是 CodeGraph 的退化,而是更强的原生基线:Opus 4.8 会在主线程上高效地 grep/read,而不是散开成大规模的 Explore 子 agent 扫描,所以没有 CodeGraph 那一组比过去更精简了。各仓库数字会随 "没有" 那组挣扎程度的不同而每次浮动(4 次中位数会平滑它,但尾部依旧存在 —— 例如 Django 的 "没有" 组在某一批次中曾冲到 $2.71 / 14m)。

**查询:**
| 代码库 | 查询 |
|----------|-------|
| VS Code | "How does the extension host communicate with the main process?" |
| Excalidraw | "How does Excalidraw render and update canvas elements?" |
| Django | "How does Django's ORM build and execute a query from a QuerySet?" |
| Tokio | "How does tokio schedule and run async tasks on its runtime?" |
| OkHttp | "How does OkHttp process a request through its interceptor chain?" |
| Gin | "How does gin route requests through its middleware chain?" |
| Alamofire | "How does Alamofire build, send, and validate a request?" |

**CodeGraph 为何取胜:** 有索引可用时,agent 直接作答 —— 通常一次 `codegraph_explore` 就返回相关源码 —— 然后停下,往往一次文件读取都没有。没有它时,agent 会把大部分预算花在探索(find/ls/grep)上,才读到正确的代码。CodeGraph 只在被*直接*查询时才有用,所以它的说明会引导 agent 直接作答,而不是把探索委派给读文件的子 agent —— 否则子 agent 照样会去读文件,CodeGraph 反而成了额外开销。

</details>

---

## 核心特性

| | |
|---|---|
| **精准上下文** | 一次工具调用即返回入口点、相关符号和代码片段 —— 无需缓慢的逐文件探索 |
| **全文搜索** | 由 FTS5 驱动,在整个代码库里按名称即时找到代码 |
| **影响分析** | 在改动前追踪任意符号的调用者、被调者以及完整的影响半径 |
| **始终新鲜** | 文件监视器使用原生操作系统事件(FSEvents/inotify/ReadDirectoryChangesW)配合去抖自动同步 —— 图谱随你编码保持最新,零配置 |
| **20+ 种语言** | TypeScript、JavaScript、Python、Go、Rust、Java、C#、PHP、Ruby、C、C++、Objective-C、Swift、Kotlin、Scala、Dart、Lua、Luau、R、Svelte、Vue、Astro、Liquid、Pascal/Delphi |
| **框架感知路由** | 识别 Web 框架的路由文件,把 URL 模式跨 17 个框架关联到它们的处理器 |
| **混合 iOS / React Native / Expo** | 补全静态解析漏掉的跨语言流程:Swift ↔ ObjC 桥接、React Native 旧版 bridge + TurboModules + Fabric 视图组件、原生 → JS 事件发射器、Expo Modules |
| **100% 本地** | 没有数据离开你的机器。无 API key。无外部服务。仅一个 SQLite 数据库 |

<details>
<summary><strong>自动同步如何工作 —— 以及你为什么无需手动运行 <code>codegraph sync</code></strong></summary>

当你的 agent(Claude Code、Cursor、Codex、opencode)启动 `codegraph serve --mcp` 时,三层机制让索引与你的代码保持同步 —— 并确保在一次编辑与下一次同步之间的短暂窗口里,agent 绝不会静默地拿到错误答案:

1. **带去抖的文件监视自动同步。** 原生的 FSEvents / inotify / ReadDirectoryChangesW 监视器捕获每一次源文件的创建/修改/删除,并在一个去抖窗口后触发重新索引(默认 `2000ms`,可通过 `CODEGRAPH_WATCH_DEBOUNCE_MS` 调节,钳制在 `[100ms, 60s]`)。密集的编辑会坍缩成一次同步。

2. **按文件的陈旧提示横幅。** 在短暂的去抖窗口期间,若 MCP 工具的响应会引用一个仍待处理的文件,响应前会加上一个 `⚠️` 横幅点名该文件,并告诉 agent 直接去 `Read` 它。未被响应引用的待处理文件则以一个小页脚的形式出现。无论哪种,agent 都会得到明确信号 —— 已用 Claude Code 验证,agent 会在打开文件前明确说 "Reading the file directly for the live content"。

3. **连接时补齐。** 当 MCP 服务(重新)连接时,codegraph 会在回答第一个查询前,对工作树做一次快速的 `(size, mtime)` + 内容哈希核对 —— 于是那些在没有 MCP 服务运行期间做出的编辑(从终端 `git pull`、来自其他编辑器的改动、上一个已退出的 agent 会话)都会在下一个会话的首次工具调用时被吸收进来。

```
agent 写入 src/Widget.ts
  → 监视器触发(<100ms)
  → 去抖(默认 2s)
  → 同步;Widget.ts 进入索引
  → agent 的下一次查询就能看到它
```

**随时验证**:用 `codegraph status`(CLI)。如果有待处理项,你会看到一个 `### Pending sync:` 小节,点名相关文件及其编辑时长。

少数几种手动 `codegraph sync` 才有意义的情形:监视器被禁用(沙箱环境,或 `CODEGRAPH_NO_DAEMON=1`),或者你在 agent 会话之外脚本化地访问索引,并希望在脚本开头做一次预同步。

→ 完整深入见 [指南 → 索引一个项目](https://colbymchenry.github.io/codegraph/guides/indexing/#stay-fresh-automatically)。

</details>

---

## 框架感知路由

CodeGraph 会检测 Web 框架的路由文件,并发出以 `references` 边连接到其处理器类或函数的 `route` 节点。此后查询某个视图/控制器的调用者,就会浮现出绑定它的 URL 模式。

| 框架 | 识别的形态 |
|---|---|
| **Django** | `urls.py` 中的 `path()`、`re_path()`、`url()`、`include()`(CBV `.as_view()`、点分路径) |
| **Flask** | `@app.route('/path', methods=[...])`、blueprint 路由 |
| **FastAPI** | `@app.get(...)`、`@router.post(...)`,所有标准方法 |
| **Express** | `app.get(...)`、`router.post(...)` 及中间件链 |
| **NestJS** | `@Controller` + `@Get/@Post/...`、GraphQL `@Resolver` + `@Query/@Mutation`、`@MessagePattern`/`@EventPattern`、`@SubscribeMessage` |
| **Laravel** | `Route::get()`、`Route::resource()`、`Controller@action`、元组语法 |
| **Drupal** | `*.routing.yml` 路由(`_controller`、`_form`、实体处理器);`.module`/`.theme`/`.install`/`.inc` 中的 `hook_*` 实现 |
| **Rails** | `get '/x', to: 'users#index'`、hash-rocket `=>` 语法 |
| **Spring** | 方法上的 `@GetMapping`、`@PostMapping`、`@RequestMapping` |
| **Play** | `conf/routes` 中的 `GET`/`POST`/… 动词路由 → `Controller.method` action(Scala + Java) |
| **Gin / chi / gorilla / mux** | `r.GET(...)`、`router.HandleFunc(...)` |
| **Axum / actix / Rocket** | `.route("/x", get(handler))` |
| **ASP.NET** | action 方法上的 `[HttpGet("/x")]` 特性 |
| **Vapor** | `app.get("x", use: handler)` |
| **React Router** / **SvelteKit** | 路由组件节点 |
| **Vue Router** / **Nuxt** | `pages/` 基于文件的路由、`server/api/` 端点、路由中间件 |
| **Astro** | `src/pages/` 基于文件的路由(`.astro` 页面 + `.ts` 端点,`[param]`/`[...rest]` 语法) |

---

## 混合 iOS / React Native / Expo 桥接

真实的 iOS 与 React Native 代码库横跨多种语言 —— 一个 Swift 调用者调用了被自动桥接的 Objective-C selector,一个 JS 文件通过 React Native bridge 调入原生模块,一个 JSX 组件委托给一个原生视图管理器。静态 tree-sitter 抽取会在每个语言边界停下。CodeGraph 把它们桥接起来,让 `codegraph_explore` 跨越这道缝隙把流程端到端地连起来 —— 调用路径与影响半径跨过边界,而不是在边界处止步。

| 边界 | JS / Swift 侧 | 原生侧 | 方式 |
|---|---|---|---|
| **Swift → ObjC** | Swift `obj.foo(bar:)` | ObjC selector `-fooWithBar:` | `@objc` 自动桥接规则(含 init/property/protocol 形式)+ Cocoa 介词前缀(`With`/`For`/`By`/`In`/`On`/`At`/…) |
| **ObjC → Swift** | ObjC `[obj fooWithBar:]` | Swift `@objc func foo(bar:)` | 反向桥接名候选;从源码校验 `@objc` 暴露 |
| **React Native 旧版 bridge** | JS `NativeModules.X.fn(...)` | ObjC `RCT_EXPORT_METHOD` / `RCT_REMAP_METHOD` · Java/Kotlin `@ReactMethod` | 解析宏/注解声明,构建 JS 名 → 原生方法的映射 |
| **React Native TurboModules** | JS `import M from './NativeM'; M.fn(...)` | 匹配 Codegen 规范的原生实现 | 把 `Native<X>.ts` 规范接口当作基准事实 |
| **RN 原生 → JS 事件** | JS `new NativeEventEmitter(...).addListener('e', cb)` | ObjC `[self sendEventWithName:@"e" body:...]` · Swift `sendEvent(withName: "e", ...)` · Java/Kotlin `.emit("e", ...)` | 以字面事件名为键,合成跨语言事件通道 |
| **Expo Modules** | JS `requireNativeModule('X').fn(...)` | Swift / Kotlin `Module { Name("X"); AsyncFunction("fn") { ... } }` | 解析 Expo DSL 字面量;合成的方法节点经由既有的名称匹配来解析 |
| **Fabric 视图组件** | JSX `<MyView prop={v}/>` | TS Codegen 规范 + 原生实现类 | 规范 → `component` 节点;基于约定的名称+后缀查找(`View`/`ComponentView`/`Manager`/`ViewManager`)桥接到原生 |
| **旧版 Paper 视图管理器** | JSX `<MyView prop={v}/>` | ObjC `RCT_EXPORT_VIEW_PROPERTY` · Java/Kotlin `@ReactProp` | 与 Fabric 相同 —— Paper 时代的声明同样产生 `component` + `property` 节点 |

**已在真实代码库上验证**(每种桥接都用小 + 中 + 大三种):

| 桥接 | 小 | 中 | 大 |
|---|---|---|---|
| Swift ↔ ObjC | [Charts](https://github.com/danielgindi/Charts) | [realm-swift](https://github.com/realm/realm-swift) | [Wikipedia-iOS](https://github.com/wikimedia/wikipedia-ios) |
| RN 旧版 bridge | [AsyncStorage](https://github.com/react-native-async-storage/async-storage) | [react-native-svg](https://github.com/software-mansion/react-native-svg) | [react-native-firebase](https://github.com/invertase/react-native-firebase) |
| RN 原生 → JS 事件 | [RNGeolocation](https://github.com/Agontuk/react-native-geolocation-service) | — | react-native-firebase |
| Expo Modules | expo-haptics | expo-camera | expo SDK 扫描(7 个包) |
| Fabric / Paper 视图 | [react-native-segmented-control](https://github.com/react-native-segmented-control/segmented-control) | [react-native-screens](https://github.com/software-mansion/react-native-screens) | [react-native-skia](https://github.com/Shopify/react-native-skia) |

每种桥接发出的边都被打上 `provenance:'heuristic'` 标签,并把 `metadata.synthesizedBy:` 设为一个稳定的通道名(如 `swift-objc-bridge`、`rn-event-channel`、`fabric-native-impl`、`expo-module-extract`),这样 agent 一眼就能看出某个跳转是怎么进入图谱的。

---

## 快速开始

### 1. 运行安装器

```bash
npx @colbymchenry/codegraph
```

安装器会:
- 询问要配置哪些 agent —— 自动检测已安装的:**Claude Code**、**Cursor**、**Codex CLI**、**opencode**、**Hermes Agent**、**Gemini CLI**、**Antigravity IDE**、**Kiro**
- 提示把 `codegraph` 安装到你的 PATH(这样 agent 才能启动 MCP 服务)
- 询问配置应用到你所有项目,还是仅当前这个
- 写入每个所选 agent 的 MCP 服务配置,外加在该 agent 的说明文件(`CLAUDE.md` / `AGENTS.md` / `GEMINI.md`)里写一小段以标记围栏的 CodeGraph 说明 —— 这是子 agent 与非 MCP agent 学会 `codegraph explore` 命令的途径,因为 MCP 服务自带的指引只会送达主 agent。这段会被 `codegraph uninstall` 干净地移除。
- 当 Claude Code 是目标之一时,设置自动放行权限

安装器**只接入你的 agent —— 不会索引你的代码。** 它完成后,请用 `codegraph init`(第 3 步)自行构建每个项目的图谱。一次全局 `codegraph install` 覆盖所有项目;`codegraph init` 则每个项目跑一次。

**非交互式(脚本 / CI):**

```bash
codegraph install --yes                              # 自动检测 agent,全局安装
codegraph install --target=cursor,claude --yes       # 显式目标列表
codegraph install --target=auto --location=local     # 检测到的 agent,项目级
codegraph install --print-config codex               # 打印片段,不写文件
```

| 标志 | 取值 | 默认 |
|---|---|---|
| `--target` | `auto`、`all`、`none`,或 csv(`claude,cursor,...`) | 交互提示 |
| `--location` | `global`、`local` | 交互提示 |
| `--yes` | (布尔) | 每步都提示 |
| `--no-permissions` | (布尔)跳过 Claude 自动放行列表 | 权限开启 |
| `--print-config <id>` | 打印某个 agent 的片段并退出 | — |

### 2. 重启你的 agent

重启你的 agent(Claude Code / Cursor / Codex CLI / opencode / Hermes Agent / Gemini CLI / Antigravity IDE / Kiro),以加载 MCP 服务。

### 3. 初始化项目

```bash
cd your-project
codegraph init
```

构建该项目的知识图谱索引,随后它会在每次文件变更时自动同步。一次全局 `codegraph install` 在你打开的每个项目里都生效 —— 无需按项目重跑安装器。

就这样 —— 当存在 `.codegraph/` 目录时,你的 agent 会自动使用 CodeGraph 工具。

<details>
<summary><strong>手动配置(备选)</strong></summary>

**全局安装:**
```bash
npm install -g @colbymchenry/codegraph
```

**加入 `~/.claude.json`:**
```json
{
  "mcpServers": {
    "codegraph": {
      "type": "stdio",
      "command": "codegraph",
      "args": ["serve", "--mcp"]
    }
  }
}
```

**加入 `~/.claude/settings.json`(可选,用于自动放行):**
```json
{
  "permissions": {
    "allow": [
      "mcp__codegraph__*"
    ]
  }
}
```

<sub>一个通配符即自动批准每一个 CodeGraph 工具 —— 默认只列出 `codegraph_explore`,但如果你通过 `CODEGRAPH_MCP_TOOLS` 重新启用了其它工具,它们也已被允许,不会再提示。</sub>

</details>

<details>
<summary><strong>Agent 工具指引</strong></summary>

CodeGraph 的 MCP 服务会在 MCP `initialize` 响应里**自动**把使用指引交付给你的 agent。简而言之,它告诉 agent:

- **用 CodeGraph 直接回答结构性问题** —— 它*就是*那个预建索引,所以一轮 grep/read 只是在重复它已经做过的工作。把返回的源码当作已经读过的。
- **几乎任何事都先用 `codegraph_explore`** —— "X 如何工作"、某个流程 / "X 如何到达 Y",或者摸清某个区域。一次调用即返回相关符号按文件分组的逐字源码、它们之间的调用路径(含动态派发跳转),以及一段影响半径摘要。在查询里点名一个文件或符号,即可读取其当前带行号的源码。
- **信任结果 —— 不要再用 grep 复核**,并在编辑后查看陈旧提示横幅。
- **按项目工作**:通过传 `projectPath` 查询任何有 `.codegraph/` 索引的项目 —— 因此一个只有部分服务被索引的 monorepo,或者第二个仓库,都能在一个会话里工作。没有索引的路径会返回干净的指引,让你改用内置工具;是否索引仍由你决定。

确切文本在 `src/mcp/server-instructions.ts` —— 面向主 agent 的唯一事实来源。由于子 agent 与非 MCP harness 从来看不到 MCP 指引,安装器还会往 agent 的说明文件里写一小段以标记围栏的小节,指向等价的 `codegraph explore` CLI。

</details>

---

## 工作原理

```
┌───────────────────────────────────────────────────────────────────┐
│                            Claude Code                            │
│                                                                   │
│   "How does a request reach the database?"                        │
│       calls CodeGraph tools directly — no Explore sub-agent       │
│                                 │                                 │
└─────────────────────────────────┬─────────────────────────────────┘
                                  │
                                  ▼
┌───────────────────────────────────────────────────────────────────┐
│                        CodeGraph MCP Server                       │
│                                                                   │
│ explore  ·  one call → verbatim source + call flow + blast radius │
│                                 │                                 │
│                                 ▼                                 │
│                       SQLite knowledge graph                      │
│          symbols · edges · files · FTS5 full-text search          │
└───────────────────────────────────────────────────────────────────┘
```

1. **抽取** —— [tree-sitter](https://tree-sitter.github.io/) 把源码解析成 AST。语言相关的查询抽取出节点(函数、类、方法)和边(调用、导入、继承、实现)。

2. **存储** —— 一切都进入本地 SQLite 数据库(`.codegraph/codegraph.db`),带 FTS5 全文搜索。

3. **解析** —— 抽取之后,引用被解析:函数调用 → 定义、导入 → 源文件、类继承,以及框架特定的模式。

4. **自动同步** —— MCP 服务用原生操作系统文件事件监视你的项目。变更会被去抖(2 秒静默窗口)、只筛选源文件,并增量同步。图谱随你编码保持新鲜 —— 无需任何配置。

---

## CLI 参考

```bash
codegraph                         # 运行交互式安装器
codegraph install                 # 运行安装器(显式)
codegraph uninstall               # 从你的 agent 移除 CodeGraph(install 的逆操作)
codegraph init [path]             # 初始化一个项目 + 构建其图谱(一步完成)
codegraph uninit [path]           # 从一个项目移除 CodeGraph(--force 跳过提示)
codegraph index [path]            # 完整索引(--force 重建,--quiet 减少输出)
codegraph sync [path]             # 增量更新
codegraph status [path]           # 显示统计
codegraph unlock [path]           # 移除阻塞索引的陈旧锁文件
codegraph query <search>          # 搜索符号(--kind、--limit、--json)
codegraph explore <query>         # 一次性返回相关符号源码 + 调用路径(输出与 codegraph_explore MCP 工具相同)
codegraph node <symbol|file>      # 单个符号的源码 + 调用者,或带行号读取一个文件(输出与 codegraph_node 相同)
codegraph files [path]            # 显示文件结构(--format、--filter、--max-depth、--json)
codegraph callers <symbol>        # 找出谁调用了某个函数/方法(--limit、--json)
codegraph callees <symbol>        # 找出某个函数/方法调用了什么(--limit、--json)
codegraph impact <symbol>         # 分析改动某符号会影响哪些代码(--depth、--json)
codegraph affected [files...]     # 找出被改动影响的测试文件(见下)
codegraph daemon                  # 管理后台守护进程 —— 选一个停止(别名:daemons)
codegraph dashboard               # 打开本地 web dashboard —— 使用量、token、缓存、工作区(别名:web、monitor)
codegraph telemetry [on|off]      # 显示或更改匿名使用遥测
codegraph upgrade [version]       # 更新到最新版(--check、--force)
codegraph version                 # 打印已安装的版本(也可用 -v、--version)
codegraph help [command]          # 显示帮助,可指定某个命令
```

### `codegraph affected`

传递地追踪 import 依赖,找出哪些测试文件被改动的源文件所影响。

```bash
codegraph affected src/utils.ts src/api.ts         # 以参数传入文件
git diff --name-only | codegraph affected --stdin   # 从 git diff 管道输入
codegraph affected src/auth.ts --filter "e2e/*"     # 自定义测试文件模式
```

| 选项 | 说明 | 默认 |
|--------|-------------|---------|
| `--stdin` | 从 stdin 读取文件列表 | `false` |
| `-d, --depth <n>` | 最大依赖遍历深度 | `5` |
| `-f, --filter <glob>` | 识别测试文件的自定义 glob | 自动检测 |
| `-j, --json` | 以 JSON 输出 | `false` |
| `-q, --quiet` | 只输出文件路径 | `false` |

**CI/hook 示例:**

```bash
#!/usr/bin/env bash
AFFECTED=$(git diff --name-only HEAD | codegraph affected --stdin --quiet)
if [ -n "$AFFECTED" ]; then
  npx vitest run $AFFECTED
fi
```

---

## MCP 工具

作为 MCP 服务运行时,CodeGraph 暴露**单个工具** —— `codegraph_explore`。实测的 agent 行为显示,一个强工具比一堆更窄的工具更能引导 agent —— 更少误选,而且每个会话都省上下文:

| 工具 | 用途 |
|------|---------|
| `codegraph_explore` | 一次调用回答几乎任何问题 —— "X 如何工作"、某个流程("X 如何到达 Y"),或摸清某个区域 —— 返回相关符号按文件分组的逐字源码,外加它们之间的调用路径与一段影响半径摘要。会浮现 grep 追不到的动态派发跳转(回调、React 重渲染、接口→实现)。在查询里点名一个文件或符号,即可读取其当前带行号的源码,形态与 Read 工具给你的一致。 |

其它工具(`codegraph_node`、`codegraph_search`、`codegraph_callers`、`codegraph_callees`、`codegraph_impact`、`codegraph_files`、`codegraph_status`)仍然完全可用,但**默认不列出** —— 它们返回的一切都已内联出现在 `codegraph_explore` 的结果里(它的影响半径小节、关系图、以及作为被调列表的符号主体)。用环境变量 `CODEGRAPH_MCP_TOOLS` 可为 MCP 界面重新启用其中任意一个(如 `CODEGRAPH_MCP_TOOLS=explore,node,search,callers`),或使用它们的 CLI 等价命令(`codegraph node` / `query` / `callers` / `callees` / `impact` / `files` / `status`)。

即使服务自己的根目录没有 `.codegraph/` 索引,这些工具仍然可用:传 `projectPath` 就能在同一会话里查询任何已索引的项目 —— monorepo 里的某个子服务,或第二个仓库。没有索引的路径会返回干净的指引让你改用内置工具,所以什么都不会大声报错,而是否索引仍由你决定。

---

## 作为库使用

CodeGraph 可以被直接嵌入。npm 包重新导出了它的编程式 API,因此 `import` 和 `require` 都能在你自己的进程里解析到 `CodeGraph` 类 —— 便于把它嵌入一个应用(例如 Electron 主进程)。

```typescript
import CodeGraph from '@colbymchenry/codegraph';
// CommonJS 也可以:
//   const { CodeGraph } = require('@colbymchenry/codegraph');

const cg = await CodeGraph.init('/path/to/project');
// 或:const cg = await CodeGraph.open('/path/to/project');

await cg.indexAll({
  onProgress: (p) => console.log(`${p.phase}: ${p.current}/${p.total}`)
});

const results = cg.searchNodes('UserService');
const callers = cg.getCallers(results[0].node.id);
const context = await cg.buildContext('fix login bug', { maxNodes: 20, includeCode: true, format: 'markdown' });
const impact = cg.getImpactRadius(results[0].node.id, 2);

cg.watch();   // 文件变更时自动同步
cg.unwatch(); // 停止监视
cg.close();
```

对于直接驱动图谱的调用方,同一入口还导出了更底层的构件:`DatabaseConnection`、`QueryBuilder`、`getDatabasePath`、`initGrammars` / `loadGrammarsForLanguages`,以及 `FileLock`。

**嵌入要求**

- 从 npm 安装(`npm i @colbymchenry/codegraph`),这样对应的按平台包 —— 它携带编译好的库及其依赖 —— 会与 shim 一同被拉取。
- 该 API 运行在**你的**运行时上,所以它需要 **Node 22.5+** 以支持内置的 `node:sqlite`(当 Electron 自带的 Node 为 22.5+ 时即符合)。CLI 与 MCP 服务不受影响 —— 它们跑在自带的打包运行时上。
- TypeScript 类型随包提供。与任何面向 Node 的库一样,请保持 `@types/node` 可用并设 `skipLibCheck: true`(常见默认)。

---

## 配置

几乎没有 —— CodeGraph **默认零配置**,开箱即用,不用写任何东西也不用保持同步。语言支持根据文件扩展名自动进行;无需按语言做任何接线。唯一的可选文件是用于映射[自定义文件扩展名](#自定义文件扩展名)的。

开箱即跳过的内容:

- **依赖、构建与缓存目录** —— `node_modules`、`vendor`、`dist`、`build`、`target`、`.venv`、`Pods`、`.next` 等,横跨每一种[支持的技术栈](#支持的语言) —— 因此图谱是你的代码,而非第三方噪声。即使没有 `.gitignore` 也成立。
- **你的 `.gitignore` 里的一切** —— 在 git 仓库里经由 git 生效,在非 git 项目里通过直接读取 `.gitignore`(根目录与嵌套)生效。
- **大于 1 MB 的文件** —— 生成的 bundle、压缩后的 JS、vendored 二进制块。

要额外排除某样东西,把它加进 `.gitignore`。要把一个被默认排除的目录重新拉**进来**(比如你确实想索引某个 vendored 依赖),添加一条取反 —— `!vendor/`。默认规则统一适用,所以提交了某个依赖或构建目录并不会强制它进入图谱;`.gitignore` 的取反才是显式的选择加入。

不过 `.gitignore` 无法丢弃你已经**提交**了的目录。对于签入仓库的 vendored 主题或 SDK(例如 `static/` 下的 Metronic 主题),把它列在 `codegraph.json` 的 `exclude` 下 —— gitignore 风格的模式,针对相对仓库根的路径匹配,在 index、sync 和 watch 时都生效:

```json
{
  "exclude": ["static/", "**/vendor/**"]
}
```

### 自定义文件扩展名

如果你的项目为某个[支持的语言](#支持的语言)使用了非标准扩展名 —— 比如 Lua 用 `.dota_lua`,或 PHP 用 `.tpl` —— 这些文件默认会被跳过,因为该扩展名不是 CodeGraph 认识的。用项目根目录下可选的 **`codegraph.json`** 来映射它们:

```json
{
  "extensions": {
    ".dota_lua": "lua",
    ".tpl": "php"
  }
}
```

每个值都是一个受支持的语言 id。这些映射会叠加在内置默认之上,并在冲突时取胜,所以你也可以重定向某个内置项(例如 `".h": "cpp"`)。把该文件提交上去以便与团队共享映射。拼错的语言或格式错误的文件会被警告并跳过 —— 绝不会破坏索引 —— 而没有 `codegraph.json` 的项目行为与以前完全一致。添加或更改映射后请重新索引(`codegraph index`)。

## Dashboard(仪表盘)

一个本地 web 界面,用来**监控 CodeGraph 在你机器上的使用情况** —— 工具调用量与成功率、CodeGraph 送达的上下文 token(估算)、读取缓存命中率、运行中 daemon 的实时 CPU / 内存 / 磁盘占用,以及你索引过的每个项目,配有饼图 + 折线图、按项目下钻。它还能展示 **CodeGraph 替你省掉了多少直接的文件读取(`Read`/`Grep`/`Glob`)** —— 这由一个可选的读取跟踪 hook 支持,`codegraph install` 会在启用用量统计时自动帮你写进 Claude Code。你可以直接在页面上对某个项目执行 `init` / `sync` / 重建索引 / 移除,已索引的项目会被自动发现。所有数据都从单个本地文件读取,**绝不离开你的机器**。

随时启动它(不会自动启动):

```bash
codegraph dashboard          # 打开 http://127.0.0.1:4319(别名:web、monitor)
```

从源码构建?先运行 `npm run build:all`(它会同时构建 CLI **和** web 前端),再执行 `node dist/bin/codegraph.js dashboard`。

[**`DASHBOARD.md`**](DASHBOARD.md) 是完整指南 —— 从源码部署、命令选项、配置/隐私开关、内网暴露(systemd + nginx)、故障排查,以及面向团队的中心化服务器的路线图。前端开发者可另见 [`src/dashboard/web/README.zh.md`](src/dashboard/web/README.zh.md)。

## 遥测

CodeGraph 收集**匿名使用统计** —— 哪些工具和命令被用到、哪些语言被索引 —— 以指导语言与 agent 支持的投入方向。**绝不**收集任何代码、路径、文件或符号名、查询,或 IP 地址;使用数据会在本地聚合成每日总量后才发送,且接收端点是[本仓库里的公开代码](telemetry-worker/),它强制执行有文档记录的字段列表。安装器会在一开始就询问;随时可关闭:

```bash
codegraph telemetry off    # 或:CODEGRAPH_TELEMETRY=0,或 DO_NOT_TRACK=1
```

[`TELEMETRY.md`](TELEMETRY.md) 列出了每一个字段,以及各个关闭开关和完整的数据处理说明。

## 支持的平台

每个发行版都为三大桌面操作系统提供自带的构建(打包 Node 运行时 —— 无需编译),同时覆盖 Intel/AMD(x64)与 ARM(arm64):

| 平台 | 架构 | 安装 |
|----------|---------------|---------|
| Windows | x64, arm64 | PowerShell 安装器或 npm |
| macOS | x64, arm64 | shell 安装器或 npm |
| Linux | x64, arm64 | shell 安装器或 npm |

一行安装命令见[开始使用](#开始使用)。

## 支持的 Agent

交互式安装器会自动检测并配置以下每一个 —— 接入 MCP 服务(它自带使用指引,因此不写说明文件):

- **Claude Code**
- **Cursor**
- **Codex CLI**
- **opencode**
- **Hermes Agent**
- **Gemini CLI**
- **Antigravity IDE**
- **Kiro**

## 支持的语言

| 语言 | 扩展名 | 状态 |
|----------|-----------|--------|
| TypeScript | `.ts`, `.tsx` | 完整支持 |
| JavaScript | `.js`, `.jsx`, `.mjs` | 完整支持 |
| Python | `.py` | 完整支持 |
| Go | `.go` | 完整支持 |
| Rust | `.rs` | 完整支持 |
| Java | `.java` | 完整支持 |
| C# | `.cs` | 完整支持 |
| PHP | `.php` | 完整支持 |
| Ruby | `.rb` | 完整支持 |
| C | `.c`, `.h` | 完整支持 |
| C++ | `.cpp`, `.hpp`, `.cc` | 完整支持 |
| Objective-C | `.m`, `.mm`, `.h` | 部分支持(类、协议、方法、`@property`、`#import`、消息发送;`.mm` ObjC++ 可能解析不完整) |
| Swift | `.swift` | 完整支持 |
| Kotlin | `.kt`, `.kts` | 完整支持 |
| Scala | `.scala`, `.sc` | 完整支持(类、trait、方法、类型别名、Scala 3 枚举) |
| Dart | `.dart` | 完整支持 |
| Svelte | `.svelte` | 完整支持(script 抽取、Svelte 5 runes、SvelteKit 路由) |
| Vue | `.vue` | 完整支持(script + script-setup 抽取、Nuxt page/API/middleware 路由) |
| Astro | `.astro` | 完整支持(frontmatter + script 抽取、模板组件/调用引用、`src/pages/` 路由) |
| Liquid | `.liquid` | 完整支持 |
| Pascal / Delphi | `.pas`, `.dpr`, `.dpk`, `.lpr` | 完整支持(类、record、接口、枚举、DFM/FMX 窗体文件) |
| Lua | `.lua` | 完整支持(函数、带接收者的方法、局部变量、`require` 导入、调用边) |
| R | `.R` `.r` | 完整支持(各种赋值形式的函数、带方法的 S4/R5/R6 类、`library`/`require` 导入、`source()` 文件引用、调用边) |
| Luau | `.luau` | 完整支持(Lua 的一切,外加 `type`/`export type` 别名、带类型的签名、Roblox 实例路径 `require`) |

## 实测的跨文件覆盖率

影响与影响半径查询的好坏,取决于其背后的依赖图谱,所以覆盖率是被实测的,而非断言的。**Fair 覆盖率** = 在每种语言一个真实基准仓库上,拥有至少一个*已解析的跨文件依赖方*(通过 import、调用、引用,或经某个框架约定路由到它们)的、承载符号的源文件所占的比例。残余部分始终是真正的静态分析前沿(运行时动态派发、反射 / DI 容器、框架约定入口点、vendored 第三方代码),绝不通过操弄分母来掩盖。

| 语言 | 基准仓库 | 覆盖率 |
|---|---|---|
| TypeScript / JavaScript | 本仓库 | 95.8% |
| Python | psf/requests | 100% |
| Go | gin-gonic/gin | 96.6% |
| Rust | BurntSushi/ripgrep | 86.7% |
| Java | google/gson | 93.3% |
| C# | jbogard/MediatR | 85.2% |
| PHP | guzzle/guzzle | 100% |
| Ruby | sidekiq/sidekiq | 100% |
| C | redis/redis | 92.2% |
| C++ | google/leveldb | 94.8% |
| Objective-C | SDWebImage | 91.6% |
| Swift | Alamofire | 95.3% |
| Kotlin | square/okhttp | 96.2% |
| Scala | gatling/gatling | 91.2% |
| Dart | flutter/packages | 92.4% |
| Svelte / SvelteKit | sveltejs/realworld | 100% |
| Vue / Nuxt | nuxt/movies | 93.5% |
| Astro | xingwangzhe/stalux | 93.0% |
| Lua | nvim-telescope/telescope.nvim | 84.2% |
| Luau | dphfox/Fusion | 92.2% |
| Liquid | Shopify/dawn | 73.8% |
| Pascal / Delphi | PascalCoin | 77.4% |

框架路由也以同样方式验证,每个框架用一个典型应用:Express 100%、FastAPI 98%、Flask 100%、NestJS 96.8%、Gin 96.5%、Axum 100%、Rocket 93.8%、Vapor 100%、Laravel 92%、Rails 89.6%、React Router 100% —— 而那些重约定/重反射的则处于其诚实的静态分析上限:ASP.NET 83.9%、Spring 83.3%、Drupal 78.9%、Play 76.3%、Django 74.1%。SvelteKit、Vue/Nuxt 与 Astro 使用基于文件的路由,所以它们的 page/端点覆盖率就是上表中的 Svelte/SvelteKit(100%)、Vue/Nuxt(93.5%)与 Astro(93.0% —— 在两个验证仓库上每个 `src/pages/` 文件都映射到一个路由节点)。

## 故障排查

**"CodeGraph not initialized"** —— 先在你的项目目录里运行 `codegraph init`。

**索引很慢** —— 检查 `node_modules` 及其它大目录是否被排除。用 `--quiet` 减少输出开销。

**MCP 遇到 `database is locked`** —— 当前构建不该出现:CodeGraph 自带 Node 运行时,并以 WAL 模式使用 Node 内置的 `node:sqlite`,在这种模式下并发读取绝不会因写入者而阻塞。如果你仍然看到它:

- **你用的是旧版(0.9 之前)安装。** 重新安装以获得打包运行时 —— `curl -fsSL https://raw.githubusercontent.com/colbymchenry/codegraph/main/install.sh | sh`(macOS/Linux)、`irm https://raw.githubusercontent.com/colbymchenry/codegraph/main/install.ps1 | iex`(Windows),或 `npm i -g @colbymchenry/codegraph@latest`。
- **`codegraph status` 显示 `Journal:` 不是 `wal`** —— 该文件系统上无法启用 WAL(网络共享和 WSL2 `/mnt` 上很常见),于是读取会因写入而阻塞。把项目(连同它的 `.codegraph/` 文件夹)移到本地磁盘上。

**MCP 服务连不上** —— 你的 agent 自己会启动这个服务,所以你不用手动去启。确认项目已初始化并索引(`codegraph status`),且 MCP 配置里的路径正确。如果还是连不上,重跑 `codegraph install` 以重写配置。

**MCP 工具调用报 `Transport closed`,而 `codegraph status`/`sync` 却健康** —— 几乎总是 WSL2 且项目在 Windows 盘上(`/mnt/c` 或 `/mnt/d` 路径),此时 CodeGraph 用来在会话间共享一个后台服务的本地 socket 不可靠。CodeGraph 现在会回退到在进程内为会话服务,而不是断开连接,但如果你仍然遇到,在 MCP 服务的环境里设 `CODEGRAPH_NO_DAEMON=1` 以完全跳过共享服务(每个会话在自己的进程里运行)。把项目移到 Linux 原生文件系统上(例如放在 `~/` 下而非 `/mnt/`)会恢复共享服务。

**符号缺失** —— MCP 服务在保存时自动同步(等几秒)。必要时手动运行 `codegraph sync`。检查该文件的语言是否受支持,且不在被 `.gitignore` 或默认排除的目录里(如 `node_modules`、`dist`)。

**在 Windows 与 WSL 之间共享同一份检出** —— 不要让两边指向同一个 `.codegraph/`:后台服务锁和 SQLite 索引与写入它们的操作系统绑定,而跨 WSL2/Windows 文件系统边界的 SQLite 加锁不可靠。通过在其中一边把 `CODEGRAPH_DIR` 设成不同的名字,给同一棵树里的每一侧各自的索引 —— 例如在 Windows 上设 `CODEGRAPH_DIR=.codegraph-win`,让 WSL 保持默认的 `.codegraph`。CodeGraph 在索引和监视时会跳过任何兄弟 `.codegraph-*` 目录,因此两者永不相互干扰。

## Star 历史

<a href="https://www.star-history.com/?repos=colbymchenry%2Fcodegraph&type=date&legend=top-left">
 <picture>
   <source media="(prefers-color-scheme: dark)" srcset="https://api.star-history.com/chart?repos=colbymchenry/codegraph&type=date&theme=dark&legend=top-left" />
   <source media="(prefers-color-scheme: light)" srcset="https://api.star-history.com/chart?repos=colbymchenry/codegraph&type=date&legend=top-left" />
   <img alt="Star History Chart" src="https://api.star-history.com/chart?repos=colbymchenry/codegraph&type=date&legend=top-left" />
 </picture>
</a>

## 许可证

MIT

---

<div align="center">

**为 AI 编码 agent 而生 —— Claude Code、Cursor、Codex CLI、opencode、Hermes Agent、Gemini CLI、Antigravity IDE 与 Kiro**

[报告 Bug](https://github.com/colbymchenry/codegraph/issues) · [请求功能](https://github.com/colbymchenry/codegraph/issues)

</div>
