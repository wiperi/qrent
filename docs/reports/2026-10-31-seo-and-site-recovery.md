# QRent SEO、内链与通知恢复

## 验收状态

本地实现、独立审查和生产构建通过；GitHub 发布及线上完整验收尚待执行。本段会在取得真实生产回执后更新，不能把本地通过当作官网已上线。

## 审计依据与基线

按用户指定的 [site-audit-zyppy](https://github.com/fisher-byte/site-audit-zyppy)，固定参考版本 `1afd81e91d6456cda4f4f3bb1202e3a31476ef56`，阅读要素清单并实际运行网页自检及上线门禁。配置在根目录 `seo-gate.config.json`；单一 urlset 使用工具的 `childSitemaps: ["sitemap.xml"]` 选项，不能误按 sitemap index 解析后声称查过全部 URL。

生产基线的完整门禁为 372 通过、102 失败检查。这是检查结果数，不是 102 个独立问题。实际 HTML 已确认：

| 部分 | 发布前问题 | 本次处理 |
| --- | --- | --- |
| 规范地址 | 各页面继承裸域首页 canonical，sitemap 指向需 308 跳转的裸域 | 统一 www 最终域名，每页独立 canonical |
| 多语言 | 中文 HTML 初始 lang=en，语言标签统一回首页，部分不存在译文仍在 sitemap | 服务端语言文档；页面级 alternates；只列真实发布语言 |
| sitemap | 重复地址、筛选搜索页、假的跨语言文章组合、每次生成伪更新时间 | 去重、实际语言文章、排除工具页；文章用源站编辑时间，静态页不编造 lastmod |
| 文章入口 | 首次 HTML 文章列表为空，依赖 useEffect；全站只有弱导航 | SSR 首屏文章列表、完整文章目录、首页/页脚/学校/指南互链 |
| 缺失内容 | 不存在的文章吞掉 notFound，返回“加载出错”200 | 页面级真实 404/noindex；普通未知路由使用独立完整 404 文档 |
| 抓取与分享 | robots 阻止 Next 资源；首页缺 OG 图、部分页面分享信息重复 | 放行 CSS/JS；独立 OG/Twitter；实际可访问分享图与正确尺寸 |
| 语义 | 全站 Schema 类型/域名不统一、缺文章与面包屑信息 | WebSite、BlogPosting、BreadcrumbList、学校 CollectionPage；JSON-LD 安全转义 |
| 正文完整性 | 只读取 Notion 第一页/第一层块，长内容可能被截断 | 完整游标分页、递归子块；修复表格/分栏结构及嵌套正文 |
| 使用入口 | 三条轮播含旧带找房广告；中文卡片只取英文关键词 | 一条恢复更新通知；中文直接复用原 descriptionCn 中已有关键词 |

## 内链结构与数据边界

首页和页脚连接学校目录、UNSW/USYD/UTS 学校页及租房指南。学校页沿原 `TARGET_AREAS` 的各 10 个查询区域，连接实际筛选搜索及最多三篇真实同语言指南。指南目录直接输出全部已发布文章链接，文章保留最多三篇相关推荐并回链学校目录。页脚可抓取的语言链接连接中英文两张图。目标为从首页不超过三次跳转发现有效内容；实际图与链接状态在生产验收核对。

学校页每个最多展示 8 条原公开 API 数据，缓存 10 分钟；不填未知价格、日期或通勤，不为 SEO 生成虚构房源。数据库仍含原库存，预览和计数不代表源站实时可租确认，也不是全悉尼覆盖。历史按学校查询可能包含周边区域，区域目录表示原查询范围，不保证每条学校库存恰好位于列出的区名。搜索参数组合、收藏及移动筛选页 noindex/follow；索引入口使用稳定目录页。

区域筛选沿用后端原空格分隔的 OR 前缀规则。本次实际只读对照：UTS `surry hills` 与 `surry` 均 77 条、仅 Surry Hills；USYD `wolli creek` 与 `wolli` 均 149 条、仅 Wolli Creek。不把旧前缀规则泛称为精确等值筛选，未为 SEO 修改数据库或后端过滤契约。

## Issue 范围

- #271：通知条保留一条，中英文说明已恢复更新，支持 Real Estate / Domain 租金。
- #270：搜索、首页与收藏卡片复用既有中文关键词；兼容列表引号和中英文分隔符，不发翻译请求。
- #217：保留并核验同语言最多三篇相关推荐，补齐指南 SSR 入口及学校/文章互链。
- #229：本轮修正语言元数据、实际译文 sitemap 和无译文时的安全导航；完整静态内容重构不冒称完成。
- #261、#237、#216，以及 agent/Dify 相关 #172 暂不处理。
- #264 时间线改版、#243 密码找回、#242 第三方登录、#185 浏览状态、#179 家具/排序扩展属于独立产品工作，未为凑关闭数量扩大本次范围。
- #250 的正文是 PostgreSQL 镜像方案，当前生产实际是 MySQL；未执行任何镜像、清库或迁移。

## 本地验证与后续复现

13 项隔离 Node 回归通过，覆盖 canonical/语言、sitemap 去重和真实日期、JSON-LD、中文关键词、区域参数、价格与来源校验、初始 HTML 指南链接、Notion 游标、表格与嵌套内容。6 项 HTTP 检查通过，含中英文未知路径/学校的完整无 JS 404 文档、首页初始语言、规范地址和通知。TypeScript、Prettier、actionlint 和真实生产构建均通过；参考门禁对 18 个代表页为 964 通过、0 失败。独立只读审查没有剩余 Critical/Important。

本地没有生产 Notion 凭据，没有取回或导出部署 Secrets；真实文章、源日期与全部生产 sitemap 必须在原 Vercel 集成发布后核对。原普通 Vitest 初始化会接数据库，本次不使用它。隔离回归：`pnpm --filter frontend test:seo`。启动已构建前端后，设置 `QRENT_SEO_BASE_URL` 执行 `node --test packages/frontend/test/seo/http-acceptance.mjs`；生产另设 `QRENT_SEO_VERIFY_BLOGS=1` 检查动态缺失文章的 HTTP 状态。

参考工具在其 `SEO自动检查门禁` 目录执行 `node --import tsx src/verify.ts --config /absolute/path/to/qrent/seo-gate.config.json` 做本地代表页检查；`src/audit-production.ts` 检查生产全部 sitemap、链接和 Bot 对照。当前配置不缓存审计结果。

## 已核实的框架限制

Next.js 动态文章调用 notFound() 时，初始错误 HTML 可能只有 `__next_error__` 空壳；HTTP 404/noindex 正确，恢复内容需 hydration 后出现。这与 [官方问题 #100596](https://github.com/vercel/next.js/issues/100596) 一致；[修复 PR #100648](https://github.com/vercel/next.js/pull/100648) 核对时尚未合并。边界配置实验已撤回。普通未知路径使用官方 global-not-found；固定学校 enum 禁止动态生成未知学校，二者完整无 JS 404 已验收。

动态文章错误页按 HTTP 404/noindex + 真实浏览器恢复导航验收，不把它登记为无 JS 正文通过，也不通过删掉失败 URL 伪造通过。未引入未合并的框架补丁。文章切换语言目前回到目标语言指南目录，避免进入不存在的译文；已有译文的同篇切换仍可进一步改善。

## 爬虫连续性、费用与发布方式

2026-10-31 00:44 再次只读核对，原 crond、Maps 普通出口、MySQL 出口均 active/enabled，原 02:00 调度与 03:00/03:05 备份保持。最近已完成的实际周期为 10 月 30 日，采集 5,075 来源 ID，严格完整的 2,696 地址 / 4,022 必要学校关联此前已逐项与原库/API 核对；下一轮 10 月 31 日 02:00 尚未发生，不提前声明成功。

正式账本仍为模型 16,507、NSW 5,170、Maps 576、赠金矩阵 280 次/元素记录；模型 CNY 12.602919（含历史保守预留）、代理现金 USD 0.60、赠金预留 USD 0.56。相对本次 SEO 开始前均未变。本次没有重启爬虫、换账本、重算成功地址—学校、发模型/通勤请求或购买服务。

GitHub CI 新增隔离 SEO/SSR 回归与生产构建后的 HTTP 检查。前端-only 的 CI/test 变更不会触发后端 CD；后端、shared、部署脚本或 cd.yml 变更仍走原保护流程。此次前端经原仓库 PR/合并及原 Vercel 集成发布，后端/数据库容器不因 SEO 更新重启。

Search Console 的真实收录、站点地图提交、排名/点击、外链与现场 Core Web Vitals 没有当前后台证据，不报虚构分数或排名提升。网页自检的 TTFB 是单次网络观测，不替代现场 CWV。
