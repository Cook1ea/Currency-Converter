# 汇率换算

一个适合 iPhone 使用的多币种联动换算 PWA。纯前端实现，无后端、无账号、无广告、无追踪，添加到主屏幕后可以像独立 App 一样打开，离线也能用上一次获取到的汇率继续换算。

- **多币种联动**：默认展示 JPY / USD / CNY / EUR / GBP / HKD / KRW / THB 八种货币，最多可同时显示 10 种。点哪一行就在哪一行输入，其余货币实时同步换算，不需要单独指定「基准货币」。
- **自定义键盘 + 简单计算**：底部固定的数字键盘，避免 iOS 原生键盘遮挡列表；带 `÷ × − + =` 四则运算，可以先算「280 × 3」再看换算结果（只有一个待处理运算，不做括号与优先级）。
- **币种管理**：搜索（代码 / 中文名 / 英文名）、添加、删除、替换，拖拽排序，触屏可用。
- **离线可用**：Service Worker 缓存应用外壳，汇率快照存在 localStorage，断网时继续换算并明确提示数据来源与时间。
- **深浅色主题**：默认跟随系统，也可手动锁定。

## 技术栈

React 18 + TypeScript + Vite。运行时依赖只有 `react` 与 `react-dom`，图标由脚本直接生成 PNG，Service Worker 手写，没有引入额外的 PWA / 拖拽 / 图标 / 日期库。

## 本地运行

需要 Node.js 20 或更高版本。

```bash
npm install     # 安装依赖
npm run dev     # 启动开发服务器，默认 http://localhost:5173
```

## 常用命令

| 命令              | 说明                                                    |
| ----------------- | ------------------------------------------------------- |
| `npm run dev`     | 启动开发服务器（热更新，不注册 Service Worker）         |
| `npm run build`   | 类型检查 + 生产构建，产物输出到 `dist/`                 |
| `npm run preview` | 本地预览构建产物                                        |
| `npm run lint`    | 运行 ESLint                                             |
| `npm run icons`   | 重新生成 `public/` 下的 PWA 图标                        |

在子路径下构建（本地验证 GitHub Pages 的部署效果）：

```bash
# macOS / Linux
BASE_PATH=/<仓库名>/ npm run build

# Windows PowerShell
$env:BASE_PATH = "/<仓库名>/"; npm run build
```

## 部署到 GitHub Pages

仓库已经包含 `.github/workflows/deploy.yml`，推送到 `main` 分支后会自动构建并部署。

1. 把项目推送到 GitHub 仓库。
2. 打开仓库的 **Settings → Pages**，把 **Source** 设为 **GitHub Actions**（不要选 “Deploy from a branch”）。
3. 向 `main` 分支推送任意提交，或在 **Actions** 页面手动运行 `Deploy to GitHub Pages`。
4. 部署完成后访问 `https://<用户名>.github.io/<仓库名>/`。

### 子路径是怎么处理的

GitHub Pages 会把项目部署在 `/<仓库名>/` 下，因此：

- 工作流在构建时注入环境变量 `BASE_PATH=/<仓库名>/`，`vite.config.ts` 用它设置 Vite 的 `base`。
- `index.html` 中的图标、manifest 路径使用 Vite 的 `%BASE_URL%` 占位符。
- `manifest.webmanifest` 里的 `start_url`、`scope`、图标路径全部使用相对路径（`./`），会自动相对 manifest 自身所在目录解析。
- Service Worker 注册时使用 `import.meta.env.BASE_URL`，`sw.js` 内部用 `new URL('./', self.location.href)` 推导自己的作用域。

应用是单页结构、没有前端路由，所以不存在刷新子路由 404 的问题；工作流仍然会把 `index.html` 复制一份为 `404.html` 作为兜底。

**如果改用自定义域名部署在根目录**，把工作流里的 `BASE_PATH` 改成 `/` 即可。

## 汇率数据

### 使用的 API

数据源是一条自动降级链（`src/api/rates.ts`），逐级尝试，第一个成功的即返回：

