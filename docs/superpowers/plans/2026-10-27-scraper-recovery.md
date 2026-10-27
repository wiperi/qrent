# Qrent 爬虫恢复与低流量采集计划

> **For agentic workers:** Use native execution in this session. Steps are checked against local tests and server evidence.

**Goal:** 恢复腾讯云采集任务，验证悉尼、墨尔本 Domain 直连及 Real Estate 澳洲住宅代理采集，并限制费用。

**Architecture:** 继续使用仓库现有解析器与 Playwright；为其补充代理会话、资源分流、失败状态和增量补缺。保留服务器现有 SQLite 数据库，通过新的运行入口写入，旧源码和启动文件保留可回滚副本。

**Tech Stack:** Python 3.11, Playwright, requests, SQLite, existing DashScope scoring.

**Spec:** 用户 2026-10-27 的两次任务说明；试验支出 <= USD 1，固定澳洲出口，非商业找房。

## 已核实的现状

- 仓库 `wiperi/qrent` 是 monorepo：backend、frontend、shared、agent、scraper；没有检索到另一个可访问的 Qrent 后端仓库。
- `packages/tt.scraper-v2` 仅出现在旧说明中，目录没有提交，根目录 `tt*` 被忽略。
- 腾讯云 `ins-5a985eaw` 的真实采集目录是 `/root/qrent-scraper`，不是 Docker 部署；代码已恢复到本地私有 output 目录。
- 每日 02:00 的 cron 仍执行，2026-10-27 因 gost 代理隧道失败得到 0 条，仍返回成功。旧脚本未使用 pipefail。
- 该目录使用 SQLite；其数据不能被称为已同步到 `api.qrent.rent` 的 MySQL 后端。
- 代理方案可复用来源：服务器现有 Qrent 独立部署中的 LycheeIP/gost 设计。新代理由用户指定为 FlashProxy Residential Lite。
- 千问配置来源：本机 `pdftomd/.env`（仅私有复用密钥）。当前账号模型列表 HTTP 200，包含 `qwen-plus`，不含 `qwen-plus-1220`。

## Global Constraints

- 试验总支出 <= USD 1；先购买 USD 0.30/1GB 一次性套餐，无自动续费。
- 用户补充：Domain 保持直连，住宅代理只用于 Real Estate。
- 每个小样本只取一页；确认结果前不恢复无限量或无预算采集。
- 图片、视频和字体默认不下载；需图片时另走无认证直连，代理仅用于站点必需资源。
- 代理认证和千问密钥只存忽略的私有环境文件，文件权限 0600。
- 页面受阻、代理异常或范围不完整，不能视为成功或据此下架旧房源。

## Review Focus

- 代理故障、HTTP 403/429、验证页、空解析：非零状态，保留旧数据。
- 房号、州和邮编：避免把同楼不同单元或 NSW/VIC 房源合并。
- 两个平台相同数字 ID：按来源区分，数据库不能覆盖另一平台。
- 静态资源直连：不转发 Cookie、Authorization 或代理凭据；直连失败不回退到收费代理。
- 预算和重试上限：在创建新请求前检查，失败后不无限重试。

## Task 1: 恢复可诊断的运行入口

**Files:** `packages/scraper/recovery_runner.py`, `src/services/sqlite_store.py`, `src/config/settings.py`, `run_scraper.py`, `tests/test_recovery.py`.

- [x] 写失败测试：VIC 地址正确解析；同源 upsert、跨源 ID 不覆盖；采集失败退出非零且不下架存量。
- [x] 实现显式地区、页数、房源数限制和 SQLite sink；移除旧快照模型硬编码，改环境可配置。
- [x] 运行采集相关测试、CLI 导入与帮助；不运行无关前端测试。

## Task 2: 低流量代理与增量补缺

**Files:** `src/utils/network.py`, `src/utils/browser.py`, `src/services/incremental.py`, `src/scrapers/domain.py`, `src/scrapers/realestate.py`, `.env.example`.

- [x] 写失败测试：黏性会话、预算截止、敏感头不直传、同址补缺且保留来源、房号差异不合并。
- [x] 实现澳洲参数代理配置、运行及失败重试时轮换、受限重试、资源分流和逐请求流量统计。
- [x] Domain 先抓列表/缺失详情；Real Estate 保留列表来源，仅对缺失详情补抓。缓存限定时效。
- [x] 用真实浏览器对悉尼/墨尔本各一页做小样本，记录解析结果、出口地区、错误与供应商用量。

## Task 3: 服务器部署与验收

**Files:** 新运行脚本、部署说明、`docs/reports/2026-10-27-scraper-recovery.md`.

- [x] 取回原始源码及配置键名，备份原启动文件和数据库；不复制含密钥的历史计划到 Git。
- [x] 上传通过验证的版本到独立 release 目录，复用服务器原环境和新代理私有配置。
- [x] 手动执行受限任务，核对退出码、日志、CSV、SQLite 新记录；确认失败不会误报成功。
- [x] 把有预算上限、加锁、正确退出码的命令接回现有 cron，并检查下一次执行设置。
- [x] 留存真实完成范围、费用、剩余障碍和回滚入口，清理无用临时文件。
