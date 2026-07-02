<!-- 语言: [English](./README.md) · **简体中文** -->

# CodeGraph Dashboard — Web 前端

`codegraph dashboard` 的 React 前端。这是一个体积小、依赖少的 Vite + React 18
单页应用(SPA),负责在 dashboard 的 JSON API 之上渲染那套只读监控界面。

> **它不是独立的 npm 包。** 该应用标记为 `private`,永不发布到 npm。它构建到
> `../../../dist/dashboard/public`,再由 dashboard 的 `node:http`
> 服务([`src/dashboard/server.ts`](../server.ts))从该目录托管。产品层面的说明
> —— dashboard 展示什么、隐私开关、内网部署、PostToolUse 读取追踪 hook、路线图
> —— 请看仓库根目录的 [**`DASHBOARD.md`**](../../../DASHBOARD.md)。本文件是面向
> **前端开发者** 的指南:如何构建、如何跑开发模式(热更新)、以及代码结构。

---

## 整体关系

```
你的 agent ──MCP 调用──▶ codegraph 守护进程 ──写入──▶ ~/.codegraph/metrics.db
                                                            │ 读取
                                                            ▼
                                     dashboard 服务 (src/dashboard/server.ts)
                                     ├─ JSON API  →  /api/*
                                     └─ 静态 SPA  →  dist/dashboard/public/*
                                                            ▲
                                                            │ 本应用构建产物落到这里
                                     src/dashboard/web  (Vite + React)
```

- **服务端** 是零依赖的 `node:http`。它在机器共享的本地 metrics DB 之上暴露一套
  只读 JSON API,并托管本 SPA 的构建产物。默认绑定 `127.0.0.1`,从不发起任何
  对外连接。
- **前端** 是纯客户端:只对同源的 `/api/*` 发 `fetch` 请求并渲染结果。它不持有
  任何密钥,也只与本地 API 通信。

---

## 构建

在 **仓库根目录** 执行(常规路径 —— 发布时就是这么打包的):

```bash
npm run build:all        # 同时构建 CLI 和本 web 前端
#   ├─ npm run build            → 把 CLI 编译进 dist/
#   └─ npm run build:dashboard  → (cd src/dashboard/web && npm ci && npm run build)
```

`build:dashboard` 执行 `tsc -b && vite build`,把打包后的 SPA 输出到
[`dist/dashboard/public`](../../../dist/dashboard/public)(见
[`vite.config.ts`](./vite.config.ts) 里的 `outDir` + `emptyOutDir`)。
`base: './'` 让所有资源 URL 保持相对路径,因此无论服务端绑定到哪个 host/端口,
页面都能正常工作。

> **如果你只跑了 `npm run build`**(只编译 CLI),那么 `dist/dashboard/public`
> 会缺失,服务端会返回一个纯文本的 *"UI is not built"* 页面 —— 此时 API 仍然
> 可用。发布构建 **必须** 跑 `build:all`。

或者只构建前端,在 **本目录** 执行:

```bash
npm ci        # 首次(安装 Vite + React 等 devDeps)
npm run build # tsc -b && vite build
```

---

## 开发模式(热更新)

前端是独立的 Vite 应用,因此你可以用 **HMR** 迭代它 —— 不用重新构建 CLI、不用
重启服务端 —— 同时由一个实时的 API 服务给它供数据。

**一条命令**(推荐)—— 同时启动 API 和 Vite 开发服务器,并自动把 `/api` 代理
指向正确的端口:

```bash
# 在仓库根目录
npm run build                              # 先构建一次 CLI
node dist/bin/codegraph.js dashboard --dev
```

它会先打印 API 的 URL,然后 Vite 打印它自己的 URL(默认
`http://localhost:5173`,除非加 `--no-open` 否则自动打开)—— 打开 Vite 那个。
对 `src/*` 的改动会实时生效。只有改动 **CLI/服务端** 代码时才需要重新构建并
重启。`--dev` 需要源码检出(发布的 npm 安装包只带构建后的 `public/`)。

<details><summary>更想用两个终端?</summary>

```bash
# 终端 1 —— API/服务端(仓库根目录)
node dist/bin/codegraph.js dashboard --no-open      # API 在 http://127.0.0.1:4319
# 终端 2 —— Vite 开发服务器(本目录)
npm install && npm run dev                          # 把 /api 代理到 :4319
```
</details>

### `/api` 代理如何找到服务端

[`vite.config.ts`](./vite.config.ts) 把 `/api` 代理到
`process.env.CODEGRAPH_DASHBOARD_API || 'http://127.0.0.1:4319'`。
`codegraph dashboard --dev` 会注入 `CODEGRAPH_DASHBOARD_API`,让代理跟随非默认
的 `--port`;单独跑 `npm run dev` 时则回退到默认的 4319。

---

## 代码结构

全部代码都在 [`src/`](./src) 下。刻意保持精简、少依赖 —— 唯一的运行时依赖是
`react` + `react-dom`;**所有图表都是手写 SVG**,不用任何图表库,与仓库
"不引入额外依赖" 的一贯风格一致。