1. [FxRatesAPI](https://fxratesapi.com)（`https://api.fxratesapi.com/latest?base=USD`）—— **分钟级实时中间价**，主数据源。
2. [Coinbase](https://docs.cdp.coinbase.com/exchange/reference/exchangerestapi_getexchangerates)（`https://api.coinbase.com/v2/exchange-rates?currency=USD`）—— 实时中间价，主源失败或限流时的备用源。
3. [Frankfurter](https://frankfurter.dev)（`https://api.frankfurter.dev/v1/latest?base=EUR`，`api.frankfurter.app` 备用入口）—— **欧洲央行（ECB）每日参考汇率**，前两者都不可用时的最终兜底。

三个源都**免费、无需 API Key**，均返回 CORS 头，允许浏览器直接访问。

### 更新频率与限制

- 正常情况下数据每分钟更新一次（由 FxRatesAPI 或 Coinbase 提供）；只有当两者都不可用时才会退回 Frankfurter 的**工作日日更**（欧洲时间 16:00 CET 前后，周末与欧洲银行假日不更新）。
- 覆盖 **30 种主要法定货币**（见 `src/config/currencies.ts` 的 `SUPPORTED_CODES`），**不含加密货币**；这是三个数据源的交集，各 provider 都会用它过滤响应。
- FxRatesAPI 未公布硬性速率限制（响应头 `x-ratelimit-limit` 有值但重置窗口未知）；本应用做了约束：手动刷新之间至少间隔 10 秒，页面可见时每 60 秒轮询一次，回到前台时数据超过 60 秒才额外触发一次刷新。
- 这是**中间价参考汇率，不是可成交价**，与银行、信用卡实际结算汇率会有差异。

### 应用如何使用这份数据

- 固定以 USD（FxRatesAPI/Coinbase）或 EUR（Frankfurter 兜底时）为基准拉取整张汇率表，任意两种货币之间在本地做交叉换算，因此切换输入货币不需要重新请求。
- 每次成功获取都会把快照（汇率、报价时刻、获取时间、实际生效的数据源）写入 localStorage（key 为 `fx.snapshot.v2`）。
- **获取失败时不会清空已有数据**，界面继续用上一份快照换算，顶部状态栏改为「缓存数据 / 离线数据 · 最后更新于 …」。
- 顶部显示的时间是**上一次成功拿到数据的时刻**，而不是页面打开的时间；旁边另外标注数据本身声明的报价时间（实时源精确到分钟，Frankfurter 兜底时精确到天）。

## 常见修改

### 更换默认货币

编辑 `src/config/currencies.ts`：

```ts
export const DEFAULT_CODES: readonly CurrencyCode[] = ['JPY', 'USD', 'CNY', 'EUR', /* … */]
export const DEFAULT_ACTIVE_CODE: CurrencyCode = 'JPY'  // 默认输入行
```

同一个文件里还可以调整：

- `CURRENCIES`：可选币种全集，每一项包含代码、中英文名称、国旗 emoji、常规小数位（`decimals`，JPY / KRW / ISK 为 0）。
- `MIN_CURRENCIES` / `MAX_CURRENCIES`：列表数量下限与上限（默认 2 和 10）。
- `PLACEHOLDER_AMOUNT`：尚未输入时输入行显示的灰色占位金额（默认 100）。

用户已经保存过币种列表时，本地存储会覆盖默认值；清除站点数据或在浏览器控制台执行 `localStorage.clear()` 可恢复默认。

### 替换汇率 API

数据源逻辑集中在 `src/api/`，与界面完全解耦：

- `provider.ts`：定义 `RateProvider` 接口与 `RateFetchError`。
- `frankfurter.ts`：默认实现。
- `rates.ts`：一行导出当前使用的实现。

替换步骤：

1. 新建 `src/api/<你的数据源>.ts`，实现 `RateProvider`：

   ```ts
   export const myProvider: RateProvider = {
     id: 'my-provider',
     label: '我的数据源',
     docsUrl: 'https://example.com/docs',
     supportedCodes: null,               // null 表示不限制币种
     async fetchLatest(signal) {
       // 请求并返回 RateSnapshot：
       // { base, rates（含 base 自身，值为 1）, rateDate, fetchedAt, provider }
     },
   }
   ```

2. 修改 `src/api/rates.ts` 中的一行：

   ```ts
   export const rateProvider: RateProvider = myProvider
   ```

3. 如果新数据源支持更多币种，在 `src/config/currencies.ts` 的 `CURRENCIES` 里补齐条目即可，界面与搜索会自动生效。

应用只依赖 `RateSnapshot` 这一种数据结构，缓存、状态文案、离线提示都不需要改动。

## 在 iPhone 上添加到主屏幕

1. 用 **Safari** 打开部署好的网址（必须是 Safari，Chrome 等第三方浏览器无法添加真正的主屏幕 App）。
2. 点击底部中间的**分享**按钮（方框加向上箭头）。
3. 向下滚动，选择**「添加到主屏幕」**。
4. 确认名称（默认「汇率换算」），点击**「添加」**。
5. 回到主屏幕，点击新出现的图标即可全屏打开，没有 Safari 地址栏。

首次打开时联网一次，之后即使断网也能打开并使用最后一次获取到的汇率。

## 项目结构

```
.
├── .github/workflows/deploy.yml   GitHub Pages 自动部署
├── public/
│   ├── manifest.webmanifest       PWA manifest（相对路径，兼容子路径部署）
│   ├── sw.js                      Service Worker：应用外壳离线缓存
│   │                              （带哈希的 JS/CSS 由页面 postMessage 补充预缓存）
│   ├── favicon.svg
│   ├── icon-192.png / icon-512.png / icon-maskable-512.png / apple-touch-icon.png
├── scripts/generate-icons.mjs     图标生成脚本（无第三方依赖）
├── src/
│   ├── api/                       汇率数据源（可替换）
│   │   ├── provider.ts            RateProvider 接口与错误类型
│   │   ├── fxratesapi.ts          主数据源：实时中间价
│   │   ├── coinbase.ts            备用数据源：实时中间价
│   │   ├── frankfurter.ts         兜底数据源：ECB 日更参考汇率
│   │   ├── chain.ts               降级链：按顺序尝试多个数据源
│   │   └── rates.ts               当前使用的数据源（降级链组装）
│   ├── components/                纯展示组件
│   │   ├── Header.tsx             标题、更新状态、刷新 / 编辑 / 主题按钮
│   │   ├── CurrencyList.tsx       货币列表 + 拖拽排序
│   │   ├── CurrencyRow.tsx        单行：国旗、代码、名称、金额
│   │   ├── CurrencyPicker.tsx     货币选择与搜索面板
│   │   ├── Keypad.tsx             自定义数字键盘
│   │   ├── Toast.tsx              轻量提示
│   │   └── Icons.tsx              内联 SVG 图标
│   ├── config/currencies.ts       统一的货币配置表
│   ├── hooks/                     状态逻辑
│   │   ├── useRates.ts            获取 / 缓存 / 刷新节流
│   │   ├── useCurrencyList.ts     币种增删改排序 + 持久化
│   │   ├── useDragReorder.ts      Pointer Events 拖拽排序
│   │   ├── useLongPress.ts        长按复制
│   │   ├── useTheme.ts            主题偏好
│   │   ├── useFitText.ts          金额按实际可用宽度自动缩放字号
│   │   └── useToast.ts / useNow.ts / useOnlineStatus.ts
│   ├── lib/                       纯函数工具
│   │   ├── calculator.ts          四则运算状态机
│   │   ├── convert.ts             交叉换算
│   │   ├── draft.ts               输入串编辑原语
│   │   ├── format.ts              金额格式化、千位分隔、自适应字号
│   │   ├── number.ts              精度处理
│   │   ├── time.ts                更新时间文案
│   │   ├── storage.ts             localStorage 读写与校验
│   │   └── clipboard.ts           复制
│   ├── App.tsx                    页面编排
│   ├── main.tsx                   入口
│   ├── index.css                  设计变量与全部样式
│   └── types.ts                   共享类型
├── index.html
└── vite.config.ts
```

## 使用说明

| 操作                       | 效果                                             |
| -------------------------- | ------------------------------------------------ |
| 点击某一行的金额区域       | 把该货币设为输入货币，其余货币实时同步换算；切换到另一种货币时会归位成灰色的默认金额 100 |
| 输入行的灰色 100           | 尚未输入时的占位金额，按下第一个数字键即被覆盖并转为正常颜色 |
| 长按任意一行的金额         | 复制该行完整数值（无千位分隔符），并弹出提示     |
| 点击国旗 / 代码 / 名称     | 打开货币选择器，替换这一行的货币                 |
| 顶部「编辑」按钮           | 进入编辑模式：删除、添加、拖动排序               |
| 编辑模式下按住右侧 ≡       | 拖动调整顺序；键盘用户可聚焦后按上下方向键       |
| 键盘 `÷ × − + =`           | 简单四则运算，算完直接作为换算金额               |
| 键盘 `AC`                  | 一键清空当前输入与未结算的算式，回到灰色的 100    |
| 键盘右下角 ⌄ / 底部 ⌃ 条   | 收起 / 展开数字键盘（只有这两处会动键盘，点货币行不会）。收起后列表可完整显示 10 种货币 |

## 本地保存了什么

全部存在浏览器 `localStorage`（键名以 `fx.` 开头），不上传任何数据：

| 键              | 内容                                   |
| --------------- | -------------------------------------- |
| `fx.codes`      | 当前显示的货币及其顺序                 |
| `fx.activeCode` | 上次输入的基准货币                     |
| `fx.draft`      | 上次输入的金额                         |
| `fx.snapshot`   | 上一次成功获取的汇率、汇率日期、获取时间 |
| `fx.theme`      | 主题偏好                               |

## 免责声明

汇率数据来自欧洲央行参考汇率，仅供参考，不构成任何交易或投资建议，实际兑换以金融机构报价为准。