| 文件 | 内容 |
|---|---|
| [`main.tsx`](./src/main.tsx) | 入口 —— 在 `<StrictMode>` 下把 `<App/>` 挂载到 `#root`。 |
| [`App.tsx`](./src/App.tsx) | 根组件。持有全部状态:时间窗口(`7` / `30` / `all`)、可选的单项目 scope、以及拉取到的 `Summary`。每 **15s** 轮询一次 API —— 有项目 job 在跑时改为每 **2.5s** —— 并串联各个操作回调(执行 init/index/sync、扫描、移除、启用 hook)。 |
| [`api.ts`](./src/api.ts) | 带类型的 API 客户端。其 TS 接口镜像服务端的读取结构(`Overview`、`ToolStat`、`Workspace`、`Resources` 等)以及 `/api/summary` 的负载,外加 `fetch` 辅助函数:`fetchSummary`、`runProject`、`scanProjects`、`deleteProject`、`installReadHook`。 |
| [`components.tsx`](./src/components.tsx) | 各个面板:`StatCard`(顶部概览卡片)、`ReadsComparisonPanel`(CodeGraph vs 原始文件读取的对比 + hook 未安装时的警告与一键启用)、`ResourcesPanel`(每个守护进程的实时 CPU/内存/磁盘)、`ToolsTable`、`WorkspacesTable`(每个项目一行,带 View/Sync/Re-index/Remove)、`ProjectsPanel`(Init & index 输入框 + 最近 job 日志)。 |
| [`charts.tsx`](./src/charts.tsx) | 零依赖的手写 SVG 图表:`PieChart`(带占比图例的环形图)和 `LineChart`(调用数 + 每日估算 token 的双序列折线)。共用 `PALETTE` 配色。 |
| [`format.ts`](./src/format.ts) | 纯展示用的格式化函数:`fmtInt`、`fmtTokens`(K/M)、`fmtBytes`、`fmtPct`、`fmtDuration`。 |
| [`styles.css`](./src/styles.css) | 全部样式 —— 一份手写样式表,深色主题。 |
| [`index.html`](./index.html) | Vite 的 HTML 入口;把 `main.tsx` 挂载到 `#root`。 |

---

## 它消费的 API

应用启动时用 **一次往返** 请求 `GET /api/summary`,该接口一次性打包所有只读面板
(概览、工具、host 工具、每日序列、工作区、jobs、资源、读取 hook 状态,以及当前
时间窗口)。它接受这些查询参数:

- `days=<n>` 或 `all=1` —— 时间窗口(即 `7` / `30` / `All` 切换)。
- `workspace=<root>` —— 把所有统计面板 scope 到单个项目(**View** 按钮);
  工作区列表、jobs、资源始终是全机器范围的。

各种操作会 POST 到服务端,随后重新拉取 summary:

| 调用 | 端点 | 作用 |
|---|---|---|
| `runProject('init'\|'index'\|'sync', path)` | `POST /api/projects/run` | 以受追踪的后台 **job** 运行对应 CLI 命令(输出流式写入"最近 jobs"日志)。 |
| `scanProjects()` | `POST /api/projects/scan` | 从(agent 配置 + 守护进程注册表)发现已配置的项目并登记进来。 |
| `deleteProject(path)` | `POST /api/projects/delete` | 从 metrics DB 删除某项目的行。**不会** 触碰它的 `.codegraph/` 索引。 |
| `installReadHook()` | `POST /api/hook/install` | 把 PostToolUse 读取追踪 hook 写入 Claude 的全局 `settings.json`(读取面板警告的恢复路径)。 |

单独的读取端点(`/api/overview`、`/api/tools`、`/api/daily`、`/api/workspaces`、
`/api/resources`、`/api/health` 等)也都存在,返回同样的结构 —— 当你想不经过本
UI 直接驱动 API 时很方便。完整路由表见
[`src/dashboard/server.ts`](../server.ts)。

---

## 约定与注意点

- **只读前端。** 它渲染实测数据;绝不编造"节省了多少 token"这种数字(那是一个
  无法从单台机器测量的反事实量 —— 见 `DASHBOARD.md` 的说明)。它展示的是真实的
  调用占比,以及每次查找的平均上下文量。
- **估算 token。** 所有 token 数字都是 `≈ 字符数 / 4` —— 是"送达上下文量"的
  代理指标,而非实际账单。UI 中已如实标注。
- **新增一个面板:** 在 `components.tsx` 里写组件(或在 `charts.tsx` 里写图表),
  从 `api.ts` 的 `Summary` 类型上取数据,再在 `App.tsx` 里渲染出来。若需要新数据,
  就往服务端 `/api/summary` 的负载里加字段,并在 `Summary` 接口里同步镜像。
- **没有充分理由不要新增运行时依赖** —— 宁可再手写一个 SVG 图表,也不引入图表库,
  以保持构建产物小、供应链最简。

---

## 相关文档

- [**`DASHBOARD.md`**](../../../DASHBOARD.md) —— 完整的 dashboard 指南(展示什么、
  隐私、读取追踪 hook、内网部署、路线图)。
- [根目录 **`README.md`**](../../../README.md) / [**`README.zh.md`**](../../../README.zh.md)
  —— CodeGraph 总览与 `codegraph dashboard` 命令。
